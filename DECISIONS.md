# DECISIONS.md — architectural decision log

Append-only. One ADR per decision. When you make an OPEN decision, move it up into a numbered
ADR with the date and rationale. Format: **status · date · decision · why**.

## Locked decisions (already embodied in the scaffold — do not silently change)

**ADR-001 · locked · Stack: TypeScript + Node + Express + `pg`.**
PGlite is a local-only fallback when `DATABASE_URL` is unset (ephemeral and single-process).
Chosen because the scaffold is already built on it; retargeting to Python now
would cost more than the deadline allows.

**ADR-002 · locked · Worker runtime: one codebase, run via `tsx`.**
Locally `server.ts` spawns `runWorkerLoop()` in-process for convenience; in `docker-compose.yml`
the workers are separate containers (`worker-1`, `worker-2`). The independent-workers requirement is
satisfied by the container topology, demonstrated via `docker compose up`.

**ADR-003 · locked · DB schema via idempotent `initSchema()` DDL on connect; no migration tool.**
Simpler for the timeline; `CREATE TABLE IF NOT EXISTS` is safe to run on every boot.

**ADR-004 · locked · Live updates: SSE by polling `job_logs` on an id cursor.**
Boring and unbreakable; decouples API from workers (they communicate only through the DB).
Postgres `LISTEN/NOTIFY` is a noted future upgrade, not required.

**ADR-005 · locked · Scheduler: real binary `MinHeap`.**
Key `[effective_priority, scheduled_at, created_at, job_id]`, lower wins; rebuilt each poll because
effective priority is time-dependent.

**ADR-006 · locked · Alternative algorithm: Timing wheel (60 slots, 1s tick) + overflow list +
within-bucket priority sort.** Benchmarked against the heap.

**ADR-007 · locked · Retry: up to 4 executions (retry_count = failures), backoff 1/5/25s ±25%
jitter, DLQ after the 4th failure.**

**ADR-008 · locked · Recurrence: next = scheduled_at + interval, clamp-to-now (no backfill),
success-only, stop on terminal failure or cancellation.**

**ADR-009 · locked · DLQ alert hysteresis (fire at 4→5 armed, re-arm below 5) via `app_flags`.**

**ADR-010 · locked · Timestamps UTC in storage/wire; Africa/Lagos for display only.**

**ADR-011 · accepted · 2026-06-10 · SSE uses unnamed messages.**
The server emits only `id:` and `data:` fields because the client uses `EventSource.onmessage`;
the event type remains available in each JSON payload. This is reversible by restoring named
`event:` fields and registering matching client event listeners.

**ADR-012 · accepted · 2026-06-10 · Handler artifacts use a configurable data directory.**
Handlers resolve artifact paths from `DATA_DIR`, defaulting to `/data` for the shared production
volume; local verification can set `DATA_DIR=./data` to avoid host-specific root paths. This is
reversible by changing the environment value or the default without changing handler contracts.

**ADR-013 · accepted · 2026-06-10 · Report checksums use SHA-256 over the exact CSV bytes.**
SHA-256 is available in Node's standard library and gives a deterministic integrity value for the
artifact passed through the workflow. This is reversible while no external consumer depends on
the checksum format.

**ADR-014 · accepted · 2026-06-10 · Handler side effects use exclusive-create delivery markers
and atomic file publication.** Email delivery is gated by a per-message marker created with
`O_CREAT|O_EXCL` (`"wx"`), while reports and uploads are written to unique same-directory
temporary files and renamed into place. This prevents duplicate outbox records and partial-file
visibility during lease-overlap re-runs; it is reversible by changing the handler I/O primitives
without changing their result contracts.

**ADR-015 · accepted · 2026-06-10 · PGlite uses `.exec()` for paramless SQL and `.query()` for
parameterized SQL.** This resolves OPEN-D: PGlite's simple protocol accepts the multi-statement
DDL used by `initSchema()`, while its extended protocol remains appropriate for single
parameterized statements. The adapter returns the final `.exec()` result's rows, or an empty
array, preserving the `DBClient.query` contract; this is reversible within the PGlite-only
connection branch.

**ADR-016 · accepted · 2026-06-10 · Vitest is the project test runner.**
Vitest fits the existing TypeScript and ESM toolchain, while the initial integration test uses
real PostgreSQL connections to exercise concurrent claims against one job. This is reversible
by replacing the package scripts, runner configuration, and test imports.

## Open decisions (decide, then promote to an ADR with rationale)

**OPEN-A · Nginx / prod topology.** Single backend container serving UI + API behind Nginx
(current build supports this), vs a separate static-frontend container. Decide before the deploy
dry-run.

**OPEN-C · Generic `POST /api/workflows` + topological-sort validation.** Today only the demo
endpoint exists. Decide whether to add generic creation with cycle/self/unknown-ref rejection
(Kahn's algorithm) or rely on the demo endpoint for the DAG workflow requirement.
