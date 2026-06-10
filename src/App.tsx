import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { Dashboard } from "./pages/Dashboard";
import { Jobs } from "./pages/Jobs";
import { CreateJob } from "./pages/CreateJob";
import { DLQ } from "./pages/DLQ";
import { WorkflowDemo } from "./pages/WorkflowDemo";

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex min-h-screen bg-[#0A0C10] text-slate-200 font-sans font-inter">
        <Sidebar />
        <main className="flex-1 overflow-x-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/create" element={<CreateJob />} />
            <Route path="/dlq" element={<DLQ />} />
            <Route path="/workflow" element={<WorkflowDemo />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
