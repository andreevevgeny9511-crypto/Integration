# Bitrix24 ↔ Listok Integration Architecture

## Overview

A configurable web application that enables bidirectional synchronization between Bitrix24 CRM and Listok fitness studio management system. Users can map fields, define sync rules, and set conditional transfer logic for deals, contacts, leads, and companies.

## Architecture Diagram

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────┐
│   Frontend UI   │────▶│   Backend API (Node)  │────▶│  Bitrix24 CRM   │
│  React + TS     │     │  Sync Engine + REST   │     │  REST 1.0/3.0   │
└─────────────────┘     └──────────┬───────────┘     └─────────────────┘
                                   │
                                   │     ┌─────────────────┐
                                   ├────▶│   Listok API     │
                                   │     │  External v2     │
                                   │     └─────────────────┘
                                   │
                                   ▼
                          ┌─────────────────┐
                          │  PostgreSQL DB   │
                          │  - integrations  │
                          │  - field_mappings│
                          │  - sync_rules    │
                          │  - sync_logs     │
                          └─────────────────┘
```

## Data Flow

1. **User Configuration**: User connects Bitrix24 and Listok accounts via the UI wizard
2. **Field Mapping**: User maps Bitrix24 entity fields to Listok fields (e.g., Bitrix24 `TITLE` → Listok `name`)
3. **Sync Rules**: User defines which entities to sync and in which direction
4. **Conditions**: User sets filters (e.g., only sync deals > 1000 RUB, only contacts with status "client")
5. **Sync Engine**: Backend polls/monitors for changes and executes transfers based on configuration
6. **Logging**: All sync operations are logged with status, errors, and timestamps

## Key Components

### 1. Bitrix24 Connector (`src/connectors/bitrix24.ts`)
- Authentication via webhook token
- CRUD operations for: Leads, Deals, Contacts, Companies, Activities
- Field schema discovery via `fields` API
- Pagination support for large datasets

### 2. Listok Connector (`src/connectors/listok.ts`)
- Authentication via API key
- CRUD operations for: Contacts, Events, Groups, Passes, Payments
- Pagination support

### 3. Sync Engine (`src/sync-engine/`)
- Reads sync configurations from DB
- Applies field mappings and transformations
- Evaluates conditions/filters
- Executes transfers between systems
- Handles error recovery and retry logic

### 4. Backend API (`src/api/`)
- REST API for frontend
- Endpoints for: configuration CRUD, sync execution, status/logs
- WebSocket for real-time sync status updates

### 5. Frontend UI (`src/ui/`)
- Connection wizard (Bitrix24 + Listok setup)
- Field mapping editor (drag-and-drop)
- Sync rules configuration
- Dashboard with sync status and logs

## Database Schema

### integrations
- id, name, bitrix24_webhook_url, listok_api_key, enabled, created_at, updated_at

### field_mappings
- id, integration_id, source_entity, source_field, target_entity, target_field, transform_type, transform_params, default_value

### sync_rules
- id, integration_id, name, source_entity, target_entity, direction, field_mapping_ids, enabled

### sync_conditions
- id, rule_id, field, operator, value, logic

### sync_logs
- id, integration_id, rule_id, source_entity_id, target_entity_id, status, error_message, executed_at

## API Contract

### Frontend → Backend
```
GET    /api/integrations          - List all integrations
POST   /api/integrations          - Create integration
PUT    /api/integrations/:id      - Update integration
DELETE /api/integrations/:id      - Delete integration

GET    /api/integrations/:id/fields  - Get available fields for mapping
POST   /api/integrations/:id/sync    - Trigger manual sync
GET    /api/integrations/:id/status  - Get sync status
GET    /api/integrations/:id/logs    - Get sync logs
```

### Backend → Bitrix24
Uses Bitrix24 REST API (webhook):
- `crm.lead.list`, `crm.lead.add`, `crm.lead.update`, `crm.lead.delete`
- `crm.deal.list`, `crm.deal.add`, `crm.deal.update`, `crm.deal.delete`
- `crm.contact.list`, `crm.contact.add`, `crm.contact.update`, `crm.contact.delete`
- `crm.company.list`, `crm.company.add`, `crm.company.update`, `crm.company.delete`

### Backend → Listok
Uses Listok External API v2:
- `GET /api/external/v2/contacts` - List contacts
- `POST /api/external/v2/contacts` - Create contact
- `PUT /api/external/v2/contacts/{id}` - Update contact
- `GET /api/external/v2/groups` - List groups
- `GET /api/external/v2/events` - List events (requires date range)
- `GET /api/external/v2/passes` - List passes
- `GET /api/external/v2/payments` - List payments

## Sync Strategies

1. **Polling**: Periodic sync based on configured interval
2. **Event-driven**: Webhook-based triggers (when available)
3. **Manual**: User-triggered sync from UI

## Error Handling

- Retry with exponential backoff (max 3 retries)
- Dead letter queue for failed syncs
- Alerting on persistent failures
- Detailed error logging per sync operation

## Security

- API keys/tokens stored encrypted in DB
- HTTPS only
- CORS configured for frontend origin
- Rate limiting on API endpoints
- Input validation on all endpoints
