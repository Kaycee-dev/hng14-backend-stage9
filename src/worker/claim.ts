import { DBClient } from "../db";
import { logJobEvent } from "./logger";

export async function reapExpiredLeases(db: DBClient, now: Date) {
  const result = await db.query(
    `UPDATE jobs
        SET status='pending', locked_by=NULL, locked_until=NULL, updated_at=$1
      WHERE status='processing'
        AND locked_until IS NOT NULL
        AND locked_until < $1
     RETURNING id`,
    [now]
  );
  
  for (const row of result.rows) {
    await logJobEvent(db, row.id, "job.lease_recovered", "warn", "Recovered expired lease");
  }
  
  return result.rows;
}

export async function fetchDueAndReady(db: DBClient, now: Date, batchSize: number) {
  const result = await db.query(
    `SELECT j.* FROM jobs j
      WHERE j.status = 'pending'
        AND j.scheduled_at <= $1
        AND NOT EXISTS (
            SELECT 1 FROM job_dependencies d
              JOIN jobs dep ON dep.id = d.depends_on_job_id
             WHERE d.job_id = j.id AND dep.status <> 'completed')
      ORDER BY j.scheduled_at
      LIMIT $2`,
    [now, batchSize]
  );
  return result.rows;
}

export async function atomicClaim(db: DBClient, jobId: string, workerId: string, leaseSeconds: number, now: Date) {
  const leaseExpiry = new Date(now.getTime() + leaseSeconds * 1000);
  const result = await db.query(
    `UPDATE jobs
        SET status='processing', 
            locked_by=$1,
            locked_until = $2,
            started_at = COALESCE(started_at, $3), 
            updated_at = $3
      WHERE id = $4
        AND status = 'pending'
        AND scheduled_at <= $3
        AND (locked_until IS NULL OR locked_until < $3)
     RETURNING *`,
    [workerId, leaseExpiry, now, jobId]
  );
  
  return result.rows.length > 0 ? result.rows[0] : null;
}
