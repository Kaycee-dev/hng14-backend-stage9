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
    <div className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-light text-slate-200">All <span className="font-bold">Jobs</span></h1>
        <button onClick={fetchJobs} className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-all hover:bg-indigo-500">Refresh</button>
      </div>

      <div className="space-y-4 lg:hidden">
        {jobs.map(job => (
          <article key={job.id} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="break-all font-mono text-xs text-slate-500">{job.id}</div>
                <div className="mt-1 break-words font-medium text-slate-200">{job.type}</div>
              </div>
              <span className={`w-fit shrink-0 rounded px-2 py-1 text-xs font-semibold uppercase tracking-wider
                ${job.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                  job.status === 'failed' ? 'bg-rose-500/10 text-rose-400' :
                  job.status === 'cancelled' ? 'bg-slate-700/50 text-slate-400' :
                  job.status === 'processing' ? 'bg-amber-500/10 text-amber-400' : 'bg-indigo-500/10 text-indigo-400'}`}>
                {job.status}
              </span>
            </div>

            <dl className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Priority</dt>
                <dd className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="text-slate-400">Base: {job.priority}</span>
                  <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-bold text-indigo-400">Eff: {calculateEffectivePriority(job)}</span>
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Retries</dt>
                <dd className="mt-1 text-slate-300">{job.retry_count} / {job.max_retries}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Scheduled</dt>
                <dd className="mt-1 break-words text-slate-300">{new Date(job.scheduled_at).toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}</dd>
                {job.recurring_interval && <div className="mt-1 break-words text-xs font-medium text-indigo-400">↻ {job.recurring_interval}</div>}
              </div>
            </dl>

            {(job.status === 'pending' || job.status === 'processing') && (
              <button onClick={() => handleCancel(job.id)} className="mt-4 min-h-11 w-full rounded-lg border border-rose-500/30 px-4 py-2 font-medium text-rose-400 transition-colors hover:bg-rose-500/10 hover:text-rose-300">
                Cancel
              </button>
            )}
          </article>
        ))}
        {jobs.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-500">No jobs found.</div>
        )}
      </div>

      <div className="hidden max-w-full overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 shadow-sm lg:block">
        <table className="w-full min-w-[900px] border-collapse text-left">
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
                  <div className="mb-1 max-w-52 break-all font-mono text-xs text-slate-500">{job.id}</div>
                  <div className="break-words font-medium text-slate-200">{job.type}</div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
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
                    <button onClick={() => handleCancel(job.id)} className="min-h-11 rounded-lg px-3 py-2 font-medium text-rose-400 hover:bg-rose-500/10 hover:text-rose-300">
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
