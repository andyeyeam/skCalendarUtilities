# API Specification: Calendar Utilities Application

**Feature**: 001-build-an-embedded
**Date**: 2025-10-11
**Phase**: 1 - Design

## Overview

This document defines the server-side function signatures and client-server communication contracts for the Calendar Utilities Application. The application uses Google Apps Script's `google.script.run` API for client-server communication.

## Communication Pattern

**Architecture**: Client (HTML/JavaScript) ↔ Server (Apps Script .gs files)

**Protocol**: `google.script.run` with callbacks
```javascript
// Client-side pattern
google.script.run
  .withSuccessHandler(successCallback)
  .withFailureHandler(errorCallback)
  .serverFunction(parameters);
```

## Server-Side Functions (Apps Script)

### 1. Application Initialization

#### `doGet()`
**Purpose**: Entry point for web app, serves initial HTML

**Signature**:
```javascript
function doGet(e) -> HtmlOutput
```

**Parameters**:
- `e` (object): Event parameter (query string, user info)

**Returns**:
- `HtmlOutput`: Menu page with OAuth authorization prompt if needed

**Behavior**:
1. Check OAuth authorization status
2. If not authorized: Trigger OAuth consent flow
3. If authorized: Initialize config sheet (first run)
4. Return main menu HTML

**Example**:
```javascript
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('ui/Menu');
  return template.evaluate()
    .setTitle('Calendar Utilities')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
```

---

### 2. Configuration Management

#### `getConfig()`
**Purpose**: Load user configuration from sheet

**Signature**:
```javascript
function getConfig() -> Object
```

**Returns**:
```javascript
{
  selectedCalendarId: string,
  selectedCalendarName: string,
  lastSyncTimestamp: string (ISO 8601),
  theme: string ("light" | "dark"),
  defaultDateRange: number
}
```

**Errors**:
- Sheet not found: Auto-creates with defaults
- Invalid data: Returns defaults

---

#### `updateConfig(key, value)`
**Purpose**: Update single configuration setting

**Signature**:
```javascript
function updateConfig(key: string, value: any) -> boolean
```

**Parameters**:
- `key` (string): Config setting name
- `value` (any): New value

**Returns**:
- `true` if successful
- `false` if validation fails

**Validation**:
- `key` must exist in schema
- `value` must match expected type

**Example**:
```javascript
updateConfig('selectedCalendarId', 'user@example.com#calendar-id');
updateConfig('defaultDateRange', 60);
```

---

### 3. Calendar Selection

#### `getAvailableCalendars()`
**Purpose**: Fetch list of user's calendars

**Signature**:
```javascript
function getAvailableCalendars() -> Array<Object>
```

**Returns**:
```javascript
[
  {
    id: string,
    name: string,
    color: string,
    accessRole: string ("owner" | "writer" | "reader"),
    isPrimary: boolean
  },
  ...
]
```

**Behavior**:
1. Fetch calendars from CalendarApp
2. Filter to calendars with write access (for bulk operations)
3. Sort: primary first, then alphabetically

**Example Response**:
```javascript
[
  { id: "primary", name: "My Calendar", color: "#4285f4", accessRole: "owner", isPrimary: true },
  { id: "work@example.com", name: "Work", color: "#e67c73", accessRole: "writer", isPrimary: false }
]
```

---

#### `selectCalendar(calendarId)`
**Purpose**: Set active calendar for utilities

**Signature**:
```javascript
function selectCalendar(calendarId: string) -> Object
```

**Parameters**:
- `calendarId` (string): Calendar ID to select

**Returns**:
```javascript
{
  success: boolean,
  calendarId: string,
  calendarName: string,
  error?: string
}
```

**Validation**:
- Calendar must exist and be accessible
- User must have write permissions

**Side Effects**:
- Updates `selectedCalendarId` and `selectedCalendarName` in config

---

### 4. Bulk Operations

#### `getBulkOperationCriteria(criteria)`
**Purpose**: Preview events matching bulk operation criteria

**Signature**:
```javascript
function getBulkOperationCriteria(criteria: Object) -> Object
```

**Parameters**:
```javascript
{
  dateRangeStart?: string (ISO 8601),
  dateRangeEnd?: string (ISO 8601),
  keyword?: string,
  colorId?: string
}
```

**Returns**:
```javascript
{
  matchedEvents: Array<{
    id: string,
    title: string,
    startTime: string,
    endTime: string,
    color: string
  }>,
  count: number,
  estimatedTime: number (seconds)
}
```

**Validation**:
- At least one criteria field must be provided
- `dateRangeStart` < `dateRangeEnd` if both provided
- `keyword` min length: 2 characters

---

#### `executeBulkOperation(operationType, criteria, targetValue)`
**Purpose**: Queue and execute bulk operation with progress tracking

**Signature**:
```javascript
function executeBulkOperation(
  operationType: string,
  criteria: Object,
  targetValue?: string
) -> string (operationId)
```

**Parameters**:
- `operationType` (string): "delete" | "changeColor" | "moveCalendar"
- `criteria` (object): Selection criteria (same as preview)
- `targetValue` (string, optional): New value (color ID or calendar ID)

**Returns**:
- `operationId` (string): UUID for tracking progress

**Behavior**:
1. Validate parameters
2. Fetch matching events
3. Create queue entry in sheet
4. Start background processing
5. Return operation ID immediately

**Errors**:
- Invalid operation type: throws Error
- No events matched: throws Error
- API quota exceeded: throws Error with retry guidance

---

#### `getBulkOperationProgress(operationId)`
**Purpose**: Check progress of running bulk operation

**Signature**:
```javascript
function getBulkOperationProgress(operationId: string) -> Object
```

**Parameters**:
- `operationId` (string): Operation ID from `executeBulkOperation`

**Returns**:
```javascript
{
  operationId: string,
  status: string ("pending" | "processing" | "completed" | "failed"),
  eventsAffected: number,
  eventsProcessed: number,
  percentComplete: number,
  errorMessage?: string
}
```

**Polling Pattern** (client-side):
```javascript
function pollProgress(operationId) {
  const interval = setInterval(() => {
    google.script.run
      .withSuccessHandler(result => {
        updateProgressBar(result.percentComplete);
        if (result.status === 'completed' || result.status === 'failed') {
          clearInterval(interval);
          showResult(result);
        }
      })
      .getBulkOperationProgress(operationId);
  }, 1000); // Poll every second
}
```

---

### 5. Analytics

#### `generateAnalytics(dateRangeStart, dateRangeEnd)`
**Purpose**: Compute analytics for specified date range

**Signature**:
```javascript
function generateAnalytics(
  dateRangeStart: string,
  dateRangeEnd: string
) -> Object
```

**Parameters**:
- `dateRangeStart` (string): ISO 8601 date
- `dateRangeEnd` (string): ISO 8601 date

**Returns**:
```javascript
{
  totalEvents: number,
  totalHours: number,
  categoryBreakdown: [
    {
      categoryName: string,
      eventCount: number,
      totalHours: number,
      percentage: number
    },
    ...
  ],
  dayBreakdown: [
    {
      dayName: string ("Monday" | "Tuesday" | ...),
      eventCount: number
    },
    ...
  ],
  busiestDay: string,
  averageEventDuration: number
}
```

**Performance**:
- Max date range: 365 days
- Max events processed: 10,000

**Validation**:
- `dateRangeStart` < `dateRangeEnd`
- Date range ≤ 365 days

---

### 6. Cleanup Utilities

#### `findDuplicates(dateRangeStart, dateRangeEnd)`
**Purpose**: Detect duplicate events in date range

**Signature**:
```javascript
function findDuplicates(
  dateRangeStart: string,
  dateRangeEnd: string
) -> Array<Object>
```

**Parameters**:
- `dateRangeStart` (string): ISO 8601 date
- `dateRangeEnd` (string): ISO 8601 date

**Returns**:
```javascript
[
  {
    duplicateKey: string,
    events: [
      {
        id: string,
        title: string,
        startTime: string,
        endTime: string,
        calendarId: string
      },
      ...
    ],
    duplicateCount: number
  },
  ...
]
```

**Algorithm**:
- Match criteria: Exact title + start time match
- Groups events by composite key `"title|startTime"`
- Returns only groups with 2+ events

---

#### `deleteDuplicates(duplicateGroups)`
**Purpose**: Delete selected duplicate events

**Signature**:
```javascript
function deleteDuplicates(duplicateGroups: Array<Object>) -> Object
```

**Parameters**:
```javascript
[
  {
    keepEventId: string,
    deleteEventIds: Array<string>
  },
  ...
]
```

**Returns**:
```javascript
{
  totalDeleted: number,
  errors: Array<{
    eventId: string,
    error: string
  }>
}
```

**Behavior**:
1. Validate `keepEventId` exists
2. Validate `deleteEventIds` are unique
3. Delete events one group at a time
4. Continue on error (report at end)

---

### 7. Navigation & UI

#### `loadUtility(utilityName)`
**Purpose**: Load utility HTML for full-screen display

**Signature**:
```javascript
function loadUtility(utilityName: string) -> string (HTML)
```

**Parameters**:
- `utilityName` (string): "BulkOps" | "Analytics" | "Cleanup"

**Returns**:
- HTML string for utility interface

**Behavior**:
1. Validate utility name
2. Load corresponding HTML template
3. Inject config data
4. Return rendered HTML

---

#### `loadMenu()`
**Purpose**: Return to main menu

**Signature**:
```javascript
function loadMenu() -> string (HTML)
```

**Returns**:
- HTML string for menu interface

---

### 8. Error Handling

#### `logError(error, context)`
**Purpose**: Log client-side errors to server

**Signature**:
```javascript
function logError(error: Object, context: string) -> void
```

**Parameters**:
- `error` (object): Error object with message, stack
- `context` (string): Where error occurred (e.g., "BulkOps:preview")

**Behavior**:
- Logs to Apps Script Logger
- No return value

---

## Client-Side Contracts

### Success Handlers

All `google.script.run` calls should include success and failure handlers:

```javascript
google.script.run
  .withSuccessHandler(result => {
    // Handle success
    console.log('Success:', result);
  })
  .withFailureHandler(error => {
    // Handle error
    console.error('Error:', error.message);
    displayError(error.message);
  })
  .serverFunction(params);
```

### Error Response Format

Server-side errors are caught and returned as:
```javascript
{
  error: true,
  message: string,
  code?: string ("QUOTA_EXCEEDED" | "PERMISSION_DENIED" | "INVALID_INPUT")
}
```

### Loading States

Client should show loading indicators during async operations:
```javascript
function callServerFunction() {
  showLoadingSpinner();

  google.script.run
    .withSuccessHandler(result => {
      hideLoadingSpinner();
      // Process result
    })
    .withFailureHandler(error => {
      hideLoadingSpinner();
      showError(error);
    })
    .serverFunction();
}
```

## OAuth Scopes

Required scopes in `appsscript.json`:
```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

## Rate Limiting

**Calendar API Quotas**:
- 20,000 calls/day per user
- 10 calls/second burst limit

**Mitigation**:
- Batch fetch events (date range queries)
- Queue bulk operations
- Exponential backoff on rate limit errors

**Client Behavior on Quota Exceeded**:
```javascript
// Server returns error
{
  error: true,
  code: "QUOTA_EXCEEDED",
  message: "Calendar API quota exceeded. Try again later.",
  retryAfter: 3600 (seconds)
}

// Client displays user-friendly message
"You've reached the daily limit for calendar operations. Please try again in 1 hour."
```

## Security

**Input Validation** (server-side):
- Sanitize all user inputs
- Validate data types and ranges
- Check permissions before operations

**Output Encoding** (client-side):
- Use `HtmlService` template escaping
- Never use `innerHTML` with server data
- Use `textContent` or jQuery `.text()`

**CSRF Protection**:
- Apps Script provides built-in CSRF tokens
- No additional protection needed

## Testing Endpoints

For manual testing, create a test harness:

```javascript
function testBulkOperationPreview() {
  const criteria = {
    dateRangeStart: '2025-01-01',
    dateRangeEnd: '2025-01-31',
    keyword: 'meeting'
  };

  const result = getBulkOperationCriteria(criteria);
  Logger.log(result);
}
```

## Deployment Configuration

`appsscript.json`:
```json
{
  "timeZone": "America/New_York",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request"
  ],
  "webapp": {
    "executeAs": "USER_ACCESSING",
    "access": "ANYONE_WITH_LINK"
  }
}
```
