import React, { useState } from "react";
import { useApp } from "@/store/useStore";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { Select } from "@/components/common/Select";
import { v4 as uuidv4 } from "uuid";

// ── Available fields (from backend schema) ──
const BITRIX24_FIELDS: Record<string, { name: string; label: string; type: string }[]> =
  {
    lead: [
      { name: "TITLE", label: "Title", type: "string" },
      { name: "NAME", label: "First Name", type: "string" },
      { name: "LAST_NAME", label: "Last Name", type: "string" },
      { name: "COMPANY_TITLE", label: "Company", type: "string" },
      { name: "SOURCE_ID", label: "Source", type: "enum" },
      { name: "STATUS_ID", label: "Status", type: "enum" },
      { name: "OPPORTUNITY", label: "Amount", type: "number" },
      { name: "CURRENCY_ID", label: "Currency", type: "currency" },
      { name: "BIRTHDATE", label: "Birth Date", type: "date" },
      { name: "PHONE", label: "Phone", type: "multifield" },
      { name: "EMAIL", label: "Email", type: "multifield" },
      { name: "UTM_SOURCE", label: "UTM Source", type: "string" },
      { name: "UTM_MEDIUM", label: "UTM Medium", type: "string" },
      { name: "UTM_CAMPAIGN", label: "UTM Campaign", type: "string" },
    ],
    deal: [
      { name: "TITLE", label: "Title", type: "string" },
      { name: "TYPE_ID", label: "Deal Type", type: "enum" },
      { name: "STAGE_ID", label: "Stage", type: "enum" },
      { name: "OPPORTUNITY", label: "Amount", type: "number" },
      { name: "CURRENCY_ID", label: "Currency", type: "currency" },
      { name: "BEGINDATE", label: "Start Date", type: "date" },
      { name: "CLOSEDATE", label: "Close Date", type: "date" },
      { name: "CONTACT_IDS", label: "Contact IDs", type: "multifield" },
      { name: "COMPANY_ID", label: "Company ID", type: "string" },
      { name: "UTM_SOURCE", label: "UTM Source", type: "string" },
    ],
    contact: [
      { name: "NAME", label: "First Name", type: "string" },
      { name: "LAST_NAME", label: "Last Name", type: "string" },
      { name: "BIRTHDATE", label: "Birth Date", type: "date" },
      { name: "PHONE", label: "Phone", type: "multifield" },
      { name: "EMAIL", label: "Email", type: "multifield" },
      { name: "SOURCE_ID", label: "Source", type: "enum" },
      { name: "TYPE_ID", label: "Contact Type", type: "enum" },
    ],
    company: [
      { name: "TITLE", label: "Company Name", type: "string" },
      { name: "COMPANY_TYPE", label: "Company Type", type: "enum" },
      { name: "INDUSTRY", label: "Industry", type: "enum" },
      { name: "REVENUE", label: "Revenue", type: "number" },
      { name: "CURRENCY_ID", label: "Currency", type: "currency" },
      { name: "PHONE", label: "Phone", type: "multifield" },
      { name: "EMAIL", label: "Email", type: "multifield" },
    ],
  };

const LISTOK_FIELDS: Record<string, { name: string; label: string; type: string }[]> =
  {
    contact: [
      { name: "name", label: "Name", type: "string" },
      { name: "name_short", label: "Short Name", type: "string" },
      { name: "email", label: "Email", type: "string" },
      { name: "phone", label: "Phone", type: "string" },
      { name: "phone_alt", label: "Alt Phone", type: "string" },
      { name: "birth_date", label: "Birth Date", type: "date" },
      { name: "gender", label: "Gender", type: "enum" },
      { name: "customer_status", label: "Customer Status", type: "enum" },
      { name: "source_id", label: "Source ID", type: "string" },
      { name: "note", label: "Note", type: "string" },
      { name: "barcode", label: "Barcode", type: "string" },
    ],
    group: [
      { name: "name", label: "Group Name", type: "string" },
      { name: "duration", label: "Duration", type: "number" },
      { name: "teacher_name", label: "Teacher", type: "string" },
      { name: "office_name", label: "Office", type: "string" },
      { name: "max_attendance_limit", label: "Max Attendees", type: "number" },
      { name: "description", label: "Description", type: "string" },
    ],
    pass: [
      { name: "name", label: "Pass Name", type: "string" },
      { name: "admit_number", label: "Admit Number", type: "string" },
      { name: "price", label: "Price", type: "number" },
      { name: "valid_for_days", label: "Valid Days", type: "number" },
      { name: "pass_type", label: "Pass Type", type: "enum" },
    ],
    payment: [
      { name: "amount", label: "Amount", type: "number" },
      { name: "full_price", label: "Full Price", type: "number" },
      { name: "payment_type", label: "Payment Type", type: "enum" },
      { name: "date", label: "Date", type: "date" },
      { name: "reason", label: "Reason", type: "string" },
    ],
  };

const ENTITY_OPTIONS = [
  { value: "lead", label: "Lead" },
  { value: "deal", label: "Deal" },
  { value: "contact", label: "Contact" },
  { value: "company", label: "Company" },
];

const LISTOK_ENTITY_OPTIONS = [
  { value: "contact", label: "Contact" },
  { value: "group", label: "Group" },
  { value: "pass", label: "Pass" },
  { value: "payment", label: "Payment" },
];

const TRANSFORM_OPTIONS = [
  { value: "none", label: "None" },
  { value: "uppercase", label: "Uppercase" },
  { value: "lowercase", label: "Lowercase" },
  { value: "trim", label: "Trim Whitespace" },
  { value: "date_format", label: "Date Format" },
  { value: "currency_convert", label: "Currency Convert" },
  { value: "phone_normalize", label: "Phone Normalize" },
  { value: "email_normalize", label: "Email Normalize" },
  { value: "prefix", label: "Add Prefix" },
  { value: "suffix", label: "Add Suffix" },
  { value: "custom", label: "Custom" },
];

export const FieldMappingBoard: React.FC = () => {
  const { state, dispatch } = useApp();
  const [bitrixEntity, setBitrixEntity] = useState("lead");
  const [listokEntity, setListokEntity] = useState("contact");

  const bitrixFields = BITRIX24_FIELDS[bitrixEntity] || [];
  const listokFields = LISTOK_FIELDS[listokEntity] || [];

  const handleAddMapping = () => {
    dispatch.addFieldMapping({
      sourceField: "",
      targetField: "",
      sourceEntity: bitrixEntity as any,
      targetEntity: listokEntity as any,
      transform: "none",
      enabled: true,
    });
  };

  const handleRemoveMapping = (id: string) => {
    dispatch.removeFieldMapping(id);
  };

  const handleUpdateMapping = (
    id: string,
    field: string,
    value: string
  ) => {
    dispatch.updateFieldMapping(id, { [field]: value });
  };

  const handleToggleMapping = (id: string) => {
    const mapping = state.fieldMappings.find((m) => m.id === id);
    if (mapping) {
      dispatch.updateFieldMapping(id, { enabled: !mapping.enabled });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">
          🔀 Field Mapping
        </h3>
        <p className="text-sm text-gray-400">
          Map Bitrix24 fields to Listok fields
        </p>
      </div>

      {/* Entity selectors */}
      <div className="flex gap-4">
        <div className="flex-1">
          <label className="block text-sm text-gray-300 mb-2">
            Bitrix24 Entity
          </label>
          <div className="flex flex-wrap gap-2">
            {ENTITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setBitrixEntity(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  bitrixEntity === opt.value
                    ? "bg-bitrix-500/20 text-bitrix-400 border border-bitrix-500/30"
                    : "bg-gray-800 text-gray-400 border border-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-center px-2">
          <span className="text-gray-600 text-xl">→</span>
        </div>
        <div className="flex-1">
          <label className="block text-sm text-gray-300 mb-2">
            Listok Entity
          </label>
          <div className="flex flex-wrap gap-2">
            {LISTOK_ENTITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setListokEntity(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  listokEntity === opt.value
                    ? "bg-brand-500/20 text-brand-400 border border-brand-500/30"
                    : "bg-gray-800 text-gray-400 border border-gray-700"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Available fields */}
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-gray-800 rounded-xl p-4 max-h-64 overflow-y-auto">
          <h4 className="text-sm font-semibold text-bitrix-400 mb-3">
            Bitrix24 Fields ({bitrixFields.length})
          </h4>
          <div className="space-y-1">
            {bitrixFields.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-700/50 text-sm"
              >
                <code className="text-bitrix-300 font-mono text-xs">
                  {f.name}
                </code>
                <span className="text-gray-500 text-xs">{f.label}</span>
                <Badge variant="info" size="sm">
                  {f.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-gray-800 rounded-xl p-4 max-h-64 overflow-y-auto">
          <h4 className="text-sm font-semibold text-brand-400 mb-3">
            Listok Fields ({listokFields.length})
          </h4>
          <div className="space-y-1">
            {listokFields.map((f) => (
              <div
                key={f.name}
                className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-gray-700/50 text-sm"
              >
                <code className="text-brand-300 font-mono text-xs">
                  {f.name}
                </code>
                <span className="text-gray-500 text-xs">{f.label}</span>
                <Badge variant="info" size="sm">
                  {f.type}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Active mappings */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-white">
            Active Mappings ({state.fieldMappings.length})
          </h4>
          <Button variant="primary" size="sm" onClick={handleAddMapping}>
            + Add Mapping
          </Button>
        </div>

        {state.fieldMappings.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No mappings yet. Click "Add Mapping" to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {state.fieldMappings.map((mapping) => (
              <div
                key={mapping.id}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  mapping.enabled
                    ? "bg-gray-800 border-gray-700"
                    : "bg-gray-900 border-gray-800 opacity-50"
                }`}
              >
                <button
                  onClick={() => handleToggleMapping(mapping.id)}
                  className={`w-10 h-6 rounded-full transition-colors flex-shrink-0 ${
                    mapping.enabled ? "bg-brand-500" : "bg-gray-700"
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      mapping.enabled ? "translate-x-5" : "translate-x-1"
                    }`}
                  />
                </button>

                <select
                  value={mapping.sourceField}
                  onChange={(e) =>
                    handleUpdateMapping(mapping.id, "sourceField", e.target.value)
                  }
                  className="flex-1 min-w-0 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-bitrix-300 font-mono focus:outline-none focus:border-bitrix-500"
                >
                  <option value="">Bitrix24 field...</option>
                  {bitrixFields.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.label} ({f.name})
                    </option>
                  ))}
                </select>

                <span className="text-gray-600 flex-shrink-0">→</span>

                <select
                  value={mapping.targetField}
                  onChange={(e) =>
                    handleUpdateMapping(mapping.id, "targetField", e.target.value)
                  }
                  className="flex-1 min-w-0 px-3 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-brand-300 font-mono focus:outline-none focus:border-brand-500"
                >
                  <option value="">Listok field...</option>
                  {listokFields.map((f) => (
                    <option key={f.name} value={f.name}>
                      {f.label} ({f.name})
                    </option>
                  ))}
                </select>

                <select
                  value={mapping.transform}
                  onChange={(e) =>
                    handleUpdateMapping(mapping.id, "transform", e.target.value)
                  }
                  className="w-32 px-2 py-1.5 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-300 font-mono focus:outline-none focus:border-brand-500 flex-shrink-0"
                >
                  {TRANSFORM_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveMapping(mapping.id)}
                >
                  ✕
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
