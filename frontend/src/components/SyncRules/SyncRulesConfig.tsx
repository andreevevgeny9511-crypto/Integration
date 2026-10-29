import React, { useState } from "react";
import { useApp } from "@/store/useStore";
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { Select } from "@/components/common/Select";
import { Badge } from "@/components/common/Badge";
import { v4 as uuidv4 } from "uuid";
import type { SyncRule, SyncCondition, SyncDirection, EntityType, ListokEntityType } from "@/types";

const DIRECTION_OPTIONS = [
  { value: "bitrix24_to_listok", label: "Bitrix24 → Listok" },
  { value: "listok_to_bitrix24", label: "Listok → Bitrix24" },
  { value: "bidirectional", label: "Bidirectional" },
];

const SOURCE_ENTITY_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "contact", label: "Contact" },
  { value: "company", label: "Company" },
];

const TARGET_ENTITY_OPTIONS = [
  { value: "contact", label: "Contact" },
  { value: "group", label: "Group" },
  { value: "pass", label: "Pass" },
  { value: "payment", label: "Payment" },
];

const SCHEDULE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "hourly", label: "Every Hour" },
  { value: "every_6h", label: "Every 6 Hours" },
  { value: "every_12h", label: "Every 12 Hours" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
];

const CONDITION_OPERATORS = [
  { value: "equals", label: "Equals" },
  { value: "not_equals", label: "Not Equals" },
  { value: "greater_than", label: "Greater Than" },
  { value: "less_than", label: "Less Than" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Not Contains" },
  { value: "is_empty", label: "Is Empty" },
  { value: "is_not_empty", label: "Is Not Empty" },
];

const ENTITY_TYPE_OPTIONS: { value: EntityType; label: string }[] = [
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "contact", label: "Contact" },
  { value: "company", label: "Company" },
];

export const SyncRulesConfig: React.FC = () => {
  const { state, dispatch } = useApp();
  const [editingRule, setEditingRule] = useState<string | null>(null);

  const handleAddRule = () => {
    const newRule: SyncRule = {
      id: uuidv4(),
      name: "New Sync Rule",
      description: "",
      sourceEntity: "lead",
      targetEntity: "contact",
      direction: "bitrix24_to_listok",
      conditions: [],
      fieldMappings: [],
      schedule: {
        id: uuidv4(),
        name: "Default Schedule",
        enabled: true,
        frequency: "manual",
      },
      enabled: true,
    };
    dispatch.addSyncRule(newRule);
    setEditingRule(newRule.id);
  };

  const handleDeleteRule = (id: string) => {
    dispatch.removeSyncRule(id);
  };

  const handleToggleRule = (id: string) => {
    const rule = state.syncRules.find((r) => r.id === id);
    if (rule) {
      dispatch.updateSyncRule(id, { enabled: !rule.enabled });
    }
  };

  const handleUpdateRule = (
    id: string,
    updates: Partial<SyncRule>
  ) => {
    dispatch.updateSyncRule(id, updates);
  };

  const handleAddCondition = (ruleId: string) => {
    const rule = state.syncRules.find((r) => r.id === ruleId);
    if (!rule) return;
    const newCondition: SyncCondition = {
      id: uuidv4(),
      field: "",
      operator: "equals",
      value: "",
      entityType: rule.sourceEntity,
      logic: rule.conditions.length > 0 ? "AND" : "AND",
    };
    dispatch.updateSyncRule(ruleId, {
      conditions: [...rule.conditions, newCondition],
    });
  };

  const handleDeleteCondition = (ruleId: string, conditionId: string) => {
    const rule = state.syncRules.find((r) => r.id === ruleId);
    if (!rule) return;
    dispatch.updateSyncRule(ruleId, {
      conditions: rule.conditions.filter((c) => c.id !== conditionId),
    });
  };

  const handleUpdateCondition = (
    ruleId: string,
    conditionId: string,
    updates: Partial<SyncCondition>
  ) => {
    const rule = state.syncRules.find((r) => r.id === ruleId);
    if (!rule) return;
    dispatch.updateSyncRule(ruleId, {
      conditions: rule.conditions.map((c) =>
        c.id === conditionId ? { ...c, ...updates } : c
      ),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-1">
            ⚙️ Sync Rules
          </h3>
          <p className="text-sm text-gray-400">
            Define conditions, filters, and schedules for sync
          </p>
        </div>
        <Button variant="primary" onClick={handleAddRule}>
          + New Rule
        </Button>
      </div>

      {state.syncRules.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <span className="text-4xl block mb-3">⚙️</span>
          <p>No sync rules yet. Create one to get started.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {state.syncRules.map((rule) => (
            <div
              key={rule.id}
              className={`rounded-xl border p-5 transition-all ${
                rule.enabled
                  ? "bg-gray-800 border-gray-700"
                  : "bg-gray-900 border-gray-800 opacity-60"
              }`}
            >
              {/* Rule Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleRule(rule.id)}
                    className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                      rule.enabled ? "bg-brand-500" : "bg-gray-700"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                        rule.enabled ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </button>
                  <div>
                    <input
                      type="text"
                      value={rule.name}
                      onChange={(e) =>
                        handleUpdateRule(rule.id, { name: e.target.value })
                      }
                      className="bg-transparent border-none text-white font-semibold focus:outline-none focus:underline w-full"
                      placeholder="Rule name"
                    />
                    <p className="text-xs text-gray-500">{rule.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={rule.enabled ? "success" : "default"}>
                    {rule.enabled ? "Active" : "Inactive"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteRule(rule.id)}
                  >
                    🗑
                  </Button>
                </div>
              </div>

              {/* Rule Configuration */}
              <div className="grid md:grid-cols-3 gap-4 mb-4">
                <Select
                  label="Source Entity"
                  value={rule.sourceEntity}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, {
                      sourceEntity: e.target.value as EntityType,
                    })
                  }
                  options={SOURCE_ENTITY_OPTIONS}
                />
                <Select
                  label="Target Entity"
                  value={rule.targetEntity}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, {
                      targetEntity: e.target.value as ListokEntityType,
                    })
                  }
                  options={TARGET_ENTITY_OPTIONS}
                />
                <Select
                  label="Direction"
                  value={rule.direction}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, {
                      direction: e.target.value as SyncDirection,
                    })
                  }
                  options={DIRECTION_OPTIONS}
                />
              </div>

              {/* Conditions */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="text-sm font-medium text-gray-300">
                    Conditions
                  </h5>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddCondition(rule.id)}
                  >
                    + Condition
                  </Button>
                </div>
                {rule.conditions.length === 0 ? (
                  <p className="text-xs text-gray-500 italic">
                    No conditions — sync all entities
                  </p>
                ) : (
                  <div className="space-y-2">
                    {rule.conditions.map((cond, idx) => (
                      <div
                        key={cond.id}
                        className="flex items-center gap-2 bg-gray-900 rounded-lg p-2"
                      >
                        {idx > 0 && (
                          <select
                            value={cond.logic}
                            onChange={(e) =>
                              handleUpdateCondition(rule.id, cond.id, {
                                logic: e.target.value as "AND" | "OR",
                              })
                            }
                            className="w-14 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none"
                          >
                            <option value="AND">AND</option>
                            <option value="OR">OR</option>
                          </select>
                        )}
                        <select
                          value={cond.field}
                          onChange={(e) =>
                            handleUpdateCondition(rule.id, cond.id, {
                              field: e.target.value,
                            })
                          }
                          className="flex-1 min-w-0 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 font-mono focus:outline-none"
                        >
                          <option value="">Field...</option>
                          {BITRIX24_FIELDS[rule.sourceEntity]?.map((f) => (
                            <option key={f.name} value={f.name}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                        <select
                          value={cond.operator}
                          onChange={(e) =>
                            handleUpdateCondition(rule.id, cond.id, {
                              operator: e.target.value as SyncCondition["operator"],
                            })
                          }
                          className="w-32 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 focus:outline-none"
                        >
                          {CONDITION_OPERATORS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={cond.value}
                          onChange={(e) =>
                            handleUpdateCondition(rule.id, cond.id, {
                              value: e.target.value,
                            })
                          }
                          placeholder="Value"
                          className="flex-1 min-w-0 px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300 font-mono focus:outline-none"
                        />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            handleDeleteCondition(rule.id, cond.id)
                          }
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedule */}
              <div className="flex items-center gap-4">
                <Select
                  label="Schedule"
                  value={rule.schedule.frequency}
                  onChange={(e) =>
                    handleUpdateRule(rule.id, {
                      schedule: {
                        ...rule.schedule,
                        frequency: e.target.value as SyncRule["schedule"]["frequency"],
                      },
                    })
                  }
                  options={SCHEDULE_OPTIONS}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
