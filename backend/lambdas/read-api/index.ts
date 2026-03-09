import type { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { getTableName, listDigests, getDigest, putDigest } from "../../shared/dynamo.js";
import { generateDigestWithLlm } from "../../shared/llm.js";
import { normalizeDigestItems } from "../../shared/normalize.js";
import { DEFAULT_JOB_CONFIG, type UserConfig } from "../../shared/types.js";

const dynamo = new DynamoDBClient({});

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function parseDate(s: string): string | null {
  const match = /^(\d{4}-\d{2}-\d{2})$/.exec(s);
  return match ? match[1]! : null;
}

const jsonCors = {
  ...CORS_HEADERS,
  "Content-Type": "application/json",
};

function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

export const handler: APIGatewayProxyHandlerV2 = async (event) => {
  const withCors = (statusCode: number, body: string) => ({
    statusCode,
    headers: jsonCors,
    body,
  });

  const withCors500 = (error: string, detail: string) =>
    withCors(500, JSON.stringify({ error, detail }));

  try {
    let tableName: string;
    try {
      tableName = getTableName();
    } catch (envErr) {
      console.error("getTableName failed:", envErr);
      return withCors500("Configuration error", errMessage(envErr));
    }
    const path = event.rawPath ?? "";
    const method = event.requestContext?.http?.method ?? "GET";

    if (method === "OPTIONS") {
      return { statusCode: 204, headers: CORS_HEADERS };
    }

    // POST /digests/refresh — generate and save today's digest (optional body: { countries? })
    if (method === "POST" && (path === "/digests/refresh" || path === "/digests/refresh/")) {
      const date = new Date().toISOString().slice(0, 10);
      try {
        let config: UserConfig = { ...DEFAULT_JOB_CONFIG };
        let body: string | undefined = event.body;
        console.log("[refresh] POST /digests/refresh received", { date });
        if (typeof body === "string" && event.isBase64Encoded) {
          try {
            body = Buffer.from(body, "base64").toString("utf8");
          } catch {
            body = undefined;
          }
        }
        if (body) {
          try {
            const parsed = JSON.parse(body) as Partial<UserConfig>;
            if (Array.isArray(parsed.countries) && parsed.countries.length > 0) {
              config = {
                countries: parsed.countries.filter((c) => typeof c === "string") as string[],
              };
            }
          } catch {
            /* ignore invalid body, use default config */
          }
        }
        console.log("[refresh] config", { countries: config.countries });
        const items = await generateDigestWithLlm(config, date);
        console.log("[refresh] LLM returned", items.length, "items");
        await putDigest(dynamo, tableName, date, items);
        const digest = await getDigest(dynamo, tableName, date);
        console.log("[refresh] digest saved and returned", digest!.date);
        return withCors(
          200,
          JSON.stringify({
            id: digest!.date,
            date: digest!.date,
            createdAt: digest!.createdAt,
            items: normalizeDigestItems(digest!.items),
          })
        );
      } catch (err) {
        const message = errMessage(err);
        console.error("[refresh] POST /digests/refresh failed:", message, err instanceof Error ? err.stack : err);
        return withCors(
          500,
          JSON.stringify({
            error: "Failed to generate digest",
            detail: message,
          })
        );
      }
    }

    if (method !== "GET") {
      return withCors(405, JSON.stringify({ error: "Method not allowed" }));
    }

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
      return withCors(200, JSON.stringify({ digests: list }));
    }

    // GET /digests/:id
    const match = path.match(/^\/digests\/([^/]+)$/);
    if (match) {
      const id = decodeURIComponent(match[1]!);
      const date = parseDate(id) ?? id;
      const digest = await getDigest(dynamo, tableName, date);
      if (!digest) {
        return withCors(404, JSON.stringify({ error: "Digest not found" }));
      }
      return withCors(
        200,
        JSON.stringify({
          id: digest.date,
          date: digest.date,
          createdAt: digest.createdAt,
          items: normalizeDigestItems(digest.items),
        })
      );
    }

    return withCors(404, JSON.stringify({ error: "Not found" }));
  } catch (err) {
    const message = errMessage(err);
    console.error("Read API error:", message, err instanceof Error ? err.stack : err);
    return withCors500("Internal server error", message);
  }
};
