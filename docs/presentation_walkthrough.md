# Presentation Walkthrough

**"Explain your heap."**
Each worker builds a fresh binary min-heap on every poll from jobs that are pending, due, and dependency-ready. The key is `[effective_priority, scheduled_at, created_at, job_id]`, and the lowest tuple wins. Rebuilding matters because effective priority changes as eligible jobs wait, so a heap retained across polls would become stale.

**"How do two workers not grab the same job?"**
The heap chooses claim order, but PostgreSQL decides ownership. Each worker uses one conditional `UPDATE ... WHERE status='pending' ... RETURNING` statement. Concurrent workers may select the same candidate, but only the update that still sees `pending` returns the row. `FOR UPDATE SKIP LOCKED` could also coordinate workers, but it requires an explicit transaction around selection and update. The conditional update keeps the ownership transaction short, and no database row lock is held while the handler performs I/O. This prevents simultaneous ownership; lease recovery still makes delivery at least once, so handlers also use deterministic paths and idempotency guards to prevent duplicate side effects.

**"Worker crashes mid-job?"**
A claim sets `locked_by` and `locked_until`. If the worker exits, the lease eventually expires and the reaper changes the job from `processing` back to `pending`, clears ownership, and records a recovery event. Recovery does not increment `retry_count` because a crashed process did not report a handler failure. The job may therefore run again, which is why handler side effects must be idempotent.

**"Walk through starvation prevention."**
The effective priority is `max(1, base_priority - floor(age_seconds / 300))`. Age starts at `max(created_at, scheduled_at)`, the time the job became eligible, so a future-scheduled job cannot gain priority before it is due. Every five minutes of eligible waiting improves the numeric priority by one until it reaches 1.

**"Cancellation while processing?"**
Pending jobs move immediately to `cancelled`. For a processing job, the API sets `cancellation_requested_at`; the runner checks it before every handler step and before the completion write. If set, the runner stops, clears the lease, and marks the job cancelled. It does not hard-kill a step because a side effect may already have completed or could be left half-applied. The email handler is a local outbox mock, not real SMTP, and its exclusive marker prevents duplicate delivery records if at-least-once recovery runs it again.

**"Why timing wheel, and tradeoffs?"**
The alternative timing wheel has 60 one-second slots. In the recorded 10,000-job benchmark, it processed 1,052,631 operations per second versus 526,315 for the heap in the immediate scenario, and 800,000 versus 689,655 in the scheduled-spread scenario. The heap won the mixed-priority scenario at 2,000,000 operations per second versus 344,827. The wheel offers constant-time slot insertion, but timing is slot-granular, jobs beyond one rotation need overflow bookkeeping, and jobs in the same bucket still need priority sorting. The heap remains the default because it directly provides exact priority and timestamp ordering at the expected queue depth.

**"Retry math / off-by-one?"**
`max_retries = 3` means three retries in addition to the initial execution, so there can be four executions. Failures one, two, and three schedule another run after about 1, 5, and 25 seconds respectively, with plus or minus 25 percent jitter. If the fourth execution fails, the job is marked `failed` and moved to the DLQ. Treating `max_retries` as the total execution count would incorrectly skip the third retry.

**"DAG cycle handling?"**
Workflow creation runs Kahn's topological-sort algorithm before inserting jobs. It rejects duplicate aliases, unknown dependencies, self-dependencies, and cycles. At runtime, a pending job is eligible only when every predecessor is `completed`. If a predecessor fails or is cancelled, its dependents remain pending but blocked; they are not automatically cancelled or executed out of order.

**"What is the deployment topology?"**
Host Nginx terminates HTTPS for the DuckDNS hostname and proxies the UI, REST API, and SSE route to the backend container. `worker-1` and `worker-2` run as separate processes and coordinate through PostgreSQL. The backend and both workers mount the same `/data` volume so a workflow step can consume an artifact written by another worker.

**"How do live updates reach the dashboard?"**
Workers append lifecycle events to `job_logs`. The backend SSE endpoint polls for rows with increasing log IDs about once per second and sends them as unnamed `data:` messages. Clients can reconnect with an `after_id` cursor, and production Nginx disables buffering on the SSE route so updates are delivered promptly.
