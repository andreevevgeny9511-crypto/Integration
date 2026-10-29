/**
 * Bitrix24 CRM Connector
 * 
 * Provides authenticated CRUD operations for Bitrix24 entities:
 * Leads, Deals, Contacts, Companies, Activities.
 * Uses REST 1.0 + 3.0 via webhook authentication.
 */

export interface Bitrix24Config {
  webhookUrl: string;
  timeout?: number;
  retryCount?: number;
}

export interface Bitrix24Lead {
  ID?: number;
  TITLE: string;
  NAME?: string;
  LAST_NAME?: string;
  SECOND_NAME?: string;
  HONORIFIC?: string;
  BIRTHDATE?: string;
  COMPANY_TITLE?: string;
  SOURCE_ID?: string;
  SOURCE_DESCRIPTION?: string;
  STATUS_ID?: string;
  STATUS_DESCRIPTION?: string;
  POST?: string;
  ADDRESS?: string;
  ADDRESS_2?: string;
  ADDRESS_CITY?: string;
  ADDRESS_POSTAL_CODE?: string;
  ADDRESS_REGION?: string;
  ADDRESS_PROVINCE?: string;
  ADDRESS_COUNTRY?: string;
  CURRENCY_ID?: string;
  OPPORTUNITY?: number;
  IS_MANUAL_OPPORTUNITY?: string;
  OPENED?: string;
  COMMENTS?: string;
  PHONE?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  EMAIL?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  WEB?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  IM?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  ASSIGNED_BY_ID?: number;
  CREATED_BY_ID?: number;
  DATE_CREATE?: string;
  DATE_MODIFY?: string;
  COMPANY_ID?: number;
  CONTACT_ID?: number;
  CONTACT_IDS?: number[];
  ORIGINATOR_ID?: string;
  ORIGIN_ID?: string;
  UTM_SOURCE?: string;
  UTM_MEDIUM?: string;
  UTM_CAMPAIGN?: string;
  UTM_CONTENT?: string;
  UTM_TERM?: string;
  [key: string]: any;
}

export interface Bitrix24Deal {
  ID?: number;
  TITLE: string;
  TYPE_ID?: string;
  CATEGORY_ID?: number;
  STAGE_ID?: string;
  PROBABILITY?: number;
  CURRENCY_ID?: string;
  OPPORTUNITY?: number;
  IS_MANUAL_OPPORTUNITY?: string;
  TAX_VALUE?: number;
  COMPANY_ID?: number;
  CONTACT_IDS?: number[];
  BEGINDATE?: string;
  CLOSEDATE?: string;
  OPENED?: string;
  CLOSED?: string;
  COMMENTS?: string;
  ASSIGNED_BY_ID?: number;
  SOURCE_ID?: string;
  SOURCE_DESCRIPTION?: string;
  LEAD_ID?: number;
  ORIGINATOR_ID?: string;
  ORIGIN_ID?: string;
  UTM_SOURCE?: string;
  UTM_MEDIUM?: string;
  UTM_CAMPAIGN?: string;
  UTM_CONTENT?: string;
  UTM_TERM?: string;
  [key: string]: any;
}

export interface Bitrix24Contact {
  ID?: number;
  HONORIFIC?: string;
  NAME: string;
  SECOND_NAME?: string;
  LAST_NAME: string;
  PHOTO?: string;
  BIRTHDATE?: string;
  TYPE_ID?: string;
  SOURCE_ID?: string;
  SOURCE_DESCRIPTION?: string;
  POST?: string;
  ADDRESS?: string;
  ADDRESS_2?: string;
  ADDRESS_CITY?: string;
  ADDRESS_POSTAL_CODE?: string;
  ADDRESS_REGION?: string;
  ADDRESS_PROVINCE?: string;
  ADDRESS_COUNTRY?: string;
  COMMENTS?: string;
  OPENED?: string;
  EXPORT?: string;
  ASSIGNED_BY_ID?: number;
  COMPANY_ID?: number;
  COMPANY_IDS?: number[];
  LEAD_ID?: number;
  ORIGINATOR_ID?: string;
  ORIGIN_ID?: string;
  ORIGIN_VERSION?: string;
  PHONE?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  EMAIL?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  WEB?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  IM?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  LINK?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  [key: string]: any;
}

export interface Bitrix24Company {
  ID?: number;
  TITLE: string;
  COMPANY_TYPE?: string;
  LOGO?: string;
  ADDRESS?: string;
  ADDRESS_2?: string;
  ADDRESS_CITY?: string;
  ADDRESS_POSTAL_CODE?: string;
  ADDRESS_REGION?: string;
  ADDRESS_PROVINCE?: string;
  ADDRESS_COUNTRY?: string;
  ADDRESS_LEGAL?: string;
  REG_ADDRESS?: string;
  INDUSTRY?: string;
  EMPLOYEES?: string;
  REVENUE?: number;
  CURRENCY_ID?: string;
  OPENED?: string;
  COMMENTS?: string;
  ASSIGNED_BY_ID?: number;
  PHONE?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  EMAIL?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  WEB?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  IM?: Array<{ VALUE: string; VALUE_TYPE: string }>;
  [key: string]: any;
}

export interface Bitrix24Activity {
  ID?: number;
  TYPE_ID: string;
  SUBJECT: string;
  DESCRIPTION?: string;
  START_TIME?: string;
  END_TIME?: string;
  COMPLETED?: string;
  OWNER_ID: number;
  OWNER_TYPE_ID: number; // 1=lead, 2=deal, 3=contact, 4=company
  RESPONSIBLE_ID?: number;
  [key: string]: any;
}

export interface Bitrix24ListResponse<T> {
  result: T[];
  total?: number;
  time?: {
    start: number;
    finish: number;
    duration: number;
  };
}

export interface Bitrix24Error {
  error: string;
  error_description: string;
}

export class Bitrix24Connector {
  private webhookUrl: string;
  private timeout: number;
  private retryCount: number;

  constructor(config: Bitrix24Config) {
    this.webhookUrl = config.webhookUrl.replace(/\/+$/, '');
    this.timeout = config.timeout ?? 30000;
    this.retryCount = config.retryCount ?? 3;
  }

  private async request<T>(method: string, params?: Record<string, any>): Promise<T> {
    const url = `${this.webhookUrl}/${method}`;
    const body = params ? JSON.stringify(params) : undefined;

    let lastError: any;
    for (let attempt = 0; attempt <= this.retryCount; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data: T | Bitrix24Error = await response.json();

        if ('error' in data && data.error) {
          throw new Error(`Bitrix24 API error: ${data.error} - ${data.error_description}`);
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

  // ===== LEADS =====

  async getLeads(filter?: Record<string, any>, select?: string[], order?: Record<string, any>, start?: number): Promise<Bitrix24ListResponse<Bitrix24Lead>> {
    const params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (select) params.select = select;
    if (order) params.order = order;
    if (start !== undefined) params.start = start;
    return this.request<Bitrix24ListResponse<Bitrix24Lead>>('crm.lead.list', params);
  }

  async getLead(id: number, select?: string[]): Promise<Bitrix24Lead> {
    const params: Record<string, any> = { id };
    if (select) params.select = select;
    const result = await this.request<{ result: Bitrix24Lead }>('crm.lead.get', params);
    return result.result;
  }

  async addLead(lead: Bitrix24Lead): Promise<{ result: number }> {
    return this.request<{ result: number }>('crm.lead.add', { fields: lead });
  }

  async updateLead(id: number, lead: Partial<Bitrix24Lead>): Promise<{ result: boolean }> {
    return this.request<{ result: boolean }>('crm.lead.update', { id, fields: lead });
  }

  async deleteLead(id: number): Promise<{ result: boolean }> {
    return this.request<{ result: boolean }>('crm.lead.delete', { id });
  }

  async getLeadFields(): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('crm.lead.fields');
  }

  // ===== DEALS =====

  async getDeals(filter?: Record<string, any>, select?: string[], order?: Record<string, any>, start?: number): Promise<Bitrix24ListResponse<Bitrix24Deal>> {
    const params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (select) params.select = select;
    if (order) params.order = order;
    if (start !== undefined) params.start = start;
    return this.request<Bitrix24ListResponse<Bitrix24Deal>>('crm.deal.list', params);
  }

  async getDeal(id: number, select?: string[]): Promise<Bitrix24Deal> {
    const params: Record<string, any> = { id };
    if (select) params.select = select;
    const result = await this.request<{ result: Bitrix24Deal }>('crm.deal.get', params);
    return result.result;
  }

  async addDeal(deal: Bitrix24Deal): Promise<{ result: number }> {
    return this.request<{ result: number }>('crm.deal.add', { fields: deal });
  }

  async updateDeal(id: number, deal: Partial<Bitrix24Deal>): Promise<{ result: boolean }> {
    return this.request<{ result: boolean }>('crm.deal.update', { id, fields: deal });
  }

  async deleteDeal(id: number): Promise<{ result: boolean }> {
    return this.request<{ result: boolean }>('crm.deal.delete', { id });
  }

  async getDealFields(): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('crm.deal.fields');
  }

  async getDealCategories(): Promise<{ result: Array<{ ID: string; NAME: string }> }> {
    return this.request<{ result: Array<{ ID: string; NAME: string }> }>('crm.dealcategory.list');
  }

  // ===== CONTACTS =====

  async getContacts(filter?: Record<string, any>, select?: string[], order?: Record<string, any>, start?: number): Promise<Bitrix24ListResponse<Bitrix24Contact>> {
    const params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (select) params.select = select;
    if (order) params.order = order;
    if (start !== undefined) params.start = start;
    return this.request<Bitrix24ListResponse<Bitrix24Contact>>('crm.contact.list', params);
  }

  async getContact(id: number, select?: string[]): Promise<Bitrix24Contact> {
    const params: Record<string, any> = { id };
    if (select) params.select = select;
    const result = await this.request<{ result: Bitrix24Contact }>('crm.contact.get', params);
    return result.result;
  }

  async addContact(contact: Bitrix24Contact): Promise<{ result: number }> {
    return this.request<{ result: number }>('crm.contact.add', { fields: contact });
  }

  async updateContact(id: number, contact: Partial<Bitrix24Contact>): Promise<{ result: boolean }> {
    return this.request<{ result: boolean }>('crm.contact.update', { id, fields: contact });
  }

  async deleteContact(id: number): Promise<{ result: boolean }> {
    return this.request<{ result: boolean }>('crm.contact.delete', { id });
  }

  async getContactFields(): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('crm.contact.fields');
  }

  // ===== COMPANIES =====

  async getCompanies(filter?: Record<string, any>, select?: string[], order?: Record<string, any>, start?: number): Promise<Bitrix24ListResponse<Bitrix24Company>> {
    const params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (select) params.select = select;
    if (order) params.order = order;
    if (start !== undefined) params.start = start;
    return this.request<Bitrix24ListResponse<Bitrix24Company>>('crm.company.list', params);
  }

  async getCompany(id: number, select?: string[]): Promise<Bitrix24Company> {
    const params: Record<string, any> = { id };
    if (select) params.select = select;
    const result = await this.request<{ result: Bitrix24Company }>('crm.company.get', params);
    return result.result;
  }

  async addCompany(company: Bitrix24Company): Promise<{ result: number }> {
    return this.request<{ result: number }>('crm.company.add', { fields: company });
  }

  async updateCompany(id: number, company: Partial<Bitrix24Company>): Promise<{ result: boolean }> {
    return this.request<{ result: boolean }>('crm.company.update', { id, fields: company });
  }

  async deleteCompany(id: number): Promise<{ result: boolean }> {
    return this.request<{ result: boolean }>('crm.company.delete', { id });
  }

  async getCompanyFields(): Promise<Record<string, any>> {
    return this.request<Record<string, any>>('crm.company.fields');
  }

  // ===== ACTIVITIES =====

  async getActivities(filter?: Record<string, any>, select?: string[], order?: Record<string, any>, start?: number): Promise<Bitrix24ListResponse<Bitrix24Activity>> {
    const params: Record<string, any> = {};
    if (filter) params.filter = filter;
    if (select) params.select = select;
    if (order) params.order = order;
    if (start !== undefined) params.start = start;
    return this.request<Bitrix24ListResponse<Bitrix24Activity>>('crm.activity.list', params);
  }

  async addActivity(activity: Bitrix24Activity): Promise<{ result: number }> {
    return this.request<{ result: number }>('crm.activity.add', { fields: activity });
  }

  async updateActivity(id: number, activity: Partial<Bitrix24Activity>): Promise<{ result: boolean }> {
    return this.request<{ result: boolean }>('crm.activity.update', { id, fields: activity });
  }

  // ===== UTILITY =====

  async ping(): Promise<boolean> {
    try {
      await this.request<{ result: any }>('crm.lead.list', { select: ['ID'], filter: {}, start: 0 });
      return true;
    } catch {
      return false;
    }
  }

  async getEntitySummary(): Promise<{
    leads: number;
    deals: number;
    contacts: number;
    companies: number;
  }> {
    const [leads, deals, contacts, companies] = await Promise.all([
      this.getLeads({ select: ['ID'] }),
      this.getDeals({ select: ['ID'] }),
      this.getContacts({ select: ['ID'] }),
      this.getCompanies({ select: ['ID'] }),
    ]);
    return {
      leads: leads.total ?? leads.result.length,
      deals: deals.total ?? deals.result.length,
      contacts: contacts.total ?? contacts.result.length,
      companies: companies.total ?? companies.result.length,
    };
  }
}
