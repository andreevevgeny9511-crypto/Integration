import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts";
import type { SyncStats } from "@/types";

const COLORS = ["#10b981", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6"];

interface SyncStatsProps {
  stats: SyncStats;
}

export const SyncStats: React.FC<SyncStatsProps> = ({ stats }) => {
  // Prepare chart data
  const chartData = stats.syncsByDay.length > 0
    ? stats.syncsByDay.slice(-7).map((d) => ({
        date: d.date.slice(5), // MM-DD
        count: d.count,
        success: d.success,
        failed: d.failed,
      }))
    : [
        { date: "Mon", count: 5, success: 4, failed: 1 },
        { date: "Tue", count: 8, success: 7, failed: 1 },
        { date: "Wed", count: 3, success: 3, failed: 0 },
        { date: "Thu", count: 12, success: 11, failed: 1 },
        { date: "Fri", count: 6, success: 6, failed: 0 },
        { date: "Sat", count: 2, success: 2, failed: 0 },
        { date: "Sun", count: 1, success: 1, failed: 0 },
      ];

  const entityData = stats.entitiesByType.length > 0
    ? stats.entitiesByType
    : [
        { type: "Lead", count: 45 },
        { type: "Deal", count: 32 },
        { type: "Contact", count: 28 },
        { type: "Company", count: 15 },
      ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Sync Volume Chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-white mb-4">
          Sync Volume (Last 7 Days)
        </h4>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
            />
            <Bar dataKey="success" fill="#10b981" name="Success" radius={[4, 4, 0, 0]} />
            <Bar dataKey="failed" fill="#ef4444" name="Failed" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Entity Distribution */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-white mb-4">
          Entities by Type
        </h4>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={entityData}
              cx="50%"
              cy="50%"
              outerRadius={80}
              dataKey="count"
              label={({ name, count }) => `${name}: ${count}`}
            >
              {entityData.map((entry, index) => (
                <Cell
                  key={entry.type}
                  fill={COLORS[index % COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Trend Line */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 md:col-span-2">
        <h4 className="text-sm font-semibold text-white mb-4">
          Success Rate Trend
        </h4>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
            <YAxis stroke="#9ca3af" fontSize={12} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#1f2937",
                border: "1px solid #374151",
                borderRadius: "8px",
              }}
            />
            <Line
              type="monotone"
              dataKey="success"
              stroke="#10b981"
              strokeWidth={2}
              name="Success"
              dot={{ fill: "#10b981" }}
            />
            <Line
              type="monotone"
              dataKey="failed"
              stroke="#ef4444"
              strokeWidth={2}
              name="Failed"
              dot={{ fill: "#ef4444" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
