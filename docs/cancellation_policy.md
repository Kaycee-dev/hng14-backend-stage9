# Cancellation Policy

## Definitions

1. **Pending/Scheduled phase**: Cancelling a job that has not started immediately changes its status from `pending` to `cancelled`. Cancelled rows are excluded from worker candidate queries, so the job never enters a worker's heap.
2. **Processing phase**: Cancellation is cooperative. The runner checks `cancellation_requested_at` before each handler step and again before writing the completed status. If cancellation has been requested, it stops running further steps, clears the lease, and marks the job `cancelled`.
   - The worker does not hard-kill a handler. A side effect that already finished cannot be safely undone, and interrupting it midway could leave partially applied work.
   - The handlers are mock integrations that perform real local I/O under `/data`: they write a report, copy it to a mock bucket, and append an email record to a local outbox. They do not send real SMTP email.
   - Delivery is at least once because an expired lease can cause a job to run again. Deterministic file paths, atomic replacement, and an exclusive email marker make repeated handler execution idempotent.

## Retry Math

When a handler fails:

- `retry_count` records failed executions.
- `max_retries = 3` allows three retries after the initial execution, for up to four executions in total.
- The three retry delays are approximately 1, 5, and 25 seconds, each with plus or minus 25 percent jitter.
- A fourth failure marks the job `failed` and moves it to the Dead Letter Queue (DLQ).

## Recurrence Rules

- **No overlap**: A successful recurring job creates its successor only after the current job is marked complete.
- **No backfill**: The next time is based on the previous `scheduled_at` plus the interval. If that time is already in the past, it is clamped to the current time instead of creating missed runs.
- **Stop on cancellation or terminal failure**: A cancelled or failed recurring job does not create a successor, so the recurrence chain ends.
