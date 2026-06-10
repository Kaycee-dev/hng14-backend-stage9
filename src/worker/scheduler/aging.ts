import { MinHeap } from "./heap";

const AGING_THRESHOLD_SECONDS = 300; // one priority level per 5 min of *eligible* waiting

export function effectivePriority(basePriority: number, createdAt: Date, scheduledAt: Date, now: Date): number {
  const createdTs = createdAt.getTime();
  const scheduledTs = scheduledAt.getTime();
  const nowTs = now.getTime();

  // Age accrues from when the job became ELIGIBLE, not when it was created.
  const eligibleTs = Math.max(createdTs, scheduledTs);
  const ageMs = Math.max(0, nowTs - eligibleTs);
  const ageSeconds = ageMs / 1000;

  const priorityBoost = Math.floor(ageSeconds / AGING_THRESHOLD_SECONDS);
  return Math.max(1, basePriority - priorityBoost);
}

export interface HeapItem {
  sortKey: [number, number, number, string]; // [effective_priority, scheduled_at, created_at, job_id]
  job_id: string;
}

export function buildHeap(candidates: any[], now: Date): MinHeap<HeapItem> {
  const heap = new MinHeap<HeapItem>((a, b) => {
    for (let i = 0; i < 4; i++) {
      if (a.sortKey[i] < b.sortKey[i]) return -1;
      if (a.sortKey[i] > b.sortKey[i]) return 1;
    }
    return 0;
  });

  for (const j of candidates) {
    const createdAt = new Date(j.created_at);
    const scheduledAt = new Date(j.scheduled_at);
    const ep = effectivePriority(j.priority, createdAt, scheduledAt, now);
    
    heap.push({
      sortKey: [ep, scheduledAt.getTime(), createdAt.getTime(), j.id],
      job_id: j.id
    });
  }

  return heap;
}
