import { useEffect, useState } from "react";
import { useCoalescedRefresh, useJobEvents } from "../hooks/useJobEvents";

const AGING_THRESHOLD = 300 * 1000;

function calculateEffectivePriority(job: any) {
  if (job.status !== 'pending') return job.priority;
  const eligibleTs = Math.max(new Date(job.created_at).getTime(), new Date(job.scheduled_at).getTime());
  const ageMs = Math.max(0, Date.now() - eligibleTs);
  return Math.max(1, job.priority - Math.floor(ageMs / AGING_THRESHOLD));
}

export function Jobs() {
  const [jobs, setJobs] = useState<any[]>([]);
  const event = useJobEvents();

  function fetchJobs() {
    return fetch("/api/jobs").then(r => r.json()).then(d => setJobs(d.items || [])).catch(console.error);
  }

  const scheduleEventRefresh = useCoalescedRefresh(fetchJobs);

  useEffect(() => { fetchJobs(); }, []);
  useEffect(() => {
    if (event) scheduleEventRefresh();
  }, [event, scheduleEventRefresh]);

  async function handleCancel(id: string) {
    try {
      await fetch(`/api/jobs/${id}/cancel`, { method: "POST" });
      fetchJobs();
    } catch (e) { console.error(e); }
  }

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-light text-slate-200">All <span className="font-bold">Jobs</span></h1>
        <button onClick={fetchJobs} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-900/20 transition-all">Refresh</button>
      </div>

      <div className="bg-slate-900/50 shadow-sm border border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-sm text-slate-400">
              <th className="p-4 font-medium">ID / Type</th>
              <th className="p-4 font-medium">Priority (Eff)</th>
              <th className="p-4 font-medium">Status / Retries</th>
              <th className="p-4 font-medium">Scheduled / Interval</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {jobs.map(job => (
              <tr key={job.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                <td className="p-4">
                  <div className="font-mono text-xs text-slate-500 mb-1">{job.id.slice(0, 8)}...</div>
                  <div className="font-medium text-slate-200">{job.type}</div>
                </td>
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500">Base: {job.priority}</span>
                    <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded font-bold">Eff: {calculateEffectivePriority(job)}</span>
                  </div>
                </td>
                <td className="p-4">
                  <span className={`px-2 py-1 rounded inline-block mb-1 text-xs font-semibold uppercase tracking-wider
                    ${job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' : 
                      job.status === 'failed' ? 'bg-rose-500/10 text-rose-400' :
                      job.status === 'cancelled' ? 'bg-slate-700/50 text-slate-400' :
                      job.status === 'processing' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                    {job.status}
                  </span>
                  <div className="text-xs text-slate-500">Retries: {job.retry_count} / {job.max_retries}</div>
                </td>
                <td className="p-4">
                  <div className="text-slate-300">{new Date(job.scheduled_at).toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}</div>
                  {job.recurring_interval && <div className="text-xs text-indigo-400 font-medium">↻ {job.recurring_interval}</div>}
                </td>
                <td className="p-4 text-right">
                  {(job.status === 'pending' || job.status === 'processing') && (
                    <button onClick={() => handleCancel(job.id)} className="text-rose-400 hover:text-rose-300 font-medium">
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-slate-500">No jobs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
