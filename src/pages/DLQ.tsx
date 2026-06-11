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
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-light text-slate-200">Dead <span className="font-bold">Letter Queue</span></h1>
        <button onClick={fetchDLQ} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold rounded-lg shadow-lg shadow-indigo-900/20 transition-all">Refresh</button>
      </div>

      <div className="bg-slate-900/50 shadow-sm border border-slate-800 rounded-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse">
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
                  <div className="font-mono text-xs text-slate-500 mb-1">{item.job_id}</div>
                  <div className="font-medium text-slate-200">{item.type}</div>
                  <div className="text-xs text-slate-500">Retries: {item.retry_count}</div>
                  <div className="text-xs text-slate-500">Manual Retries: {item.manual_retry_count}</div>
                </td>
                <td className="p-4">
                  <div className="text-rose-400 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20 font-mono text-xs whitespace-pre-wrap">{item.error_message}</div>
                </td>
                <td className="p-4 text-slate-300">
                  {new Date(item.moved_at).toLocaleString('en-GB', { timeZone: 'Africa/Lagos' })}
                </td>
                <td className="p-4 text-right">
                  <button onClick={() => handleRetry(item.job_id)} className="px-3 py-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-500 transition-colors">
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
