# Data Model: Calendar Event Display

**Feature**: 004-i-would-like
**Created**: 2025-01-13
**Purpose**: Define data structures for calendar events and enhanced availability response

## Entities

### CalendarEvent

Represents a scheduled calendar event fetched from Google Calendar.

**Purpose**: Store calendar event data with formatted display strings for client-side rendering.

**Fields**:

| Field | Type | Description | Validation | Example |
|-------|------|-------------|------------|---------|
| `title` | String | Event title from calendar | Non-empty string; max 200 chars | "Team Standup" |
| `startTime` | Date | Event start date/time | Valid Date object | Date("2025-01-15T10:00:00") |
| `endTime` | Date | Event end date/time | Valid Date object; must be >= startTime | Date("2025-01-15T10:30:00") |
| `isAllDay` | Boolean | True if all-day event | Boolean | false |
| `date` | String | ISO date string (YYYY-MM-DD) | ISO 8601 date format | "2025-01-15" |
| `formattedStart` | String | 12-hour formatted start time | h:mm AM/PM format | "10:00 AM" |
| `formattedEnd` | String | 12-hour formatted end time | h:mm AM/PM format | "10:30 AM" |
| `formattedDuration` | String | Human-readable duration | "{n} min" format | "30 min" |
| `displayTitle` | String | Truncated title for display | Max 40 chars with ellipsis if needed | "Team Standup" |

**Relationships**:
- Belongs to same calendar as available time slots
- No direct relationship to TimeSlot entities (independent data)
- Grouped by `date` field for display (same as TimeSlot grouping)

**State Transitions**: None (read-only data)

**Validation Rules**:
- `startTime` must be before `endTime` (unless `isAllDay` is true)
- `date` must match the calendar date portion of `startTime`
- `displayTitle` length <= 40 characters
- All formatted fields must be populated (non-null, non-empty)

**Example Instance**:
```javascript
{
  title: "Team Standup Meeting",
  startTime: Date("2025-01-15T10:00:00"),
  endTime: Date("2025-01-15T10:30:00"),
  isAllDay: false,
  date: "2025-01-15",
  formattedStart: "10:00 AM",
  formattedEnd: "10:30 AM",
  formattedDuration: "30 min",
  displayTitle: "Team Standup Meeting"
}
```

**All-Day Event Example**:
```javascript
{
  title: "Company Holiday",
  startTime: Date("2025-01-15T00:00:00"),
  endTime: Date("2025-01-16T00:00:00"),
  isAllDay: true,
  date: "2025-01-15",
  formattedStart: "All Day",
  formattedEnd: "All Day",
  formattedDuration: "All Day",
  displayTitle: "Company Holiday"
}
```

### Enhanced AvailabilityResponse

Extends the existing availability response to include calendar events.

**Purpose**: Return both available slots and calendar events in a single server response.

**Fields**:

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `success` | Boolean | True if request succeeded | true |
| `slots` | Array\<TimeSlot\> | Available time slots (existing) | [...] |
| `events` | Array\<CalendarEvent\> | Calendar events for date range (NEW) | [...] |
| `metadata` | Object | Search metadata (existing) | { dateRange: {...}, totalSlotsFound: 12, ... } |
| `eventsError` | String (optional) | Error message if event fetch failed (NEW) | "Calendar access denied" |
| `error` | String (optional) | Error message if entire request failed (existing) | null |

**Enhanced Metadata**:

The existing `metadata` object remains unchanged, but context is enhanced:
- `totalSlotsFound`: Count of available slots (unchanged)
- `totalEventsFound` (NEW): Count of calendar events retrieved
- `workingDaysCount`: Number of working days in range (unchanged)
- `dateRange`: Start and end dates (unchanged)

**Example Response (Success)**:
```javascript
{
  success: true,
  slots: [
    {
      date: "2025-01-15",
      startTime: Date("2025-01-15T09:00:00"),
      endTime: Date("2025-01-15T09:30:00"),
      formattedStart: "9:00 AM",
      formattedEnd: "9:30 AM",
      formattedDuration: "30 min",
      durationMinutes: 30
    },
    // ... more slots
  ],
  events: [
    {
      title: "Team Standup",
      startTime: Date("2025-01-15T10:00:00"),
      endTime: Date("2025-01-15T10:30:00"),
      isAllDay: false,
      date: "2025-01-15",
      formattedStart: "10:00 AM",
      formattedEnd: "10:30 AM",
      formattedDuration: "30 min",
      displayTitle: "Team Standup"
    },
    // ... more events
  ],
  metadata: {
    dateRange: {
      start: "2025-01-15T09:00:00",
      end: "2025-01-19T17:30:00"
    },
    workingDaysCount: 5,
    totalSlotsFound: 12,
    totalEventsFound: 8
  }
}
```

**Example Response (Events Failed, Slots Succeeded)**:
```javascript
{
  success: true,
  slots: [ /* ... available slots ... */ ],
  events: [],
  eventsError: "Calendar access denied. Showing availability only.",
  metadata: {
    dateRange: { /* ... */ },
    workingDaysCount: 5,
    totalSlotsFound: 12,
    totalEventsFound: 0
  }
}
```

**Example Response (Complete Failure)**:
```javascript
{
  success: false,
  error: "Start date must be before end date",
  slots: [],
  events: []
}
```

## Data Flow

### Server-Side (Google Apps Script)

1. **Input**: `findAvailability(startDateTime, endDateTime, minDuration)` function called from client
2. **Fetch Events**: `CalendarEventService.fetchCalendarEvents(calendar, startDate, endDate)` returns raw CalendarEvent objects from Google Calendar API
3. **Format Events**: `CalendarEventService.formatEvents(rawEvents)` transforms to CalendarEvent model with display strings
4. **Calculate Availability**: Existing `AvailabilityService.calculateAvailability(...)` returns TimeSlot array (unchanged)
5. **Combine Response**: Construct Enhanced AvailabilityResponse with both slots and events
6. **Return**: JSON response sent to client

### Client-Side (Availability.html)

1. **Receive Response**: `displayResults(response, minDuration)` function receives enhanced response
2. **Store Events**: `allCalendarEvents = response.events` (similar to existing `allAvailableSlots`)
3. **Group by Date**: Both events and slots grouped by `date` field
4. **Render Cards**: For each date, render:
   - **Available section**: Existing slot rendering (checkboxes, selection)
   - **Scheduled section**: New event rendering (read-only list)
5. **Error Handling**: If `response.eventsError` exists, show warning banner

## Data Transformations

### Event Formatting (Server-Side)

Raw Google Calendar event → CalendarEvent model:

```javascript
// Input: Google CalendarEvent object
var rawEvent = {
  getTitle: () => "Team Standup Meeting",
  getStartTime: () => Date("2025-01-15T10:00:00"),
  getEndTime: () => Date("2025-01-15T10:30:00"),
  isAllDayEvent: () => false
};

// Output: CalendarEvent model
var formattedEvent = {
  title: "Team Standup Meeting",
  startTime: Date("2025-01-15T10:00:00"),
  endTime: Date("2025-01-15T10:30:00"),
  isAllDay: false,
  date: "2025-01-15",
  formattedStart: "10:00 AM",
  formattedEnd: "10:30 AM",
  formattedDuration: "30 min",
  displayTitle: "Team Standup Meeting"
};
```

### Event Grouping (Client-Side)

Events grouped by date (parallel to existing slot grouping):

```javascript
// Input: Array of CalendarEvent objects
var events = [
  { date: "2025-01-15", ... },
  { date: "2025-01-15", ... },
  { date: "2025-01-16", ... }
];

// Output: Grouped by date
var eventsByDate = {
  "2025-01-15": [
    { date: "2025-01-15", ... },
    { date: "2025-01-15", ... }
  ],
  "2025-01-16": [
    { date: "2025-01-16", ... }
  ]
};
```

## Storage

**No persistent storage required** for this feature:
- Calendar events are fetched dynamically per search (ephemeral)
- Events are not cached or stored in Google Sheets
- Client-side storage uses in-memory JavaScript variables (no localStorage/sessionStorage for events)
- Selection state (checkboxes) applies only to available slots, not events

## Validation Summary

### Server-Side Validations

- Calendar ID is provided and valid (existing validation)
- Date range is valid (start <= end) (existing validation)
- Date range is <= 14 days (existing validation)
- Event start time < end time (skip invalid events with warning log)
- Event title is non-empty (use "Untitled Event" if empty)

### Client-Side Validations

- Response contains `success` field
- If `success: true`, both `slots` and `events` arrays exist (may be empty)
- Each event has required fields: `date`, `formattedStart`, `displayTitle`
- Event `date` matches one of the dates in the search results (for grouping)

## Edge Cases

| Scenario | Handling |
|----------|----------|
| No events in date range | Return `events: []`; hide "Scheduled" section in UI |
| Event with empty title | Use displayTitle: "Untitled Event" |
| Event extends beyond search time | Show full event time (per spec FR-007) |
| All-day event | Set `formattedStart`, `formattedEnd`, `formattedDuration` to "All Day" |
| Multi-day event | Show on first day only with "(multi-day)" suffix in displayTitle |
| Event title > 40 chars | Truncate to 37 chars + "..." in displayTitle |
| Event fetch fails | Return `eventsError` message; `events: []`; show warning banner |
| Calendar permission denied | Graceful degradation: show slots only with error message |

## Dependencies

- **Existing Models**: TimeSlot.gs (unchanged, used in parallel with CalendarEvent)
- **New Services**: CalendarEventService.gs (event fetching and formatting)
- **Modified Services**: AvailabilityService.gs (orchestrates both slots and events)
- **Google APIs**: CalendarApp.getEvents() method
