# Research & Technical Decisions: Availability Finder

**Feature**: 002-i-want-to (Availability Finder)
**Date**: 2025-01-11
**Status**: Complete

## Overview

This document captures technical decisions and research findings for implementing the availability finder feature in the Google Apps Script calendar utilities application.

## Research Areas

### 1. Time Slot Calculation Algorithm

**Decision**: Interval-based algorithm with 15-minute granularity

**Rationale**:
- Working hours (09:00-17:30) = 510 minutes = 34 possible 15-minute slots per day
- Algorithm approach:
  1. For each working day in range, create array of 34 time intervals
  2. Retrieve all calendar events for the day
  3. Mark intervals as "busy" if any event overlaps them
  4. Merge consecutive "free" intervals into time slots
  5. Filter out slots < 15 minutes (FR-018)
- This approach is efficient for small date ranges (1-7 days) and handles overlapping events naturally

**Alternatives Considered**:
- **Event-subtraction approach**: Calculate free time by subtracting event durations from working hours
  - Rejected: More complex logic for handling overlapping events and partial overlaps with working hours
- **Minute-by-minute boolean array**: Track availability for each minute in working hours
  - Rejected: Unnecessary granularity (510 booleans vs 34 intervals per day), same complexity

**Implementation Notes**:
- Use JavaScript Date objects with millisecond precision for interval boundaries
- Round event times to nearest 15-minute boundary for display consistency
- Handle all-day events by marking entire working day (09:00-17:30) as busy

---

### 2. Date Range Validation

**Decision**: Client-side + server-side validation with clear error messages

**Rationale**:
- Client-side validation provides immediate feedback without server round-trip
- Server-side validation ensures security (prevent API abuse, enforce FR-016 7-day limit)
- Validation rules:
  - Start date not after end date (FR-010)
  - Date range ≤ 7 days (FR-016)
  - Date range contains at least one working day (FR-020)

**Alternatives Considered**:
- **Server-side only**: Rejected due to poor UX (unnecessary latency for obvious errors)
- **Client-side only**: Rejected due to security concerns (users could manipulate requests)

**Implementation Notes**:
- Use HTML5 date inputs with `min`/`max` attributes for basic validation
- JavaScript validation before `google.script.run` call
- Server function validates again and returns structured error object with user-friendly messages

---

### 3. Calendar Event Filtering

**Decision**: Single Calendar API call with date range, filter in-memory

**Rationale**:
- Google Apps Script `CalendarApp.getEvents(startDate, endDate)` retrieves all events in range efficiently
- Filter logic applied in-memory:
  - Clip events that start before 09:00 or end after 17:30 (FR-012)
  - Treat all-day events as blocking entire working day (FR-014)
  - Handle overlapping events by merging busy intervals (FR-015)
- For 7-day range with 20 events/day = ~140 events, in-memory filtering is fast (<100ms)

**Alternatives Considered**:
- **Multiple API calls per day**: Rejected due to API quota concerns and unnecessary complexity
- **Pre-filter events by time**: Not supported by Calendar API (can only filter by date range)

**Implementation Notes**:
- Use `event.isAllDayEvent()` to detect all-day events
- For regular events, use `getStartTime()` and `getEndTime()` to get Date objects
- Cache calendar reference to avoid repeated `CalendarApp.getCalendarById()` calls

---

### 4. Time Display Format

**Decision**: 12-hour format with AM/PM (FR-019)

**Rationale**:
- User clarification selected 12-hour format (e.g., "9:00 AM - 10:30 AM")
- More familiar to general users vs 24-hour format
- Aligns with Google Calendar default display in most locales

**Alternatives Considered**:
- **24-hour format**: Rejected per user clarification
- **Locale-aware formatting**: Not needed (single format specified in requirements)

**Implementation Notes**:
- Create utility function `formatTime12Hour(date)` in DateUtils.gs
- Format: "h:mm AM/PM" (e.g., "9:00 AM", "12:30 PM", "5:30 PM")
- Omit leading zero for hours (9:00, not 09:00)

---

### 5. UI Layout & Data Presentation

**Decision**: Date-grouped card layout with expandable date sections

**Rationale**:
- User Story 1 requires slots "grouped by date" (FR-007)
- Card-based design aligns with existing UI pattern (Menu.html, other utilities)
- Layout structure:
  - Search form at top (start date, end date, optional min duration filter)
  - "Find Availability" button
  - Results section with cards per date
  - Each card shows: date header, list of time slots with durations
- Chronological sorting: earliest slots first within each day (per clarification)

**Alternatives Considered**:
- **Single flat list**: Rejected due to poor readability for multi-day ranges
- **Calendar grid view**: Rejected due to complexity (would require significant CSS/JS for visual calendar)
- **Table layout**: Rejected due to poor mobile responsiveness

**Implementation Notes**:
- Use existing Styles.html card classes for consistency
- Display slot duration in human-readable format (e.g., "2 hours 30 minutes" or "45 minutes")
- Empty state message when no availability found (FR-009)
- Error messages displayed prominently with red error card style

---

### 6. Minimum Duration Filtering

**Decision**: Optional client-side filter, applied after server calculation

**Rationale**:
- User Story 2 (P2 priority) requires filtering by minimum duration
- Filter applied after calculating all slots:
  1. Server returns all slots ≥15 minutes
  2. If user specifies min duration (e.g., 60 min), client filters results before display
  3. Benefits: Can adjust filter without re-querying server, faster interaction
- Alternative: Server-side filtering would work but adds unnecessary complexity for this simple filter

**Alternatives Considered**:
- **Server-side filtering**: Possible but requires additional server call when user changes filter
- **Pre-calculate multiple filter levels**: Wasteful; most users won't use filter

**Implementation Notes**:
- Add optional "Minimum Duration" input field (dropdown: 15 min, 30 min, 1 hour, 2 hours)
- Store original results in JavaScript variable
- Implement `filterSlotsByDuration(slots, minMinutes)` client-side function
- Update display without server round-trip when filter changes

---

### 7. Weekend Handling

**Decision**: Exclude weekends by default, validate for weekend-only ranges

**Rationale**:
- FR-004: Exclude weekends (Saturday and Sunday) from availability search by default
- FR-020: Display error "No working days in selected range" for weekend-only ranges
- Detection logic: Use JavaScript `Date.getDay()` (0 = Sunday, 6 = Saturday)

**Alternatives Considered**:
- **Include weekends with toggle**: Not in MVP scope; may be future enhancement
- **Treat weekends as non-working days silently**: User confusion if they select weekend range

**Implementation Notes**:
- Create `isWorkingDay(date)` utility function: returns false for Saturday/Sunday
- Validate date range: iterate through range, count working days, error if zero
- Display working days count in UI (e.g., "Searching 5 working days between Jan 15 - Jan 21")

---

### 8. Performance Optimization

**Decision**: Minimize Calendar API calls, avoid batch processing overhead

**Rationale**:
- Primary performance concern: Calendar API latency (~500ms-2s depending on event count)
- Optimization strategies:
  1. Single `getEvents()` call for entire date range
  2. Process all events in-memory (fast for <200 events)
  3. Return structured JSON to client (no additional server calls for display)
- Expected performance: <3 seconds for 7-day range with 140 events (within SC-001 goal of <5 seconds)

**Alternatives Considered**:
- **Caching results**: Not needed for transient data (availability changes frequently)
- **Background processing**: Overkill for small date ranges; Apps Script execution is fast enough

**Implementation Notes**:
- Log execution time for monitoring: `Logger.log('Availability calculation took ' + elapsed + 'ms')`
- Return early if no events found (optimization for empty calendars)
- Structure response: `{ success: true, slots: [...], metadata: { dateRange, workingDays, totalSlots } }`

---

### 9. Error Handling

**Decision**: Structured error responses with user-friendly messages

**Rationale**:
- Errors categorized:
  - **Validation errors**: Date range invalid, weekend-only range (FR-010, FR-016, FR-020)
  - **API errors**: Calendar access denied, rate limit exceeded
  - **Unexpected errors**: JavaScript exceptions, null references
- All errors return structured object: `{ success: false, error: "message", errorType: "validation|api|system" }`

**Alternatives Considered**:
- **Throw exceptions**: Rejected; harder to handle gracefully in client
- **Generic error messages**: Rejected; poor UX for actionable errors

**Implementation Notes**:
- Create error message constants in AvailabilityService.gs
- Display error messages in red error card with appropriate icon
- Log all errors with context for debugging

---

### 10. Integration with Existing Menu System

**Decision**: Add "Find Availability" button to Menu.html, follow existing navigation pattern

**Rationale**:
- User requirement: "add a new button on the main menu"
- Existing menu has 3 utility buttons (BulkOps, Analytics, Cleanup)
- Pattern: Button click → `navigateToUtility('Availability')` → `loadUtility()` → full-screen replacement
- Navigation: Back button uses `window.top.location.reload()` to return to menu (preserves sessionStorage)

**Alternatives Considered**:
- **Modal/overlay**: Rejected; poor for displaying large result sets
- **Separate page/URL**: Not supported in Apps Script single-page architecture

**Implementation Notes**:
- Add fourth button to Menu.html after Cleanup button
- Update `validUtilities` array in Code.gs to include 'Availability'
- Create Availability.html following same structure as BulkOps.html (back button, card layout)
- Button description: "Find available time slots in your calendar for scheduling meetings"

---

## Technical Dependencies

### Required APIs
- **Google Calendar API** (CalendarApp): Event retrieval, calendar access validation
- **Google Sheets API** (SpreadsheetApp): Config persistence (existing)
- **HTML Service**: UI rendering (existing)

### JavaScript Built-ins
- **Date**: Time calculations, comparisons, formatting
- **Array**: Filtering, mapping, sorting time slots
- **Math**: Duration calculations, rounding

### No External Libraries Required
- Pure JavaScript implementation
- No npm packages or external dependencies
- Leverages existing utility functions (Logger, AuthUtils)

---

## Testing Strategy

### Manual Test Scenarios

1. **Happy Path**:
   - Select 3-day range with some events
   - Verify slots grouped by date, sorted chronologically
   - Check 15-minute granularity and 12-hour format

2. **Edge Cases**:
   - Completely free day → single slot 9:00 AM - 5:30 PM
   - Fully booked day → "No availability" message
   - Weekend-only range → validation error
   - Start date after end date → validation error
   - Date range > 7 days → validation error

3. **Event Handling**:
   - All-day event → entire working day blocked
   - Event before 9:00 AM extending into working hours → clipped to 9:00 AM
   - Event during working hours extending past 5:30 PM → clipped to 5:30 PM
   - Overlapping events → time correctly marked as unavailable

4. **Filtering**:
   - Apply 1-hour minimum filter → only slots ≥60 minutes shown
   - Apply 2-hour filter to range with only 30-min slots → "No availability" message

5. **Cross-Device**:
   - Test in Google Sites iframe on desktop
   - Test on mobile viewport (responsive layout)

### Performance Testing
- Measure execution time for 7-day range with 140 events
- Verify < 5 seconds total (SC-001)
- Test with empty calendar (optimization case)

---

## Summary

All technical decisions support the feature requirements without introducing unnecessary complexity. The implementation leverages existing Google Apps Script capabilities and follows established patterns in the codebase. No external dependencies or significant architectural changes required.

**Key Technologies**:
- Google Apps Script (JavaScript ES5+ compatible)
- CalendarApp API for event retrieval
- HTML Service for UI
- Pure JavaScript for time calculations

**Performance**: Expected <3 seconds for typical 7-day search (within 5-second requirement)

**Complexity**: Low - straightforward algorithm, minimal new code (~300 lines total across 5 new files)
