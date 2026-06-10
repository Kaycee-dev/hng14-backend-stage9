import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import { initSchema } from "./schema";

export interface DBRow {
  [key: string]: any;
}

export interface DBClient {
  query(text: string, params?: any[]): Promise<{ rows: DBRow[] }>;
}

let pool: DBClient;

export async function getDb(): Promise<DBClient> {
  if (pool) return pool;

  if (process.env.DATABASE_URL) {
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  } else {
    console.log("Using PGLite for ephemeral local database.");
    const pglite = new PGlite();
    pool = {
      query: async (text: string, params?: any[]) => {
        return (await pglite.query(text, params)) as any;
      }
    };
  }
  
  await initSchema(pool);
  return pool;
}
