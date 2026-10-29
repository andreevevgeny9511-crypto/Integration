import React from "react";
import { useApp } from "@/store/useStore";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";

export const SyncStatus: React.FC = () => {
  const { state, dispatch } = useApp();
  const { dashboard } = state;

  const statusConfig = {
    idle: { color: "gray", label: "Idle", icon: "⏸️" },
    running: { color: "blue", label: "Running", icon: "▶️" },
    completed: { color: "emerald", label: "Completed", icon: "✅" },
    failed: { color: "red", label: "Failed", icon: "❌" },
    paused: { color: "amber", label: "Paused", icon: "⏸️" },
  };

  const config = statusConfig[dashboard.syncStatus];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="text-3xl">{config.icon}</span>
          <div>
            <h3 className="text-lg font-semibold text-white">
              Sync Status
            </h3>
            <p className="text-sm text-gray-400">
              Last sync:{" "}
              {dashboard.lastSyncAt
                ? new Date(dashboard.lastSyncAt).toLocaleString("ru-RU")
                : "Never"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={config.color as any}>{config.label}</Badge>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              dispatch({ type: "SET_DASHBOARD_STATUS", payload: "running" });
              // Simulate sync completion
              setTimeout(() => {
                dispatch({
                  type: "SET_DASHBOARD_STATUS",
                  payload: "completed",
                });
                dispatch.addLog({
                  ruleId: "system",
                  ruleName: "Manual Sync",
                  status: "success",
                  message: "Sync completed successfully",
                  entityType: "lead",
                  entityId: "system",
                });
              }, 2000);
            }}
          >
            ▶ Run Sync
          </Button>
        </div>
      </div>

      {/* Active rules indicator */}
      <div className="mt-4 pt-4 border-t border-gray-800 flex items-center gap-4">
        <span className="text-sm text-gray-400">Active Rules:</span>
        <span className="text-lg font-bold text-white">
          {state.syncRules.filter((r) => r.enabled).length}
        </span>
        <span className="text-sm text-gray-500">
          / {state.syncRules.length} total
        </span>
      </div>
    </div>
  );
};
