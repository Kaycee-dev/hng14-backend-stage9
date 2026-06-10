import { DBClient } from "../db";
import { logJobEvent } from "../worker/logger";

const INTERVALS: Record<string, number> = {
  every_1_minute: 60,
  every_5_minutes: 300,
  every_1_hour: 3600
};

export async function scheduleNextRun(db: DBClient, job: any, now: Date) {
  if (!job.recurring_interval) return null;
  const intervalSeconds = INTERVALS[job.recurring_interval];
  if (!intervalSeconds) return null;

  let nextTs = new Date(job.scheduled_at).getTime() + intervalSeconds * 1000;
  if (nextTs < now.getTime()) {
    nextTs = now.getTime(); // clamp to now, no backfill
  }

  const nextDate = new Date(nextTs);

  const res = await db.query(
    `INSERT INTO jobs (type, payload, priority, recurring_interval, scheduled_at, parent_job_id)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [job.type, job.payload ? JSON.stringify(job.payload) : '{}', job.priority, job.recurring_interval, nextDate, job.id]
  );
  
  const child = res.rows[0];
  await logJobEvent(db, child.id, "job.recurring_scheduled", "info", "Scheduled next run", { parent: job.id });
  return child;
}
