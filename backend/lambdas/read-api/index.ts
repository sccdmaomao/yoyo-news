import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { getTableName, listDigests, getDigest } from "../../shared/dynamo.js";

const dynamo = new DynamoDBClient({});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

function parseDate(s: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})$/.exec(s);
  return match ? match[1]! : null;
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const tableName = getTableName();
  const path = event.rawPath ?? "";
  const method = event.requestContext?.http?.method ?? "GET";

  if (method === "OPTIONS") {
    return { statusCode: 204, headers: CORS_HEADERS };
  }

  if (method !== "GET") {
    return {
      statusCode: 405,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Method not allowed" }),
    };
  }

  try {
    // GET /digests or GET /digests?from=...&to=...
    if (path === "/digests" || path === "/digests/") {
      const from =
        event.queryStringParameters?.from ??
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const to =
        event.queryStringParameters?.to ?? new Date().toISOString().slice(0, 10);
      const fromDate = parseDate(from) ?? from;
      const toDate = parseDate(to) ?? to;
      const list = await listDigests(dynamo, tableName, fromDate, toDate);
      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({ digests: list }),
      };
    }

    // GET /digests/:id
    const match = path.match(/^\/digests\/([^/]+)$/);
    if (match) {
      const id = decodeURIComponent(match[1]!);
      const date = parseDate(id) ?? id;
      const digest = await getDigest(dynamo, tableName, date);
      if (!digest) {
        return {
          statusCode: 404,
          headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
          body: JSON.stringify({ error: "Digest not found" }),
        };
      }
      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
        body: JSON.stringify({
          id: digest.date,
          date: digest.date,
          createdAt: digest.createdAt,
          items: digest.items,
        }),
      };
    }

    return {
      statusCode: 404,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Not found" }),
    };
  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Internal server error" }),
    };
  }
};
