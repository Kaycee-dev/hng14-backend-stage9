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
    <>
      <header className="border-b border-slate-800 bg-[#0D1117] lg:hidden">
        <div className="flex items-center gap-3 px-4 py-4 sm:px-6">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500">
            <div className="h-4 w-4 rounded-sm border-2 border-white"></div>
          </div>
          <span className="text-lg font-bold tracking-tight">Dilamme</span>
        </div>
        <nav aria-label="Primary navigation" className="grid grid-cols-3 gap-1 px-2 pb-3 sm:grid-cols-5 sm:px-4">
          {links.map(link => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-lg px-2 py-2 text-center text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-indigo-500/10 text-indigo-400"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="truncate">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </header>

      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-800 bg-[#0D1117] lg:flex">
        <div className="border-b border-slate-800 p-8">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
              <div className="h-4 w-4 rounded-sm border-2 border-white"></div>
            </div>
            <span className="font-bold text-xl tracking-tight">Dilamme</span>
          </div>
        </div>
        <nav aria-label="Primary navigation" className="flex-1 space-y-2 px-4 py-6">
          {links.map(link => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={isActive ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-md px-4 py-2 transition-colors ${
                  isActive
                    ? "bg-indigo-500/10 text-indigo-400"
                    : "text-slate-400 hover:bg-slate-800"
                }`}
              >
                <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">{link.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
