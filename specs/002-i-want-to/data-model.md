# Data Model: Availability Finder

**Feature**: 002-i-want-to (Availability Finder)
**Date**: 2025-01-11
**Status**: Complete

## Overview

This document defines the data structures used in the availability finder feature. All models are implemented as JavaScript objects (no classes) following Google Apps Script ES5+ conventions.

---

## Core Entities

### 1. TimeSlot

Represents a continuous block of free time in the calendar.

**Fields**:
- `date` (Date): The calendar date for this slot (time set to midnight)
- `startTime` (Date): Start of the free time slot (with full date-time)
- `endTime` (Date): End of the free time slot (with full date-time)
- `durationMinutes` (Number): Duration of slot in minutes
- `formattedStart` (String): Start time in 12-hour format (e.g., "9:00 AM")
- `formattedEnd` (String): End time in 12-hour format (e.g., "10:30 AM")
- `formattedDuration` (String): Human-readable duration (e.g., "1 hour 30 minutes")

**Example**:
```javascript
{
  date: new Date(2025, 0, 15), // Jan 15, 2025 at midnight
  startTime: new Date(2025, 0, 15, 9, 0, 0), // 9:00 AM
  endTime: new Date(2025, 0, 15, 10, 30, 0), // 10:30 AM
  durationMinutes: 90,
  formattedStart: "9:00 AM",
  formattedEnd: "10:30 AM",
  formattedDuration: "1 hour 30 minutes"
}
```

**Validation Rules**:
- `startTime` must be before `endTime`
- `durationMinutes` must be ≥ 15 (FR-018: exclude slots < 15 minutes)
- `startTime` and `endTime` must fall within working hours (09:00-17:30)
- `date` must be a working day (not Saturday or Sunday)

**Related Requirements**:
- FR-007: Display available time slots grouped by date
- FR-008: Show duration of each slot
- FR-017: 15-minute granularity
- FR-018: Exclude slots < 15 minutes
- FR-019: 12-hour AM/PM format

---

### 2. AvailabilityRequest

Represents a user's search request for available time slots.

**Fields**:
- `startDate` (Date): Start of date range (inclusive, time set to midnight)
- `endDate` (Date): End of date range (inclusive, time set to midnight)
- `calendarId` (String): Google Calendar ID to search
- `minDurationMinutes` (Number, optional): Minimum slot duration filter (default: 15)

**Example**:
```javascript
{
  startDate: new Date(2025, 0, 15), // Jan 15, 2025
  endDate: new Date(2025, 0, 19),   // Jan 19, 2025
  calendarId: "user@example.com",
  minDurationMinutes: 60 // Optional: only show slots ≥ 1 hour
}
```

**Validation Rules**:
- `startDate` must not be after `endDate` (FR-010)
- Date range must be ≤ 7 days (FR-016)
- Date range must contain at least one working day (FR-020)
- `calendarId` must be a valid, accessible calendar ID
- `minDurationMinutes` must be ≥ 15 if provided

**Related Requirements**:
- FR-002: Allow users to specify start and end date
- FR-010: Validate start date not after end date
- FR-011: Optional filter by minimum slot duration
- FR-016: Maximum 7-day date range

---

### 3. AvailabilityResponse

Represents the result of an availability search.

**Fields**:
- `success` (Boolean): Whether the search completed successfully
- `slots` (Array<TimeSlot>): Available time slots, grouped by date and sorted chronologically
- `metadata` (Object): Additional information about the search
  - `dateRange` (Object): `{ start: Date, end: Date }`
  - `workingDaysCount` (Number): Number of working days in range
  - `totalSlotsFound` (Number): Total number of slots found
  - `calendarId` (String): Calendar that was searched
- `error` (String, optional): Error message if `success` is false
- `errorType` (String, optional): Error category: "validation" | "api" | "system"

**Example (Success)**:
```javascript
{
  success: true,
  slots: [
    {
      date: new Date(2025, 0, 15),
      startTime: new Date(2025, 0, 15, 9, 0, 0),
      endTime: new Date(2025, 0, 15, 10, 0, 0),
      durationMinutes: 60,
      formattedStart: "9:00 AM",
      formattedEnd: "10:00 AM",
      formattedDuration: "1 hour"
    },
    // ... more slots
  ],
  metadata: {
    dateRange: {
      start: new Date(2025, 0, 15),
      end: new Date(2025, 0, 19)
    },
    workingDaysCount: 5,
    totalSlotsFound: 12,
    calendarId: "user@example.com"
  }
}
```

**Example (Error)**:
```javascript
{
  success: false,
  slots: [],
  error: "Date range must be 7 days or less",
  errorType: "validation"
}
```

**Related Requirements**:
- FR-009: Handle case where no availability exists
- FR-010, FR-016, FR-020: Various validation errors
- SC-002: System correctly identifies availability with 100% accuracy

---

### 4. WorkingHours

Configuration object defining working day boundaries.

**Fields**:
- `startHour` (Number): Start hour of working day (24-hour format, e.g., 9)
- `startMinute` (Number): Start minute (e.g., 0)
- `endHour` (Number): End hour of working day (24-hour format, e.g., 17)
- `endMinute` (Number): End minute (e.g., 30)
- `totalMinutes` (Number): Total working minutes per day (e.g., 510)

**Example**:
```javascript
{
  startHour: 9,
  startMinute: 0,
  endHour: 17,
  endMinute: 30,
  totalMinutes: 510 // 8.5 hours = 510 minutes
}
```

**Usage**:
- Defined as constant in AvailabilityService.gs
- Used to clip events that extend outside working hours (FR-012)
- Used to validate time slot boundaries

**Related Requirements**:
- FR-003: Working hours defined as 09:00 to 17:30

---

### 5. TimeInterval (Internal)

Represents a 15-minute interval within a working day. Used internally for availability calculation.

**Fields**:
- `startTime` (Date): Start of interval
- `endTime` (Date): End of interval (startTime + 15 minutes)
- `isBusy` (Boolean): Whether interval is occupied by an event

**Example**:
```javascript
{
  startTime: new Date(2025, 0, 15, 9, 0, 0),  // 9:00 AM
  endTime: new Date(2025, 0, 15, 9, 15, 0),   // 9:15 AM
  isBusy: false
}
```

**Usage**:
- Generated in `generateWorkingDayIntervals(date)` function
- Marked as busy by `markIntervalsAsBusy(intervals, events)` function
- Merged into TimeSlots by `intervalsToTimeSlots(intervals)` function

**Not exposed to client** - internal to AvailabilityService.gs calculation algorithm.

---

## Existing Entities (No Changes)

### CalendarEvent

Existing entity from src/models/Event.gs. Used to retrieve and validate calendar events.

**Relevant Fields for Availability**:
- `id` (String): Event ID
- `title` (String): Event title
- `startTime` (Date): Event start
- `endTime` (Date): Event end
- `isAllDay` (Boolean): Whether event is all-day

**Usage**:
- Retrieved via `createEventFromGCal(gcalEvent)` function
- Processed to determine busy intervals

**Related Requirements**:
- FR-005: Retrieve all calendar events within date range
- FR-012: Handle events outside working hours
- FR-014: Handle all-day events
- FR-015: Handle overlapping events

---

### UserConfiguration

Existing entity from src/models/Config.gs. Used to get selected calendar ID.

**Relevant Fields**:
- `selectedCalendarId` (String): Currently selected calendar

**Usage**:
- Retrieved via `getConfig()` from SheetService
- Used to determine which calendar to search for availability

---

## Data Flow

```
User Input (Availability.html)
  ↓
AvailabilityRequest (validated client-side)
  ↓
findAvailability(request) [Code.gs]
  ↓
validateRequest(request) [AvailabilityService.gs]
  ↓
getCalendarEvents(calendarId, startDate, endDate) [CalendarService.gs]
  ↓
Array<CalendarEvent>
  ↓
calculateAvailability(events, startDate, endDate) [AvailabilityService.gs]
  ↓
  1. generateWorkingDayIntervals(date) → Array<TimeInterval>
  2. markIntervalsAsBusy(intervals, events)
  3. intervalsToTimeSlots(intervals) → Array<TimeSlot>
  ↓
Array<TimeSlot> (sorted by date, then time)
  ↓
AvailabilityResponse
  ↓
Display in UI (Availability.html)
```

---

## Validation Summary

### TimeSlot Validation
- ✅ Duration ≥ 15 minutes
- ✅ Start before end
- ✅ Within working hours (09:00-17:30)
- ✅ On working day (Mon-Fri)

### AvailabilityRequest Validation
- ✅ Start date ≤ end date
- ✅ Date range ≤ 7 days
- ✅ Contains ≥ 1 working day
- ✅ Valid calendar ID
- ✅ Min duration ≥ 15 minutes (if provided)

### Error Handling
- Validation errors → `errorType: "validation"`
- Calendar API errors → `errorType: "api"`
- JavaScript exceptions → `errorType: "system"`

---

## Summary

The data model is intentionally simple, using plain JavaScript objects to represent:
1. **TimeSlot**: Free time blocks (output)
2. **AvailabilityRequest**: Search parameters (input)
3. **AvailabilityResponse**: Search results (output)
4. **WorkingHours**: Configuration constant
5. **TimeInterval**: Internal calculation structure

All entities include comprehensive validation rules aligned with functional requirements. The model integrates with existing entities (CalendarEvent, UserConfiguration) without requiring changes to them.
