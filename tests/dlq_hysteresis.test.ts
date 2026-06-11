import { Pool } from "pg";
import { expect, test } from "vitest";
import type { DBClient } from "../src/db";
import { initSchema } from "../src/schema";
import {
  countActiveDlq,
  getFlag,
  maybeAlertDlq,
  setFlag
} from "../src/worker/dlq";

const connectionString =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
const alertSubject = "DLQ threshold crossed";
const schemaLockId = 9_061_104;

async function initializeTestSchema(db: DBClient) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const existing = await db.query(
      "SELECT to_regclass('public.jobs') AS jobs"
    );
    if (existing.rows[0].jobs) {
      await initSchema(db);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }

  await db.query("SELECT pg_advisory_lock($1)", [schemaLockId]);
  try {
    await initSchema(db);
  } finally {
    await db.query("SELECT pg_advisory_unlock($1)", [schemaLockId]);
  }
}

if (!connectionString) {
  test.skip(
    "DLQ hysteresis skipped: set TEST_DATABASE_URL or DATABASE_URL",
    () => {}
  );
} else {
  test("alerts once at five active rows and re-arms below five", async () => {
    const pool = new Pool({ connectionString });
    const client = await pool.connect();
    const db: DBClient = client;
    const placeholderJobIds: string[] = [];

    const insertActiveDlqRow = async () => {
      const inserted = await db.query(
        `INSERT INTO jobs (type, payload, priority, scheduled_at, status)
         VALUES ('send_email', $1, 2, now(), 'failed')
         RETURNING id`,
        [JSON.stringify({ marker: "dlq-hysteresis-test" })]
      );
      const jobId = inserted.rows[0].id;
      placeholderJobIds.push(jobId);

      await db.query(
        `INSERT INTO dead_letter_queue
          (job_id, error_message, error_context, retry_count)
         VALUES ($1, 'test failure', '{}', 4)`,
        [jobId]
      );

      return jobId;
    };

    const countAlertJobs = async () => {
      const result = await db.query(
        `SELECT count(*) AS count
           FROM jobs
          WHERE type = 'send_email'
            AND payload->>'subject' = $1`,
        [alertSubject]
      );
      return Number(result.rows[0].count);
    };

    try {
      await initializeTestSchema(db);
      await db.query("DELETE FROM dead_letter_queue");
      await db.query(
        "DELETE FROM app_flags WHERE key = 'dlq_alert_armed'"
      );
      await db.query(
        `DELETE FROM jobs
          WHERE type = 'send_email'
            AND payload->>'subject' = $1`,
        [alertSubject]
      );
      await setFlag(db, "dlq_alert_armed", true);

      for (let index = 0; index < 4; index += 1) {
        await insertActiveDlqRow();
      }

      expect(await countActiveDlq(db)).toBe(4);
      await maybeAlertDlq(db);
      expect(await countAlertJobs()).toBe(0);
      expect(await getFlag(db, "dlq_alert_armed", false)).toBe(true);

      await insertActiveDlqRow();
      expect(await countActiveDlq(db)).toBe(5);
      await maybeAlertDlq(db);
      expect(await countAlertJobs()).toBe(1);
      expect(await getFlag(db, "dlq_alert_armed", true)).toBe(false);

      await insertActiveDlqRow();
      expect(await countActiveDlq(db)).toBe(6);
      await maybeAlertDlq(db);
      expect(await countAlertJobs()).toBe(1);
      expect(await getFlag(db, "dlq_alert_armed", true)).toBe(false);

      await db.query(
        `UPDATE dead_letter_queue
            SET resolved_at = now()
          WHERE job_id = ANY($1::uuid[])`,
        [placeholderJobIds.slice(0, 2)]
      );
      expect(await countActiveDlq(db)).toBe(4);
      await maybeAlertDlq(db);
      expect(await getFlag(db, "dlq_alert_armed", false)).toBe(true);
      expect(await countAlertJobs()).toBe(1);
    } finally {
      try {
        await db.query("DELETE FROM dead_letter_queue");
        await db.query(
          "DELETE FROM app_flags WHERE key = 'dlq_alert_armed'"
        );
        await db.query(
          `DELETE FROM jobs
            WHERE type = 'send_email'
              AND payload->>'subject' = $1`,
          [alertSubject]
        );
        if (placeholderJobIds.length > 0) {
          await db.query("DELETE FROM jobs WHERE id = ANY($1::uuid[])", [
            placeholderJobIds
          ]);
        }
      } finally {
        client.release();
        await pool.end();
      }
    }
  });
}
