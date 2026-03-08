import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNode from "aws-cdk-lib/aws-lambda-nodejs";
import * as events from "aws-cdk-lib/aws-events";
import * as targets from "aws-cdk-lib/aws-events-targets";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as integrations from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

export class YoyoNewsStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const backendPath = join(__dirname, "..", "..", "..", "backend");

    // DynamoDB table: PK, SK (Option A: one digest per day)
    const table = new dynamodb.Table(this, "DigestsTable", {
      partitionKey: { name: "pk", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "sk", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Daily job Lambda (CJS so deps like OpenAI can use require('punycode') at runtime)
    const dailyJob = new lambdaNode.NodejsFunction(this, "DailyJob", {
      entry: join(backendPath, "lambdas", "daily-job", "index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      timeout: cdk.Duration.minutes(2),
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        format: lambdaNode.OutputFormat.CJS,
        mainFields: ["module", "main"],
      },
    });
    table.grantReadWriteData(dailyJob);

    // EventBridge: run daily at 6:00 UTC
    const rule = new events.Rule(this, "DailySchedule", {
      schedule: events.Schedule.cron({ minute: "0", hour: "6" }),
    });
    rule.addTarget(new targets.LambdaFunction(dailyJob));

    // Read API Lambda
    const readApi = new lambdaNode.NodejsFunction(this, "ReadApi", {
      entry: join(backendPath, "lambdas", "read-api", "index.ts"),
      handler: "handler",
      runtime: lambda.Runtime.NODEJS_20_X,
      environment: {
        DYNAMODB_TABLE_NAME: table.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        format: lambdaNode.OutputFormat.ESM,
        mainFields: ["module", "main"],
      },
    });
    table.grantReadData(readApi);

    // HTTP API (API Gateway v2)
    const httpApi = new apigatewayv2.HttpApi(this, "HttpApi", {
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [apigatewayv2.CorsHttpMethod.GET, apigatewayv2.CorsHttpMethod.OPTIONS],
        allowHeaders: ["Content-Type"],
      },
    });
    httpApi.addRoutes({
      path: "/digests",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration("ReadApiIntegration", readApi),
    });
    httpApi.addRoutes({
      path: "/digests/{id}",
      methods: [apigatewayv2.HttpMethod.GET],
      integration: new integrations.HttpLambdaIntegration("ReadApiIdIntegration", readApi),
    });

    // S3 bucket for frontend (static website hosting, public read)
    const frontendBucket = new s3.Bucket(this, "FrontendBucket", {
      blockPublicAccess: new s3.BlockPublicAccess({
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      }),
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });
    frontendBucket.addToResourcePolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject"],
        resources: [frontendBucket.arnForObjects("*")],
        principals: [new iam.StarPrincipal()],
      })
    );

    // Deploy frontend: run "npm run build" in frontend/ first, then deploy
    const frontendBuildPath = join(__dirname, "..", "..", "..", "frontend", "dist");
    new s3deploy.BucketDeployment(this, "FrontendDeploy", {
      sources: [s3deploy.Source.asset(frontendBuildPath)],
      destinationBucket: frontendBucket,
      prune: true,
    });

    // Outputs
    new cdk.CfnOutput(this, "ApiUrl", {
      value: httpApi.apiEndpoint,
      description: "Read API base URL (GET /digests, GET /digests/{id})",
    });
    new cdk.CfnOutput(this, "TableName", {
      value: table.tableName,
      description: "DynamoDB digests table",
    });
    new cdk.CfnOutput(this, "FrontendBucketName", {
      value: frontendBucket.bucketName,
      description: "S3 bucket for frontend",
    });
    new cdk.CfnOutput(this, "FrontendWebsiteUrl", {
      value: frontendBucket.bucketWebsiteUrl,
      description: "Frontend static website URL",
    });
  }
}
