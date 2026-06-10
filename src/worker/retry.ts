import { DBClient } from "../db";
import { logJobEvent } from "./logger";
import { moveToDlq } from "./dlq";

const BACKOFF: Record<number, number> = { 1: 1.0, 2: 5.0, 3: 25.0 };

export function nextBackoffSeconds(retryCount: number): number {
  const base = BACKOFF[retryCount] || 25.0;
  const jitter = (Math.random() - 0.5) * 0.5 * base;
  return Math.max(1.0, base + jitter);
}

export async function onFailure(db: DBClient, job: any, error: any, now: Date) {
  const errStr = error instanceof Error ? error.message : String(error);
  if (job.retry_count < job.max_retries) {
    const nextRetry = job.retry_count + 1;
    const delay = nextBackoffSeconds(nextRetry);
    const scheduledAt = new Date(now.getTime() + delay * 1000);
    
    await db.query(
      `UPDATE jobs
        SET status='pending', last_error=$1, scheduled_at=$2, 
            locked_by=NULL, locked_until=NULL, retry_count=$3, updated_at=$4
       WHERE id=$5`,
      [errStr, scheduledAt, nextRetry, now, job.id]
    );
    await logJobEvent(db, job.id, "job.retry_scheduled", "warn", errStr, { retry_count: nextRetry, delay_s: Math.round(delay * 100) / 100 });
  } else {
    await db.query(
      `UPDATE jobs
        SET status='failed', last_error=$1, failed_at=$2,
            locked_by=NULL, locked_until=NULL, updated_at=$2
       WHERE id=$3`,
      [errStr, now, job.id]
    );
    await moveToDlq(db, job, errStr, now);
  }
}
