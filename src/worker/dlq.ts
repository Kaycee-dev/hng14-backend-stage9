import { DBClient, DBRow } from "../db";
import { logJobEvent } from "./logger";

export async function countActiveDlq(db: DBClient): Promise<number> {
  const res = await db.query(`SELECT count(*) as count FROM dead_letter_queue WHERE resolved_at IS NULL`);
  return parseInt(res.rows[0].count, 10);
}

export async function getFlag(db: DBClient, key: string, defaultVal: boolean): Promise<boolean> {
  const res = await db.query(`SELECT value FROM app_flags WHERE key=$1`, [key]);
  if (res.rows.length === 0) return defaultVal;
  return res.rows[0].value;
}

export async function setFlag(db: DBClient, key: string, value: boolean) {
  await db.query(`
    INSERT INTO app_flags (key, value) VALUES ($1, $2)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `, [key, JSON.stringify(value)]);
}

export async function maybeAlertDlq(db: DBClient) {
  const active = await countActiveDlq(db);
  const armed = await getFlag(db, "dlq_alert_armed", true);
  if (active >= 5 && armed) {
    await db.query(`
      INSERT INTO jobs (type, priority, payload, scheduled_at)
      VALUES ('send_email', 1, $1, now())
    `, [JSON.stringify({
      to: "engineer@example.com",
      subject: "DLQ threshold crossed",
      body: `Dead-letter queue has reached ${active} active jobs.`
    })]);
    await setFlag(db, "dlq_alert_armed", false);
  } else if (active < 5 && !armed) {
    await setFlag(db, "dlq_alert_armed", true);
  }
}

export async function moveToDlq(db: DBClient, job: DBRow, errStr: string, now: Date) {
  await db.query(
    `INSERT INTO dead_letter_queue (job_id, error_message, error_context, retry_count, moved_at)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (job_id) DO UPDATE SET 
      error_message = EXCLUDED.error_message,
      resolved_at = NULL,
      moved_at = EXCLUDED.moved_at`,
    [job.id, errStr, JSON.stringify(job), job.retry_count, now]
  );
  await logJobEvent(db, job.id, "job.failed_terminal", "error", "Job moved to DLQ");
  await maybeAlertDlq(db);
}
