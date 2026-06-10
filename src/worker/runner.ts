import { DBClient } from "../db";
import { logJobEvent } from "./logger";
import { onFailure } from "./retry";
import { scheduleNextRun } from "../services/recurring_service";
import * as handlers from "./handlers/index";

export async function cancellationRequested(db: DBClient, jobId: string): Promise<boolean> {
  const res = await db.query(`SELECT cancellation_requested_at FROM jobs WHERE id=$1`, [jobId]);
  return res.rows.length > 0 && res.rows[0].cancellation_requested_at !== null;
}

export async function runJob(db: DBClient, job: any, workerId: string) {
  await logJobEvent(db, job.id, "job.started", "info", `Job processing started`, { worker_id: workerId });
  try {
    const handler = (handlers as any)[job.type];
    if (!handler) {
      throw new Error(`Unknown job type: ${job.type}`);
    }

    const steps = handler(job);
    let resultData = {};
    for (const step of steps) {
      if (await cancellationRequested(db, job.id)) {
        await db.query(
          `UPDATE jobs SET status='cancelled', cancelled_at=now(), locked_by=NULL, locked_until=NULL WHERE id=$1`,
          [job.id]
        );
        await logJobEvent(db, job.id, "job.cancelled", "warn", `cancelled before '${step.name}'`);
        return;
      }
      const stepRes = await step.run(db, job, resultData);
      if (stepRes) {
        resultData = { ...resultData, ...stepRes };
      }
    }

    if (await cancellationRequested(db, job.id)) {
      await db.query(
        `UPDATE jobs SET status='cancelled', cancelled_at=now(), locked_by=NULL, locked_until=NULL WHERE id=$1`,
        [job.id]
      );
      await logJobEvent(db, job.id, "job.cancelled", "warn", `cancelled before finalizing`);
      return;
    }

    await db.query(
       `UPDATE jobs SET status='completed', completed_at=now(), locked_by=NULL, locked_until=NULL, result=$1 WHERE id=$2`,
       [JSON.stringify(resultData), job.id]
    );
    await logJobEvent(db, job.id, "job.completed", "info", "Job completed successfully", { result: resultData });
    await scheduleNextRun(db, job, new Date());
  } catch (error) {
    await onFailure(db, job, error, new Date());
  }
}
