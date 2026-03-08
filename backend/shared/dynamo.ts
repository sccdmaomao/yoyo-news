import {
  DynamoDBClient,
  PutItemCommand,
  QueryCommand,
  GetItemCommand,
} from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import type { DigestRecord, NewsItem } from "./types.js";

const PK = "DIGEST";
const SK_PREFIX = "DATE#";

export function getTableName(): string {
  const name = process.env.DYNAMODB_TABLE_NAME;
  if (!name) throw new Error("DYNAMODB_TABLE_NAME is not set");
  return name;
}

export function dateToSk(date: string): string {
  return `${SK_PREFIX}${date}`;
}

/** Save a digest for the given date (Option A: one per day). */
export async function putDigest(
  client: DynamoDBClient,
  tableName: string,
  date: string,
  items: NewsItem[]
): Promise<void> {
  const now = new Date().toISOString();
  const record: DigestRecord = {
    pk: PK,
    sk: dateToSk(date),
    date,
    items,
    createdAt: now,
  };
  await client.send(
    new PutItemCommand({
      TableName: tableName,
      Item: marshall(record, { removeUndefinedValues: true }),
    })
  );
}

/** List digests in date range (SK between DATE#from and DATE#to). */
export async function listDigests(
  client: DynamoDBClient,
  tableName: string,
  fromDate: string,
  toDate: string
): Promise<{ id: string; date: string; createdAt: string }[]> {
  const result = await client.send(
    new QueryCommand({
      TableName: tableName,
      KeyConditionExpression: "pk = :pk AND sk BETWEEN :skFrom AND :skTo",
      ExpressionAttributeValues: marshall({
        ":pk": PK,
        ":skFrom": dateToSk(fromDate),
        ":skTo": dateToSk(toDate),
      }),
      ProjectionExpression: "#d, createdAt",
      ExpressionAttributeNames: { "#d": "date" },
    })
  );
  const items = (result.Items ?? []).map((i) => unmarshall(i));
  return items.map((i) => ({
    id: i.date,
    date: i.date,
    createdAt: i.createdAt ?? "",
  }));
}

/** Get a single digest by date (id = date). */
export async function getDigest(
  client: DynamoDBClient,
  tableName: string,
  date: string
): Promise<DigestRecord | null> {
  const result = await client.send(
    new GetItemCommand({
      TableName: tableName,
      Key: marshall({ pk: PK, sk: dateToSk(date) }),
    })
  );
  if (!result.Item) return null;
  return unmarshall(result.Item) as DigestRecord;
}
