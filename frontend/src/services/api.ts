// ============================================================
// API client for the integration backend
// ============================================================

const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:8080/api";

interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    const config: RequestInit = {
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    };

    try {
      const response = await fetch(url, config);

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        const error: ApiError = {
          code: errorBody.code || "HTTP_ERROR",
          message: errorBody.message || `Request failed with status ${response.status}`,
          details: errorBody.details,
        };
        throw new ApiClientError(error.message, error.code, error.details);
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (err) {
      if (err instanceof ApiClientError) throw err;
      throw new ApiClientError(
        err instanceof TypeError ? "Network error" : String(err),
        "NETWORK_ERROR"
      );
    }
  }

  // ── Bitrix24 Connections ──
  async getBitrix24Connections() {
    return this.request<Bitrix24ConnectionConfig[]>("/bitrix24/connections");
  }

  async createBitrix24Connection(data: Partial<Bitrix24ConnectionConfig>) {
    return this.request<Bitrix24ConnectionConfig>("/bitrix24/connections", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateBitrix24Connection(id: string, data: Partial<Bitrix24ConnectionConfig>) {
    return this.request<Bitrix24ConnectionConfig>(`/bitrix24/connections/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteBitrix24Connection(id: string) {
    return this.request<void>(`/bitrix24/connections/${id}`, { method: "DELETE" });
  }

  async testBitrix24Connection(data: { domain: string; clientId: string; clientSecret: string }) {
    return this.request<{ success: boolean; message: string }>("/bitrix24/test-connection", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ── Listok Connections ──
  async getListokConnections() {
    return this.request<ListokConnectionConfig[]>("/listok/connections");
  }

  async createListokConnection(data: Partial<ListokConnectionConfig>) {
    return this.request<ListokConnectionConfig>("/listok/connections", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateListokConnection(id: string, data: Partial<ListokConnectionConfig>) {
    return this.request<ListokConnectionConfig>(`/listok/connections/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteListokConnection(id: string) {
    return this.request<void>(`/listok/connections/${id}`, { method: "DELETE" });
  }

  async testListokConnection(data: { apiKey: string; baseUrl: string }) {
    return this.request<{ success: boolean; message: string }>("/listok/test-connection", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  // ── Field Mappings ──
  async getFieldMappings() {
    return this.request<FieldMapping[]>("/mappings");
  }

  async createFieldMapping(data: FieldMapping) {
    return this.request<FieldMapping>("/mappings", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateFieldMapping(id: string, data: Partial<FieldMapping>) {
    return this.request<FieldMapping>(`/mappings/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteFieldMapping(id: string) {
    return this.request<void>(`/mappings/${id}`, { method: "DELETE" });
  }

  async bulkUpdateFieldMappings(mappings: FieldMapping[]) {
    return this.request<FieldMapping[]>("/mappings/bulk", {
      method: "PUT",
      body: JSON.stringify({ mappings }),
    });
  }

  // ── Sync Rules ──
  async getSyncRules() {
    return this.request<SyncRule[]>("/sync-rules");
  }

  async createSyncRule(data: SyncRule) {
    return this.request<SyncRule>("/sync-rules", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  async updateSyncRule(id: string, data: Partial<SyncRule>) {
    return this.request<SyncRule>(`/sync-rules/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  }

  async deleteSyncRule(id: string) {
    return this.request<void>(`/sync-rules/${id}`, { method: "DELETE" });
  }

  // ── Sync Operations ──
  async startSync(ruleId?: string) {
    return this.request<{ success: boolean; message: string }>("/sync/start", {
      method: "POST",
      body: JSON.stringify({ ruleId }),
    });
  }

  async stopSync(ruleId?: string) {
    return this.request<{ success: boolean; message: string }>("/sync/stop", {
      method: "POST",
      body: JSON.stringify({ ruleId }),
    });
  }

  async getSyncStatus() {
    return this.request<DashboardState>("/sync/status");
  }

  // ── Dashboard ──
  async getSyncLogs(ruleId?: string, limit?: number) {
    const params = new URLSearchParams();
    if (ruleId) params.set("ruleId", ruleId);
    if (limit) params.set("limit", String(limit));
    return this.request<SyncLog[]>(`/sync/logs?${params.toString()}`);
  }

  async getSyncStats() {
    return this.request<SyncStats>("/sync/stats");
  }

  // ── Bitrix24 CRM Fields ──
  async getBitrix24Fields(entityType: string) {
    return this.request<Bitrix24Field[]>(`/bitrix24/fields?entityType=${entityType}`);
  }

  // ── Listok Fields ──
  async getListokFields(entityType: string) {
    return this.request<ListokField[]>(`/listok/fields?entityType=${entityType}`);
  }
}

class ApiClientError extends Error {
  code: string;
  details?: Record<string, unknown>;

  constructor(message: string, code: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ApiClientError";
    this.code = code;
    this.details = details;
  }
}

export const apiClient = new ApiClient(API_BASE);
export { ApiClientError };
