import { Outlet, NavLink, Link } from 'react-router-dom';
import { BarChart3, Database, FileSpreadsheet, Package, Settings, LayoutDashboard } from 'lucide-react';

export default function AdminLayout() {
  // Notice: No more isAdminAuth props, state, or PIN checks here!
  // AdminAuthGuard already proved the user is an admin before this component is even allowed to render.

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 font-sans overflow-hidden">

      {/* Sidebar Navigation */}
      <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col shadow-2xl z-10">
        <div className="p-6 border-b border-gray-800 bg-gray-900/50">
          <h2 className="text-xl font-black text-white flex items-center gap-3 tracking-tight">
            <LayoutDashboard className="text-blue-500" /> Admin Console
          </h2>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto scrollbar-none">
          <NavLink
            to="/admin/stats"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
          >
            <BarChart3 size={20} /> Analytics
          </NavLink>

          <NavLink
            to="/admin/import"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
          >
            <Database size={20} /> Import Wizard
          </NavLink>

          <NavLink
            to="/admin/export"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
          >
            <FileSpreadsheet size={20} /> Export Logs
          </NavLink>

          <NavLink
            to="/admin/resource"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
          >
            <Package size={20} /> Resources & P.O.
          </NavLink>

          <NavLink
            to="/admin/settings"
            className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold transition-all ${isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'}`}
          >
            <Settings size={20} /> Store Config
          </NavLink>
        </nav>

        {/* Bottom Action Area */}
        <div className="p-4 border-t border-gray-800 bg-gray-900/50">
          <Link
            to="/pos"
            className="flex justify-center items-center gap-2 w-full py-3.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold transition-all border border-gray-700 hover:border-gray-500"
          >
            ← Back to POS Terminal
          </Link>
        </div>
      </div>

      {/* Main Content Area (Where your pages inject) */}
      <div className="flex-1 overflow-y-auto bg-gray-950 p-8 relative">
        {/* Subtle background glow for the main content area */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-blue-900/5 blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </div>

    </div>
  );
}