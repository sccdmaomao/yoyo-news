#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { YoyoNewsStack } from "../lib/stack.js";

const app = new cdk.App();
new YoyoNewsStack(app, "YoyoNewsStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "ca-central-1",
  },
});
