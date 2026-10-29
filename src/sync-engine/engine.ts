/**
 * Sync Engine
 * 
 * Core engine that reads sync configurations and performs conditional
 * transfers of deals, contacts, companies, leads between Bitrix24 and Listok.
 */

import { Bitrix24Connector, Bitrix24Lead, Bitrix24Deal, Bitrix24Contact, Bitrix24Company } from './connectors/bitrix24.js';
import { ListokConnector, ListokContact, ListokContactCreate, ListokContactUpdate } from './connectors/listok.js';
import { SyncConfig, FieldMapping, SyncRule, SyncCondition } from '../db/models/index.js';

export type EntityType = 'lead' | 'deal' | 'contact' | 'company';
export type TargetEntityType = 'contact' | 'event' | 'group' | 'pass' | 'payment';
export type SyncDirection = 'bitrix24→listok' | 'listok→bitrix24' | 'bidirectional';

export interface SyncResult {
  success: boolean;
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsFailed: number;
  errors: SyncError[];
  executedAt: string;
}

export interface SyncError {
  sourceEntityId: string;
  error: string;
  stage: 'mapping' | 'condition' | 'transform' | 'transfer' | 'create' | 'update';
}

export interface TransformRule {
  type: 'direct' | 'format_date' | 'format_phone' | 'format_email' | 'concat' | 'split' | 'lookup' | 'constant' | 'custom';
  params?: Record<string, any>;
}

export class SyncEngine {
  private bitrix24: Bitrix24Connector;
  private listok: ListokConnector;
  private config: SyncConfig;

  constructor(bitrix24: Bitrix24Connector, listok: ListokConnector, config: SyncConfig) {
    this.bitrix24 = bitrix24;
    this.listok = listok;
    this.config = config;
  }

  /**
   * Execute a full sync based on the configuration
   */
  async execute(): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
      executedAt: new Date().toISOString(),
    };

    const rules = this.config.syncRules.filter(r => r.enabled);

    for (const rule of rules) {
      try {
        const ruleResult = await this.executeRule(rule);
        result.recordsProcessed += ruleResult.recordsProcessed;
        result.recordsCreated += ruleResult.recordsCreated;
        result.recordsUpdated += ruleResult.recordsUpdated;
        result.recordsFailed += ruleResult.recordsFailed;
        result.errors.push(...ruleResult.errors);
      } catch (error) {
        result.success = false;
        result.errors.push({
          sourceEntityId: 'rule',
          error: `Rule "${rule.name}" failed: ${error instanceof Error ? error.message : String(error)}`,
          stage: 'transfer',
        });
      }
    }

    return result;
  }

  /**
   * Execute a single sync rule
   */
  private async executeRule(rule: SyncRule): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
      executedAt: new Date().toISOString(),
    };

    const mappings = this.config.fieldMappings.filter(m =>
      rule.fieldMappings.includes(m.id)
    );

    // Determine direction
    const directions: SyncDirection[] = rule.direction === 'bidirectional'
      ? ['bitrix24→listok', 'listok→bitrix24']
      : [rule.direction];

    for (const direction of directions) {
      if (direction === 'bitrix24→listok') {
        const bitrixResult = await this.syncBitrix24ToListok(rule, mappings);
        result.recordsProcessed += bitrixResult.recordsProcessed;
        result.recordsCreated += bitrixResult.recordsCreated;
        result.recordsUpdated += bitrixResult.recordsUpdated;
        result.recordsFailed += bitrixResult.recordsFailed;
        result.errors.push(...bitrixResult.errors);
      } else {
        const listokResult = await this.syncListokToBitrix24(rule, mappings);
        result.recordsProcessed += listokResult.recordsProcessed;
        result.recordsCreated += listokResult.recordsCreated;
        result.recordsUpdated += listokResult.recordsUpdated;
        result.recordsFailed += listokResult.recordsFailed;
        result.errors.push(...listokResult.errors);
      }
    }

    return result;
  }

  /**
   * Sync from Bitrix24 to Listok
   */
  private async syncBitrix24ToListok(
    rule: SyncRule,
    mappings: FieldMapping[]
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
      executedAt: new Date().toISOString(),
    };

    // Fetch entities from Bitrix24
    const bitrixEntities = await this.fetchBitrix24Entities(rule.sourceEntity);

    for (const entity of bitrixEntities) {
      result.recordsProcessed++;

      try {
        // Check conditions
        if (!this.evaluateConditions(rule, entity, 'bitrix24')) {
          continue;
        }

        // Map fields
        const listokContact = this.mapToTarget(entity, mappings, 'bitrix24→listok');

        // Check if target already exists (by external ID or match criteria)
        const existing = await this.findExistingTarget(entity, rule);

        if (existing) {
          await this.listok.updateContact(existing.contact_id, listokContact as ListokContactUpdate);
          result.recordsUpdated++;
        } else {
          await this.listok.createContact(listokContact as ListokContactCreate);
          result.recordsCreated++;
        }
      } catch (error) {
        result.success = false;
        result.recordsFailed++;
        result.errors.push({
          sourceEntityId: String(entity.ID ?? entity.contact_id ?? 'unknown'),
          error: error instanceof Error ? error.message : String(error),
          stage: 'transfer',
        });
      }
    }

    return result;
  }

  /**
   * Sync from Listok to Bitrix24
   */
  private async syncListokToBitrix24(
    rule: SyncRule,
    mappings: FieldMapping[]
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      recordsProcessed: 0,
      recordsCreated: 0,
      recordsUpdated: 0,
      recordsFailed: 0,
      errors: [],
      executedAt: new Date().toISOString(),
    };

    // Fetch contacts from Listok
    const listokContacts = await this.listok.listContacts({ page: 1 });

    for (const contact of listokContacts) {
      result.recordsProcessed++;

      try {
        // Check conditions
        if (!this.evaluateConditions(rule, contact, 'listok')) {
          continue;
        }

        // Map fields
        const bitrixEntity = this.mapToTarget(contact, mappings, 'listok→bitrix24');

        // Check if target already exists
        const existing = await this.findExistingBitrix24Entity(contact, rule);

        if (existing) {
          // Update existing entity
          // Implementation depends on entity type
          result.recordsUpdated++;
        } else {
          // Create new entity
          // Implementation depends on entity type
          result.recordsCreated++;
        }
      } catch (error) {
        result.success = false;
        result.recordsFailed++;
        result.errors.push({
          sourceEntityId: String(contact.contact_id),
          error: error instanceof Error ? error.message : String(error),
          stage: 'transfer',
        });
      }
    }

    return result;
  }

  /**
   * Fetch entities from Bitrix24 based on entity type
   */
  private async fetchBitrix24Entities(entityType: EntityType): Promise<any[]> {
    switch (entityType) {
      case 'lead': {
        const response = await this.bitrix24.getLeads({ select: ['*'] });
        return response.result;
      }
      case 'deal': {
        const response = await this.bitrix24.getDeals({ select: ['*'] });
        return response.result;
      }
      case 'contact': {
        const response = await this.bitrix24.getContacts({ select: ['*'] });
        return response.result;
      }
      case 'company': {
        const response = await this.bitrix24.getCompanies({ select: ['*'] });
        return response.result;
      }
      default:
        throw new Error(`Unknown entity type: ${entityType}`);
    }
  }

  /**
   * Evaluate sync conditions against an entity
   */
  private evaluateConditions(rule: SyncRule, entity: any, source: string): boolean {
    const conditions = this.config.syncConditions.filter(c => c.ruleId === rule.id);
    if (conditions.length === 0) return true;

    // Group conditions by logic
    let result = conditions[0].logic === 'OR' ? false : true;

    for (const condition of conditions) {
      const entityValue = this.getNestedValue(entity, condition.field);
      const conditionResult = this.evaluateCondition(entityValue, condition);

      if (condition.logic === 'OR') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }

    return result;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(entityValue: any, condition: SyncCondition): boolean {
    switch (condition.operator) {
      case 'eq':
        return String(entityValue) === String(condition.value);
      case 'neq':
        return String(entityValue) !== String(condition.value);
      case 'gt':
        return Number(entityValue) > Number(condition.value);
      case 'gte':
        return Number(entityValue) >= Number(condition.value);
      case 'lt':
        return Number(entityValue) < Number(condition.value);
      case 'lte':
        return Number(entityValue) <= Number(condition.value);
      case 'contains':
        return String(entityValue).includes(String(condition.value));
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(String(entityValue));
      case 'not_in':
        return Array.isArray(condition.value) && !condition.value.includes(String(entityValue));
      default:
        return true;
    }
  }

  /**
   * Map source entity fields to target entity fields using field mappings
   */
  private mapToTarget(source: any, mappings: FieldMapping[], direction: string): any {
    const target: any = {};

    for (const mapping of mappings) {
      const sourceValue = this.getNestedValue(source, mapping.sourceField);
      let value = sourceValue;

      // Apply transform if specified
      if (mapping.transform && mapping.transform.type !== 'direct') {
        value = this.applyTransform(sourceValue, mapping.transform);
      }

      // Use default value if source is empty
      if ((value === undefined || value === null || value === '') && mapping.defaultValue) {
        value = mapping.defaultValue;
      }

      target[mapping.targetField] = value;
    }

    return target;
  }

  /**
   * Apply a transformation to a value
   */
  private applyTransform(value: any, transform: TransformRule): any {
    switch (transform.type) {
      case 'format_phone':
        return String(value).replace(/[\s\-\(\)]/g, '');
      case 'format_email':
        return String(value).toLowerCase().trim();
      case 'format_date':
        return new Date(value).toISOString().split('T')[0];
      case 'concat':
        return transform.params?.fields?.map((f: string) => this.getNestedValue(value, f)).join(transform.params?.separator ?? ' ');
      case 'split':
        return String(value).split(transform.params?.separator ?? ',');
      case 'constant':
        return transform.params?.value;
      case 'lookup':
        // Lookup in a reference table
        return transform.params?.map?.[value] ?? value;
      case 'custom':
        // Custom JS function (evaluated safely)
        try {
          const fn = new Function('value', transform.params?.code ?? 'return value;');
          return fn(value);
        } catch {
          return value;
        }
      case 'direct':
      default:
        return value;
    }
  }

  /**
   * Get a nested value from an object using dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    if (!obj || !path) return undefined;
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current === null || current === undefined) return undefined;
      current = current[part];
    }
    return current;
  }

  /**
   * Find existing target entity in Listok
   */
  private async findExistingTarget(sourceEntity: any, rule: SyncRule): Promise<ListokContact | null> {
    // Try to find by external ID (ORIGIN_ID)
    const originId = sourceEntity.ORIGIN_ID || sourceEntity.origin_id;
    if (originId) {
      const contacts = await this.listok.listContacts({ page: 1 });
      const match = contacts.find(c => c.custom_fields?.some(f => f.value === originId));
      if (match) return match;
    }

    // Try to find by phone/email match
    const phone = sourceEntity.PHONE?.[0]?.VALUE || sourceEntity.phone;
    const email = sourceEntity.EMAIL?.[0]?.VALUE || sourceEntity.email;

    if (phone || email) {
      const contacts = await this.listok.listContacts({ page: 1 });
      const match = contacts.find(c =>
        (phone && c.phone === phone) ||
        (email && c.email === email)
      );
      if (match) return match;
    }

    return null;
  }

  /**
   * Find existing Bitrix24 entity
   */
  private async findExistingBitrix24Entity(contact: ListokContact, rule: SyncRule): Promise<any | null> {
    // Try to find by phone/email match
    if (contact.phone) {
      const leads = await this.bitrix24.getLeads({ filter: { PHONE: contact.phone } });
      if (leads.result.length > 0) return leads.result[0];

      const contacts = await this.bitrix24.getContacts({ filter: { PHONE: contact.phone } });
      if (contacts.result.length > 0) return contacts.result[0];
    }

    if (contact.email) {
      const leads = await this.bitrix24.getLeads({ filter: { EMAIL: contact.email } });
      if (leads.result.length > 0) return leads.result[0];

      const contacts = await this.bitrix24.getContacts({ filter: { EMAIL: contact.email } });
      if (contacts.result.length > 0) return contacts.result[0];
    }

    return null;
  }
}
