/**
 * Listok CRM Connector
 * 
 * Provides authenticated CRUD operations for Listok entities:
 * Contacts, Events, Groups, Passes, Payments.
 * Uses External API v2 with API key authentication.
 */

export interface ListokConfig {
  baseUrl: string;
  apiKey: string;
  timeout?: number;
  retryCount?: number;
}

export interface ListokContact {
  contact_id: number;
  parent_contact_id: number;
  name: string;
  name_short: string;
  gender: 'male' | 'female' | 'unknown';
  birth_date: string;
  email: string;
  phone_alt: string;
  phone: string;
  note: string;
  sticky_note: string;
  photo: string;
  barcode: string;
  created_at: string;
  updated_at: string;
  deleted_at: number;
  balance: number;
  bonus_balance: number;
  parent_name: string;
  parent_phone: string;
  parent_email: string;
  parent_name2: string;
  parent_phone2: string;
  parent_email2: string;
  search_score: number | null;
  added_office_id: number;
  customer_status: 'lead' | 'client';
  vkid: string;
  fbid: string;
  instaid: string;
  has_trial_passes: number;
  has_non_trial_passes: number;
  last_admission_date: number;
  last_pass_purchased: number;
  first_non_trial: number;
  last_non_trial: number;
  source_id: number;
  can_email: number;
  can_sms: number;
  can_wa: number;
  can_tg: number;
  tg_chat_id: string | null;
  custom_fields: Array<{
    field_id: number;
    alias: string;
    label: string;
    type: string;
    value: string;
  }>;
  sicknesses: any[];
  interests: any[];
}

export interface ListokGroup {
  group_id: number;
  name: string;
  duration: number;
  teacher_name: string | null;
  second_teacher_name: string | null;
  color: string;
  max_attendance_limit: number;
  office_name: string;
  office_id: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  private_group: number;
  group_type_name: string;
  group_type_id: number;
  description: string;
  disable_online_listing: number;
  video: string;
  photo: string;
}

export interface ListokEvent {
  event_id: number;
  group_id: number;
  group_name: string;
  date_start: string;
  date_end: string;
  duration: number;
  teacher_name: string;
  second_teacher_name: string | null;
  office_name: string;
  office_id: number;
  max_attendance_limit: number;
  current_attendance: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface ListokPass {
  pass_id: number;
  name: string;
  description: string;
  admit_number: number;
  valid_for_days: number;
  valid_for_months: number;
  freeze_times: number;
  freeze_days: number;
  pass_type: number;
  price: number;
  allowed_times: any[];
  disabled_days: any[];
  enable_mobile_purchase: boolean;
  allow_buying_pass_mobile: string;
  allow_buying_pass_online: string;
}

export interface ListokPayment {
  payment_id: number;
  from_id: number;
  to_id: number;
  user_id: number;
  direction: 'income' | 'outcome';
  reason: string;
  date: string;
  created_at: string;
  updated_at: string;
  amount: number;
  full_price: number;
  balance_paid: number;
  total_discount_amount: number;
  discount_bonus_amount: number | null;
  discount_amount: number;
  payment_type: string;
  init_price: number;
  office_id: number;
  cashregister_id: number;
  discounts: Array<{
    name: string;
    original_name: string;
    type: string;
    amount: number;
    amount_fixed: number;
    amount_percent: number;
    amount_type: string | null;
    code_word: string;
    contact_id: number;
    country_id: number;
    discount_id: number;
    discounts_left: number;
    discountslot_id: any;
    dynamic_calculator: any;
    dynamic_type: any;
    limit_per_contact: any;
    limited: number;
    master_id: number;
    use_for: string;
    used: number;
    valid_til: any;
    pivot: any;
  }>;
}

export interface ListokContactCreate {
  name: string;
  phone?: string;
  email?: string;
  parent_contact_id?: number;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  birth_date?: string;
  gender?: 'male' | 'female';
  customer_status?: 'lead' | 'client';
  source_id?: number;
  note?: string;
  sticky_note?: string;
  barcode?: string;
  custom_fields?: Array<{
    field_id: number;
    value: string;
  }>;
}

export interface ListokContactUpdate {
  name?: string;
  phone?: string;
  email?: string;
  parent_contact_id?: number;
  parent_name?: string;
  parent_phone?: string;
  parent_email?: string;
  birth_date?: string;
  gender?: 'male' | 'female';
  customer_status?: 'lead' | 'client';
  source_id?: number;
  note?: string;
  sticky_note?: string;
  barcode?: string;
  custom_fields?: Array<{
    field_id: number;
    value: string;
  }>;
}

export interface ListokListResponse<T> {
  data: T[];
  meta: {
    pagination: {
      total: number;
      count: number;
      per_page: number;
      current_page: number;
      total_pages: number;
      links: {
        next?: string;
        prev?: string;
      };
    };
  };
}

export interface ListokError {
  message: string;
  errors?: Record<string, string>;
}

export class ListokConnector {
  private baseUrl: string;
  private apiKey: string;
  private timeout: number;
  private retryCount: number;

  constructor(config: ListokConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
    this.timeout = config.timeout ?? 30000;
    this.retryCount = config.retryCount ?? 3;
  }

  private async request<T>(method: string, path: string, options?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    let lastError: any;
    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            ...options?.headers,
          } as HeadersInit,
          body: options?.body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorBody = await response.text();
          throw new Error(`Listok API error: HTTP ${response.status} - ${errorBody}`);
        }

        const data: T | ListokError = await response.json();

        if ('message' in data && typeof data.message === 'string') {
          throw new Error(`Listok API error: ${data.message}`);
        }

        return data as T;
      } catch (error) {
        lastError = error;
        if (attempt < this.retryCount) {
          const delay = Math.pow(2, attempt) * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }

  private async paginate<T>(
    path: string,
    params?: Record<string, any>
  ): Promise<T[]> {
    const allItems: T[] = [];
    let currentPage = 1;
    let hasMore = true;

    while (hasMore) {
      const queryParams = new URLSearchParams();
      queryParams.set('page', currentPage.toString());
      if (params) {
        for (const [key, value] of Object.entries(params)) {
          queryParams.set(key, String(value));
        }
      }

      const response = await this.request<ListokListResponse<T>>(
        'GET',
        `${path}?${queryParams.toString()}`
      );

      allItems.push(...response.data);

      const { pagination } = response.meta;
      hasMore = pagination.current_page < pagination.total_pages;
      currentPage++;
    }

    return allItems;
  }

  // ===== CONTACTS =====

  async listContacts(params?: {
    page?: number;
    name?: string;
    phone?: string;
    email?: string;
    customer_status?: string;
    source_id?: number;
  }): Promise<ListokContact[]> {
    return this.paginate<ListokContact>('/api/external/v2/contacts', params);
  }

  async getContact(contactId: number): Promise<ListokContact> {
    const result = await this.request<ListokContact>('GET', `/api/external/v2/contacts/${contactId}`);
    return result;
  }

  async createContact(contact: ListokContactCreate): Promise<ListokContact> {
    const result = await this.request<ListokContact>('POST', '/api/external/v2/contacts', {
      body: JSON.stringify(contact),
    });
    return result;
  }

  async updateContact(contactId: number, contact: ListokContactUpdate): Promise<ListokContact> {
    const result = await this.request<ListokContact>('PUT', `/api/external/v2/contacts/${contactId}`, {
      body: JSON.stringify(contact),
    });
    return result;
  }

  async deleteContact(contactId: number): Promise<void> {
    await this.request<void>('DELETE', `/api/external/v2/contacts/${contactId}`);
  }

  // ===== GROUPS =====

  async listGroups(params?: { page?: number }): Promise<ListokGroup[]> {
    return this.paginate<ListokGroup>('/api/external/v2/groups', params);
  }

  async getGroup(groupId: number): Promise<ListokGroup> {
    const result = await this.request<ListokGroup>('GET', `/api/external/v2/groups/${groupId}`);
    return result;
  }

  // ===== EVENTS =====

  async listEvents(params: { date?: string; from?: string; to?: string; page?: number }): Promise<any[]> {
    return this.paginate<any>('/api/external/v2/events', params);
  }

  // ===== PASSES =====

  async listPasses(params?: { page?: number }): Promise<ListokPass[]> {
    return this.paginate<ListokPass>('/api/external/v2/passes', params);
  }

  async getPass(passId: number): Promise<ListokPass> {
    const result = await this.request<ListokPass>('GET', `/api/external/v2/passes/${passId}`);
    return result;
  }

  // ===== PAYMENTS =====

  async listPayments(params?: {
    from?: string;
    to?: string;
    page?: number;
  }): Promise<ListokPayment[]> {
    return this.paginate<ListokPayment>('/api/external/v2/payments', params);
  }

  async getPayment(paymentId: number): Promise<ListokPayment> {
    const result = await this.request<ListokPayment>('GET', `/api/external/v2/payments/${paymentId}`);
    return result;
  }

  // ===== UTILITY =====

  async ping(): Promise<boolean> {
    try {
      await this.listContacts({ page: 1 });
      return true;
    } catch {
      return false;
    }
  }

  async getStats(): Promise<{
    contacts: number;
    groups: number;
    passes: number;
    payments: number;
  }> {
    const [contacts, groups, passes, payments] = await Promise.all([
      this.listContacts({ page: 1 }),
      this.listGroups({ page: 1 }),
      this.listPasses({ page: 1 }),
      this.listPayments({ page: 1 }),
    ]);

    // Get totals from pagination metadata (we need to re-fetch with page=1 to get meta)
    const contactsMeta = await this.request<ListokListResponse<ListokContact>>('GET', '/api/external/v2/contacts?page=1');
    const groupsMeta = await this.request<ListokListResponse<ListokGroup>>('GET', '/api/external/v2/groups?page=1');
    const passesMeta = await this.request<ListokListResponse<ListokPass>>('GET', '/api/external/v2/passes?page=1');
    const paymentsMeta = await this.request<ListokListResponse<ListokPayment>>('GET', '/api/external/v2/payments?page=1');

    return {
      contacts: contactsMeta.meta.pagination.total,
      groups: groupsMeta.meta.pagination.total,
      passes: passesMeta.meta.pagination.total,
      payments: paymentsMeta.meta.pagination.total,
    };
  }
}
