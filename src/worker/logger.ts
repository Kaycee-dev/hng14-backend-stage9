import { DBClient } from "../db";

export async function logJobEvent(
  db: DBClient, 
  jobId: string | null, 
  eventType: string, 
  level = 'info', 
  message = '', 
  context: any = {}
) {
  const payload = {
    timestamp: new Date().toISOString(),
    level,
    event: eventType,
    job_id: jobId,
    message,
    ...context
  };
  
  console.log(JSON.stringify(payload));
  
  await db.query(
    `INSERT INTO job_logs (job_id, event_type, level, message, context)
     VALUES ($1, $2, $3, $4, $5)`,
    [jobId, eventType, level, message, JSON.stringify(context)]
  );
}
