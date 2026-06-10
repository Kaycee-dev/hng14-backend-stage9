import { Link, useLocation } from "react-router-dom";
import { LayoutDashboard, List, PlusSquare, AlertTriangle, Workflow } from "lucide-react";

export function Sidebar() {
  const location = useLocation();

  const links = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/jobs", icon: List, label: "Jobs" },
    { to: "/create", icon: PlusSquare, label: "Create Job" },
    { to: "/dlq", icon: AlertTriangle, label: "DLQ" },
    { to: "/workflow", icon: Workflow, label: "Workflow Demo" },
  ];

  return (
    <aside className="w-64 border-r border-slate-800 flex flex-col bg-[#0D1117]">
      <div className="p-8 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-white rounded-sm"></div>
          </div>
          <span className="font-bold text-xl tracking-tight">PRECISION</span>
        </div>
      </div>
      <nav className="flex-1 py-6 px-4 space-y-2">
        {links.map(link => {
          const isActive = location.pathname === link.to;
          return (
            <Link 
              key={link.to} 
              to={link.to}
              className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${isActive ? "bg-indigo-500/10 text-indigo-400" : "hover:bg-slate-800 text-slate-400"}`}
            >
              {isActive ? (
                <div className="flex items-center justify-center w-4 h-4">
                  <div className="w-2 h-2 rounded-full bg-indigo-400"></div>
                </div>
              ) : (
                <div className="flex items-center justify-center w-4 h-4">
                  <div className="w-2 h-2 rounded-full border border-slate-600"></div>
                </div>
              )}
              <span className="text-sm font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
