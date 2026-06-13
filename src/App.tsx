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
      <div className="flex min-h-screen flex-col bg-[#0A0C10] font-sans font-inter text-slate-200 lg:flex-row">
        <Sidebar />
        <main className="min-w-0 w-full flex-1">
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
