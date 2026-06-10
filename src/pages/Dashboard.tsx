import { useEffect, useState } from "react";
import { useJobEvents } from "../hooks/useJobEvents";

export function Dashboard() {
  const [stats, setStats] = useState<any>({
    pending: 0, processing: 0, completed: 0, failed: 0, cancelled: 0, dlq: 0, active_workers: 1
  });
  const event = useJobEvents();

  useEffect(() => {
    fetch("/api/dashboard").then(res => res.json()).then(setStats).catch(console.error);
  }, []);

  useEffect(() => {
    if (event) {
      // Re-fetch stats on any event to keep dashboard highly consistent
      fetch("/api/dashboard").then(res => res.json()).then(setStats).catch(console.error);
    }
  }, [event]);

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
    <div className="flex-1 flex flex-col">
      <header className="h-20 border-b border-slate-800 px-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-light text-slate-200">System <span className="font-bold">Overview</span></h1>
          <p className="text-xs text-slate-500">Live Workspace Status</p>
        </div>
      </header>

      <div className="p-10 flex-1 space-y-6">
        {stats.dlq >= 5 && (
          <div className="p-4 bg-red-500/10 border-l-4 border border-red-500/50 rounded-xl text-red-500">
            <strong>Alert: </strong> DLQ Threshold Reached! There are 5 or more failed jobs requiring manual intervention.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {cards.map(c => (
            <div key={c.label} className="bg-slate-900/50 border border-slate-800 p-6 rounded-2xl">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">{c.label}</p>
              <div className="flex items-baseline gap-2">
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
