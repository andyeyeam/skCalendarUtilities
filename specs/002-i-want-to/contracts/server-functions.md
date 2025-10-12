# Server-Side API Contracts: Availability Finder

**Feature**: 002-i-want-to (Availability Finder)
**Date**: 2025-01-11
**Protocol**: Google Apps Script `google.script.run` RPC

## Overview

This document defines the server-side functions exposed to the client via Google Apps Script's `google.script.run` interface. All functions are defined in `src/Code.gs` and delegate to service layer functions.

---

## Function: findAvailability

Searches for available time slots in the selected calendar within the specified date range.

### Signature

```javascript
function findAvailability(startDateStr, endDateStr, minDurationMinutes)
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `startDateStr` | String | Yes | Start date in ISO 8601 format (YYYY-MM-DD) |
| `endDateStr` | String | Yes | End date in ISO 8601 format (YYYY-MM-DD) |
| `minDurationMinutes` | Number | No | Minimum slot duration filter in minutes (default: 15) |

### Returns

**Type**: `AvailabilityResponse` (Object)

**Success Response**:
```javascript
{
  success: true,
  slots: [
    {
      date: "2025-01-15T00:00:00.000Z", // ISO string for client parsing
      startTime: "2025-01-15T14:00:00.000Z", // 9:00 AM EST in UTC
      endTime: "2025-01-15T15:00:00.000Z",   // 10:00 AM EST in UTC
      durationMinutes: 60,
      formattedStart: "9:00 AM",
      formattedEnd: "10:00 AM",
      formattedDuration: "1 hour"
    }
    // ... more slots
  ],
  metadata: {
    dateRange: {
      start: "2025-01-15T00:00:00.000Z",
      end: "2025-01-19T00:00:00.000Z"
    },
    workingDaysCount: 5,
    totalSlotsFound: 12,
    calendarId: "user@example.com"
  }
}
```

**Error Response**:
```javascript
{
  success: false,
  slots: [],
  error: "Date range must be 7 days or less",
  errorType: "validation" // or "api" or "system"
}
```

### Error Types

| errorType | Description | Example Errors |
|-----------|-------------|----------------|
| `validation` | Invalid input parameters | "Start date must be before end date"<br>"Date range must be 7 days or less"<br>"No working days in selected range" |
| `api` | Calendar API errors | "Unable to access calendar"<br>"Calendar not found" |
| `system` | Unexpected errors | "An unexpected error occurred: [message]" |

### Validation Rules

1. **Date Range Validation**:
   - Start date must not be after end date (FR-010)
   - Date range must be ≤ 7 days (FR-016)
   - Range must contain ≥ 1 working day (FR-020)

2. **Calendar Validation**:
   - User must have selected a calendar (via Config)
   - User must have read access to calendar

3. **Duration Validation**:
   - If provided, `minDurationMinutes` must be ≥ 15

### Example Usage (Client-Side)

```javascript
// Successful search
google.script.run
  .withSuccessHandler(function(response) {
    if (response.success) {
      displayAvailability(response.slots);
      showMetadata(response.metadata);
    } else {
      showError(response.error);
    }
  })
  .withFailureHandler(function(error) {
    showError('Server error: ' + error.message);
  })
  .findAvailability('2025-01-15', '2025-01-19', 60);
```

### Related Requirements
- FR-002: Allow users to specify start and end date
- FR-005: Retrieve calendar events in range
- FR-006: Calculate free time slots
- FR-007: Display slots grouped by date
- FR-009: Handle no availability case
- FR-010: Validate start date not after end date
- FR-011: Optional minimum duration filter
- FR-016: 7-day maximum range
- FR-020: Error for weekend-only ranges

### Performance
- **Target**: < 5 seconds for 7-day range (SC-001)
- **Typical**: 1-3 seconds for 3-day range with 20 events/day
- **Worst Case**: ~5 seconds for 7-day range with 140 events

---

## Function: getSelectedCalendar

Retrieves information about the currently selected calendar.

### Signature

```javascript
function getSelectedCalendar()
```

### Parameters

None

### Returns

**Type**: Object

```javascript
{
  success: true,
  calendar: {
    id: "user@example.com",
    name: "John Doe",
    isPrimary: true,
    color: "#9fc6e7"
  }
}
```

**Or (no calendar selected)**:
```javascript
{
  success: false,
  error: "No calendar selected"
}
```

### Example Usage

```javascript
google.script.run
  .withSuccessHandler(function(response) {
    if (response.success) {
      document.getElementById('calendarName').textContent = response.calendar.name;
    } else {
      showError('Please select a calendar first');
    }
  })
  .getSelectedCalendar();
```

### Related Requirements
- FR-001: Provide interface to access availability finder
- Integration with existing calendar selection (Feature 001)

---

## Implementation Notes

### Date Serialization

Google Apps Script's `google.script.run` automatically serializes Date objects to ISO 8601 strings when passing from server to client. The client must parse these strings back to Date objects:

```javascript
// Client-side parsing
slots.forEach(function(slot) {
  slot.date = new Date(slot.date);
  slot.startTime = new Date(slot.startTime);
  slot.endTime = new Date(slot.endTime);
});
```

### Error Handling Pattern

All server functions follow a consistent error handling pattern:

```javascript
function findAvailability(startDateStr, endDateStr, minDurationMinutes) {
  try {
    // Validate inputs
    // Call service layer
    // Return success response
    return {
      success: true,
      slots: [...],
      metadata: {...}
    };
  } catch (e) {
    error('findAvailability failed', e);
    return {
      success: false,
      slots: [],
      error: e.message,
      errorType: e.type || 'system'
    };
  }
}
```

### Logging

All functions log execution details:
- Start: `log('findAvailability started', { startDate, endDate })`
- End: `log('findAvailability completed', { slotsFound, duration })`
- Errors: `error('findAvailability failed', { error: e.message, stack: e.stack })`

---

## Security Considerations

1. **Authorization**: All functions check that user is authorized via `checkAuthorization()`
2. **Calendar Access**: Validate user has access to requested calendar via `hasCalendarAccess(calendarId)`
3. **Input Sanitization**: All date strings parsed and validated before use
4. **Rate Limiting**: Relies on Google Apps Script built-in rate limits (no additional throttling needed)

---

## Summary

The API consists of 1 primary function (`findAvailability`) and 1 helper function (`getSelectedCalendar`). All functions return structured responses with consistent error handling. Date serialization handled automatically by Apps Script RPC mechanism.

**API Surface**:
- `findAvailability(startDateStr, endDateStr, minDurationMinutes?)` → AvailabilityResponse
- `getSelectedCalendar()` → Calendar info or error
