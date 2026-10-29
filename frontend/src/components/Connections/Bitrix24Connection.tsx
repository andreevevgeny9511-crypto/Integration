import React, { useState } from "react";
import { Input } from "@/components/common/Input";
import { Button } from "@/components/common/Button";
import { Badge } from "@/components/common/Badge";
import { useToast } from "@/components/common/Toast";

interface Bitrix24ConnectionProps {
  existingConfig?: any;
  onSave: (config: any) => void;
  onNext: () => void;
}

export const Bitrix24Connection: React.FC<Bitrix24ConnectionProps> = ({
  existingConfig,
  onSave,
  onNext,
}) => {
  const { addToast } = useToast();
  const [formData, setFormData] = useState({
    name: existingConfig?.name || "Bitrix24",
    domain: existingConfig?.domain || "",
    clientId: existingConfig?.clientId || "",
    clientSecret: existingConfig?.clientSecret || "",
    accessToken: existingConfig?.accessToken || "",
    refreshToken: existingConfig?.refreshToken || "",
  });
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.domain.trim()) newErrors.domain = "Domain is required";
    if (!formData.clientId.trim()) newErrors.clientId = "Client ID is required";
    if (!formData.clientSecret.trim())
      newErrors.clientSecret = "Client Secret is required";
    if (!formData.accessToken.trim() && !formData.refreshToken.trim())
      newErrors.tokens = "At least one token is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleTest = async () => {
    if (!validate()) return;
    setTesting(true);
    setTestResult(null);

    // Simulate API call
    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setTestResult({ success: true, message: "Connection successful!" });
      addToast({ type: "success", message: "Bitrix24 connection test passed" });
    } catch {
      setTestResult({
        success: false,
        message: "Connection failed. Please check your credentials.",
      });
      addToast({ type: "error", message: "Connection test failed" });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({
      ...formData,
      status: "connected",
      tokenExpiry: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    addToast({ type: "success", message: "Bitrix24 connection saved" });
    onNext();
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">
          🔗 Connect Bitrix24
        </h3>
        <p className="text-sm text-gray-400">
          Enter your Bitrix24 credentials to enable integration
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Input
          label="Connection Name"
          placeholder="My Bitrix24"
          value={formData.name}
          onChange={(e) =>
            setFormData({ ...formData, name: e.target.value })
          }
        />
        <Input
          label="Domain"
          placeholder="yourcompany.bitrix24.ru"
          value={formData.domain}
          onChange={(e) =>
            setFormData({ ...formData, domain: e.target.value })
          }
          error={errors.domain}
          required
        />
        <Input
          label="Client ID"
          placeholder="app-12345"
          value={formData.clientId}
          onChange={(e) =>
            setFormData({ ...formData, clientId: e.target.value })
          }
          error={errors.clientId}
          required
        />
        <Input
          label="Client Secret"
          placeholder="••••••••••••"
          value={formData.clientSecret}
          onChange={(e) =>
            setFormData({ ...formData, clientSecret: e.target.value })
          }
          error={errors.clientSecret}
          required
        />
        <Input
          label="Access Token"
          placeholder="oauth_token_..."
          value={formData.accessToken}
          onChange={(e) =>
            setFormData({ ...formData, accessToken: e.target.value })
          }
        />
        <Input
          label="Refresh Token"
          placeholder="oauth_refresh_..."
          value={formData.refreshToken}
          onChange={(e) =>
            setFormData({ ...formData, refreshToken: e.target.value })
          }
        />
      </div>

      {errors.tokens && (
        <p className="text-xs text-red-400">{errors.tokens}</p>
      )}

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
