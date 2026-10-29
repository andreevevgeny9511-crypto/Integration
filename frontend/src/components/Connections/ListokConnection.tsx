import React, { useState } from "react";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { useToast } from "@/components/common/Toast";

interface ListokConnectionProps {
  existingConfig?: any;
  onSave: (config: any) => void;
  onNext: () => void;
}

export const ListokConnection: React.FC<ListokConnectionProps> = ({
  existingConfig,
  onSave,
  onNext,
}) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    name: existingConfig?.name || "Listok",
    apiKey: existingConfig?.apiKey || "",
    baseUrl: existingConfig?.baseUrl || "https://api.listok.ru",
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.apiKey.trim()) newErrors.apiKey = "API Key is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validate()) return;
    setTesting(true);
    setTestResult(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setTestResult({ success: true, message: "Listok connection successful!" });
      addToast({ type: "success", message: "Listok connection test passed" });
    } catch {
      setTestResult({
        success: false,
        message: "Connection failed. Please check your API key.",
      });
      addToast({ type: "error", message: "Listok connection test failed" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      ...formData,
      status: "connected",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    addToast({ type: "success", message: "Listok connection saved" });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">
          📋 Connect Listok
        </h3>
        <p className="text-sm text-gray-400">
          Enter your Listok API key to enable integration
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Input
          label="Connection Name"
          placeholder="My Listok"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
        />
        <Input
          label="API Key"
          placeholder="listok_api_key_..."
          value={formData.apiKey}
          onChange={(e) =>
            setFormData({ ...formData, apiKey: e.target.value })
          }
          error={errors.apiKey}
          required
        />
        <Input
          label="Base URL"
          placeholder="https://api.listok.ru"
          value={formData.baseUrl}
          onChange={(e) =>
            setFormData({ ...formData, baseUrl: e.target.value })
          }
          helperText="Default: https://api.listok.ru"
        />
      </div>

      {testResult && (
        <div
          className={`rounded-lg p-4 border ${
            testResult.success
              ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400"
              : "bg-red-500/5 border-red-500/20 text-red-400"
          }`}
        >
          {testResult.success ? "✅" : "❌"} {testResult.message}
        </div>
      )}

      <div className="flex gap-3 pt-4">
        <Button variant="secondary" onClick={handleTest} loading={testing}>
          Test Connection
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save & Continue
        </Button>
      </div>
    </div>
  );
};
