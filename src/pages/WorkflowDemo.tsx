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
    <div className="w-full min-w-0 max-w-4xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-light text-slate-200 mb-6">DAG <span className="font-bold">Workflow Demo</span></h1>
      
      <div className="mb-8 min-w-0 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6">
        <p className="mb-4 break-words text-slate-400">
          This demo fires a sequence of three dependent jobs ensuring strict execution order:
        </p>
        <ol className="mb-6 list-decimal space-y-2 pl-5 font-medium text-slate-300">
          <li><strong>Report Generation</strong> (Simulates SQL/data aggregation, saves to file)</li>
          <li><strong>Upload File</strong> (Reads file path from Step 1's result, uploads to bucket)</li>
          <li><strong>Send Email</strong> (Emails the uploaded URL to stakeholders)</li>
        </ol>
        <button onClick={startDemo} className="min-h-11 w-full rounded-lg bg-indigo-600 px-6 py-2 font-semibold text-white shadow-lg shadow-indigo-900/20 transition-all hover:bg-indigo-500 sm:w-auto">
          Launch Workflow Sequence
        </button>
      </div>

      {workflowId && (
        <div className="space-y-4">
          {jobs.map((job, idx) => (
            <div key={job.id} className="relative min-w-0 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 sm:p-6">
              {idx > 0 && <div className="absolute -top-4 left-8 w-px h-4 bg-slate-700" />}
              
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <h3 className="break-words text-lg font-bold text-slate-200">{job.type}</h3>
                  <div className="mt-1 break-all font-mono text-xs text-slate-500">ID: {job.id}</div>
                </div>
                <span className={`w-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold uppercase
                    ${job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 
                      job.status === 'processing' ? 'bg-amber-500/10 text-amber-400 animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                  {job.status}
                </span>
              </div>
              
              {job.result && (
                <div className="mt-4 min-w-0 max-w-full overflow-hidden rounded-xl border border-slate-800 bg-[#0A0C10] p-3 font-mono text-xs">
                  <div className="font-semibold text-slate-500 mb-2 uppercase tracking-wider text-[10px]">Result JSON (Passed to next step):</div>
                  <pre className="max-w-full overflow-x-auto whitespace-pre-wrap break-all text-slate-300">{JSON.stringify(job.result, null, 2)}</pre>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
