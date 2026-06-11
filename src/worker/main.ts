import { getDb } from "../db";
import { reapExpiredLeases, fetchDueAndReady, atomicClaim } from "./claim";
import { buildHeap } from "./scheduler/aging";
import { runJob } from "./runner";
import { logJobEvent } from "./logger";

export async function pollOnce(workerId: string, now: Date) {
  const db = await getDb();
  await db.query(
    `INSERT INTO worker_heartbeat (worker_id, last_seen) VALUES ($1, $2)
     ON CONFLICT (worker_id) DO UPDATE SET last_seen = $2`,
    [workerId, now]
  );
  await reapExpiredLeases(db, now);
  const candidates = await fetchDueAndReady(db, now, 100);
  const heap = buildHeap(candidates, now);
  
  while (heap.length > 0) {
    const item = heap.pop()!;
    const claimed = await atomicClaim(db, item.job_id, workerId, 60, new Date());
    if (!claimed) {
      await logJobEvent(db, item.job_id, "job.claim_skipped", "info", "Skipped claim", { worker_id: workerId });
      continue;
    }
    await logJobEvent(db, item.job_id, "job.claimed", "info", "Claimed job", { worker_id: workerId });
    await runJob(db, claimed, workerId);
  }
}

export async function runWorkerLoop(workerId: string, intervalSeconds: number) {
  console.log(`Starting worker loop for ${workerId} ...`);
  while (true) {
    try {
      await pollOnce(workerId, new Date());
    } catch (err) {
      console.error("Error in worker poll loop", err);
    }
    await new Promise(r => setTimeout(r, intervalSeconds * 1000));
  }
}
