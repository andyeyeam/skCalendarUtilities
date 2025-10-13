# Server Function Contracts: Calendar Event Display

**Feature**: 004-i-would-like
**Created**: 2025-01-13
**Purpose**: Define the enhanced server-side API contract for availability + events

## Enhanced Function: `findAvailability`

**Location**: `src/Code.gs`

**Purpose**: Fetch both available time slots and calendar events for a given date range.

### Signature

```javascript
/**
 * Find available time slots and calendar events for a date range
 * @param {string} startDateTime - Start date/time in ISO 8601 format (e.g., "2025-01-15T09:00:00")
 * @param {string} endDateTime - End date/time in ISO 8601 format (e.g., "2025-01-19T17:30:00")
 * @param {number} minDuration - Minimum slot duration in minutes (e.g., 30)
 * @returns {Object} Enhanced AvailabilityResponse with slots and events
 */
function findAvailability(startDateTime, endDateTime, minDuration)
```

### Request Parameters

| Parameter | Type | Required | Validation | Example |
|-----------|------|----------|------------|---------|
| `startDateTime` | String | Yes | ISO 8601 datetime; must be <= endDateTime | "2025-01-15T09:00:00" |
| `endDateTime` | String | Yes | ISO 8601 datetime; must be >= startDateTime | "2025-01-19T17:30:00" |
| `minDuration` | Number | Yes | Integer >= 15; <= 120 | 30 |

### Response Format

**Success Response** (both slots and events fetched):

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
    }
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
    }
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

**Partial Success Response** (slots succeeded, events failed):

```javascript
{
  success: true,
  slots: [ /* ... available slots ... */ ],
  events: [],
  eventsError: "Calendar access denied",
  metadata: {
    dateRange: { /* ... */ },
    workingDaysCount: 5,
    totalSlotsFound: 12,
    totalEventsFound: 0
  }
}
```

**Error Response** (complete failure):

```javascript
{
  success: false,
  error: "Start date must be before end date",
  slots: [],
  events: []
}
```

### Error Cases

| Error Condition | Response |
|----------------|----------|
| Invalid date range (start > end) | `{ success: false, error: "Invalid date range", slots: [], events: [] }` |
| Date range > 14 days | `{ success: false, error: "Date range must be 14 days or less", slots: [], events: [] }` |
| No calendar selected | `{ success: false, error: "Please select a calendar first", slots: [], events: [] }` |
| Calendar access denied | `{ success: true, slots: [...], events: [], eventsError: "Calendar access denied" }` (partial success) |
| Event fetch timeout | `{ success: true, slots: [...], events: [], eventsError: "Calendar events unavailable" }` (partial success) |

### Implementation Changes

**Before (Existing)**:
```javascript
function findAvailability(startDateTime, endDateTime, minDuration) {
  // 1. Validate inputs
  // 2. Fetch calendar
  // 3. Calculate availability (slots only)
  // 4. Return { success, slots, metadata }
}
```

**After (Enhanced)**:
```javascript
function findAvailability(startDateTime, endDateTime, minDuration) {
  // 1. Validate inputs (unchanged)
  // 2. Fetch calendar (unchanged)
  // 3. Calculate availability (slots) (unchanged)
  // 4. Fetch calendar events (NEW)
  //    - Wrap in try-catch for graceful degradation
  //    - Use CalendarEventService.fetchAndFormatEvents()
  // 5. Return { success, slots, events, metadata, eventsError? }
}
```

### Dependencies

**New Service Functions** (CalendarEventService.gs):

#### `fetchAndFormatEvents`

```javascript
/**
 * Fetch and format calendar events for a date range
 * @param {Calendar} calendar - Google Calendar object
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Array<Object>} Array of formatted CalendarEvent objects
 * @throws {Error} If calendar access fails
 */
function fetchAndFormatEvents(calendar, startDate, endDate)
```

**Implementation**:
1. Call `calendar.getEvents(startDate, endDate)`
2. Map each raw event to CalendarEvent model
3. Format times using existing time formatting utilities
4. Sort events by date, then start time
5. Return formatted array

#### `formatCalendarEvent`

```javascript
/**
 * Format a single Google Calendar event to CalendarEvent model
 * @param {GoogleCalendarEvent} rawEvent - Raw event from CalendarApp
 * @returns {Object} Formatted CalendarEvent object
 */
function formatCalendarEvent(rawEvent)
```

**Implementation**:
1. Extract title, start time, end time, all-day flag from raw event
2. Calculate date string (YYYY-MM-DD format)
3. Format times using `formatTime12Hour()` utility
4. Calculate duration in minutes
5. Format duration string ("{n} min")
6. Truncate title if > 40 characters
7. Return CalendarEvent object

### Backward Compatibility

**Client-Side Compatibility**: Existing client code expects `response.slots`. The enhanced response includes `response.events` as an additional field, so existing functionality remains unchanged. Clients not updated to display events will simply ignore the `events` array.

**Server-Side Changes**: The `findAvailability` function signature does not change (same parameters). Enhanced response is backward-compatible (all existing fields remain, new fields added).

### Performance Considerations

- **Event Fetching**: CalendarApp.getEvents() is called once per search (not per day)
- **Expected Latency**: +100-300ms for event fetch (based on typical calendar API performance)
- **Total Response Time**: <2 seconds (per spec requirement SC-002)
- **Event Count**: Typical 5-10 events/day × 5 days = 25-50 events (negligible formatting overhead)

### Security Considerations

- **Authorization**: Uses existing OAuth permissions for calendar access (no new scopes required)
- **Data Exposure**: Events are fetched from user's own calendar (no cross-user data access)
- **Error Messages**: Do not expose internal system details (use user-friendly error messages)

## New Service: CalendarEventService

**Location**: `src/services/CalendarEventService.gs` (new file)

**Purpose**: Encapsulate calendar event fetching and formatting logic.

### Public Functions

#### `fetchAndFormatEvents(calendar, startDate, endDate)`

See contract above.

#### `formatCalendarEvent(rawEvent)`

See contract above.

### Private Helpers

#### `truncateTitle(title, maxLength)`

```javascript
/**
 * Truncate title to max length with ellipsis
 * @param {string} title - Original title
 * @param {number} maxLength - Maximum length (including ellipsis)
 * @returns {string} Truncated title
 */
function truncateTitle(title, maxLength)
```

**Example**: `truncateTitle("Very Long Meeting Title That Exceeds Limit", 40)` → `"Very Long Meeting Title That Exceeds..."`

#### `formatEventDuration(startTime, endTime, isAllDay)`

```javascript
/**
 * Calculate and format event duration
 * @param {Date} startTime - Event start
 * @param {Date} endTime - Event end
 * @param {boolean} isAllDay - True if all-day event
 * @returns {string} Formatted duration
 */
function formatEventDuration(startTime, endTime, isAllDay)
```

**Examples**:
- Regular event: `formatEventDuration(10:00, 10:30, false)` → `"30 min"`
- All-day event: `formatEventDuration(*, *, true)` → `"All Day"`

### Error Handling

All CalendarEventService functions use try-catch blocks:
- Log errors to console (for debugging)
- Throw errors with user-friendly messages
- Calling code (findAvailability) catches and sets `eventsError` field

## Client-Side Integration

**Modified Client Function**: `displayResults(response, minDuration)` in `src/ui/Availability.html`

**Changes**:
1. Check for `response.events` array (new)
2. Store events globally: `allCalendarEvents = response.events`
3. Check for `response.eventsError` (new)
4. If eventsError exists, display warning banner
5. Render events in "Scheduled" section per date

**New Client Function**: `displayEvents(eventsByDate)` in `src/ui/Availability.html`

```javascript
/**
 * Render calendar events grouped by date
 * @param {Object} eventsByDate - Events grouped by date string
 * @returns {string} HTML for events section
 */
function displayEvents(eventsByDate)
```

**Implementation**:
- For each date in eventsByDate:
  - Render "Scheduled" heading
  - Render list of events (title, time range)
  - If no events, render "No events scheduled" or omit section
- Return HTML string for injection into resultsSlots container

## Testing Contract

**Manual Test Cases** (see `tests/manual/004-event-display-test-plan.md`):

1. **Normal case**: Search with 5 events in range → Both slots and events displayed
2. **No events**: Search with no events → Slots displayed, no "Scheduled" section
3. **All-day event**: Search with all-day event → "All Day" displayed correctly
4. **Event extends beyond range**: Event from 4PM-6PM, search ends at 5PM → Full event time shown
5. **Long event title**: Event with 60-char title → Truncated to 40 chars with "..."
6. **Events error**: Revoke calendar permission → Slots shown, warning banner visible
7. **Complete failure**: Invalid date range → Error message, no slots or events

## Summary

**Key Changes**:
- Enhanced `findAvailability` to return both `slots` and `events` arrays
- New `CalendarEventService` for event fetching and formatting
- Graceful degradation if events fail to fetch (partial success response)
- Backward-compatible response (existing clients ignore new fields)
- Performance: <2 seconds total response time including events
