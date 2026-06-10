# Cancellation Policy

## Definitions

1. **Pending/Scheduled phase**: For a job that has not yet started, a cancellation results in immediate transition from \`pending\` to \`cancelled\`. It never enters the evaluation heap.
2. **Processing phase**: When a job is actively running inside a worker, a hard system interrupt is **not possible** natively without destructive kill behaviors. Instead, we perform **Cooperative Cancellation**.
   - Event loop checkpoints verify the job's heartbeat in the database (\`cancellation_requested_at\`).
   - If a cancellation token is flagged, side-effect intensive segments abort safely.
   - Operations that act as critical single-fire commitments (such as emitting emails via SMTP) bypass interruption if they've already started to avoid partial deliveries.

## Retry Math
When a handler fails:
- \`retry_count\` defines the volume of post-failure executions recorded thus far.
- Total executions equal \`max_retries\` (defaulted 3) + initial attempt = 4 runs.
- Backoffs resolve to ~1, ~5, and ~25 seconds with a ±25% random jitter dynamically spread.
- Upon 4th consecutive fault, the job routes to the Dead Letter Queue (DLQ).

## Recurrence Rules
- **No overlapping timelines**: A succeeding schedule instance is evaluated post-completion of the prior run. Delay limits self-encroaching.
- **No backfill**: In scenarios where workers suffer extreme latency, catching up aligns sequentially relative to \`now\`, dropping obsolete inter-loop steps smoothly without explosive flooding.
- **Fail constraint**: Recurring cycles cease if DLQ limits are hit or if intentionally cancelled.
