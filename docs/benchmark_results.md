# Scheduler Benchmark Results

This benchmark compares the `O(log n)` exact-ordering Min-Heap with the
`O(1)` slot insertion of a 60-slot, one-second Timing Wheel.

## Method

The command `npx tsx scripts/run_benchmarks.ts` was run three times on
2026-06-11 on an HP EliteBook 840 G8 development laptop with an 11th Gen
Intel Core i7-1185G7 CPU, Windows 11 Pro, and Node.js v22.20.0. The table
uses the second run, which was representative of the three.

This is an in-process micro-benchmark with 10,000 synthetic jobs per
scenario. It measures combined bulk insertion and extraction throughput:
the heap pushes and pops every job, while the wheel adds every job and
advances all 60 slots to collect due jobs. The short runtime and
millisecond timer resolution produce visible run-to-run variance, so these
figures are a directional comparison rather than a capacity forecast.

## Results

| Scenario | Min-Heap (ops/sec) | Timing Wheel (ops/sec) | Higher throughput |
|---|---:|---:|---|
| Immediate | 526,315 | 1,052,631 | Timing Wheel |
| Scheduled Spread | 689,655 | 800,000 | Timing Wheel |
| Mixed Priority | 2,000,000 | 344,827 | Min-Heap |

## Trade-offs

The production heap provides exact `O(log n)` ordering on the locked key
`[effective_priority, scheduled_at, created_at, job_id]`. It is rebuilt on
each worker poll because effective priority changes with time. At the
queue depths this system targets, that cost is modest, and the heap gives
the required priority and time ordering without a separate bucket-ordering
step.

The timing wheel inserts into a time slot in `O(1)`, which can help on
insert-heavy workloads and jobs spread across its scheduling horizon. That
speed comes with slot-granular time resolution. Jobs beyond one wheel
rotation require overflow bookkeeping on every rotation, and jobs sharing
a bucket still require a priority sort before they can be claimed in the
right order.

The algorithms are complementary, not interchangeable. The wheel's
throughput edge on the immediate and scheduled-spread shapes is paid for
in timing resolution, overflow handling, and within-bucket sorting; the
heap directly supplies exact ordering. We run the heap because exact
priority ordering is a product requirement and expected queue depth is
modest. The timing wheel remains the benchmarked alternative for workloads
where insertion volume matters more than exact scheduling resolution.

These numbers capture only the harness's in-process throughput for its
three synthetic shapes. They do not measure database access, concurrent
workers, claim contention, end-to-end latency, memory use, or the timing
wheel's operational cost from coarse resolution and far-future overflow.
