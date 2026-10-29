import React from "react";
import { useApp } from "@/store/useStore";
import { Badge } from "@/components/common/Badge";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
}

const navItems: NavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "📊" },
  { id: "wizard", label: "Setup Wizard", icon: "🚀" },
  { id: "connections", label: "Connections", icon: "🔌" },
  { id: "mapping", label: "Field Mapping", icon: "🔀" },
  { id: "rules", label: "Sync Rules", icon: "⚙️" },
  { id: "logs", label: "Sync Logs", icon: "📋" },
];

export const Sidebar: React.FC = () => {
  const { state, dispatch } = useApp();
  const activeTab = state.activeTab;

  return (
    <>
      {/* Mobile overlay */}
      <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" id="sidebar-overlay" />

      {/* Sidebar */}
      <aside className="fixed left-0 top-16 bottom-0 w-64 bg-gray-950 border-r border-gray-800 z-50 transform -translate-x-full lg:translate-x-0 transition-transform duration-200 flex flex-col">
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                dispatch({ type: "SET_ACTIVE_TAB", payload: item.id });
                // Close mobile sidebar
                document.body.classList.remove("overflow-hidden");
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === item.id
                  ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                  : "text-gray-400 hover:text-gray-200 hover:bg-gray-800/50"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="bg-gray-900 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-2">Active Rules</p>
            <p className="text-2xl font-bold text-white">
              {state.syncRules.filter((r) => r.enabled).length}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              of {state.syncRules.length} total
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
