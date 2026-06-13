import { useEffect, useState } from "react";
import { useCoalescedRefresh, useJobEvents } from "../hooks/useJobEvents";

export function Dashboard() {
  const [stats, setStats] = useState<any>({
    pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0, dlq: 0, active_workers: 1
  });
  const event = useJobEvents();

  function fetchStats() {
    return fetch("/api/dashboard").then(res => res.json()).then(setStats).catch(console.error);
  }

  const scheduleEventRefresh = useCoalescedRefresh(fetchStats);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (event) scheduleEventRefresh();
  }, [event, scheduleEventRefresh]);

  const cards = [
    { label: "Pending", value: stats.pending, indicator: "In Queue" },
    { label: "Processing", value: stats.processing, indicator: "Active" },
    { label: "Completed", value: stats.completed, indicator: "Done" },
    { label: "Failed", value: stats.failed, indicator: "Error" },
    { label: "Cancelled", value: stats.cancelled, indicator: "Stopped" },
    { label: "Dead Letter Queue", value: stats.dlq, indicator: "Terminal" },
    { label: "Active Workers", value: stats.active_workers, indicator: "Nodes" }
  ];

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <header className="flex min-h-20 items-center border-b border-slate-800 px-4 py-5 sm:px-6 lg:px-10">
        <div className="min-w-0">
          <h1 className="text-2xl font-light text-slate-200">System <span className="font-bold">Overview</span></h1>
          <p className="text-xs text-slate-500">Live Workspace Status</p>
        </div>
      </header>

      <div className="flex-1 space-y-5 p-4 sm:p-6 lg:p-10">
        {stats.dlq >= 5 && (
          <div className="break-words rounded-xl border border-l-4 border-red-500/50 bg-red-500/10 p-4 text-red-500">
            <strong>Alert: </strong> DLQ Threshold Reached! There are 5 or more failed jobs requiring manual intervention.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 xl:gap-6">
          {cards.map(c => (
            <div key={c.label} className="min-w-0 rounded-2xl border border-slate-800 bg-slate-900/50 p-5 sm:p-6">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{c.label}</p>
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold">{c.value}</span>
                <span className="text-indigo-400 text-xs">{c.indicator}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
