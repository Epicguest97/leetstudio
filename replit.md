# CodeArena

A lightweight competitive-programming and hackathon platform: browse problems, submit code that's judged asynchronously via a self-hosted Judge0 instance, and compete in timed contests with a live leaderboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000 locally, 8080 via workflow)
- `pnpm --filter @workspace/codearena run dev` — run the CodeArena frontend
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/scripts run seed-languages` — seed the `languages` table (C++, Python, Java Judge0 mappings)
- Required env: `DATABASE_URL`, `JUDGE0_API_URL` (self-hosted Judge0 base URL, no default)
- Optional env: `JUDGE0_AUTH_TOKEN` (sent as `X-Auth-Token` if the Judge0 instance requires auth)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5, Replit Auth (OpenID Connect)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Frontend: React + Vite, wouter router, TanStack Query, shadcn/ui, Monaco editor (`@monaco-editor/react` + `monaco-editor`)
- Build: esbuild (CJS bundle)

## Where things live

- `lib/api-spec/openapi.yaml` — source-of-truth API contract
- `lib/api-client-react/src/generated/` — generated React Query hooks + Zod-free TS types (`api.ts`, `api.schemas.ts`), re-exported from the package root (`@workspace/api-client-react`)
- `artifacts/api-server/src/routes/{languages,problems,submissions,contests,dashboard,judge0}.ts` — route handlers
- `artifacts/api-server/src/lib/{judge0.ts,queue.ts,submissionScoring.ts,publicUrl.ts}` — Judge0 dispatch, submission queueing, score aggregation
- `artifacts/codearena/src/pages/` — one file per route (home, problem-detail, submissions, submission-detail, contests, contest-detail, contest-leaderboard, dashboard, create-problem, create-contest)
- `artifacts/codearena/src/components/{layout,require-auth}.tsx` — shared app shell and auth gate

## Architecture decisions

- Judge0 is used **asynchronously only**: the backend POSTs each test case to Judge0 with a `callback_url` webhook (`/api/judge0/callback/:testResultId`); there is no polling of Judge0 itself. The frontend polls `GET /submissions/:id` instead while status is `queued`/`judging`.
- No admin role in this MVP — any authenticated user can create problems and contests.
- Leaderboard is computed live via a Postgres aggregation query on each request (no caching); the frontend polls it every 5s for a "live" feel instead of using websockets/SSE.
- Per-language resource limits are modeled as multipliers (`timeMultiplier`, `memoryMultiplier`) on the `languages` table, applied to each problem's base `cpuTimeLimitSeconds`/`memoryLimitKb`.

## Product

- Browse problems by difficulty, view description + sample test cases, write/submit code in Monaco with per-language selection.
- Submissions are judged per test case; sample test cases show stdout/stderr, hidden test cases only show pass/fail (+ compile output on failure).
- Contests bundle problems with labels (A, B, C) and points; each contest has a live-polling leaderboard (rank, score, solved count, penalty minutes).
- Dashboard shows a signed-in user's solved count, acceptance rate, and recent submissions.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

- `AuthUser` (from Replit Auth) has no `username` field — only `email`, `firstName`, `lastName`, `profileImageUrl`. Derive a display name from those.
- Judge0 must be self-hosted externally by the user — never run Judge0 in this sandbox.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
