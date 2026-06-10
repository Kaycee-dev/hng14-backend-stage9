# DECISIONS.md — architectural decision log

Append-only. One ADR per decision. When you make an OPEN decision, move it up into a numbered
ADR with the date and rationale. Format: **status · date · decision · why**.

## Locked decisions (already embodied in the scaffold — do not silently change)

**ADR-001 · locked · Stack: TypeScript + Node + Express + `pg`.**
PGlite is a local-only fallback when `DATABASE_URL` is unset (ephemeral, single-process — see
GUARDRAILS §3). Chosen because the scaffold is already built on it; retargeting to Python now
would cost more than the deadline allows.

**ADR-002 · locked · Worker runtime: one codebase, run via `tsx`.**
Locally `server.ts` spawns `runWorkerLoop()` in-process for convenience; in `docker-compose.yml`
the workers are separate containers (`worker-1`, `worker-2`). The "independent workers" rubric is
satisfied by the container topology, demonstrated via `docker compose up`.

**ADR-003 · locked · DB schema via idempotent `initSchema()` DDL on connect; no migration tool.**
Simpler for the timeline; `CREATE TABLE IF NOT EXISTS` is safe to run on every boot.

**ADR-004 · locked · Live updates: SSE by polling `job_logs` on an id cursor.**
Boring and unbreakable; decouples API from workers (they communicate only through the DB).
Postgres `LISTEN/NOTIFY` is a noted future upgrade, not required.

**ADR-005 · locked · Scheduler: real binary `MinHeap`.**
Key `[effective_priority, scheduled_at, created_at, job_id]`, lower wins; rebuilt each poll because
effective priority is time-dependent. GUARDRAILS §4.

**ADR-006 · locked · Alternative algorithm: Timing wheel (60 slots, 1s tick) + overflow list +
within-bucket priority sort.** Benchmarked against the heap; honest framing in STAGE9_BUILD_PACK §16.

**ADR-007 · locked · Retry: up to 4 executions (retry_count = failures), backoff 1/5/25s ±25%
jitter, DLQ after the 4th failure.** GUARDRAILS §9.

**ADR-008 · locked · Recurrence: next = scheduled_at + interval, clamp-to-now (no backfill),
success-only, stop on terminal failure or cancellation.** GUARDRAILS §10.

**ADR-009 · locked · DLQ alert hysteresis (fire at 4→5 armed, re-arm below 5) via `app_flags`.**
GUARDRAILS §12.

**ADR-010 · locked · Timestamps UTC in storage/wire; Africa/Lagos for display only.** GUARDRAILS §11.

**ADR-011 · accepted · 2026-06-10 · SSE uses unnamed messages.**
The server emits only `id:` and `data:` fields because the client uses `EventSource.onmessage`;
the event type remains available in each JSON payload. This is reversible by restoring named
`event:` fields and registering matching client event listeners.

## Open decisions (decide, then promote to an ADR with rationale)

**OPEN-A · Nginx / prod topology.** Single backend container serving UI + API behind Nginx
(current build supports this), vs a separate static-frontend container. Decide before the deploy
dry-run (GUARDRAILS §13).

**OPEN-B · Test runner + scope.** Whether to add `vitest` and which tests. Minimum bar: the
concurrency claim test that proves duplicate protection (SPEC, STAGE9_BUILD_PACK §22).

**OPEN-C · Generic `POST /api/workflows` + topological-sort validation.** Today only the demo
endpoint exists. Decide whether to add generic creation with cycle/self/unknown-ref rejection
(Kahn's algorithm, STAGE9_BUILD_PACK §15) or rely on the demo endpoint for the DAG rubric row.
