import React from "react";
import { useApp } from "@/store/useStore";
import { Badge } from "@/components/common/Badge";
import { SyncStats } from "./SyncStats";
import { SyncLogs } from "./SyncLogs";
import { SyncStatus } from "./SyncStatus";

export const DashboardHome: React.FC = () => {
  const { state } = useApp();
  const { dashboard } = state;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">
          Dashboard
        </h2>
        <p className="text-gray-400 text-sm">
          Monitor your Bitrix24 ↔ Listok sync status
        </p>
      </div>

      {/* Sync Status */}
      <SyncStatus />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Syncs"
          value={dashboard.stats.totalSyncs.toString()}
          icon="📊"
          color="text-white"
        />
        <StatCard
          label="Successful"
          value={dashboard.stats.successfulSyncs.toString()}
          icon="✅"
          color="text-emerald-400"
        />
        <StatCard
          label="Failed"
          value={dashboard.stats.failedSyncs.toString()}
          icon="❌"
          color="text-red-400"
        />
        <StatCard
          label="Entities Synced"
          value={dashboard.stats.entitiesSynced.toString()}
          icon="🔄"
          color="text-bitrix-400"
        />
      </div>

      {/* Charts */}
      <SyncStats stats={dashboard.stats} />

      {/* Recent Logs */}
      <SyncLogs logs={dashboard.logs} />
    </div>
  );
};

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: string;
  color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
      </div>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
