import { createHash, randomUUID } from "node:crypto";
import { access, appendFile, copyFile, mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { DBClient } from "../../db";

const DATA_DIR = process.env.DATA_DIR || "/data";

export interface Step {
  name: string;
  run: (db: DBClient, job: any, resultSoFar: any) => Promise<any>;
}

export function generate_report(job: any): Step[] {
  let rows: string[][] = [];
  let csv = "";

  return [
    {
      name: "validate_rows",
      run: async () => {
        if (!job.id) {
          throw new Error("generate_report requires a job id");
        }

        rows = [
          ["job_id", String(job.id)],
          ["job_type", String(job.type)],
          ["payload", JSON.stringify(job.payload ?? {})]
        ];
      }
    },
    {
      name: "build_csv",
      run: async () => {
        const escapeCell = (value: string) => `"${value.replace(/"/g, "\"\"")}"`;
        csv = [
          "field,value",
          ...rows.map(row => row.map(escapeCell).join(","))
        ].join("\n") + "\n";
      }
    },
    {
      name: "write_file",
      run: async () => {
        const reportDir = path.join(DATA_DIR, "reports");
        const filePath = path.join(reportDir, `${job.id}.csv`);
        const tempPath = `${filePath}.tmp-${randomUUID()}`;
        const csvBytes = Buffer.from(csv, "utf8");
        await mkdir(reportDir, { recursive: true });

        try {
          await writeFile(tempPath, csvBytes);
          await rename(tempPath, filePath);
        } catch (error) {
          await rm(tempPath, { force: true });
          throw error;
        }

        return {
          file_path: filePath,
          checksum: createHash("sha256").update(csvBytes).digest("hex")
        };
      }
    }
  ];
}

export function upload_file(job: any): Step[] {
  return [
    {
      name: "read_file",
      run: async (db, j) => {
        const res = await db.query(`
          SELECT dep.result FROM job_dependencies d
          JOIN jobs dep ON dep.id = d.depends_on_job_id
          WHERE d.job_id = $1 AND dep.type = 'generate_report'`, [j.id]);
        
        let path = "unknown";
        if (res.rows.length > 0 && res.rows[0].result) {
          path = res.rows[0].result.file_path || path;
        }
        
        if (!path || path === "unknown") {
             // In case there is no dependency, try to read from payload
             if (j.payload && j.payload.file_path) {
                 path = j.payload.file_path;
             }
        }
        return { source_file: path };
      }
    },
    {
      name: "upload",
      run: async (db, j, resultSoFar) => {
        const sourceFile = resultSoFar.source_file;
        if (!sourceFile || sourceFile === "unknown") {
          throw new Error("upload_file requires an existing source file");
        }

        await access(sourceFile);
        const fileName = path.basename(sourceFile);
        const bucketDir = path.join(DATA_DIR, "mock-bucket");
        const destinationPath = path.join(bucketDir, fileName);
        const tempPath = `${destinationPath}.tmp-${randomUUID()}`;
        await mkdir(bucketDir, { recursive: true });

        try {
          await copyFile(sourceFile, tempPath);
          await rename(tempPath, destinationPath);
        } catch (error) {
          await rm(tempPath, { force: true });
          throw error;
        }

        return { url: `mock://bucket/${fileName}` };
      }
    }
  ];
}

export function send_email(job: any): Step[] {
  return [
    {
      name: "send",
      run: async (db, j) => {
        if (job.payload && job.payload.fail === true) {
          throw new Error("Intentional failure triggered by payload");
        }

        const messageId = `msg-${job.id}`;
        const outboxDir = path.join(DATA_DIR, "outbox");
        const outboxPath = path.join(outboxDir, "emails.jsonl");
        const sentDir = path.join(outboxDir, "sent");
        const markerPath = path.join(sentDir, `${messageId}.json`);
        await mkdir(sentDir, { recursive: true });

        const record = {
          message_id: messageId,
          job_id: job.id,
          payload: job.payload ?? {}
        };
        let wonDelivery = false;
        try {
          await writeFile(markerPath, JSON.stringify(record), { encoding: "utf8", flag: "wx" });
          wonDelivery = true;
        } catch (error: any) {
          if (error.code !== "EEXIST") {
            throw error;
          }
        }

        if (wonDelivery) {
          try {
            await appendFile(outboxPath, `${JSON.stringify(record)}\n`, "utf8");
          } catch (error) {
            await rm(markerPath, { force: true });
            throw error;
          }
        }

        return { message_id: messageId };
      }
    }
  ];
}

export function log_processing(job: any): Step[] {
  return [
    {
      name: "process",
      run: async () => {
        return {
          processed: true,
          payload_key_count: Object.keys(job.payload ?? {}).length
        };
      }
    }
  ];
}
