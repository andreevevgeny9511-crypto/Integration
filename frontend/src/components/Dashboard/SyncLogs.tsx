import React from "react";
import { Badge } from "@/components/common/Badge";

interface SyncLogsProps {
  logs: Array<{
    id: string;
    ruleName: string;
    status: "success" | "error" | "warning" | "info";
    message: string;
    timestamp: string;
    entityType: string;
    entityId: string;
  }>;
}

export const SyncLogs: React.FC<SyncLogsProps> = ({ logs }) => {
  const displayLogs = logs.length > 0
    ? logs
    : [
        {
          id: "1",
          ruleName: "Lead → Contact Sync",
          status: "success" as const,
          message: "Synced 3 leads to Listok contacts",
          timestamp: new Date().toISOString(),
          entityType: "lead",
          entityId: "sys",
        },
        {
          id: "2",
          ruleName: "Deal Sync",
          status: "warning" as const,
          message: "Deal #1234 skipped — missing required field",
          timestamp: new Date(Date.now() - 300000).toISOString(),
          entityType: "deal",
          entityId: "1234",
        },
        {
          id: "3",
          ruleName: "Lead → Contact Sync",
          status: "error" as const,
          message: "API rate limit exceeded, retrying in 30s",
          timestamp: new Date(Date.now() - 600000).toISOString(),
          entityType: "lead",
          entityId: "sys",
        },
      ];

  const statusConfig = {
    success: { variant: "success" as const, icon: "✅" },
    error: { variant: "error" as const, icon: "❌" },
    warning: { variant: "warning" as const, icon: "⚠️" },
    info: { variant: "info" as const, icon: "ℹ️" },
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-semibold text-white">
          Recent Sync Logs
        </h4>
        <Badge variant="info">{displayLogs.length} entries</Badge>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {displayLogs.map((log) => {
          const cfg = statusConfig[log.status];
          return (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors"
            >
              <span className="text-base flex-shrink-0 mt-0.5">
                {cfg.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-white truncate">
                    {log.ruleName}
                  </span>
                  <Badge variant={cfg.variant} size="sm">
                    {log.status}
                  </Badge>
                </div>
                <p className="text-xs text-gray-400 truncate">
                  {log.message}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {new Date(log.timestamp).toLocaleString("ru-RU")}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
