import type { ScheduledHandler } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DEFAULT_JOB_CONFIG } from "../../shared/types.js";
import { getTableName, putDigest } from "../../shared/dynamo.js";
import { generateDigestWithLlm } from "../../shared/llm.js";

const dynamo = new DynamoDBClient({});

export const handler: ScheduledHandler = async () => {
  const tableName = getTableName();
  const config = DEFAULT_JOB_CONFIG;
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  const items = await generateDigestWithLlm(config, date);
  await putDigest(dynamo, tableName, date, items);

  console.log(`Daily job completed: ${date}, ${items.length} items`);
};
