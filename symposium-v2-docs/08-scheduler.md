# Scheduler

## Overview

The **Global Scheduler** orchestrates all time-based executions. It runs
continuously, checking for due sources, queries, and outputs.

```
Every 30 seconds:
  Check all scheduled entities → Execute if due → Update next_run_at
```

## Architecture

```
┌─────────────────────────────────────┐
│       GLOBAL SCHEDULER              │
├─────────────────────────────────────┤
│  Monitors:                          │
│    - Sources (schedule_enabled)     │
│    - Queries (schedule_enabled)     │
│    - Outputs (schedule_enabled)     │
├─────────────────────────────────────┤
│  Every 30 seconds:                  │
│    1. Query due entities            │
│    2. Execute in priority order     │
│    3. Update next_run_at            │
│    4. Handle errors                 │
└─────────────────────────────────────┘
```

## Execution Loop

```sql
-- Query for due sources
SELECT * FROM sources
WHERE schedule_enabled = true
  AND is_active = true
  AND next_run_at <= NOW()
ORDER BY next_run_at ASC;

-- Query for due queries
SELECT * FROM queries
WHERE schedule_enabled = true
  AND is_active = true
  AND next_run_at <= NOW()
ORDER BY next_run_at ASC;

-- Query for due outputs
SELECT * FROM outputs
WHERE schedule_enabled = true
  AND is_active = true
  AND next_run_at <= NOW()
ORDER BY next_run_at ASC;
```

## Cron Processing

### Calculation

```
Input:
  cron = "0 9 * * *"
  timezone = "America/Toronto"
  current_time = "2024-10-30T14:30:00Z" (9:30am Toronto)

Process:
  1. Parse cron expression
  2. Find next occurrence after current_time
  3. Apply timezone conversion
  4. Store as UTC

Output:
  next_run_at = "2024-10-31T13:00:00Z" (9am Toronto next day)
```

### Edge Cases

```
Daylight Saving Time:
  - Always use timezone-aware calculations
  - next_run_at adjusts automatically

Past Due:
  - If next_run_at in past, execute immediately
  - Calculate new next_run_at from NOW()

Multiple Due:
  - Execute in order of next_run_at
  - Spread over time to avoid spikes
```

## Priority & Queue

### Priority Order

```
1. Outputs (deliver to external systems)
2. Sources (data collection)
3. Queries (aggregation, depends on sources)
```

### Rate Limiting

```
Per Integration Instance:
  - Track requests in rolling 60-second window
  - Queue if approaching rate limit
  - Execute when capacity available
  - Never fail due to rate limit, just delay
```

### Concurrency

```
Parallel Execution:
  - Different integration types → parallel
  - Same integration type → respect rate limits
  - Configurable worker pool size

Sequential for Safety:
  - Same source in multiple queries
  - Dependent operations
```

## Error Handling

```
Execution Failure:
  ↓
Log Error Details
  ↓
Update Entity Status
  ├── Increment failure_count
  ├── Set last_execution_status = 'failure'
  └── If failures >= threshold: Set is_active = false
  ↓
Calculate Next Run
  ├── Continue schedule (don't skip)
  ├── Will retry on next occurrence
  └── User can manually intervene
  ↓
Notify User (if needed)
  └── Persistent failures → email/notification
```

## Monitoring

### Key Metrics

```
Scheduler Health:
  - Executions per minute
  - Average execution time
  - Queue depth
  - Lag (time between due and execution)

Per Entity:
  - Success rate
  - Average duration
  - Last successful execution
  - Consecutive failures
```

### Alerts

```
Trigger alerts when:
  - Scheduler lag > 5 minutes
  - Queue depth > 100
  - Entity failure rate > 20%
  - Execution time anomalies
```

## Scalability

### Distributed Scheduling

```
Multiple Scheduler Instances:
  1. Use advisory locks (PostgreSQL)
  2. Each instance tries to claim execution
  3. Only one succeeds
  4. Others move to next item

Benefits:
  - High availability
  - Load distribution
  - No single point of failure
```

### Database Optimization

```sql
-- Efficient indexes for scheduler queries
CREATE INDEX idx_sources_schedule 
  ON sources(next_run_at) 
  WHERE schedule_enabled AND is_active;

CREATE INDEX idx_queries_schedule 
  ON queries(next_run_at) 
  WHERE schedule_enabled AND is_active;

CREATE INDEX idx_outputs_schedule 
  ON outputs(next_run_at) 
  WHERE schedule_enabled AND is_active;
```

## Best Practices

- **Stagger Schedules**: Avoid many entities at same time
- **Monitor Lag**: Keep execution close to scheduled time
- **Reasonable Frequencies**: Not everything needs to be every minute
- **Error Budgets**: Some failures acceptable, persistent failures are not
- **Graceful Degradation**: Queue if overloaded, don't drop

---

**Next**: [Filtering & Views](09-filtering-views.md)
