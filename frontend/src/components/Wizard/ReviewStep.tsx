import React from "react";
import { useApp } from "@/store/useStore";
import { Badge } from "@/components/common/Badge";

export const ReviewStep: React.FC = () => {
  const { state } = useApp();

  const allConnected =
    state.bitrix24Connection?.status === "connected" &&
    state.listokConnection?.status === "connected";

  return (
    <div className="space-y-6">
      <div className="text-center py-4">
        <div className="text-5xl mb-4">
          {allConnected ? "✅" : "⚠️"}
        </div>
        <h3 className="text-xl font-bold text-white mb-2">
          {allConnected ? "Ready to Sync!" : "Setup Incomplete"}
        </h3>
        <p className="text-gray-400">
          {allConnected
            ? "All connections are configured. Review your settings below."
            : "Please complete all connection steps before reviewing."}
        </p>
      </div>

      {/* Connections Summary */}
      <div className="grid md:grid-cols-2 gap-4">
        <div
          className={`rounded-xl p-5 border ${
            state.bitrix24Connection?.status === "connected"
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-gray-800 border-gray-700"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">🔗</span>
            <div>
              <h4 className="font-semibold text-white">Bitrix24</h4>
              <p className="text-xs text-gray-400">
                {state.bitrix24Connection?.domain || "Not configured"}
              </p>
            </div>
          </div>
          <Badge
            variant={
              state.bitrix24Connection?.status === "connected"
                ? "success"
                : "error"
            }
          >
            {state.bitrix24Connection?.status === "connected"
              ? "Connected"
              : "Not connected"}
          </Badge>
        </div>

        <div
          className={`rounded-xl p-5 border ${
            state.listokConnection?.status === "connected"
              ? "bg-emerald-500/5 border-emerald-500/20"
              : "bg-gray-800 border-gray-700"
          }`}
        >
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl">📋</span>
            <div>
              <h4 className="font-semibold text-white">Listok</h4>
              <p className="text-xs text-gray-400">
                {state.listokConnection?.baseUrl || "Not configured"}
              </p>
            </div>
          </div>
          <Badge
            variant={
              state.listokConnection?.status === "connected"
                ? "success"
                : "error"
            }
          >
            {state.listokConnection?.status === "connected"
              ? "Connected"
              : "Not connected"}
          </Badge>
        </div>
      </div>

      {/* Field Mappings Summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h4 className="font-semibold text-white mb-3">
          🔀 Field Mappings ({state.fieldMappings.length})
        </h4>
        {state.fieldMappings.length === 0 ? (
          <p className="text-gray-400 text-sm">No field mappings configured</p>
        ) : (
          <div className="space-y-2">
            {state.fieldMappings.slice(0, 5).map((mapping) => (
              <div
                key={mapping.id}
                className="flex items-center gap-3 text-sm"
              >
                <code className="text-bitrix-400 bg-bitrix-500/10 px-2 py-0.5 rounded">
                  {mapping.sourceField}
                </code>
                <span className="text-gray-500">→</span>
                <code className="text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded">
                  {mapping.targetField}
                </code>
                {mapping.transform && mapping.transform !== "none" && (
                  <Badge variant="info" size="sm">
                    {mapping.transform}
                  </Badge>
                )}
              </div>
            ))}
            {state.fieldMappings.length > 5 && (
              <p className="text-xs text-gray-500 mt-2">
                ...and {state.fieldMappings.length - 5} more mappings
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sync Rules Summary */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <h4 className="font-semibold text-white mb-3">
          ⚙️ Sync Rules ({state.syncRules.length})
        </h4>
        {state.syncRules.length === 0 ? (
          <p className="text-gray-400 text-sm">No sync rules configured</p>
        ) : (
          <div className="space-y-2">
            {state.syncRules.map((rule) => (
              <div
                key={rule.id}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <span className="text-white">{rule.name}</span>
                  <Badge variant="info" size="sm">
                    {rule.direction}
                  </Badge>
                </div>
                <Badge variant={rule.enabled ? "success" : "default"} size="sm">
                  {rule.enabled ? "Active" : "Inactive"}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
