---
name: backend-sam-dynamodb
description: Backend patterns for this repo's API: AWS SAM, Lambda handlers, DynamoDB single-table, Firebase JWT auth. Use when writing or changing backend code, Lambda handlers, shared/db, API routes, or DynamoDB access patterns.
---

# Backend (SAM + DynamoDB) skill

Guidelines for the backend in this repo: AWS SAM, Node 20 Lambda, API Gateway, DynamoDB single-table, Firebase token authorizer.

## Architecture

- **API:** API Gateway (REST) with a single authorizer; stage `Prod`; path prefix `/Prod/` in requests.
- **Auth:** Firebase JWT in `Authorization: Bearer <token>`. Authorizer validates with Firebase JWKS and passes `userId` (Firebase `sub`) in `event.requestContext.authorizer.userId`.
- **Lambdas:** One Lambda per resource (e.g. `FoldersFunction`, `DocumentsFunction`). Each handler routes by path and method inside a single `lambdaHandler`.
- **Data:** Single DynamoDB table. Access patterns:
  - **List by parent:** PK = `USER#<userId>` or `USER#<userId>#FOLDER#<parentId>`, SK `begins_with FOLDER#` or `DOC#`. Use `shared/types.js` key helpers: `USER_PK_FOLDER(userId, parentId)`, `SK_FOLDER(id)`, `SK_DOC(id)`.
  - **Get by id (scoped to user):** GSI1 query with `GSI1PK` = `FOLDER#<id>` or `DOC#<id>`, `GSI1SK` = `USER#<userId>`. Helpers: `GSI1PK_FOLDER(id)`, `GSI1PK_DOC(id)`, `GSI1SK_USER(userId)`.
- **Shared code:** `backend/shared/db.ts` (DynamoDB), `backend/shared/types.ts` (Folder, Document, input types, key helpers). Handlers import `../../shared/db.js` and `../../shared/types.js`.

## Handler pattern

1. **OPTIONS:** Return 204 with CORS headers, no auth.
2. **Auth:** Read `userId` from `event.requestContext?.authorizer?.userId`. If missing or not a non-empty string (or is `'cors-preflight'`), return 401 with `{ error: 'Unauthorized' }`.
3. **Path:** Strip `/Prod/` and leading `/`, then `split('/').filter(Boolean)` → `pathParts`. Use `event.queryStringParameters` for query params.
4. **Route:** Branch on `pathParts[0]` (resource), `pathParts.length`, and `event.httpMethod`. Return 404 for unknown resource/path, 405 for wrong method.
5. **Body:** Parse with `event.body ? JSON.parse(event.body) : {}`. Validate required fields; return 400 with `{ error: '...' }` on validation failure.
6. **DB:** Call `db.*` with `userId` as first argument where applicable. Map `null` from db to 404; let thrown errors (e.g. "Parent folder not found") be caught and mapped to 404 or 500 as appropriate.
7. **Response:** Use a shared `response(statusCode, body)` that sets CORS headers and `Content-Type: application/json`, and stringifies body except for 204.

Example response helper:

```ts
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
  'Content-Type': 'application/json',
};

function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: statusCode === 204 ? '' : JSON.stringify(body),
  };
}
```

## Adding a new route or resource

- **New endpoint on existing resource:** Add a branch in the same handler (e.g. new path segment or method) and call existing or new `db.*` functions. Keep path parsing consistent (e.g. `pathParts[0] === 'folders'`, then `pathParts.length` and method).
- **New resource (e.g. comments)::** Add `backend/shared/db.ts` functions using the same key pattern (PK/SK for list, GSI1 for get-by-id). Add a new Lambda in `template.yaml` and a new handler under `functions/<resource>/handler.ts` that follows the same handler pattern. Wire the new path in the API resource.
- **New path endpoint (e.g. folder path):** If the frontend needs a single call for “ancestor path”, add a db function that returns the path (e.g. repeated getFolder in a loop or a dedicated access pattern) and expose it as e.g. `GET /folders/:folderId/path` in the folders handler.

## DB layer conventions

- **List:** `listFolders(userId, parentId)`, `listDocuments(userId, parentId)`. Return sorted by `order`. Use `QueryCommand` with PK and `begins_with(SK, :prefix)`.
- **Get:** `getFolder(folderId, userId)`, `getDocument(documentId, userId)`. Return `null` if not found. Use GSI1 query.
- **Create:** Accept `userId` and generated id (uuid); validate parent exists when parentId is non-null; use `ConditionExpression: 'attribute_not_exists(SK)'` to avoid overwrites.
- **Update:** Get existing first; if parent changes, delete old PK/SK item and put new one (same GSI1 keys); otherwise put with updated fields. Return `null` if not found.
- **Delete:** Single item delete by PK/SK. For “delete folder and all contents”, implement recursively in db (list children, delete each, then delete folder).
- **Types:** Use `Folder`, `Document`, `CreateFolderInput`, etc. from `shared/types.js`. Marshall/unmarshall with `@aws-sdk/util-dynamodb`. Map raw items to types with small `toFolder`/`toDocument` helpers that validate required fields.

## Input validation and errors

- Validate required body fields (e.g. `name` for create folder). Return 400 with a clear `{ error: '...' }` message.
- Normalize optional values (e.g. `parentId` empty string or `'root'` → null).
- In catch: if `err.message` is a known business error (e.g. "Parent folder not found"), return 404; otherwise return 500 with a generic or safe message. Do not leak internal details.

## What not to do

- Do not add auth logic inside resource handlers; the authorizer already enforces JWT and sets `userId`.
- Do not use a different table or key schema without updating `shared/types.js` and the single-table design.
- Do not skip CORS headers on any response (including 4xx/5xx).
- Do not return 204 with a body; use an empty string for `body` when statusCode is 204.
