# Connection Policies

## Overview

**Connection Policies** control external access to Symposium via API. They
enable external systems to read or write cards without full authentication.

```
Policy = Connection String + Access Type + Scope

Types:
  - Output: External systems fetch cards
  - Input: External systems create cards
```

## Structure

```json
{
  "id": "policy-uuid",
  "user_id": "user-uuid",
  "name": "External Dashboard Access",
  "description": "Read-only access for company dashboard",
  "policy_type": "output",
  "connection_string": "sym_abc123def456ghi789",
  "view_ids": ["published-view-uuid", "metrics-view-uuid"],
  "schema_id": null,
  "tags": ["public-uuid"],
  "is_active": true,
  "expires_at": "2025-12-31T23:59:59Z",
  "access_count": 1247,
  "last_accessed_at": "2024-10-30T14:30:00Z",
  "created_at": "2024-01-01T00:00:00Z"
}
```

## Policy Types

### Output Policies

**Purpose**: External systems fetch filtered cards

```
External System Request:
  GET /api/external/cards?connection=sym_abc123...
  
System:
  1. Validate connection string
  2. Check policy active & not expired
  3. Apply view filters
  4. Return filtered cards as JSON
  5. Increment access_count
```

**Use Cases**:

- Dashboard integration
- Mobile app access
- Third-party analytics
- Public API endpoints

### Input Policies

**Purpose**: External systems create cards

```
External System Request:
  POST /api/external/cards?connection=sym_xyz789...
  Body: { schema_id, data, content, tags }
  
System:
  1. Validate connection string
  2. Check policy active & not expired
  3. Verify schema_id matches policy
  4. Validate card data
  5. Create card
  6. Return created card
  7. Increment access_count
```

**Use Cases**:

- Form submissions
- Webhook receivers
- IoT device data
- Integration pipelines

## Connection Strings

### Format

```
sym_[random_alphanumeric_40_chars]

Example:
sym_abc123def456ghi789jkl012mno345pqr678
```

### Generation

```
1. Generate cryptographically random token
2. Prefix with 'sym_' for identification
3. Store hashed version in database
4. Display once to user (copy to clipboard)
5. Cannot be retrieved later
```

### Security

```
Connection String is:
  ✓ Long and random (hard to guess)
  ✓ Stored hashed in database
  ✓ Rate-limited
  ✓ Can be revoked instantly
  ✓ Can have expiration
  ✗ Not encrypted in transit (use HTTPS)
  ✗ Not as secure as OAuth
```

## Access Control

### Scope Definition

**Output Policy Scope**:

```json
{
  "view_ids": ["view1-uuid", "view2-uuid"],
  "tags": ["public-uuid"],
  "card_types": ["manual", "source"]
}
```

Only cards matching ALL criteria are accessible.

**Input Policy Scope**:

```json
{
  "schema_id": "form-submission-uuid",
  "tags": ["external-uuid"]
}
```

External systems can only create cards with this schema and these tags.

### Expiration

```json
{
  "expires_at": "2025-12-31T23:59:59Z"
}
```

After expiration:

- Policy becomes inactive
- Connection string rejected
- Can be extended before expiration
- Expired policies kept for audit

### Revocation

```
Instant Revocation:
  - Set is_active = false
  - All requests immediately rejected
  - No grace period
  - Can be reactivated if needed
```

## API Endpoints

### Fetch Cards (Output Policy)

```
GET /api/external/cards?connection=sym_abc123...

Query Parameters:
  - connection (required): Connection string
  - limit: Max cards (default 50, max 100)
  - offset: Pagination offset
  - sort: Sort field (created_at, updated_at)
  - order: asc or desc

Response:
{
  "cards": [...],
  "total": 123,
  "limit": 50,
  "offset": 0
}
```

### Create Card (Input Policy)

```
POST /api/external/cards?connection=sym_xyz789...

Body:
{
  "data": {
    "field1": "value1",
    "field2": "value2"
  },
  "content": "# Markdown content",
  "tags": ["tag-uuid"] // optional, merged with policy tags
}

Response:
{
  "id": "card-uuid",
  "created_at": "2024-10-30T15:00:00Z",
  "url": "/cards/card-uuid"
}
```

## Monitoring

### Access Tracking

```
Per Policy:
  - access_count: Total requests
  - last_accessed_at: Most recent access
  - Detailed access logs (optional)

Access Log Entry:
{
  "timestamp": "2024-10-30T15:00:00Z",
  "ip_address": "192.168.1.1",
  "user_agent": "Dashboard/1.0",
  "endpoint": "/api/external/cards",
  "cards_returned": 25,
  "response_time_ms": 45
}
```

### Rate Limiting

```
Per Connection String:
  - 100 requests per minute
  - 10,000 requests per day
  - Sliding window

Exceeded:
  - 429 Too Many Requests
  - Retry-After header
  - Exponential backoff recommended
```

### Alerts

```
Trigger alerts when:
  - Unusual access patterns
  - Rate limit exceeded repeatedly
  - Access from new IPs
  - Failed authentication attempts > 10
```

## Security Best Practices

### For Users

- **Rotate Regularly**: Change connection strings periodically
- **Minimal Scope**: Only grant necessary access
- **Monitor Usage**: Review access logs
- **Set Expiration**: Don't use permanent policies
- **Revoke Unused**: Disable old integrations

### For External Systems

- **Store Securely**: Treat like passwords
- **Use HTTPS**: Always encrypt in transit
- **Handle Errors**: Respect rate limits
- **Log Access**: Track API usage
- **Rotate on Compromise**: Get new string if exposed

## Use Cases

### Public Dashboard

```
Policy Type: Output
Scope: view_ids = ["metrics-view"]
Expiration: None (long-lived)
Use: Company dashboard showing KPIs
```

### Form Integration

```
Policy Type: Input
Scope: schema_id = "contact-form"
Expiration: None (active form)
Use: Website contact form submissions
```

### Mobile App

```
Policy Type: Output
Scope: view_ids = ["mobile-view"]
Expiration: 1 year
Use: Mobile app reads user's cards
```

### Webhook Receiver

```
Policy Type: Input
Scope: schema_id = "webhook-event"
Expiration: None
Use: Receive events from external service
```

---

**Next**: [Data Flow Examples](13-data-flow-examples.md)
