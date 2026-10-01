# AI Connection Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the owner add, test and remove an AI provider connection under Settings.

**Architecture:** A dedicated tenant-scoped SQLite table and FastAPI router store encrypted credentials. A focused React component uses the existing authenticated request helper. Public preview remains serverless and blocks credential entry.

**Tech Stack:** FastAPI, SQLite, httpx, cryptography Fernet, React/TypeScript and Playwright.

**Spec:** `docs/superpowers/specs/2026-10-01-ai-connections.md`

## Global Constraints

- Preserve existing rule-based assistant and all business operations.
- Only Patron may read or mutate connections; mutations require CSRF.
- Keys never appear in responses, state, audit, owner JSON or browser storage.
- Only fixed official model metadata endpoints may receive the API key.
- Serverless preview blocks credential entry and network calls.

## Review Focus

- Missing or corrupt encryption key must fail safely without replacing existing secrets.
- Blank credentials and provider changes must not reuse the wrong provider's key.
- Provider errors and reflected response payloads must not disclose credentials.
- Concurrent edits/removal while a model test runs must not certify stale credentials.
- Mobile fields and action buttons must remain usable at 360 px.

### Task 1: Server connection storage and test API

**Files:** Create `backend/app/ai_connections.py`, `backend/tests/test_ai_connections.py`; modify `backend/app/main.py`, `backend/app/schema.sql`, `backend/requirements.txt`, `backend/backup.py`.

**Interfaces:** GET/POST `/api/ai-connection` returns `{connection: null | {provider, model, has_key, last_tested_at, updated_at}}`. POST `/api/ai-connection/test` and `/api/ai-connection/remove` use the same safe response envelope plus `message`.

- [ ] Write tests for owner/CSRF/tenant isolation, encrypted storage, secret-free exports, blank-key preservation and provider-change validation, provider success/error/timeout, stale test races, missing/corrupt master key and backup restore.
- [ ] Run `.venv/bin/python -m unittest discover -s backend/tests -p 'test_ai_connections.py' -v`; expect FAIL because routes do not exist.
- [ ] Implement router and encryption with additive schema, fixed provider endpoints, safe errors, request timeouts and rate limit.
- [ ] Run `.venv/bin/python -m unittest discover -s backend/tests -v`; expect all business and AI tests PASS.
- [ ] Commit server changes.

### Task 2: Owner AI settings section

**Files:** Create `frontend/src/AISettings.tsx`; modify `frontend/src/Modules.tsx`, `frontend/src/Workspace.tsx`, `frontend/src/restaurant.css`, `scripts/check_ui.py`, `README.md`.

**Interfaces:** `AISettings({request, preview, owner})` consumes Task 1's safe connection envelope. No client persistence of credentials.

- [ ] Extend browser checks for the AI tab, all five viewport widths, save/clear-key/model edit/remove, disabled preview credentials and zero preview API calls.
- [ ] Run build and browser check; expect FAIL because tab is missing.
- [ ] Implement provider/model/key form, saved/tested status, error/loading feedback and remove confirmation; add AI tab and integrations shortcut.
- [ ] Run `npm --prefix frontend run build`, `.venv/bin/python scripts/make_preview.py`, `.venv/bin/python scripts/check_ui.py`; expect PASS and capture AI settings at 1440/390 px.
- [ ] Commit UI and generated previews.

### Task 3: Review and release

**Files:** Existing source branch and generated preview.

- [ ] Obtain independent whole-branch code review; fix important findings with a failing regression and passing suite.
- [ ] Publish isolated GitHub branch, open PR and confirm all CI checks pass.
- [ ] Merge the exact reviewed head under prior user authorization.
- [ ] Publish verified `docs/index.html` to the preview repository, confirm Pages success and compare live blob hash.
- [ ] Report the AI section path, supported providers and preview/server distinction.
