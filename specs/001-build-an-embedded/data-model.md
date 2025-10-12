# Data Model: Calendar Utilities Application

**Feature**: 001-build-an-embedded
**Date**: 2025-10-11
**Phase**: 1 - Design

## Overview

This document defines the data entities, storage schema, and relationships for the Calendar Utilities Application. All data is persisted in Google Sheets following the Sheet-Based Data Persistence principle from the constitution.

## Entity Definitions

### 1. UserConfiguration

**Purpose**: Stores user preferences and application settings

**Attributes**:
- `selectedCalendarId` (string): ID of the currently active calendar (default: "primary")
- `selectedCalendarName` (string): Display name of active calendar
- `lastSyncTimestamp` (datetime): Last successful operation timestamp
- `theme` (enum): UI theme preference ["light", "dark"] (default: "light")
- `defaultDateRange` (integer): Default analytics date range in days (default: 30)

**Storage**: Google Sheet "Config" (key-value pairs)

**Validation Rules**:
- `selectedCalendarId` must be valid calendar ID or "primary"
- `lastSyncTimestamp` must be valid ISO 8601 datetime
- `theme` must be one of allowed values
- `defaultDateRange` must be positive integer (1-365)

**State Transitions**: N/A (configuration only)

### 2. CalendarEvent

**Purpose**: Represents a calendar event from Google Calendar API

**Attributes**:
- `id` (string): Google Calendar event ID (unique)
- `calendarId` (string): Parent calendar ID
- `title` (string): Event title/summary
- `description` (string, optional): Event description/notes
- `startTime` (datetime): Event start date/time
- `endTime` (datetime): Event end date/time
- `color` (string, optional): Event color ID (1-11) or null
- `location` (string, optional): Event location
- `status` (enum): Event status ["confirmed", "tentative", "cancelled"]
- `isAllDay` (boolean): Whether event is all-day
- `recurrence` (array, optional): Recurrence rules (RRULE)
- `attendees` (array, optional): List of attendee email addresses

**Storage**: Fetched from Calendar API, not persisted (except in operation queue)

**Validation Rules**:
- `id` must be non-empty
- `startTime` < `endTime` (unless all-day event)
- `color` must be valid color ID (1-11) or null
- `status` must be one of allowed values

**Relationships**:
- Belongs to one Calendar (via `calendarId`)
- Can be referenced in BulkOperationQueue entries
- Can appear in AnalyticsReport computations

### 3. BulkOperationQueue

**Purpose**: Tracks queued bulk operations with progress

**Attributes**:
- `operationId` (string): Unique operation ID (UUID)
- `timestamp` (datetime): When operation was queued
- `operationType` (enum): ["delete", "changeColor", "moveCalendar"]
- `criteria` (object): Selection criteria JSON
  - `dateRangeStart` (datetime, optional)
  - `dateRangeEnd` (datetime, optional)
  - `keyword` (string, optional)
  - `colorId` (string, optional)
- `targetValue` (string, optional): New value (color ID for changeColor, calendar ID for moveCalendar)
- `status` (enum): ["pending", "processing", "completed", "failed"]
- `eventsAffected` (integer): Count of events matched
- `eventsProcessed` (integer): Count of events successfully processed
- `errorMessage` (string, optional): Error details if failed

**Storage**: Google Sheet "BulkOpQueue" (one row per operation)

**Validation Rules**:
- `operationId` must be unique
- `operationType` must be one of allowed values
- `criteria` must have at least one filter (dateRange, keyword, or color)
- `eventsProcessed` ≤ `eventsAffected`
- `status` transitions: pending → processing → completed/failed

**State Transitions**:
```
pending → processing (when queue starts)
processing → completed (all events processed successfully)
processing → failed (error occurs)
```

**Relationships**:
- References CalendarEvent entities (via criteria matching)

### 4. AnalyticsReport

**Purpose**: Computed analytics data for display

**Attributes**:
- `reportId` (string): Unique report ID
- `generatedAt` (datetime): When report was generated
- `dateRangeStart` (datetime): Analysis period start
- `dateRangeEnd` (datetime): Analysis period end
- `totalEvents` (integer): Total events in range
- `totalHours` (float): Total hours of events
- `categoryBreakdown` (array of objects): Time by category
  - `categoryName` (string): Category/color name
  - `eventCount` (integer): Events in this category
  - `totalHours` (float): Hours in this category
  - `percentage` (float): Percentage of total time
- `dayBreakdown` (array of objects): Events by day of week
  - `dayName` (string): Day name (Monday-Sunday)
  - `eventCount` (integer): Events on this day
- `busiestDay` (string): Day with most events
- `averageEventDuration` (float): Average event length in hours

**Storage**: Computed on-demand, not persisted (optionally cache in sheet for performance)

**Validation Rules**:
- `dateRangeStart` < `dateRangeEnd`
- `totalEvents` ≥ 0
- `totalHours` ≥ 0
- Sum of category percentages = 100%

**Relationships**:
- Aggregates CalendarEvent data

### 5. DuplicateGroup

**Purpose**: Groups duplicate events for cleanup utility

**Attributes**:
- `duplicateKey` (string): Composite key "title|startTime"
- `events` (array): List of duplicate CalendarEvent objects
- `duplicateCount` (integer): Number of duplicates (≥2)
- `keepEventId` (string, optional): Event ID to keep (user selected)
- `deleteEventIds` (array, optional): Event IDs to delete

**Storage**: Computed on-demand, not persisted

**Validation Rules**:
- `events` array must have ≥2 items
- `duplicateKey` must match pattern "title|startTime"
- If `keepEventId` set, must be in `events` array
- `deleteEventIds` must be subset of event IDs in `events` (excluding `keepEventId`)

**Relationships**:
- Aggregates CalendarEvent instances

### 6. Calendar (Reference)

**Purpose**: Represents a Google Calendar (from Calendar API)

**Attributes**:
- `id` (string): Calendar ID
- `summary` (string): Calendar name/title
- `backgroundColor` (string): Calendar color (hex)
- `accessRole` (enum): ["owner", "writer", "reader"]
- `isPrimary` (boolean): Whether this is the primary calendar

**Storage**: Fetched from Calendar API, cached in UserConfiguration

**Validation Rules**:
- `id` must be non-empty
- `accessRole` must be one of allowed values
- Only one calendar can have `isPrimary = true`

**Relationships**:
- One Calendar has many CalendarEvents

## Storage Schema

### Google Sheet: "Config"

| Column A (Setting) | Column B (Value) | Column C (Description) |
|-------------------|------------------|------------------------|
| selectedCalendarId | primary | Active calendar for utilities |
| selectedCalendarName | My Calendar | Display name of active calendar |
| lastSyncTimestamp | 2025-10-11T12:00:00Z | Last operation timestamp |
| theme | light | UI theme preference |
| defaultDateRange | 30 | Default analytics range (days) |

**Schema Management**:
- Row 1: Headers (frozen)
- Rows 2+: Configuration entries
- Named range: "ConfigData" = A2:C
- Access via: `getRange('ConfigData').getValues()`

### Google Sheet: "BulkOpQueue"

| Column A (OperationID) | Column B (Timestamp) | Column C (OpType) | Column D (Criteria) | Column E (TargetValue) | Column F (Status) | Column G (EventsAffected) | Column H (EventsProcessed) | Column I (Error) |
|------------------------|----------------------|-------------------|---------------------|------------------------|-------------------|---------------------------|----------------------------|------------------|
| uuid-1234-5678 | 2025-10-11T10:00:00Z | delete | {"keyword":"test"} | null | completed | 25 | 25 | null |

**Schema Management**:
- Row 1: Headers (frozen)
- Rows 2+: Operation entries
- Auto-prune completed operations older than 30 days
- Named range: "QueueData" = A2:I

## Entity Relationships

```
Calendar (1) ──── (N) CalendarEvent
                      │
                      │ (referenced by)
                      │
UserConfiguration ────┘
      │
      │ (stores selected)
      │
      └─────> Calendar (selected calendar)

CalendarEvent (N) ──── (1) BulkOperationQueue (criteria match)

CalendarEvent (N) ──── (1) AnalyticsReport (aggregated in)

CalendarEvent (N) ──── (1) DuplicateGroup (grouped in)
```

## Data Access Patterns

### Pattern 1: Load User Configuration (Startup)
```javascript
const configData = SheetService.getConfigData();
const config = {
  selectedCalendarId: configData.get('selectedCalendarId'),
  selectedCalendarName: configData.get('selectedCalendarName'),
  // ... other config
};
```

### Pattern 2: Fetch Calendar Events (Bulk Operations)
```javascript
const calendar = CalendarApp.getCalendarById(config.selectedCalendarId);
const events = calendar.getEvents(startDate, endDate); // Batch fetch
```

### Pattern 3: Queue Bulk Operation
```javascript
const operation = {
  operationId: Utilities.getUuid(),
  timestamp: new Date().toISOString(),
  operationType: 'delete',
  criteria: { keyword: 'test', dateRangeStart: '2025-01-01' },
  status: 'pending',
  eventsAffected: matchedEvents.length
};
SheetService.addQueueEntry(operation);
```

### Pattern 4: Process Queue with Progress
```javascript
while (queue.hasItems()) {
  const batch = queue.getNextBatch(100);
  batch.forEach(op => processOperation(op));
  const progress = { processed: queue.getProcessedCount(), total: queue.getTotalCount() };
  updateProgressIndicator(progress);
}
```

### Pattern 5: Compute Analytics
```javascript
const events = calendar.getEvents(startDate, endDate);
const analytics = AnalyticsService.computeReport(events, startDate, endDate);
// analytics contains aggregated metrics (no persistence)
```

### Pattern 6: Detect Duplicates
```javascript
const events = calendar.getEvents(startDate, endDate);
const duplicateGroups = CleanupService.findDuplicates(events);
// duplicateGroups = [{ duplicateKey: 'Meeting|timestamp', events: [...] }, ...]
```

## Data Integrity & Constraints

### Concurrency
- Apps Script is single-threaded per user session
- No concurrent write conflicts within same user session
- Multiple users: Each has separate config sheet (one per user)

### Data Retention
- Config: Persistent until user deletes
- BulkOpQueue: Auto-prune entries >30 days old
- CalendarEvent: Not persisted (fetched on-demand from Calendar API)
- AnalyticsReport: Not persisted (computed on-demand)
- DuplicateGroup: Not persisted (computed on-demand)

### Backup & Recovery
- Sheet data: Auto-backed up by Google Drive version history
- Calendar data: Source of truth is Google Calendar (read-only from app perspective)

## Migration Strategy

### Initial Deployment (First Run)
1. Check if "Config" sheet exists
2. If not, create with default schema
3. Populate default configuration
4. Create "BulkOpQueue" sheet with schema

### Schema Evolution (Future)
- Add new columns to right (preserves existing data)
- Use column headers for field lookup (avoid hard-coded column indexes)
- Provide migration function to add missing fields with defaults

**Example Migration**:
```javascript
function migrateConfigSchema() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Config');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Check if 'defaultDateRange' column exists
  if (!headers.includes('defaultDateRange')) {
    sheet.getRange(1, headers.length + 1).setValue('Setting');
    sheet.getRange(2, headers.length + 1, 1, 3).setValues([['defaultDateRange', '30', 'Default analytics range']]);
  }
}
```

## Performance Considerations

- **Batch Reads**: Use `getRange().getValues()` to fetch all config at once (not row-by-row)
- **Batch Writes**: Accumulate changes, write once with `setValues()`
- **Calendar API**: Fetch events in date ranges (not one-by-one by ID)
- **Caching**: Store calendar list in user properties to avoid repeated API calls
- **Indexing**: Use frozen header row for fast column lookup

## Security & Privacy

- **Sheet Access**: Config sheet shared only with script owner (user)
- **Sensitive Data**: No passwords, tokens, or PII stored (OAuth tokens managed by Apps Script)
- **Data Validation**: Sanitize all user inputs before sheet writes
- **Read-Only Calendar**: Bulk operations modify calendar, but sheet only logs metadata (not event contents)
