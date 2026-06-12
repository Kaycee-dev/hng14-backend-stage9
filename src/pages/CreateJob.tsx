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
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-light text-slate-200 mb-6">Create <span className="font-bold">New Job</span></h1>
      
      <div className="flex space-x-2 mb-8">
        <button className="px-3 py-1 bg-slate-800 text-slate-300 text-sm rounded border border-slate-700 hover:bg-slate-700 transition-colors" onClick={() => setForm({...form, type: 'send_email', payload: '{}', recurring_interval: ''})}>Create Email Job</button>
        <button className="px-3 py-1 bg-slate-800 text-rose-400 text-sm rounded border border-slate-700 hover:bg-slate-700 transition-colors" onClick={() => setForm({...form, type: 'send_email', payload: '{"fail": true}', recurring_interval: ''})}>Create Failing Job</button>
        <button className="px-3 py-1 bg-slate-800 text-indigo-400 text-sm rounded border border-slate-700 hover:bg-slate-700 transition-colors" onClick={() => {
            const d = new Date(Date.now() + 30_000);
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60_000)
              .toISOString().slice(0, 19);
            setForm({...form, scheduled_at: local})
        }}>Schedule +30s</button>
        <button className="px-3 py-1 bg-slate-800 text-emerald-400 text-sm rounded border border-slate-700 hover:bg-slate-700 transition-colors" onClick={() => setForm({...form, recurring_interval: 'every_1_minute'})}>Recurring 1m</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 bg-slate-900/50 p-6 rounded-2xl border border-slate-800 shadow-sm">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Job Type</label>
          <select value={form.type} onChange={e => setForm({...form, type: e.target.value})} className="w-full p-2 bg-[#0A0C10] border border-slate-700 rounded text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all">
            <option value="send_email">send_email</option>
            <option value="generate_report">generate_report</option>
            <option value="upload_file">upload_file</option>
            <option value="log_processing">log_processing</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Priority (1=High, 2=Med, 3=Low)</label>
          <input type="number" min="1" max="3" value={form.priority} onChange={e => setForm({...form, priority: parseInt(e.target.value, 10)})} className="w-full p-2 bg-[#0A0C10] border border-slate-700 rounded text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Payload (JSON)</label>
          <textarea value={form.payload} onChange={e => setForm({...form, payload: e.target.value})} rows={4} className="w-full p-2 bg-[#0A0C10] border border-slate-700 rounded text-slate-200 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Scheduled At (optional)</label>
            <input type="datetime-local" step="1" value={form.scheduled_at} onChange={e => setForm({...form, scheduled_at: e.target.value})} className="w-full p-2 bg-[#0A0C10] border border-slate-700 rounded text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all [color-scheme:dark]" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Recurring Interval</label>
            <select value={form.recurring_interval} onChange={e => setForm({...form, recurring_interval: e.target.value})} className="w-full p-2 bg-[#0A0C10] border border-slate-700 rounded text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all">
              <option value="">None</option>
              <option value="every_1_minute">every_1_minute</option>
              <option value="every_5_minutes">every_5_minutes</option>
              <option value="every_1_hour">every_1_hour</option>
            </select>
          </div>
        </div>

        <button type="submit" className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-lg shadow-indigo-900/20 transition-all">
          Deploy New Task
        </button>
      </form>
    </div>
  );
}
