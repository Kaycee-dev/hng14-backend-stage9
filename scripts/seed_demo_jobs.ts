import { getDb } from "../src/db";

async function seed() {
  const db = await getDb();
  await db.query(
    `INSERT INTO jobs (type, priority, payload, scheduled_at)
     VALUES ('log_processing', 2, '{}', now())`
  );
  await db.query(
    `INSERT INTO jobs (type, priority, payload, scheduled_at)
     VALUES ('generate_report', 1, '{"client": "Demo"}', now() - interval '10 minutes')`
  );
  console.log("Database seeded successfully.");
}

seed().catch(console.error);
