import { DBClient } from "../../db";

export interface Step {
  name: string;
  run: (db: DBClient, job: any, resultSoFar: any) => Promise<any>;
}

export function generate_report(job: any): Step[] {
  return [
    {
      name: "validate_rows",
      run: async () => { await new Promise(r => setTimeout(r, 100)); }
    },
    {
      name: "build_csv",
      run: async () => { await new Promise(r => setTimeout(r, 200)); }
    },
    {
      name: "write_file",
      run: async () => { 
        return { file_path: `/data/reports/\${job.id}.csv`, checksum: "abcdef123" };
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
      run: async (db, j, resInfo) => {
        await new Promise(r => setTimeout(r, 150));
        return { url: `mock://bucket/\${j.id}` };
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
        await new Promise(r => setTimeout(r, 100));
        return { message_id: `msg-\${job.id}` };
      }
    }
  ];
}

export function log_processing(job: any): Step[] {
  return [
    {
      name: "process",
      run: async () => { return { processed: true }; }
    }
  ];
}
