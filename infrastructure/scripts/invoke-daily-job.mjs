#!/usr/bin/env node
/**
 * Invoke the DailyJob Lambda to generate today's digest.
 * Requires: AWS CLI configured. Uses region ca-central-1 (or AWS_REGION).
 * Usage: npm run invoke-daily   (from infrastructure/)
 */

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const region = process.env.AWS_REGION || "ca-central-1";
const outFile = join(__dirname, "..", "lambda-out.json");

function run(cmd, options = {}) {
  return execSync(cmd, { encoding: "utf-8", ...options });
}

try {
  console.log("Finding DailyJob Lambda in", region, "...");
  const name = run(
    `aws lambda list-functions --region ${region} --query "Functions[?contains(FunctionName, 'DailyJob')].FunctionName" --output text`
  ).trim();
  if (!name || name === "None") {
    console.error("DailyJob Lambda not found. Deploy the stack first: npx cdk deploy");
    process.exit(1);
  }

  console.log("Invoking", name, "...");
  run(
    `aws lambda invoke --region ${region} --function-name "${name}" --payload "{}" --cli-binary-format raw-in-base64-out "${outFile}"`
  );

  const response = readFileSync(outFile, "utf-8");
  console.log("Response:", response);

  if (response.includes("FunctionError") || response.includes("errorType")) {
    console.error("Lambda reported an error. Check CloudWatch Logs for the function.");
    process.exit(1);
  }
  console.log("Done. Refresh the app to see the new digest.");
} catch (err) {
  if (err.stderr) console.error(err.stderr);
  else console.error(err.message);
  process.exit(1);
}
