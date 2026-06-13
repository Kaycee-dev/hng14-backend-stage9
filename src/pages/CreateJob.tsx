import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

export function CreateJob() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    type: "send_email",
    priority: 2,
    payload: "{}",
    scheduled_at: "",
    recurring_interval: ""
  });

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      const parsedPayload = JSON.parse(form.payload);
      const data = { ...form, payload: parsedPayload };
      if (data.scheduled_at) {
        data.scheduled_at = new Date(data.scheduled_at).toISOString();
      } else {
        delete data.scheduled_at;
      }
      if (!data.recurring_interval) delete data.recurring_interval;

      await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      navigate("/jobs");
    } catch (e) {
      alert("Error parsing payload or submitting job: " + e);
    }
  }

  return (
    <div className="w-full min-w-0 max-w-2xl p-4 sm:p-6 lg:p-8">
      <h1 className="text-2xl font-light text-slate-200 mb-6">Create <span className="font-bold">New Job</span></h1>
      
      <div className="mb-8 flex flex-wrap gap-2">
        <button className="min-h-11 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-300 transition-colors hover:bg-slate-700" onClick={() => setForm({...form, type: 'send_email', payload: '{}', recurring_interval: ''})}>Create Email Job</button>
        <button className="min-h-11 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-rose-400 transition-colors hover:bg-slate-700" onClick={() => setForm({...form, type: 'send_email', payload: '{"fail": true}', recurring_interval: ''})}>Create Failing Job</button>
        <button className="min-h-11 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-indigo-400 transition-colors hover:bg-slate-700" onClick={() => {
            const d = new Date(Date.now() + 30_000);
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
              .toISOString().slice(0, 19);
            setForm({...form, scheduled_at: local})
        }}>Schedule +30s</button>
        <button className="min-h-11 rounded border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-emerald-400 transition-colors hover:bg-slate-700" onClick={() => setForm({...form, recurring_interval: 'every_1_minute'})}>Recurring 1m</button>
      </div>

      <form onSubmit={handleSubmit} className="min-w-0 space-y-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-4 shadow-sm sm:p-6">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Job Type</label>
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="min-h-11 w-full min-w-0 rounded border border-slate-700 bg-[#0A0C10] p-2 text-slate-200 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500">
            <option value="send_email">send_email</option>
            <option value="generate_report">generate_report</option>
            <option value="upload_file">upload_file</option>
            <option value="log_processing">log_processing</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Priority (1=High, 2=Med, 3=Low)</label>
          <input type="number" min="1" max="3" value={form.priority} onChange={e => setForm({...form, priority: parseInt(e.target.value, 10)})} className="min-h-11 w-full min-w-0 rounded border border-slate-700 bg-[#0A0C10] p-2 text-slate-200 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Payload (JSON)</label>
          <textarea value={form.payload} onChange={e => setForm({...form, payload: e.target.value})} rows={4} className="w-full min-w-0 resize-y rounded border border-slate-700 bg-[#0A0C10] p-2 font-mono text-sm text-slate-200 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <label className="block text-sm font-medium text-slate-400 mb-1">Scheduled At (optional)</label>
            <input type="datetime-local" step="1" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} className="min-h-11 w-full min-w-0 max-w-full rounded border border-slate-700 bg-[#0A0C10] p-2 text-slate-200 outline-none transition-all [color-scheme:dark] focus:border-transparent focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="min-w-0">
            <label className="block text-sm font-medium text-slate-400 mb-1">Recurring Interval</label>
            <select value={form.recurring_interval} onChange={e => setForm({...form, recurring_interval: e.target.value})} className="min-h-11 w-full min-w-0 rounded border border-slate-700 bg-[#0A0C10] p-2 text-slate-200 outline-none transition-all focus:border-transparent focus:ring-2 focus:ring-indigo-500">
              <option value="">None</option>
              <option value="every_1_minute">every_1_minute</option>
              <option value="every_5_minutes">every_5_minutes</option>
              <option value="every_1_hour">every_1_hour</option>
            </select>
          </div>
        </div>

        <button type="submit" className="min-h-11 w-full rounded-lg bg-indigo-600 py-2 font-semibold text-white shadow-lg shadow-indigo-900/20 transition-all hover:bg-indigo-500">
          Deploy New Task
        </button>
      </form>
    </div>
  );
}
