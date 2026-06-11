import { DBClient } from "./db";

export async function initSchema(db: DBClient) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS jobs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      type VARCHAR(50) NOT NULL,
      payload JSONB NOT NULL DEFAULT '{}',
      priority INTEGER NOT NULL DEFAULT 2,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL,
      recurring_interval VARCHAR(50),
      retry_count INTEGER NOT NULL DEFAULT 0,
      max_retries INTEGER NOT NULL DEFAULT 3,
      last_error TEXT,
      result JSONB,
      locked_by VARCHAR(100),
      locked_until TIMESTAMP WITH TIME ZONE,
      cancellation_requested_at TIMESTAMP WITH TIME ZONE,
      started_at TIMESTAMP WITH TIME ZONE,
      completed_at TIMESTAMP WITH TIME ZONE,
      failed_at TIMESTAMP WITH TIME ZONE,
      cancelled_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      parent_job_id UUID,
      workflow_id UUID
    );

    CREATE TABLE IF NOT EXISTS job_dependencies (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      depends_on_job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS job_logs (
      id SERIAL PRIMARY KEY,
      job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
      event_type VARCHAR(50) NOT NULL,
      level VARCHAR(20) NOT NULL DEFAULT 'info',
      message TEXT,
      context JSONB,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS dead_letter_queue (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      job_id UUID UNIQUE REFERENCES jobs(id) ON DELETE CASCADE,
      error_message TEXT,
      error_context JSONB,
      retry_count INTEGER,
      manual_retry_count INTEGER NOT NULL DEFAULT 0,
      moved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      resolved_at TIMESTAMP WITH TIME ZONE,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS app_flags (
      key VARCHAR(100) PRIMARY KEY,
      value JSONB
    );

    CREATE TABLE IF NOT EXISTS worker_heartbeat (
      worker_id VARCHAR(100) PRIMARY KEY,
      last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS ix_jobs_ready ON jobs (status, scheduled_at);
    CREATE INDEX IF NOT EXISTS ix_jobs_lease ON jobs (locked_until) WHERE status = 'processing';
    CREATE INDEX IF NOT EXISTS ix_jobdep_job ON job_dependencies (job_id);
    CREATE INDEX IF NOT EXISTS ix_jobdep_dependson ON job_dependencies (depends_on_job_id);
    CREATE INDEX IF NOT EXISTS ix_joblogs_stream ON job_logs (id);
    CREATE INDEX IF NOT EXISTS ix_joblogs_byjob ON job_logs (job_id, created_at);
  `);
}
