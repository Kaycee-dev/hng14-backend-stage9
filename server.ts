import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { getDb } from "./src/db";
import {
  validateWorkflow,
  type WfJob
} from "./src/services/dag_validation";
import cors from "cors";

// Keep zero-setup development convenient while production uses separate workers.
import { runWorkerLoop } from "./src/worker/main";
if (process.env.NODE_ENV !== "production") {
  runWorkerLoop(process.env.WORKER_ID || "worker-local", 1);
}


async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Wait for the DB to be ready
  await getDb();

  // API Routes
  app.get("/api/dashboard", async (req, res) => {
    const db = await getDb();
    try {
      const counts = await db.query(`
        SELECT status, count(*) as c FROM jobs GROUP BY status
      `);
      const dlqCount = await db.query(`SELECT count(*) as c FROM dead_letter_queue WHERE resolved_at IS NULL`);
      const activeWorkerCount = await db.query(`
        SELECT count(*)::int AS c FROM worker_heartbeat
        WHERE last_seen > now() - interval '30 seconds'
      `);
      
      const stats = { pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0, dlq: 0, active_workers: 0 };
      counts.rows.forEach(r => {
        (stats as any)[r.status] = parseInt(r.c, 10);
      });
      stats.dlq = parseInt(dlqCount.rows[0].c, 10);
      stats.active_workers = Number(activeWorkerCount.rows[0].c);
      
      res.json(stats);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/jobs", async (req, res) => {
    const db = await getDb();
    const { type, priority, payload, scheduled_at, recurring_interval, parent_job_id } = req.body;
    try {
      const sched = scheduled_at ? new Date(scheduled_at) : new Date();
      const p = priority || 2;
      const pl = payload ? JSON.stringify(payload) : '{}';

      const result = await db.query(
        `INSERT INTO jobs (type, priority, payload, scheduled_at, recurring_interval, parent_job_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [type, p, pl, sched, recurring_interval, parent_job_id]
      );
      
      await db.query(
        `INSERT INTO job_logs (job_id, event_type, level, message) VALUES ($1, $2, $3, $4)`,
        [result.rows[0].id, 'job.created', 'info', 'Job created manually']
      );

      res.status(201).json(result.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/jobs", async (req, res) => {
    const db = await getDb();
    try {
      const result = await db.query(`SELECT * FROM jobs ORDER BY created_at DESC LIMIT 100`);
      res.json({ items: result.rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/jobs/:id/cancel", async (req, res) => {
    const db = await getDb();
    const { id } = req.params;
    try {
      const jobRes = await db.query(`SELECT status FROM jobs WHERE id=$1`, [id]);
      if (jobRes.rows.length === 0) return res.status(404).json({ error: "Not found" });
      
      const status = jobRes.rows[0].status;
      if (status === 'pending') {
        const result = await db.query(
          `UPDATE jobs SET status='cancelled', cancelled_at=now() WHERE id=$1 RETURNING *`, [id]
        );
        await db.query(`INSERT INTO job_logs (job_id, event_type, message) VALUES ($1, 'job.cancelled', 'Cancelled while pending')`, [id]);
        res.json(result.rows[0]);
      } else if (status === 'processing') {
        const result = await db.query(
          `UPDATE jobs SET cancellation_requested_at=now() WHERE id=$1 RETURNING *`, [id]
        );
        res.json(result.rows[0]);
      } else {
        res.status(400).json({ error: "Cannot cancel a finished job" });
      }
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/dlq", async (req, res) => {
    const db = await getDb();
    try {
      const result = await db.query(`
        SELECT d.*, j.type, j.priority 
        FROM dead_letter_queue d 
        JOIN jobs j ON j.id = d.job_id
        WHERE d.resolved_at IS NULL ORDER BY d.moved_at DESC
      `);
      res.json({ items: result.rows });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/dlq/:id/retry", async (req, res) => {
    const db = await getDb();
    const { id } = req.params;
    try {
      await db.query(`UPDATE dead_letter_queue SET resolved_at=now(), manual_retry_count=manual_retry_count+1 WHERE job_id=$1`, [id]);
      const jobRes = await db.query(
        `UPDATE jobs SET status='pending', retry_count=0, last_error=NULL, scheduled_at=now(), locked_by=NULL, locked_until=NULL WHERE id=$1 RETURNING *`, [id]
      );
      await db.query(`INSERT INTO job_logs (job_id, event_type, message) VALUES ($1, 'job.dlq_retry_requested', 'Manual retry from DLQ')`, [id]);
      res.json(jobRes.rows[0]);
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get("/api/jobs/:id", async (req, res) => {
    const db = await getDb();
    const { id } = req.params;
    try {
      const jobRes = await db.query(`SELECT * FROM jobs WHERE id=$1`, [id]);
      if (jobRes.rows.length === 0) return res.status(404).json({ error: "Not found" });
      const job = jobRes.rows[0];
      
      const logsRes = await db.query(`SELECT * FROM job_logs WHERE job_id=$1 ORDER BY created_at ASC`, [id]);
      const depsRes = await db.query(`SELECT depends_on_job_id FROM job_dependencies WHERE job_id=$1`, [id]);
      
      res.json({ ...job, logs: logsRes.rows, dependencies: depsRes.rows.map(r => r.depends_on_job_id) });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/workflows", async (req, res) => {
    const jobs = req.body?.jobs as WfJob[];
    const validation = validateWorkflow(jobs);
    if (validation.ok === false) {
      return res.status(400).json({ error: validation.error });
    }

    try {
      const db = await getDb();
      const wfId = '00000000-0000-0000-0000-000000000000'.replace(/0/g, () => (Math.random()*16|0).toString(16));
      const jobsByClientId = new Map(
        jobs.map((job) => [job.client_id, job])
      );
      const idsByClientId = new Map<string, string>();

      for (const clientId of validation.order) {
        const job = jobsByClientId.get(clientId)!;
        const scheduledAt = job.scheduled_at
          ? new Date(job.scheduled_at)
          : new Date();
        const priority = job.priority || 2;
        const payload = job.payload ? JSON.stringify(job.payload) : '{}';
        const result = await db.query(
          `INSERT INTO jobs (type, priority, payload, scheduled_at, recurring_interval, workflow_id)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [
            job.type,
            priority,
            payload,
            scheduledAt,
            job.recurring_interval,
            wfId
          ]
        );
        idsByClientId.set(clientId, result.rows[0].id);
      }

      for (const job of jobs) {
        for (const dependency of job.depends_on ?? []) {
          await db.query(
            `INSERT INTO job_dependencies (job_id, depends_on_job_id)
             VALUES ($1, $2)`,
            [
              idsByClientId.get(job.client_id),
              idsByClientId.get(dependency)
            ]
          );
        }
      }

      res.status(201).json({
        workflow_id: wfId,
        jobs: jobs.map((job) => ({
          client_id: job.client_id,
          id: idsByClientId.get(job.client_id)
        }))
      });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.post("/api/workflows/report-email-demo", async (req, res) => {
    const db = await getDb();
    try {
      const wfId = '00000000-0000-0000-0000-000000000000'.replace(/0/g, () => (Math.random()*16|0).toString(16));
      
      // 1. Report
      const repRes = await db.query(
        `INSERT INTO jobs (type, payload, scheduled_at, workflow_id) VALUES ('generate_report', '{}', now(), $1) RETURNING id`, [wfId]
      );
      const repId = repRes.rows[0].id;
      
      // 2. Upload
      const upRes = await db.query(
        `INSERT INTO jobs (type, payload, scheduled_at, workflow_id) VALUES ('upload_file', '{}', now(), $1) RETURNING id`, [wfId]
      );
      const upId = upRes.rows[0].id;
      await db.query(`INSERT INTO job_dependencies (job_id, depends_on_job_id) VALUES ($1, $2)`, [upId, repId]);
      
      // 3. Email
      const emRes = await db.query(
        `INSERT INTO jobs (type, payload, scheduled_at, workflow_id) VALUES ('send_email', '{}', now(), $1) RETURNING id`, [wfId]
      );
      const emId = emRes.rows[0].id;
      await db.query(`INSERT INTO job_dependencies (job_id, depends_on_job_id) VALUES ($1, $2)`, [emId, upId]);

      res.status(201).json({ workflow_id: wfId, jobs: [repId, upId, emId] });
    } catch (e: any) { res.status(500).json({ error: e.message }); }
  });

  app.get('/api/events/jobs', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    
    let last = parseInt(req.query.after_id as string) || 0;
    
    const interval = setInterval(async () => {
      try {
        const db = await getDb();
        const result = await db.query(
          `SELECT id, job_id, event_type, message, created_at, context 
           FROM job_logs WHERE id > $1 ORDER BY id ASC LIMIT 200`,
          [last]
        );
        
        for (const row of result.rows) {
          last = row.id;
          const payload = JSON.stringify(row);
          res.write(`id: ${row.id}
data: ${payload}

`);
        }
      } catch (e: any) { 
        console.error("SSE Poll Error", e.message); 
      }
    }, 1000);
    
    req.on('close', () => { clearInterval(interval); });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
