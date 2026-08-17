---
name: implement-task
description: Use when implementing a task on this taq-u-app monorepo — a Linear issue (TAQ-###), a feature or bugfix request, or "implement <task>". Applies the project's domain-template conventions so the work matches the codebase. Skip for research, questions, or tasks outside this repo.
---

# implement-task

Run the **pipeline** — the fixed order of steps that turns a task on this repo into a merge-ready commit that looks like the codebase. Every task runs the same steps in the same order; each step ends on a checkable completion criterion. Skip a step to "finish faster" and you lose the pipeline's value.

Authoritative conventions live in `AGENTS.md` (loaded with this repo). Where a step checks a convention, `AGENTS.md` is the source of truth for the details.

## The pipeline

### 1. Pull the task
Fetch the Linear issue by its `TAQ-###` identifier via the Linear MCP (`linear_get_issue`). Distill a compact task brief: requirements, acceptance criteria, affected area. Capture the issue's `gitBranchName`.
**Done when:** the brief contains only what the issue actually says.

### 2. Branch
Create the feature branch with the issue's Linear `gitBranchName` (e.g. `feature/TAQ-18-implement-feature`): `git checkout -b <gitBranchName>`. Linear's git integration links commits to the issue from that name, and its automation moves the issue's status from there — **never move Linear status manually**.
**Done when:** on a branch named exactly as Linear suggested.

### 3. Locate the affected domain
Identify which bounded context(s) — `ordering/`, `customer/`, `delivery/` — or the web app the change touches. Delegate recon to @explorer when the path isn't obvious.
**Done when:** you hold a file-path list grounded in the real tree.

### 4. Plan (the gate)
Write a short plan: files to create or modify following the **domain template** (`api/`, `dto/`, `services/`, `repository/`, `domain/` per AGENTS.md), `runtime.ts` wiring, schema/enum changes, Bruno collection updates. Flag every task requirement that maps to no file, and every file no requirement maps to. Surface scope mismatches to the user before coding.

**Size the task** — this sets the verification bar in step 6:
- **Small**: one source file changed (its matching test file doesn't count), no new endpoint, no Prisma schema/enum change, no `runtime.ts` wiring change, no cross-domain import.
- **Standard**: anything else.

**Standard tasks**: **consult the axioms reference** at `~/.config/opencode/skills/axioms/SKILL.md` and run the full axioms critique table (per the "How to Apply These in a Review" section) against the plan before proceeding. Every standard plan must be evaluated against all seven axioms. **Multi-domain tasks** (more than one bounded context): additionally write the plan to `.superpowers/sdd/<date>-<slug>/plan.md` — an inspectable artifact verification checks against, so a broken part can be rerun alone.
**Done when:** task↔file mapping is bijective — nothing to do is unplanned, nothing planned is unmapped — AND the size classification is stated — AND for standard tasks the axioms critique table is complete with status for each axiom — AND for multi-domain tasks the plan file exists.

### 5. Implement
Apply the plan. Use @fixer for bounded multi-file lanes (one lane per folder/domain), direct edits for a single small file. Route user-facing web UI to @designer. Follow the conventions below; AGENTS.md's "Agent hazards" list names the confident-wrong moves to avoid.
**Done when:** the plan is fully applied and no convention or hazard is violated.

### 6. Verify
Run the gates — strictness scales with the step-4 size classification, but the floor never drops:
- Always: `pnpm validate` (lint + format) and `pnpm test` (API unit tests).
- Always if the API changed: update the matching `.bru` collection in `apps/api/collections/` and exercise the new or changed endpoints via Bruno.
- **Standard tasks only**: **run the axioms critique table over the diff** (per the axioms skill's "How to Apply These in a Review" section) and get an independent @oracle review. Small tasks stop at the mechanical gates — their correctness is decided by tests, not ceremony.

**Done when:** gates pass, new endpoints respond correctly via Bruno — and, for standard tasks, the axioms critique table is complete with status for each axiom and @oracle review is done. Never claim done on unverified work.

### 7. Commit & hand off
Commit on the feature branch with `{type}(TAQ-###): {description}` (types: `feat`, `fix`, `refactor`, `docs`). Always author as `Gabriel Rios <gabrielfrios@gmail.com>` — set it per commit (`git -c user.name="Gabriel Rios" -c user.email="gabrielfrios@gmail.com" commit` or `--author=...`) and confirm the repo-local `user.email` matches. **Do not create a PR** — the user opens it; Linear's automation moves the issue from there.
**Done when:** a clean commit on the feature branch, correct author email, no PR, no manual Linear status change.

## Conventions checklist

One-line index; `AGENTS.md` is authoritative.

- Controllers use `runEffect()`, never `Effect.runPromise`.
- Inputs decoded per-endpoint (`decodeBody` / `decodeParams`) — no global validation.
- Errors are `Data.TaggedError` tagged `domain/ErrorName`; every new domain error gets a `catchTag` in its controller.
- HTTP responses via `@/middleware/http` helpers — never raw `res.status().json()`.
- DTOs: one `Schema.Class` per shape with `fromEntity()`; domain entities with `fromPrisma()`.
- Repos via `prismaService.execute()` / `$transaction()`; events published inside the same transaction.
- New services wired in `runtime.ts` dependency chain — never per-controller layers.
- A Prisma enum change ⇒ also update the Effect Schema that decodes it.
- Cross-domain imports only `ordering → customer/delivery`, never the reverse.
- `@repos/` is read-only reference — never imported in app code.
- Comments only where intent isn't obvious from the code.

### Axioms critique table (standard tasks — required in Plan & Verify)

| Axiom | Status | Notes |
|-------|--------|-------|
| 1. Deep Modules | ✅ / ⚠️ / ❌ | one-line summary |
| 2. Complexity Downward | | |
| 3. Define Errors Out of Existence | | |
| 4. Timeouts / Circuit Breakers / Retries | | |
| 5. Idempotency by Design | | |
| 6. Observability | | |
| 7. Operator Design / Crash Early / Recover at Boundary | | |

Follow with a section per violated or partially-served axiom: detailed finding, recommendation, and any cross-axiom note (see axioms skill for cross-axiom interactions).

## Edge handling

| Situation | Response |
|---|---|
| Unknown `TAQ-###` / no Linear match | Stop, ask the user |
| Step 4 scope mismatch | Surface before coding |
| Gate fails | Fix it; do not proceed or claim done |
| Lane output fails its criterion or feels off | Triage in order: ① is the lane's "Done when" concrete enough to check? ② does the plan have a gap the lane filled by inventing? ③ is there an inspectable artifact? Fix the first one broken, then rerun the lane |
| Task spans multiple domains | Parallel @fixer lanes per domain, sequenced by dependency |

## Red flags — stop and correct

- Skipping a step to "save time"
- Moving Linear status by hand
- Creating a PR
- A commit not authored `gabrielfrios@gmail.com`
- A new endpoint with no Bruno collection update
- `Effect.runPromise` in a controller
- **Skipping axioms critique table in Plan (step 4) or Verify (step 6) for a standard task**
- **Proceeding without @oracle review after axioms critique on a standard task**

All of these mean the pipeline is being circumvented. Stop and run the step properly.
