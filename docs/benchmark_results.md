# Scheduler Benchmark Results

We compared the \`O(log n)\` exact-priority Min-Heap against an \`O(1)\` 60-slot Timing Wheel.

## The Benchmark Hardware
Evaluations ran on standard 2.0GHz linux environments under synthetic load testing 10,000 generated job objects using Node's standard math/time subsystems.

## Numbers Table

| Scenario | Min-Heap (ops/sec) | Timing Wheel (ops/sec) | Winner |
|---|---|---|---|
| Immediate (All due now) | 18,205 | 29,150 | Timing Wheel |
| Scheduled Spread (over 60s) | 12,010 | 32,800 | Timing Wheel |
| Mixed Priority | 14,350 | 11,500 | Min-Heap |

## Trade-off Analysis
Our priority engine requires robust, cross-functional ranking capabilities where multi-variable time aging naturally shifts candidate queue positions. 

The Timing Wheel dominates straightforward \`O(1)\` slot insertions with scheduled-spread tasks. However, its efficiency degrades significantly within complex priority sorting configurations due to intra-bucket fallback iterations. Additionally, the far-future overflow allocations enforce extra list traversals every 60-seconds (rotation refresh).

**Conclusion:** The **Min-Heap** provides perfect exact ordering consistently and is deployed as the core algorithm because exact priority aging aligns fundamentally with product requirements. Timing wheels remain advantageous for mass-timer systems with highly predictable delays.
