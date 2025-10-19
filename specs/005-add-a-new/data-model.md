# Data Model: Contiguous Availability Blocks

**Feature**: 005-add-a-new
**Date**: 2025-01-19
**Status**: Complete

## Overview

This document defines the data structures and entities for the contiguous availability blocks feature. The feature extends the existing availability finder with minimal new data structures, primarily adding mode selection to the search request.

## Entity Definitions

### SearchMode (Enumeration)

Represents the type of availability search the user has selected.

**Type**: String enumeration
**Values**: `"duration"` | `"contiguous"`

**Storage Locations**:
- Session Storage: `availability_searchMode` key
- Server-side function parameter: `searchMode` in `findAvailability()`
- Client-side state: Radio button value in search form

**Validation Rules**:
- MUST be one of two valid values: `"duration"` or `"contiguous"`
- Defaults to `"duration"` if not specified (backward compatibility)
- Invalid values treated as `"duration"` (graceful degradation)

**State Transitions**:
```
[Initial Load] → "duration" (default)
[User selects duration radio] → "duration"
[User selects contiguous radio] → "contiguous"
[Page reload] → Restored from sessionStorage (or default to "duration")
```

---

### TimeSlot (Existing Entity - No Changes)

Represents a period of available time in the calendar.

**Source**: `src/models/TimeSlot.gs`

**Fields** (from existing implementation):
```javascript
{
  date: String,              // Format: "YYYY-MM-DD"
  dateObj: Date,             // JavaScript Date object for the day
  startTime: Date,           // Start of availability slot
  endTime: Date,             // End of availability slot
  durationMinutes: Number,   // Length of slot in minutes
  formattedStart: String,    // e.g., "9:00 AM"
  formattedEnd: String,      // e.g., "10:30 AM"
  formattedDuration: String  // e.g., "90 min"
}
```

**Usage in Contiguous Mode**:
- Represents complete uninterrupted free time block
- `durationMinutes` may vary widely (e.g., 15 min to 510 min for full working day)
- No filtering by minimum duration (all blocks ≥15 min shown)

**Usage in Duration Mode**:
- Represents discrete slot of specified duration
- `durationMinutes` equals user-specified duration (e.g., 30, 60, 120)
- Filtered to show only slots matching user's minimum duration

**Validation Rules** (existing, unchanged):
- `startTime` < `endTime` (enforced by AvailabilityService)
- `durationMinutes` ≥ 15 (minimum slot granularity per FR-018)
- `startTime` and `endTime` clipped to working hours (09:00-17:30)

---

### ContiguousBlock (Conceptual Extension)

**Note**: This is NOT a new data structure. "ContiguousBlock" is conceptually the same as `TimeSlot` but represents contiguous availability rather than a discrete duration-based slot.

**Rationale for Reuse**:
- All fields in TimeSlot are applicable (date, start, end, duration, formatting)
- No additional data needed for contiguous blocks
- Simplifies implementation (no new model class required)
- Client-side rendering logic identical for both modes

**Semantic Difference**:
- **Duration Mode**: TimeSlot represents a slot matching user's specified duration
- **Contiguous Mode**: TimeSlot represents a complete gap between calendar events

**Example**:
```javascript
// Duration mode (30-minute slots from 09:00-10:00 block)
{ date: "2025-01-20", startTime: [09:00], endTime: [09:30], durationMinutes: 30 }
{ date: "2025-01-20", startTime: [09:30], endTime: [10:00], durationMinutes: 30 }

// Contiguous mode (same 09:00-10:00 block)
{ date: "2025-01-20", startTime: [09:00], endTime: [10:00], durationMinutes: 60 }
```

---

### AvailabilitySearchRequest (Extended)

Represents the user's availability search criteria submitted to the server.

**Transport**: HTTP request parameters (Google Apps Script server function call)

**Fields**:
```javascript
{
  startDateTime: String,    // ISO 8601 format: "YYYY-MM-DDTHH:mm"
  endDateTime: String,      // ISO 8601 format: "YYYY-MM-DDTHH:mm"
  minDuration: Number,      // Minimum slot duration in minutes (15-120)
  searchMode: String        // NEW: "duration" | "contiguous" (default: "duration")
}
```

**Field Descriptions**:

- **startDateTime** (EXISTING)
  - Start of date/time range to search
  - Validation: Must be before `endDateTime`
  - Format: HTML datetime-local format converted to ISO 8601

- **endDateTime** (EXISTING)
  - End of date/time range to search
  - Validation: Must be after `startDateTime`, range ≤14 days
  - Format: HTML datetime-local format converted to ISO 8601

- **minDuration** (EXISTING)
  - Minimum slot duration to find (duration mode) or granularity (contiguous mode)
  - Validation: 15 ≤ minDuration ≤ 120
  - Behavior in contiguous mode: Ignored for filtering (all slots ≥15 min shown)

- **searchMode** (NEW)
  - Type of search to perform
  - Validation: Must be "duration" or "contiguous"
  - Default: "duration" (if omitted or invalid)

**Usage Pattern**:
```javascript
// Client-side call (from Availability.html)
google.script.run
  .withSuccessHandler(handleSuccess)
  .findAvailability(startDateTime, endDateTime, minDuration, searchMode);

// Server-side handler (Code.gs)
function findAvailability(startDateTime, endDateTime, minDuration, searchMode) {
  searchMode = searchMode || 'duration'; // Default
  // ... validation and processing ...
}
```

---

### AvailabilitySearchResponse (Extended)

Represents the server's response to an availability search request.

**Transport**: JSON object returned from Google Apps Script server function

**Structure**:
```javascript
{
  success: Boolean,              // true if search completed, false if error
  slots: Array<TimeSlot>,        // Available time slots found
  events: Array<CalendarEvent>,  // Calendar events in date range (for display)
  metadata: Object,              // Search metadata
  error: String,                 // Error message (only if success === false)
  eventsError: String            // Warning if events fetch failed (optional)
}
```

**Metadata Object** (extended):
```javascript
{
  dateRange: {
    start: String,  // ISO 8601 date
    end: String     // ISO 8601 date
  },
  workingDaysCount: Number,    // Number of working days in range
  totalSlotsFound: Number,     // Count of available slots
  searchMode: String           // NEW: "duration" | "contiguous" (for display)
}
```

**Behavior by Mode**:

**Duration Mode**:
```javascript
{
  success: true,
  slots: [
    { date: "2025-01-20", startTime: [...], endTime: [...], durationMinutes: 30 },
    { date: "2025-01-20", startTime: [...], endTime: [...], durationMinutes: 30 },
    // Multiple 30-min slots from same time block
  ],
  metadata: {
    totalSlotsFound: 45,
    searchMode: "duration"
  }
}
```

**Contiguous Mode**:
```javascript
{
  success: true,
  slots: [
    { date: "2025-01-20", startTime: [...], endTime: [...], durationMinutes: 60 },
    { date: "2025-01-20", startTime: [...], endTime: [...], durationMinutes: 210 },
    // Complete time blocks between events
  ],
  metadata: {
    totalSlotsFound: 12,
    searchMode: "contiguous"
  }
}
```

---

## Session Storage Schema

Session storage keys used for persisting user preferences across page reloads within the same session.

**Namespace**: `availability_*`

**Keys**:
```javascript
{
  "availability_searchMode": "duration" | "contiguous",  // NEW - defaults to "duration"
  "availability_startDateTime": "YYYY-MM-DDTHH:mm",      // EXISTING
  "availability_endDateTime": "YYYY-MM-DDTHH:mm",        // EXISTING
  "availability_minDuration": "15" | "30" | "60" | ...,  // EXISTING - stored as string
  "availability_selectedSlots": "{ ... }"                // EXISTING - JSON string of selections
}
```

**Lifecycle**:
- **Write**: On user interaction (mode change, date change, duration change)
- **Read**: On page load (`initializeAvailabilityScreen`)
- **Clear**: On navigation away from Availability screen (via `SelectionManager.clear()`)

**Persistence**: Session-scoped (cleared when browser tab closed)

---

## Data Flow Diagrams

### Duration Mode Flow (Existing)
```
User selects "duration" mode + date range + 30 min duration
  ↓
Client sends: { startDateTime, endDateTime, minDuration: 30, searchMode: "duration" }
  ↓
Server calls: calculateAvailability(events, startDate, endDate, 30)
  ↓
Server generates: 30-minute intervals, filters by conflicts
  ↓
Server returns: { success: true, slots: [...30-min slots...], metadata: {...} }
  ↓
Client renders: Multiple 30-min slots per time block
```

### Contiguous Mode Flow (New)
```
User selects "contiguous" mode + date range
  ↓
Client sends: { startDateTime, endDateTime, minDuration: 15, searchMode: "contiguous" }
  ↓
Server calls: calculateContiguousAvailability(events, startDate, endDate)
  ↓
Server generates: 15-minute intervals (for granularity), merges into contiguous blocks
  ↓
Server returns: { success: true, slots: [...contiguous blocks...], metadata: {...} }
  ↓
Client renders: One slot per complete time block (varying durations)
```

---

## Validation Rules Summary

| Field | Validation Rule | Error Message |
|-------|----------------|---------------|
| searchMode | Must be "duration" or "contiguous" | Defaults to "duration" (no error) |
| startDateTime | Must be valid ISO 8601 datetime | "Invalid start date/time" |
| endDateTime | Must be valid ISO 8601 datetime | "Invalid end date/time" |
| endDateTime | Must be after startDateTime | "Start date must be before end date" |
| Date range | endDateTime - startDateTime ≤ 14 days | "Date range must be 14 days or less" |
| minDuration | 15 ≤ value ≤ 120 | "Duration must be between 15 and 120 minutes" |
| Working days | Range must contain ≥1 working day | "No working days in selected range" |

---

## Backward Compatibility

**Existing Functionality Preserved**:
- If `searchMode` parameter omitted → defaults to "duration" → existing behavior
- If `searchMode` is invalid value → defaults to "duration" → existing behavior
- All existing TimeSlot fields unchanged
- All existing validation rules unchanged
- Session storage keys for dates/duration unchanged

**Migration Path**:
- No data migration required (no persistent storage changes)
- Existing users see "duration" mode by default (radio button pre-selected)
- No breaking changes to server function signatures (new parameter is optional)

---

## Summary

- **New Entities**: 1 (SearchMode enumeration)
- **Extended Entities**: 2 (AvailabilitySearchRequest, AvailabilitySearchResponse)
- **Reused Entities**: 2 (TimeSlot, CalendarEvent - no changes)
- **New Session Storage Keys**: 1 (`availability_searchMode`)
- **Breaking Changes**: None (fully backward compatible)

All data structures align with the existing Google Apps Script + Session Storage architecture and maintain consistency with current naming conventions and validation patterns.
