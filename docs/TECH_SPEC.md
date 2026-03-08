# yoyo-news — Technical Specification

## 1. System Overview

- **Frontend:** Static web app hosted on S3 (optionally behind CloudFront). No login; reads config from `localStorage` and fetches digest history from a read-only API.
- **Backend:** Serverless on AWS. A scheduled Lambda runs once per day: calls the LLM once to generate the digest (gather + summarize), then stores the result in DynamoDB. A separate Lambda (behind API Gateway) serves digest history to the frontend.
- **Config:** User preferences (country, language, category) are stored only in the browser. The scheduled job uses a **system default** or a fixed set of (country, language, category) combinations so that the frontend can filter history by the user’s local config.

---

## 2. Architecture

### 2.1 High-level flow

```
[EventBridge: daily schedule]
         │
         ▼
[Lambda: daily job] ──► [LLM API] ──► [DynamoDB]
         │
         └── writes one digest per (date, country, language, category) or single global digest (see 3.2)

[User browser]
         │
         ├── config: localStorage (country, language, category)
         ├── static assets: S3 / CloudFront
         └── GET /digests, GET /digests/:id: API Gateway ──► [Lambda: read] ──► DynamoDB
```

### 2.2 AWS components

All resources use **ca-central-1** by default (override with `CDK_DEFAULT_REGION`).

| Component | Role |
|----------|------|
| **S3** | Host static frontend (HTML, JS, CSS). Optional: enable static website hosting or use as CloudFront origin. |
| **CloudFront** (optional) | CDN and HTTPS for the frontend and/or API. |
| **Lambda** | (1) **Daily job:** triggered by EventBridge; runs search → LLM → write to DynamoDB. (2) **Read API:** handles GET requests for digest list and single digest. |
| **API Gateway** | HTTP API or REST API exposing the read Lambda (e.g. `GET /digests`, `GET /digests/{id}`). |
| **DynamoDB** | Single table (or two if preferred) for digest metadata and items. |
| **EventBridge** | Rule to invoke the daily-job Lambda on a schedule (e.g. cron: 0 6 * * ? for 6:00 UTC). |
| **Secrets Manager / env** | Store API keys for Search API and LLM (Lambda env vars or Secrets Manager). |

---

## 3. Data Model

### 3.1 Digest (DynamoDB)

One record per “daily digest” produced by the job. Design supports filtering by date and optionally by country, language, category.

**Option A — One digest per day (single “global” digest):**

- **PK:** `DIGEST`
- **SK:** `DATE#<YYYY-MM-DD>`
- **Attributes:** `date`, `items` (list of news items), `createdAt`, optional `country`, `language`, `category` if we later support multiple digests per day.

**Option B — Multiple digests per day (one per config combo):**

- **PK:** `DIGEST#<country>#<language>#<category>`
- **SK:** `DATE#<YYYY-MM-DD>`
- **Attributes:** `date`, `country`, `language`, `category`, `items`, `createdAt`.

For MVP, Option A is simpler (one digest per day; frontend filters or displays all). Option B allows “today’s sports news for US in English” without over-fetching.

**News item (inside `items` array):**

- `id` (optional, e.g. UUID)
- `title`: string
- `summary`: string (LLM-written short summary)
- `url`: string (link to source)
- `source`: string (site name)
- `publishedAt`: optional ISO8601

### 3.2 User config (frontend only)

Stored in `localStorage`, not in DynamoDB. Shape:

- `country`: string (e.g. `"US"`, `"GB"`)
- `language`: string (e.g. `"en"`, `"es"`)
- `category`: string (e.g. `"sports"`, `"economy"`)

Frontend uses this to (a) filter displayed digests if we store multiple digests per day (Option B), or (b) display a single daily digest and use config only for future “what to fetch” logic (e.g. if we add on-demand runs later).

---

## 4. APIs

### 4.1 Read API (public, no auth)

- **GET /digests**
  - Query: `?from=YYYY-MM-DD&to=YYYY-MM-DD` (optional), `?country=...&language=...&category=...` (if Option B).
  - Response: list of digest summaries (e.g. `id`, `date`, optional `country`, `language`, `category`).
- **GET /digests/:id**
  - Response: full digest (date, items with title, summary, url, source).
- **CORS:** Enabled for the frontend origin.

### 4.2 Daily job (internal)

- Invoked by EventBridge (no HTTP). Input can be empty or a small payload (e.g. “run for these configs”). Lambda uses the LLM only (no separate search API): one call to generate the digest (gather + summarize). Writes result to DynamoDB.

---

## 5. Daily job pipeline (Lambda)

1. **Resolve config:** Use system default (country, language, category).
2. **Generate digest:** Call the **LLM** (OpenAI) once with a prompt that asks for 5–10 news items for the given date/country/language/category. The model returns a JSON array (e.g. “sports news today”, “economy news US”).
3. **Store:** Write one DynamoDB item per digest (date, items array).
4. **Error handling:** Log failures; fall back to mock items if the LLM call fails or no API key is set.

---

## 6. External services

### 6.1 LLM (OpenAI)

- **Purpose:** Generate the full daily digest in one call (gather + summarize). No separate search API.
- **Credentials:** `OPENAI_API_KEY` (and optional `OPENAI_MODEL`) in Lambda env; never sent to the frontend.

---

## 7. Tech stack (recommendations)

| Layer | Recommendation | Notes |
|-------|-----------------|--------|
| **Frontend** | React (Vite) or Next.js (static export) | S3 hosts static files; no server-side rendering required. |
| **Backend (Lambda)** | Node.js 20.x | Single LLM call per digest; shared types possible with a monorepo. |
| **Infrastructure** | AWS CDK or SAM | Define S3, Lambda, DynamoDB, EventBridge, API Gateway in code. |
| **LLM** | OpenAI | One call for gather + summarize; optional adapter to swap provider. |

---

## 8. Security and operations

- **Secrets:** Search and LLM API keys in Lambda environment variables or AWS Secrets Manager. No keys in the frontend or in source control.
- **Read API:** No authentication for MVP (public digest history). If needed later, add API key or Cognito.
- **CORS:** Restrict to the frontend origin (S3/CloudFront URL or custom domain).
- **Logging:** Lambda logs to CloudWatch; avoid logging request bodies that might contain sensitive data.
- **Cost:** Lambda + DynamoDB + EventBridge + optional API Gateway and CloudFront stay within free tier for low traffic; monitor Search and LLM API usage.

---

## 9. Deployment

- **Frontend:** Build (e.g. `npm run build`) → upload build output to S3; optionally invalidate CloudFront cache.
- **Backend:** Package Lambda (Node: zip with deps); deploy via CDK/SAM/Serverless; set env vars for API keys and table name.
- **Schedule:** EventBridge rule created by IaC; ensure Lambda has permission to be invoked by EventBridge and to read/write DynamoDB.

---

## 10. Open / deferred

- **LLM provider:** Decide and document in runbook.
- **Search API provider:** Decide; document rate limits and fallbacks.
- **Single vs multiple digests per day:** Option A vs B (see 3.1); affects daily job and read API.
- **UX:** Layout and theming out of scope for this tech spec; see requirements.

---

*This technical spec will be updated as we lock in provider choices and data-model options.*
