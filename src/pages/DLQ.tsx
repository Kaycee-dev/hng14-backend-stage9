import { useEffect, useState } from "react";

export function DLQ() {
  const [items, setItems] = useState<any[]>([]);

  function fetchDLQ() {
    fetch("/api/dlq").then(r => r.json()).then(d => setItems(d.items || [])).catch(console.error);
  }

  useEffect(() => { fetchDLQ(); }, []);

  async function handleRetry(id: string) {
    try {
      await fetch(`/api/dlq/${id}/retry`, { method: "POST" });
      fetchDLQ();
    } catch (e) { console.error(e); }
  }

  return (
    <div className="min-w-0 p-4 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-light text-slate-200">Dead <span className="font-bold">Letter Queue</span></h1>
        <button onClick={fetchDLQ} className="min-h-11 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-900/20 transition-all hover:bg-indigo-500">Refresh</button>
      </div>

      <div className="space-y-4 lg:hidden">
        {items.map(item => (
          <article key={item.id} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm">
            <div className="min-w-0">
              <div className="break-all font-mono text-xs text-slate-500">{item.job_id}</div>
              <div className="mt-1 break-words font-medium text-slate-200">{item.type}</div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Retries</dt>
                <dd className="mt-1 text-slate-300">{item.retry_count}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-slate-500">Manual retries</dt>
                <dd className="mt-1 text-slate-300">{item.manual_retry_count}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs uppercase tracking-wide text-slate-500">Moved at</dt>
                <dd className="mt-1 break-words text-slate-300">{new Date(item.moved_at).toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}</dd>
              </div>
            </dl>
            <div className="mt-4 break-words whitespace-pre-wrap rounded-lg border border-rose-500/20 bg-rose-500/10 p-3 font-mono text-xs text-rose-400">
              {item.error_message}
            </div>
            <button onClick={() => handleRetry(item.job_id)} className="mt-4 min-h-11 w-full rounded-lg bg-indigo-600 px-3 py-2 text-white transition-colors hover:bg-indigo-500">
              Manual Retry
            </button>
          </article>
        ))}
        {items.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-8 text-center text-slate-500">No active items in the Dead Letter Queue.</div>
        )}
      </div>

      <div className="hidden max-w-full overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 shadow-sm lg:block">
        <table className="w-full min-w-[850px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-900/80 border-b border-slate-800 text-sm text-slate-400">
              <th className="p-4 font-medium">Job Info</th>
              <th className="p-4 font-medium">Error Details</th>
              <th className="p-4 font-medium">Moved At</th>
              <th className="p-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="text-sm">
            {items.map(item => (
              <tr key={item.id} className="border-b border-slate-800/50 hover:bg-slate-800/40 transition-colors">
                <td className="p-4">
                  <div className="mb-1 max-w-52 break-all font-mono text-xs text-slate-500">{item.job_id}</div>
                  <div className="break-words font-medium text-slate-200">{item.type}</div>
                  <div className="text-xs text-slate-500">Retries: {item.retry_count}</div>
                  <div className="text-xs text-slate-500">Manual Retries: {item.manual_retry_count}</div>
                </td>
                <td className="p-4">
                  <div className="max-w-md break-words whitespace-pre-wrap rounded-lg border border-rose-500/20 bg-rose-500/10 p-2 font-mono text-xs text-rose-400">{item.error_message}</div>
                </td>
                <td className="p-4 text-slate-300">
                  {new Date(item.moved_at).toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => handleRetry(item.job_id)} className="min-h-11 rounded bg-indigo-600 px-3 py-2 text-white transition-colors hover:bg-indigo-500">
                    Manual Retry
                  </button>
                </td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-slate-500">No active items in the Dead Letter Queue.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
