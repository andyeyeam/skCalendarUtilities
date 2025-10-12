# Service Layer Contracts: Availability Finder

**Feature**: 002-i-want-to (Availability Finder)
**Date**: 2025-01-11

## Overview

This document defines internal service layer interfaces used to implement the availability finder feature. These functions are not exposed to the client directly but are called by server-side code.

---

## AvailabilityService.gs

Core business logic for calculating available time slots.

### Function: calculateAvailability

Calculates all available time slots within a date range given a set of calendar events.

**Signature**:
```javascript
function calculateAvailability(events, startDate, endDate, minDurationMinutes)
```

**Parameters**:
- `events` (Array<CalendarEvent>): Calendar events retrieved from CalendarApp
- `startDate` (Date): Start of date range (inclusive)
- `endDate` (Date): End of date range (inclusive)
- `minDurationMinutes` (Number): Minimum slot duration (default: 15)

**Returns**:
- `Array<TimeSlot>`: Available time slots, grouped by date and sorted chronologically

**Algorithm**:
1. Iterate through each date in range
2. Skip weekends (Saturday, Sunday)
3. For each working day:
   - Generate 34 intervals (09:00-17:30 in 15-min increments)
   - Mark intervals as busy if overlapped by events
   - Merge consecutive free intervals into slots
   - Filter out slots < `minDurationMinutes`
4. Return all slots sorted by date, then time

**Example**:
```javascript
var events = [/* CalendarEvent objects */];
var startDate = new Date(2025, 0, 15);
var endDate = new Date(2025, 0, 17);
var slots = calculateAvailability(events, startDate, endDate, 15);
// Returns: [ TimeSlot, TimeSlot, ... ]
```

---

### Function: validateAvailabilityRequest

Validates an availability search request.

**Signature**:
```javascript
function validateAvailabilityRequest(startDate, endDate, calendarId)
```

**Parameters**:
- `startDate` (Date): Start of date range
- `endDate` (Date): End of date range
- `calendarId` (String): Calendar ID to search

**Returns**:
- `Object`: `{ valid: true }` or `{ valid: false, error: "message", errorType: "validation" }`

**Validation Rules**:
1. Start date must not be after end date (FR-010)
2. Date range must be ≤ 7 days (FR-016)
3. Range must contain ≥ 1 working day (FR-020)
4. Calendar ID must be non-empty and accessible

**Example**:
```javascript
var result = validateAvailabilityRequest(
  new Date(2025, 0, 15),
  new Date(2025, 0, 22),
  'user@example.com'
);
// Returns: { valid: false, error: "Date range must be 7 days or less", errorType: "validation" }
```

---

### Function: generateWorkingDayIntervals

Generates 15-minute time intervals for a single working day.

**Signature**:
```javascript
function generateWorkingDayIntervals(date)
```

**Parameters**:
- `date` (Date): The calendar date

**Returns**:
- `Array<TimeInterval>`: 34 intervals from 09:00 to 17:30

**Example**:
```javascript
var intervals = generateWorkingDayIntervals(new Date(2025, 0, 15));
// Returns: [
//   { startTime: Date(09:00), endTime: Date(09:15), isBusy: false },
//   { startTime: Date(09:15), endTime: Date(09:30), isBusy: false },
//   ...
// ]
```

---

### Function: markIntervalsAsBusy

Marks time intervals as busy based on calendar events.

**Signature**:
```javascript
function markIntervalsAsBusy(intervals, events)
```

**Parameters**:
- `intervals` (Array<TimeInterval>): Time intervals for a day
- `events` (Array<CalendarEvent>): Events occurring on that day

**Returns**:
- `void` (modifies `intervals` in place)

**Logic**:
1. For each event:
   - If all-day event, mark all intervals as busy (FR-014)
   - Otherwise, clip event to working hours (FR-012)
   - Mark overlapping intervals as busy
2. Handle overlapping events (FR-015) by marking interval busy if ANY event occupies it

**Example**:
```javascript
var intervals = generateWorkingDayIntervals(new Date(2025, 0, 15));
var events = [/* CalendarEvent with 10:00-11:00 meeting */];
markIntervalsAsBusy(intervals, events);
// intervals[4] through intervals[7] now have isBusy: true (10:00-11:00)
```

---

### Function: intervalsToTimeSlots

Converts marked intervals into time slots by merging consecutive free intervals.

**Signature**:
```javascript
function intervalsToTimeSlots(intervals)
```

**Parameters**:
- `intervals` (Array<TimeInterval>): Marked time intervals

**Returns**:
- `Array<TimeSlot>`: Merged time slots with formatted fields

**Logic**:
1. Iterate through intervals
2. When encountering free interval, start new slot
3. Continue merging consecutive free intervals
4. When encountering busy interval or end, finalize slot
5. Add formatted fields (formattedStart, formattedEnd, formattedDuration)
6. Filter out slots < 15 minutes (FR-018)

**Example**:
```javascript
var intervals = [/* 4 free intervals (09:00-10:00), 4 busy, 4 free */];
var slots = intervalsToTimeSlots(intervals);
// Returns: [
//   { startTime: 09:00, endTime: 10:00, durationMinutes: 60, ... },
//   { startTime: 11:00, endTime: 12:00, durationMinutes: 60, ... }
// ]
```

---

## CalendarService.gs

Abstraction layer for Google Calendar API operations.

### Function: getCalendarEvents

Retrieves all calendar events within a date range.

**Signature**:
```javascript
function getCalendarEvents(calendarId, startDate, endDate)
```

**Parameters**:
- `calendarId` (String): Google Calendar ID
- `startDate` (Date): Start of range (inclusive)
- `endDate` (Date): End of range (inclusive)

**Returns**:
- `Array<CalendarEvent>`: Events in the range

**Implementation**:
```javascript
function getCalendarEvents(calendarId, startDate, endDate) {
  try {
    var calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      throw { message: 'Calendar not found', type: 'api' };
    }

    var gcalEvents = calendar.getEvents(startDate, endDate);
    var events = [];

    gcalEvents.forEach(function(gcalEvent) {
      events.push(createEventFromGCal(gcalEvent));
    });

    log('Retrieved calendar events', { count: events.length });
    return events;
  } catch (e) {
    error('Failed to retrieve calendar events', e);
    throw { message: 'Unable to access calendar', type: 'api' };
  }
}
```

**Related Requirements**:
- FR-005: Retrieve all calendar events in range

---

### Function: getCalendarById

Retrieves calendar metadata by ID.

**Signature**:
```javascript
function getCalendarById(calendarId)
```

**Parameters**:
- `calendarId` (String): Google Calendar ID

**Returns**:
- `Object`: `{ id, name, isPrimary, color }` or `null` if not found

**Example**:
```javascript
var calendar = getCalendarById('user@example.com');
// Returns: { id: "user@example.com", name: "John Doe", isPrimary: true, color: "#9fc6e7" }
```

---

## DateUtils.gs

Utility functions for date and time manipulation.

### Function: isWorkingDay

Checks if a date is a working day (Monday-Friday).

**Signature**:
```javascript
function isWorkingDay(date)
```

**Parameters**:
- `date` (Date): Date to check

**Returns**:
- `Boolean`: true if Monday-Friday, false if Saturday-Sunday

**Implementation**:
```javascript
function isWorkingDay(date) {
  var day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6;
}
```

**Related Requirements**:
- FR-004: Exclude weekends from availability search

---

### Function: countWorkingDays

Counts working days in a date range.

**Signature**:
```javascript
function countWorkingDays(startDate, endDate)
```

**Parameters**:
- `startDate` (Date): Start of range (inclusive)
- `endDate` (Date): End of range (inclusive)

**Returns**:
- `Number`: Count of working days

**Example**:
```javascript
var count = countWorkingDays(new Date(2025, 0, 15), new Date(2025, 0, 21));
// Returns: 5 (Mon-Fri, excludes Sat-Sun)
```

**Related Requirements**:
- FR-020: Validate range contains working days

---

### Function: formatTime12Hour

Formats a Date object as 12-hour time string.

**Signature**:
```javascript
function formatTime12Hour(date)
```

**Parameters**:
- `date` (Date): Date/time to format

**Returns**:
- `String`: Formatted time (e.g., "9:00 AM", "2:30 PM")

**Implementation**:
```javascript
function formatTime12Hour(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12

  var minutesStr = minutes < 10 ? '0' + minutes : minutes.toString();

  return hours + ':' + minutesStr + ' ' + ampm;
}
```

**Related Requirements**:
- FR-019: Display times in 12-hour AM/PM format

---

### Function: formatDuration

Formats duration in minutes as human-readable string.

**Signature**:
```javascript
function formatDuration(minutes)
```

**Parameters**:
- `minutes` (Number): Duration in minutes

**Returns**:
- `String`: Formatted duration (e.g., "1 hour", "2 hours 30 minutes", "45 minutes")

**Example**:
```javascript
formatDuration(60);  // "1 hour"
formatDuration(90);  // "1 hour 30 minutes"
formatDuration(150); // "2 hours 30 minutes"
formatDuration(45);  // "45 minutes"
```

**Related Requirements**:
- FR-008: Show duration of each slot

---

### Function: roundToQuarterHour

Rounds a Date to the nearest 15-minute boundary.

**Signature**:
```javascript
function roundToQuarterHour(date)
```

**Parameters**:
- `date` (Date): Date/time to round

**Returns**:
- `Date`: Rounded date (new Date object)

**Example**:
```javascript
var rounded = roundToQuarterHour(new Date(2025, 0, 15, 10, 7, 0));
// Returns: Date(2025, 0, 15, 10, 0, 0) - rounded down to 10:00
```

**Related Requirements**:
- FR-017: Display slots with 15-minute granularity

---

### Function: clipToWorkingHours

Clips a time range to working hours (09:00-17:30).

**Signature**:
```javascript
function clipToWorkingHours(startTime, endTime, date)
```

**Parameters**:
- `startTime` (Date): Original start time
- `endTime` (Date): Original end time
- `date` (Date): The calendar date

**Returns**:
- `Object`: `{ start: Date, end: Date }` clipped to 09:00-17:30

**Example**:
```javascript
var clipped = clipToWorkingHours(
  new Date(2025, 0, 15, 8, 30, 0),  // 8:30 AM (before working hours)
  new Date(2025, 0, 15, 18, 0, 0),  // 6:00 PM (after working hours)
  new Date(2025, 0, 15)
);
// Returns: { start: Date(09:00), end: Date(17:30) }
```

**Related Requirements**:
- FR-012: Clip events outside working hours

---

### Function: getDaysBetween

Gets array of dates between start and end (inclusive).

**Signature**:
```javascript
function getDaysBetween(startDate, endDate)
```

**Parameters**:
- `startDate` (Date): Start date
- `endDate` (Date): End date

**Returns**:
- `Array<Date>`: Array of dates

**Example**:
```javascript
var days = getDaysBetween(new Date(2025, 0, 15), new Date(2025, 0, 17));
// Returns: [Date(Jan 15), Date(Jan 16), Date(Jan 17)]
```

---

## Constants

### WORKING_HOURS

Defined in `AvailabilityService.gs`:

```javascript
var WORKING_HOURS = {
  START_HOUR: 9,
  START_MINUTE: 0,
  END_HOUR: 17,
  END_MINUTE: 30,
  TOTAL_MINUTES: 510,
  INTERVAL_MINUTES: 15,
  INTERVALS_PER_DAY: 34
};
```

### ERROR_MESSAGES

Defined in `AvailabilityService.gs`:

```javascript
var ERROR_MESSAGES = {
  INVALID_DATE_RANGE: 'Start date must be before or equal to end date',
  RANGE_TOO_LONG: 'Date range must be 7 days or less',
  NO_WORKING_DAYS: 'No working days in selected range',
  NO_CALENDAR_SELECTED: 'Please select a calendar first',
  CALENDAR_ACCESS_DENIED: 'Unable to access calendar',
  INVALID_MIN_DURATION: 'Minimum duration must be at least 15 minutes'
};
```

---

## Summary

The service layer provides:
- **AvailabilityService.gs**: Core calculation logic (5 functions)
- **CalendarService.gs**: Calendar API abstraction (2 functions)
- **DateUtils.gs**: Date/time utilities (7 functions)

All functions include comprehensive error handling, logging, and validation. The architecture separates concerns cleanly:
- Calendar operations isolated in CalendarService
- Business logic in AvailabilityService
- Reusable utilities in DateUtils
