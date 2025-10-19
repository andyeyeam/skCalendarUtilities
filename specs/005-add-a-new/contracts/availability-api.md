# API Contract: Availability Search with Mode Selection

**Feature**: 005-add-a-new - Contiguous Availability Blocks
**Date**: 2025-01-19
**Version**: 1.0

## Overview

This document defines the client-server API contract for the availability search feature with support for both duration-based and contiguous block search modes. The API follows Google Apps Script conventions for HTML Service client-server communication.

---

## Server Functions

### findAvailability()

Searches for available time slots within a date range using the specified search mode.

**Function Signature**:
```javascript
function findAvailability(startDateTime, endDateTime, minDuration, searchMode)
```

**Parameters**:

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startDateTime` | String | Yes | - | Start of search range in ISO 8601 format ("YYYY-MM-DDTHH:mm") |
| `endDateTime` | String | Yes | - | End of search range in ISO 8601 format ("YYYY-MM-DDTHH:mm") |
| `minDuration` | Number | Yes | - | Minimum slot duration in minutes (15-120). In contiguous mode, used only for granularity, not filtering |
| `searchMode` | String | No | `"duration"` | Search mode: `"duration"` or `"contiguous"` |

**Return Value**:
```javascript
{
  success: Boolean,
  slots: TimeSlot[],
  events: CalendarEvent[],
  metadata: Metadata,
  error?: String,
  eventsError?: String
}
```

**Return Value Fields**:

- **success**: `Boolean`
  - `true` if search completed successfully
  - `false` if validation or server error occurred

- **slots**: `TimeSlot[]`
  - Array of available time slots found in the date range
  - Empty array `[]` if no availability found
  - Sorted by date (ascending), then by start time (ascending)
  - See TimeSlot schema below

- **events**: `CalendarEvent[]`
  - Array of calendar events in the date range (for "Scheduled" display)
  - Empty array `[]` if no events or fetch failed
  - See CalendarEvent schema below

- **metadata**: `Metadata`
  - Search metadata including date range, working days count, total slots found, and search mode
  - Always present when `success: true`
  - See Metadata schema below

- **error**: `String` (optional)
  - Error message describing validation or server failure
  - Only present when `success: false`
  - Examples: "Start date must be before end date", "Date range must be 14 days or less"

- **eventsError**: `String` (optional)
  - Warning message if calendar events could not be fetched
  - Present when slots were found but events fetch failed
  - Does not affect `success` status (still `true` if slots found)

**Behavior by Search Mode**:

**Duration Mode** (`searchMode: "duration"`):
1. Generate discrete intervals of `minDuration` length within working hours
2. Check each interval for calendar event conflicts
3. Return only intervals that are completely free
4. Each slot has `durationMinutes` equal to `minDuration`

**Contiguous Mode** (`searchMode: "contiguous"`):
1. Generate 15-minute intervals within working hours (for granularity)
2. Mark intervals as busy based on calendar events
3. Merge consecutive free intervals into contiguous blocks
4. Return all contiguous blocks ≥15 minutes (no minimum duration filtering)
5. Each slot has `durationMinutes` equal to the length of the contiguous block (varies)

**Validation Rules**:

| Rule | Error Response |
|------|----------------|
| `startDateTime` after `endDateTime` | `{ success: false, error: "Start date must be before or equal to end date", slots: [], events: [], metadata: null }` |
| Date range > 14 days | `{ success: false, error: "Date range must be 14 days or less", slots: [], events: [], metadata: null }` |
| No working days in range | `{ success: false, error: "No working days in selected range", slots: [], events: [], metadata: null }` |
| `minDuration` < 15 or > 120 | `{ success: false, error: "Minimum duration must be at least 15 minutes", slots: [], events: [], metadata: null }` |
| No calendar selected | `{ success: false, error: "Please select a calendar first", slots: [], events: [], metadata: null }` |
| Invalid `searchMode` | Defaults to `"duration"` (no error, backward compatible) |

**Example Requests & Responses**:

**Request 1: Duration Mode (30-minute slots)**
```javascript
google.script.run
  .withSuccessHandler(handleSuccess)
  .withFailureHandler(handleFailure)
  .findAvailability("2025-01-20T09:00", "2025-01-22T17:30", 30, "duration");
```

**Response 1**:
```javascript
{
  success: true,
  slots: [
    {
      date: "2025-01-20",
      dateObj: Date("2025-01-20T00:00:00"),
      startTime: Date("2025-01-20T09:00:00"),
      endTime: Date("2025-01-20T09:30:00"),
      durationMinutes: 30,
      formattedStart: "9:00 AM",
      formattedEnd: "9:30 AM",
      formattedDuration: "30 min"
    },
    {
      date: "2025-01-20",
      dateObj: Date("2025-01-20T00:00:00"),
      startTime: Date("2025-01-20T09:30:00"),
      endTime: Date("2025-01-20T10:00:00"),
      durationMinutes: 30,
      formattedStart: "9:30 AM",
      formattedEnd: "10:00 AM",
      formattedDuration: "30 min"
    }
    // ... more 30-minute slots
  ],
  events: [
    {
      date: "2025-01-20",
      startTime: Date("2025-01-20T14:00:00"),
      endTime: Date("2025-01-20T15:00:00"),
      formattedStart: "2:00 PM",
      formattedEnd: "3:00 PM",
      displayTitle: "Team Meeting",
      isAllDay: false
    }
  ],
  metadata: {
    dateRange: {
      start: "2025-01-20",
      end: "2025-01-22"
    },
    workingDaysCount: 3,
    totalSlotsFound: 45,
    searchMode: "duration"
  }
}
```

**Request 2: Contiguous Mode**
```javascript
google.script.run
  .withSuccessHandler(handleSuccess)
  .withFailureHandler(handleFailure)
  .findAvailability("2025-01-20T09:00", "2025-01-22T17:30", 15, "contiguous");
```

**Response 2**:
```javascript
{
  success: true,
  slots: [
    {
      date: "2025-01-20",
      dateObj: Date("2025-01-20T00:00:00"),
      startTime: Date("2025-01-20T09:00:00"),
      endTime: Date("2025-01-20T14:00:00"),
      durationMinutes: 300,  // 5 hours
      formattedStart: "9:00 AM",
      formattedEnd: "2:00 PM",
      formattedDuration: "5 hr"
    },
    {
      date: "2025-01-20",
      dateObj: Date("2025-01-20T00:00:00"),
      startTime: Date("2025-01-20T15:00:00"),
      endTime: Date("2025-01-20T17:30:00"),
      durationMinutes: 150,  // 2.5 hours
      formattedStart: "3:00 PM",
      formattedEnd: "5:30 PM",
      formattedDuration: "2 hr 30 min"
    }
    // ... contiguous blocks for other days
  ],
  events: [
    {
      date: "2025-01-20",
      startTime: Date("2025-01-20T14:00:00"),
      endTime: Date("2025-01-20T15:00:00"),
      formattedStart: "2:00 PM",
      formattedEnd: "3:00 PM",
      displayTitle: "Team Meeting",
      isAllDay: false
    }
  ],
  metadata: {
    dateRange: {
      start: "2025-01-20",
      end: "2025-01-22"
    },
    workingDaysCount: 3,
    totalSlotsFound: 8,
    searchMode: "contiguous"
  }
}
```

**Request 3: Validation Error (Invalid Date Range)**
```javascript
google.script.run
  .withSuccessHandler(handleSuccess)
  .withFailureHandler(handleFailure)
  .findAvailability("2025-01-22T09:00", "2025-01-20T17:30", 30, "duration");
```

**Response 3**:
```javascript
{
  success: false,
  error: "Start date must be before or equal to end date",
  slots: [],
  events: [],
  metadata: null
}
```

---

## Data Type Schemas

### TimeSlot

Represents an available time slot.

```javascript
{
  date: String,              // Date in "YYYY-MM-DD" format
  dateObj: Date,             // JavaScript Date object for the day (midnight)
  startTime: Date,           // JavaScript Date object for slot start
  endTime: Date,             // JavaScript Date object for slot end
  durationMinutes: Number,   // Duration in minutes
  formattedStart: String,    // 12-hour time (e.g., "9:00 AM")
  formattedEnd: String,      // 12-hour time (e.g., "10:30 AM")
  formattedDuration: String  // Human-readable duration (e.g., "90 min", "2 hr 30 min")
}
```

**Constraints**:
- `startTime` < `endTime`
- `durationMinutes` ≥ 15 (minimum granularity)
- `startTime` and `endTime` within working hours (09:00-17:30)

---

### CalendarEvent

Represents a calendar event (for display in "Scheduled" section).

```javascript
{
  date: String,              // Date in "YYYY-MM-DD" format
  startTime: Date,           // JavaScript Date object for event start
  endTime: Date,             // JavaScript Date object for event end
  formattedStart: String,    // 12-hour time (e.g., "2:00 PM") or "All day"
  formattedEnd: String,      // 12-hour time (e.g., "3:00 PM") or empty for all-day
  displayTitle: String,      // Event title or "(No title)"
  isAllDay: Boolean          // True if all-day event
}
```

---

### Metadata

Search metadata for display purposes.

```javascript
{
  dateRange: {
    start: String,           // ISO 8601 date ("YYYY-MM-DD")
    end: String              // ISO 8601 date ("YYYY-MM-DD")
  },
  workingDaysCount: Number,  // Number of working days in range
  totalSlotsFound: Number,   // Total available slots found
  searchMode: String         // "duration" | "contiguous"
}
```

---

## Session Storage Contract

Session storage keys used by the client to persist search preferences.

**Storage Mechanism**: Browser `sessionStorage` API

**Keys and Values**:

| Key | Value Type | Example | Description |
|-----|------------|---------|-------------|
| `availability_searchMode` | String | `"duration"` or `"contiguous"` | Selected search mode (NEW) |
| `availability_startDateTime` | String | `"2025-01-20T09:00"` | Start datetime in datetime-local format (EXISTING) |
| `availability_endDateTime` | String | `"2025-01-22T17:30"` | End datetime in datetime-local format (EXISTING) |
| `availability_minDuration` | String | `"30"` | Minimum duration as string (EXISTING) |
| `availability_selectedSlots` | String | `'{"2025-01-20_9:00 AM":true}'` | JSON object of selected slots (EXISTING) |

**Lifecycle**:
- **Write**: On user interaction (mode change, date change, form submission)
- **Read**: On page load to restore previous search parameters
- **Clear**: On navigation away from availability screen

**Default Values**:
- `availability_searchMode`: `"duration"` (if key not present)
- `availability_startDateTime`: Next business day at 09:00 (if key not present)
- `availability_endDateTime`: 4 business days later at 17:30 (if key not present)
- `availability_minDuration`: `"30"` (if key not present)

---

## Client-Side Integration

**Calling Pattern**:
```javascript
// 1. Get form values
var startDateTime = document.getElementById('startDateTime').value;
var endDateTime = document.getElementById('endDateTime').value;
var minDuration = parseInt(document.getElementById('minDuration').value);
var searchMode = document.querySelector('input[name="searchMode"]:checked').value;

// 2. Call server function
google.script.run
  .withSuccessHandler(function(response) {
    if (response.success) {
      displayResults(response);
    } else {
      showError(response.error);
    }
  })
  .withFailureHandler(function(error) {
    showError('Server error: ' + error.message);
  })
  .findAvailability(startDateTime, endDateTime, minDuration, searchMode);
```

**Success Handler**:
```javascript
function displayResults(response) {
  // response.slots: Array of TimeSlot objects
  // response.events: Array of CalendarEvent objects
  // response.metadata: Metadata object with searchMode

  var slots = response.slots;
  var events = response.events;
  var metadata = response.metadata;

  // Render slots grouped by date
  // Render events in "Scheduled" sections
  // Display metadata (date range, working days, total slots, search mode)
}
```

**Failure Handler**:
```javascript
function handleFailure(error) {
  // error.message: String describing server-side failure
  showError('Failed to fetch availability: ' + error.message);
}
```

---

## Error Handling

**Client-Side Validation** (before server call):
- Date/time inputs not empty
- Start datetime before end datetime
- Duration between 15-120 minutes
- Date range ≤14 days

**Server-Side Validation** (in findAvailability):
- Calendar access permissions
- Date range validity
- Working days in range
- Duration constraints

**Error Response Format**:
```javascript
{
  success: false,
  error: "Human-readable error message",
  slots: [],
  events: [],
  metadata: null
}
```

**Warning Response Format** (events fetch failed but slots found):
```javascript
{
  success: true,
  eventsError: "Unable to fetch calendar events",
  slots: [...],  // Slots still returned
  events: [],    // Empty events array
  metadata: {...}
}
```

---

## Backward Compatibility

**Breaking Changes**: None

**Compatibility Guarantees**:
1. Omitting `searchMode` parameter defaults to `"duration"` (existing behavior)
2. Invalid `searchMode` values default to `"duration"` (graceful degradation)
3. All existing request parameters remain unchanged
4. All existing response fields remain unchanged
5. New `metadata.searchMode` field is additive (does not break existing clients)

**Migration Path**:
- Existing client code calling `findAvailability(start, end, duration)` continues to work
- New client code adds fourth parameter: `findAvailability(start, end, duration, mode)`

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-01-19 | Initial contract with mode selection support |

---

## Summary

This API contract defines a backward-compatible extension to the availability search feature, adding support for contiguous block mode while preserving all existing duration-based functionality. The contract follows Google Apps Script conventions and maintains consistency with existing session storage patterns.

**Key Additions**:
- New `searchMode` parameter (optional, defaults to "duration")
- New `metadata.searchMode` response field
- New `availability_searchMode` session storage key

**Unchanged**:
- All existing request parameters
- All existing response structures (TimeSlot, CalendarEvent, Metadata)
- All validation rules
- All error handling patterns
