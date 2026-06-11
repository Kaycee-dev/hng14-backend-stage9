import { Pool } from "pg";
import { expect, test } from "vitest";
import type { DBClient } from "../src/db";
import { scheduleNextRun } from "../src/services/recurring_service";
import { initSchema } from "../src/schema";

const connectionString =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;
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
    "recurrence skipped: set TEST_DATABASE_URL or DATABASE_URL",
    () => {}
  );
} else {
  test("scheduleNextRun preserves cadence and clamps missed runs", async () => {
    const pool = new Pool({ connectionString });
    const client = await pool.connect();
    const db: DBClient = client;
    const jobIds: string[] = [];
    const now = new Date("2026-06-11T12:00:00.000Z");

    const insertParent = async (
      recurringInterval: string | null,
      scheduledAt: Date
    ) => {
      const inserted = await db.query(
        `INSERT INTO jobs
          (type, payload, priority, recurring_interval, scheduled_at)
         VALUES ('send_email', $1, 2, $2, $3)
         RETURNING *`,
        [
          JSON.stringify({ marker: "recurrence-test" }),
          recurringInterval,
          scheduledAt
        ]
      );
      const parent = inserted.rows[0];
      jobIds.push(parent.id);
      return parent;
    };

    try {
      await initializeTestSchema(db);

      const nonRecurring = await insertParent(null, now);
      const noChild = await scheduleNextRun(db, nonRecurring, now);
      const nonRecurringChildren = await db.query(
        "SELECT id FROM jobs WHERE parent_job_id = $1",
        [nonRecurring.id]
      );

      expect(noChild).toBeNull();
      expect(nonRecurringChildren.rows).toHaveLength(0);

      const previousScheduledAt = new Date(now.getTime() - 30_000);
      const recurring = await insertParent(
        "every_1_minute",
        previousScheduledAt
      );
      const child = await scheduleNextRun(db, recurring, now);

      expect(child).not.toBeNull();
      jobIds.push(child!.id);
      expect(child!.parent_job_id).toBe(recurring.id);
      expect(child!.recurring_interval).toBe("every_1_minute");
      expect(new Date(child!.scheduled_at).getTime()).toBe(
        previousScheduledAt.getTime() + 60_000
      );

      const storedChildren = await db.query(
        `SELECT parent_job_id, recurring_interval, scheduled_at
           FROM jobs
          WHERE parent_job_id = $1`,
        [recurring.id]
      );
      expect(storedChildren.rows).toHaveLength(1);
      expect(storedChildren.rows[0].parent_job_id).toBe(recurring.id);
      expect(storedChildren.rows[0].recurring_interval).toBe(
        "every_1_minute"
      );
      expect(
        new Date(storedChildren.rows[0].scheduled_at).getTime()
      ).toBe(previousScheduledAt.getTime() + 60_000);

      const farPastScheduledAt = new Date(
        now.getTime() - 2 * 60 * 60 * 1000
      );
      const overdue = await insertParent(
        "every_1_minute",
        farPastScheduledAt
      );
      const clampedChild = await scheduleNextRun(db, overdue, now);

      expect(clampedChild).not.toBeNull();
      jobIds.push(clampedChild!.id);
      expect(new Date(clampedChild!.scheduled_at).getTime()).toBe(
        now.getTime()
      );
      expect(new Date(clampedChild!.scheduled_at).getTime()).not.toBe(
        farPastScheduledAt.getTime() + 60_000
      );

      // Success-only firing is enforced by runner.ts calling this after completion.
      // That call-site behavior is outside this recurrence unit test.
    } finally {
      try {
        if (jobIds.length > 0) {
          await db.query(
            "DELETE FROM job_logs WHERE job_id = ANY($1::uuid[])",
            [jobIds]
          );
          await db.query("DELETE FROM jobs WHERE id = ANY($1::uuid[])", [
            jobIds
          ]);
        }
      } finally {
        client.release();
        await pool.end();
      }
    }
  });
}
