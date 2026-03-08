# yoyo-news ? Requirements Specification

## 1. Overview

- **Product:** yoyo-news  
- **Type:** Web application  
- **Auth:** No login required; anonymous use only.

---

## 2. Functional Requirements

### 2.1 News gathering (LLM-powered)

- The application uses an **LLM** to gather daily news.
- **Approach (decided):** The LLM **drives web search** via an API (e.g. search API), and **writes short summaries** from the search results. No login required for end users.

### 2.2 Architecture: frontend + backend

- **Frontend:** Static web app (served from S3).
- **Backend:** Serverless (Lambda). Backend calls the LLM and runs on a **schedule** ? "daily" means **scheduled** (e.g. once per day via EventBridge), not on-demand for MVP.
- **History:** Past daily runs are stored so users can **go back and view history** (previous days' digests).

### 2.3 Configuration (MVP)

- Users can **configure what news to gather**. Configuration is **stored locally** in the browser (no server-side user accounts).
- **MVP settings:**
  - **Country** ? which country's news to focus on.
  - **Language** ? language for content/summaries.
  - **Category** ? e.g. **sports**, **economy** (extensible later).
- Backend scheduled job may use a system default or a single anonymous config for "what to fetch" until we define how local config is used by the pipeline.

### 2.4 Display

- News is displayed in a **modern, visually appealing** style.
- **UX:** Layout, detail view, theming to be defined later.

---

## 3. Infrastructure & Hosting (decided)

- **Target:** Low-cost hosting on **AWS**.
- **Frontend:** **S3** (static site) + optional CloudFront for delivery.
- **Backend / compute:** **Lambda** (serverless functions for LLM + search, scheduled runs).
- **Storage / history:** **DynamoDB** (store daily digests and run metadata so users can browse history).
- **Scheduling:** EventBridge (CloudWatch Events) or Lambda trigger to run the daily job.

---

## 4. Non-Functional Requirements

- *(To be refined; e.g. cost limits, rate limits, availability.)*

---

## 5. Out of Scope

- User accounts, login, or cross-device sync of *user-specific* data.
- Server-side *per-user* data (config stays local; only shared digests/history are stored).

---

## 6. Open / Later

### LLM provider (open)

- Which LLM / API for v1: OpenAI, Anthropic, Groq, other? One provider or multiple?

### UX (later)

- Layout, detail view, theming, and visual reference to be defined when we work on UX.

### Tech stack (later)

- Frontend and backend (Lambda) stack to be decided when we work on technical design.

