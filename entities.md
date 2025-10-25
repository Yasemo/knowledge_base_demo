# Exhaustive JSON Structures for Schema and Content Card Entities

## Content Card Schema Entity

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Task",
  "description": "A structured task with priority, status, and assignee tracking",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "organization_id": "789e0123-e45b-67c8-d901-234567890abc",
  "is_extension": false,
  "created_at": "2024-02-20T10:00:00Z",
  "updated_at": "2024-02-25T14:30:00Z",
  "field_definitions": {
    "fields": [
      {
        "name": "title",
        "type": "text",
        "label": "Task Title",
        "description": "Brief description of the task",
        "required": true,
        "max_length": 200,
        "display_order": 1,
        "validation_rules": {
          "min_length": 3,
          "pattern": null
        }
      },
      {
        "name": "priority",
        "type": "select",
        "label": "Priority Level",
        "description": "Urgency of the task",
        "required": true,
        "options": [
          {
            "value": "critical",
            "label": "Critical",
            "color": "#f44336"
          },
          {
            "value": "high",
            "label": "High",
            "color": "#ff9800"
          },
          {
            "value": "medium",
            "label": "Medium",
            "color": "#2196f3"
          },
          {
            "value": "low",
            "label": "Low",
            "color": "#4caf50"
          }
        ],
        "default_value": "medium",
        "display_order": 2
      },
      {
        "name": "status",
        "type": "select",
        "label": "Status",
        "description": "Current state of the task",
        "required": true,
        "options": [
          {
            "value": "backlog",
            "label": "Backlog",
            "color": "#9e9e9e"
          },
          {
            "value": "in_progress",
            "label": "In Progress",
            "color": "#2196f3"
          },
          {
            "value": "review",
            "label": "In Review",
            "color": "#ff9800"
          },
          {
            "value": "done",
            "label": "Done",
            "color": "#4caf50"
          },
          {
            "value": "blocked",
            "label": "Blocked",
            "color": "#f44336"
          }
        ],
        "default_value": "backlog",
        "display_order": 3
      },
      {
        "name": "assignee",
        "type": "text",
        "label": "Assigned To",
        "description": "Person responsible for this task",
        "required": false,
        "max_length": 100,
        "display_order": 4
      },
      {
        "name": "due_date",
        "type": "date",
        "label": "Due Date",
        "description": "When this task should be completed",
        "required": false,
        "display_order": 5,
        "validation_rules": {
          "min_date": "today",
          "max_date": null
        }
      },
      {
        "name": "estimated_hours",
        "type": "number",
        "label": "Estimated Hours",
        "description": "Estimated time to complete",
        "required": false,
        "display_order": 6,
        "validation_rules": {
          "min": 0,
          "max": 1000,
          "step": 0.5
        }
      },
      {
        "name": "tags",
        "type": "multi_select",
        "label": "Tags",
        "description": "Categorization tags",
        "required": false,
        "options": [
          {
            "value": "frontend",
            "label": "Frontend",
            "color": "#e91e63"
          },
          {
            "value": "backend",
            "label": "Backend",
            "color": "#9c27b0"
          },
          {
            "value": "database",
            "label": "Database",
            "color": "#3f51b5"
          },
          {
            "value": "ui_ux",
            "label": "UI/UX",
            "color": "#00bcd4"
          },
          {
            "value": "bug",
            "label": "Bug Fix",
            "color": "#f44336"
          }
        ],
        "display_order": 7
      },
      {
        "name": "content",
        "type": "markdown",
        "label": "Task Details",
        "description": "Full description and details of the task",
        "required": true,
        "is_primary_content": true,
        "display_order": 8,
        "rendering_options": {
          "allow_html": false,
          "allow_special_blocks": true,
          "supported_blocks": [
            "code",
            "mermaid",
            "dataviz:table",
            "dataviz:bar-chart",
            "dataviz:line-chart"
          ]
        }
      }
    ],
    "metadata": {
      "version": "1.2.0",
      "changelog": [
        {
          "version": "1.2.0",
          "date": "2024-02-25T14:30:00Z",
          "changes": "Added multi_select tags field"
        },
        {
          "version": "1.1.0",
          "date": "2024-02-15T09:00:00Z",
          "changes": "Added estimated_hours field"
        },
        {
          "version": "1.0.0",
          "date": "2024-02-01T10:00:00Z",
          "changes": "Initial schema creation"
        }
      ]
    }
  }
}
```

## Content Card Entity (Task Example)

```json
{
  "id": "660e9511-f30c-52e5-b827-557766551111",
  "schema_id": "550e8400-e29b-41d4-a716-446655440000",
  "schema_name": "Task",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "project_id": "456e7890-e12b-34d5-a678-901234567def",
  "created_at": "2024-02-26T08:30:00Z",
  "updated_at": "2024-02-26T15:45:00Z",
  "last_refreshed_at": null,
  "is_refreshable": false,
  "token_count": 487,
  "data": {
    "title": "Implement Content Card Refresh Mechanism",
    "priority": "high",
    "status": "in_progress",
    "assignee": "Yaseen",
    "due_date": "2024-03-01",
    "estimated_hours": 8,
    "tags": ["backend", "database"]
  },
  "content": "## Task Description\n\nBuild the refresh mechanism for extension-generated content cards, allowing them to update their data from the original API source.\n\n### Requirements\n\n- Add refresh endpoint to backend API\n- Store origin data for all extension cards\n- Implement scheduling system for automatic refreshes\n- Add UI button for manual refresh\n- Handle refresh failures gracefully\n\n### Technical Approach\n\nThe refresh system will:\n\n1. Query the `origin_data` field to get original API parameters\n2. Re-execute the API call with the same parameters\n3. Update the `data` and `content` fields with new results\n4. Update `last_refreshed_at` timestamp\n\n### Implementation Steps\n\n```javascript\nasync function refreshContentCard(cardId) {\n  const card = await db.getContentCard(cardId);\n  \n  if (!card.origin_data) {\n    throw new Error('Card is not refreshable');\n  }\n  \n  const extension = extensions[card.origin_data.extension_name];\n  const newData = await extension.fetch(card.origin_data.params);\n  \n  await db.updateContentCard(cardId, {\n    data: newData,\n    content: newData.formatted_content,\n    last_refreshed_at: new Date()\n  });\n}\n```\n\n### Acceptance Criteria\n\n- [ ] Manual refresh works for all extension types\n- [ ] Scheduled refreshes run reliably\n- [ ] Error handling prevents data corruption\n- [ ] UI shows last refresh timestamp\n- [ ] Failed refreshes are logged and retried",
  "origin_data": null,
  "metadata": {
    "version": "1.0.0",
    "created_by_extension": false,
    "edit_history": [
      {
        "timestamp": "2024-02-26T08:30:00Z",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "action": "created",
        "changes": null
      },
      {
        "timestamp": "2024-02-26T15:45:00Z",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "action": "updated",
        "changes": {
          "fields_modified": ["status", "content"],
          "previous_values": {
            "status": "backlog"
          }
        }
      }
    ],
    "references": {
      "related_cards": ["770e0622-g41d-63f6-c938-668877662222"],
      "mentioned_in_chats": ["890e1733-h52e-74g7-d049-779988773333"]
    }
  }
}
```

## Content Card Entity (Perplexity Extension Example)

```json
{
  "id": "770e0622-g41d-63f6-c938-668877662222",
  "schema_id": "661e0511-f41d-52e5-b827-557766552222",
  "schema_name": "Perplexity Search",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "project_id": "456e7890-e12b-34d5-a678-901234567def",
  "created_at": "2024-02-26T10:15:00Z",
  "updated_at": "2024-02-26T10:15:00Z",
  "last_refreshed_at": "2024-02-26T10:15:00Z",
  "is_refreshable": true,
  "token_count": 1243,
  "data": {
    "query": "latest AI developments December 2024",
    "model": "sonar-medium-online",
    "search_date": "2024-02-26T10:15:00Z",
    "result_count": 15,
    "citations": [
      "https://openai.com/blog/chatgpt-o1",
      "https://www.anthropic.com/news/claude-3-5-sonnet",
      "https://deepmind.google/discover/blog/"
    ],
    "confidence_score": 0.92
  },
  "content": "## Search Results: Latest AI Developments\n\n**Query:** latest AI developments December 2024  \n**Model:** sonar-medium-online  \n**Search Date:** February 26, 2024, 10:15 AM UTC\n\n### Major Developments\n\n#### OpenAI o1 Model Release\n\nOpenAI released the o1 model series, featuring enhanced reasoning capabilities through reinforcement learning. Key improvements include:\n\n- Chain-of-thought reasoning visible to users\n- Significantly better performance on complex math and coding tasks\n- Reduced hallucinations on factual queries\n\n#### Claude 3.5 Sonnet Updates\n\nAnthropic updated Claude 3.5 Sonnet with:\n\n- Improved coding capabilities\n- Better instruction following\n- Enhanced safety features\n- Computer use capabilities (beta)\n\n### Citations\n\n1. [OpenAI o1 Announcement](https://openai.com/blog/chatgpt-o1)\n2. [Claude 3.5 Sonnet Update](https://www.anthropic.com/news/claude-3-5-sonnet)\n3. [Gemini 1.5 Pro Blog](https://deepmind.google/discover/blog/)\n\n---\n\n*This card can be refreshed to get the latest information. Last refreshed: February 26, 2024*",
  "origin_data": {
    "extension_name": "perplexity",
    "extension_version": "1.0.0",
    "api_endpoint": "https://api.perplexity.ai/chat/completions",
    "request_timestamp": "2024-02-26T10:15:00Z",
    "request_params": {
      "model": "sonar-medium-online",
      "messages": [
        {
          "role": "user",
          "content": "latest AI developments December 2024"
        }
      ],
      "max_tokens": 2000,
      "temperature": 0.2,
      "return_citations": true
    },
    "response_metadata": {
      "request_id": "req_abc123xyz789",
      "processing_time_ms": 3421,
      "tokens_used": {
        "prompt": 15,
        "completion": 1228,
        "total": 1243
      }
    },
    "refresh_config": {
      "enabled": true,
      "schedule": "daily",
      "next_refresh": "2024-02-27T10:15:00Z",
      "max_retries": 3,
      "retry_delay_seconds": 300
    }
  },
  "metadata": {
    "version": "1.0.0",
    "created_by_extension": true,
    "edit_history": [
      {
        "timestamp": "2024-02-26T10:15:00Z",
        "user_id": "123e4567-e89b-12d3-a456-426614174000",
        "action": "created_from_extension",
        "changes": null
      }
    ],
    "references": {
      "related_cards": [],
      "mentioned_in_chats": ["890e1733-h52e-74g7-d049-779988773333"]
    },
    "refresh_history": [
      {
        "timestamp": "2024-02-26T10:15:00Z",
        "status": "success",
        "changes_detected": false,
        "error": null
      }
    ]
  }
}
```

## Field Type Definitions Reference

```json
{
  "supported_field_types": [
    {
      "type": "text",
      "description": "Single-line text input",
      "validation_options": ["required", "min_length", "max_length", "pattern"],
      "storage_type": "string"
    },
    {
      "type": "textarea",
      "description": "Multi-line text input",
      "validation_options": ["required", "min_length", "max_length"],
      "storage_type": "string"
    },
    {
      "type": "markdown",
      "description": "Rich markdown content with special block support",
      "validation_options": ["required"],
      "storage_type": "string",
      "special_properties": ["is_primary_content", "allow_html", "allow_special_blocks"]
    },
    {
      "type": "number",
      "description": "Numeric input (integer or decimal)",
      "validation_options": ["required", "min", "max", "step"],
      "storage_type": "number"
    },
    {
      "type": "date",
      "description": "Date picker",
      "validation_options": ["required", "min_date", "max_date"],
      "storage_type": "string (ISO 8601)"
    },
    {
      "type": "datetime",
      "description": "Date and time picker",
      "validation_options": ["required", "min_datetime", "max_datetime"],
      "storage_type": "string (ISO 8601)"
    },
    {
      "type": "select",
      "description": "Single selection dropdown",
      "validation_options": ["required", "options"],
      "storage_type": "string",
      "required_properties": ["options"]
    },
    {
      "type": "multi_select",
      "description": "Multiple selection dropdown",
      "validation_options": ["required", "options", "min_selections", "max_selections"],
      "storage_type": "array of strings",
      "required_properties": ["options"]
    },
    {
      "type": "boolean",
      "description": "Checkbox or toggle",
      "validation_options": ["required"],
      "storage_type": "boolean"
    },
    {
      "type": "url",
      "description": "URL input with validation",
      "validation_options": ["required", "allowed_protocols"],
      "storage_type": "string"
    },
    {
      "type": "email",
      "description": "Email input with validation",
      "validation_options": ["required"],
      "storage_type": "string"
    },
    {
      "type": "json",
      "description": "Raw JSON data",
      "validation_options": ["required", "schema"],
      "storage_type": "object"
    }
  ]
}
```

These exhaustive structures show all the key properties and metadata that your schema and content card entities should support, Yaseen. The structures include validation rules, versioning, edit history, refresh capabilities, and all the metadata needed for a robust content management system.