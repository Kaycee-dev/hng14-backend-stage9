import { Pool } from "pg";
import { expect, test } from "vitest";
import type { DBClient } from "../src/db";
import { initSchema } from "../src/schema";
import { atomicClaim } from "../src/worker/claim";

const connectionString =
  process.env.TEST_DATABASE_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  test.skip(
    "claim contention skipped: set TEST_DATABASE_URL or DATABASE_URL",
    () => {}
  );
} else {
  test("four concurrent claims produce exactly one winner", async () => {
    const pool = new Pool({ connectionString });
    const db: DBClient = pool;
    let jobId: string | undefined;

    try {
      await initSchema(db);

      const inserted = await db.query(
        `INSERT INTO jobs (type, priority, payload, scheduled_at, status)
         VALUES ('send_email', 1, '{}', now(), 'pending')
         RETURNING id`
      );
      jobId = inserted.rows[0].id;

      const workerIds = Array.from({ length: 4 }, (_, index) => `w${index}`);
      const now = new Date();
      const results = await Promise.all(
        workerIds.map((workerId) =>
          atomicClaim(db, jobId!, workerId, 60, now)
        )
      );
      const winners = results.filter(
        (result): result is NonNullable<(typeof results)[number]> =>
          result !== null
      );

      expect(winners, "exactly one winner").toHaveLength(1);

      const winner = winners[0];
      expect(workerIds).toContain(winner.locked_by);

      const stored = await db.query(
        "SELECT status, locked_by FROM jobs WHERE id = $1",
        [jobId]
      );
      expect(stored.rows).toHaveLength(1);
      expect(stored.rows[0]).toEqual({
        status: "processing",
        locked_by: winner.locked_by
      });
    } finally {
      try {
        if (jobId) {
          await db.query("DELETE FROM job_logs WHERE job_id = $1", [jobId]);
          await db.query("DELETE FROM jobs WHERE id = $1", [jobId]);
        }
      } finally {
        await pool.end();
      }
    }
  });
}
