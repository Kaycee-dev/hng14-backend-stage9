import { MinHeap } from "../src/worker/scheduler/heap";
import { TimingWheel } from "../src/worker/scheduler/timing_wheel";

function randomJob(priority: number, delayMs: number) {
  const now = Date.now();
  return {
    id: 'test_job_' + Math.floor(Math.random() * 1000000),
    priority,
    created_at: new Date(now),
    scheduled_at: new Date(now + delayMs)
  };
}

function runBenchmark(scenarioName: string, numJobs: number, priorityG: () => number, delayG: () => number) {
  const jobs = Array.from({length: numJobs}, () => randomJob(priorityG(), delayG()));

  // Min-Heap Test
  const heap = new MinHeap<any>((a, b) => {
    for (let i = 0; i < 4; i++) {
        if (a.sortKey[i] < b.sortKey[i]) return -1;
        if (a.sortKey[i] > b.sortKey[i]) return 1;
    }
    return 0;
  });

  const heapStart = Date.now();
  for (const j of jobs) {
    heap.push({ sortKey: [j.priority, j.scheduled_at.getTime(), j.created_at.getTime(), j.id], job_id: j.id });
  }
  while (heap.length > 0) {
    heap.pop();
  }
  const heapEnd = Date.now();
  const heapOps = Math.floor((numJobs * 2) / ((heapEnd - heapStart) / 1000) || 1);

  // Timing Wheel Test
  const wheel = new TimingWheel(60, 1);
  const wheelStart = Date.now();
  for (const j of jobs) {
    wheel.add(j, j.scheduled_at.getTime());
  }
  let poppedCount = 0;
  for (let i = 0; i < 60; i++) {
    poppedCount += wheel.advance().length;
  }
  const wheelEnd = Date.now();
  const wheelOps = Math.floor((numJobs + poppedCount) / ((wheelEnd - wheelStart) / 1000) || 1);

  console.log(\`\${scenarioName} (10k items) | Heap: \${heapOps} ops/sec | Wheel: \${wheelOps} ops/sec\`);
}

console.log("Running benchmarks...");
// Immediate (All due now)
runBenchmark("Immediate", 10000, () => 2, () => 0);
// Scheduled Spread (over 60s)
runBenchmark("Scheduled Spread", 10000, () => 2, () => Math.random() * 60000);
// Mixed Priority
runBenchmark("Mixed Priority", 10000, () => Math.floor(Math.random() * 3) + 1, () => Math.random() * 5000);
