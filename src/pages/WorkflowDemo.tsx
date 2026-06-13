import { useState, useEffect } from "react";
import { useCoalescedRefresh, useJobEvents } from "../hooks/useJobEvents";

export function WorkflowDemo() {
  const [workflowId, setWorkflowId] = useState<string | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const event = useJobEvents();

  async function startDemo() {
    try {
      const res = await fetch("/api/workflows/report-email-demo", { method: "POST" });
      const data = await res.json();
      setWorkflowId(data.workflow_id);
      fetchJobs(data.workflow_id);
    } catch (e) {
      console.error(e);
    }
  }

  async function fetchJobs(id: string) {
    if (!id) return;
    try {
      // Small optimization: We fetch all jobs and filter on client side.
      // In production, we'd add 'workflow_id' to the GET /api/jobs signature.
      const res = await fetch("/api/jobs");
      const data = await res.json();
      const wJobs = data.items.filter((j: any) => j.workflow_id === id).reverse();
      
      // Fetch results for these to show data passing
      const detailed = await Promise.all(wJobs.map(async (j: any) => {
        const dRes = await fetch(`/api/jobs/${j.id}`);
        return await dRes.json();
      }));
      setJobs(detailed);
      
    } catch (e) { }
  }

  const scheduleEventRefresh = useCoalescedRefresh(() => {
    if (workflowId) return fetchJobs(workflowId);
  });

  useEffect(() => {
    if (event && workflowId) scheduleEventRefresh();
  }, [event, workflowId, scheduleEventRefresh]);

  return (
    <div className="p-8 max-w-4xl">
      <h1 className="text-2xl font-light text-slate-200 mb-6">DAG <span className="font-bold">Workflow Demo</span></h1>
      
      <div className="mb-8 p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
        <p className="text-slate-400 mb-4">
          This demo fires a sequence of three dependent jobs ensuring strict execution order:
        </p>
        <ol className="list-decimal pl-5 text-slate-300 space-y-2 mb-6 font-medium">
          <li><strong>Report Generation</strong> (Simulates SQL/data aggregation, saves to file)</li>
          <li><strong>Upload File</strong> (Reads file path from Step 1's result, uploads to bucket)</li>
          <li><strong>Send Email</strong> (Emails the uploaded URL to stakeholders)</li>
        </ol>
        <button onClick={startDemo} className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-900/20 transition-all">
          Launch Workflow Sequence
        </button>
      </div>

      {workflowId && (
        <div className="space-y-4">
          {jobs.map((job, idx) => (
            <div key={job.id} className="relative p-6 bg-slate-900/50 rounded-2xl border border-slate-800">
              {idx > 0 && <div className="absolute -top-4 left-8 w-px h-4 bg-slate-700" />}
              
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-slate-200">{job.type}</h3>
                  <div className="font-mono text-xs text-slate-500 mt-1">ID: {job.id}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase
                    ${job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 
                      job.status === 'processing' ? 'bg-amber-500/10 text-amber-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                  {job.status}
                </span>
              </div>
              
              {job.result && (
                <div className="mt-4 p-3 bg-[#0A0C10] rounded-xl border border-slate-800 font-mono text-xs">
                  <div className="font-semibold text-slate-500 mb-2 uppercase tracking-wider text-[10px]">Result JSON (Passed to next step):</div>
                  <pre className="text-slate-300">{JSON.stringify(job.result, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
