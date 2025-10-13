# Research: Calendar Event Display

**Feature**: 004-i-would-like
**Created**: 2025-01-13
**Purpose**: Technical research for displaying calendar events alongside availability slots

## Research Questions

### 1. Google Calendar API - Event Fetching

**Question**: How do we fetch calendar events for a date range using CalendarApp in Google Apps Script?

**Decision**: Use `CalendarApp.getCalendarById(calendarId).getEvents(startTime, endTime)` method

**Rationale**:
- CalendarApp service is already used in the project for availability calculation
- `getEvents()` method accepts Date objects for start and end time, matching our existing date range handling
- Returns array of CalendarEvent objects with all properties we need (title, start time, end time, all-day flag)
- No additional OAuth scopes required beyond existing calendar access

**Alternatives Considered**:
- **Advanced Calendar Service**: More features but requires additional OAuth configuration and script setup
- **Rejected because**: CalendarApp provides all needed functionality; simpler API; no additional setup

**Implementation Notes**:
- Use same calendar ID already selected by user for availability search
- Fetch events using same date range boundaries as availability search
- Handle all-day events separately (CalendarEvent.isAllDay() property)

### 2. Visual Distinction - Events vs Available Slots

**Question**: How should calendar events be visually distinguished from available time slots in a compact, readable format?

**Decision**: Use separate sections within each date card: "Available" section for slots, "Scheduled" section for events

**Rationale**:
- Clear separation via section headings provides strongest visual distinction
- Maintains compact layout per user requirement (no duplicate date headers)
- Follows existing pattern (availability slots already grouped by date in cards)
- Allows different visual treatments (available slots have checkboxes; events do not)
- Easy to scan: "Available" = things I can select; "Scheduled" = things I'm committed to

**Alternatives Considered**:
- **Option A: Color-coded backgrounds** (e.g., green for available, red for busy)
  - Rejected because: Violates constitution's disciplined color palette (max 3 colors); color alone is poor accessibility
- **Option B: Side-by-side columns** (left = available, right = scheduled)
  - Rejected because: Poor mobile responsiveness; horizontal space constrained in Google Sites iframe
- **Option C: Icons/glyphs** (checkmark for available, calendar icon for events)
  - Rejected because: Adds visual clutter; harder to scan quickly; doesn't meet "easy to read" requirement

**Implementation Notes**:
- Within each date card, render two subsections:
  - **"Available" heading**: Followed by checkbox-enabled time slots (existing pattern)
  - **"Scheduled" heading**: Followed by read-only event list (new pattern)
- Use same card styling, typography hierarchy for consistency
- If no events for a day, omit "Scheduled" section entirely (or show "No events scheduled" for clarity)

### 3. Event Display Format

**Question**: What information should be displayed for each calendar event, and in what format?

**Decision**: Display format: **"[Time Range] - [Event Title]"** (e.g., "9:00 AM - 10:30 AM - Team Standup")

**Rationale**:
- Time range first: Most critical information for understanding schedule conflicts
- Event title provides context for what user is committed to
- Single-line format is most compact (per user requirement)
- Mirrors available slot format (time + label) for visual consistency

**Data to Display**:
- **Start time** (formatted as "h:mm AM/PM")
- **End time** (formatted as "h:mm AM/PM")
- **Event title** (truncated if > 40 characters with ellipsis)
- **Duration** (optional, show in format "(90 min)" if helpful)

**Data to Exclude** (per spec Out of Scope):
- Event attendees
- Event location
- Event description
- Event color/category

**Edge Case Handling**:
- **All-day events**: Display as "All Day - [Event Title]" at top of Scheduled section
- **Long titles**: Truncate at 40 characters with "..." (hover/click for full title optional future enhancement)
- **Multi-day events**: Display only on first day within search range with note "(multi-day)" appended
- **Events extending beyond search range**: Show full time range per spec clarification (e.g., "4:00 PM - 6:00 PM" even if search ends at 5 PM)

**Implementation Notes**:
- Reuse existing `formatTime12Hour()` utility function from TimeSlot formatting
- Create new `formatEventTime()` function in CalendarEventService for event-specific formatting
- Store formatted strings in CalendarEvent model for client-side rendering

### 4. Performance - Event Fetching Strategy

**Question**: Should events be fetched in the same server call as availability calculation, or separately?

**Decision**: Fetch events in the same server call (modify `findAvailability` function to return both slots and events)

**Rationale**:
- **Performance**: Avoids additional round-trip to server; meets <2 second requirement
- **Consistency**: Events and slots calculated from same snapshot of calendar data
- **Simplicity**: Single loading state, single error handling path
- **Existing Pattern**: Current `findAvailability` already makes one server call returning JSON response

**Implementation Approach**:
1. Modify `findAvailability(startDateTime, endDateTime, minDuration)` server function
2. Add event fetching logic: `calendar.getEvents(startDate, endDate)`
3. Format events using new CalendarEventService
4. Return enhanced response: `{ success: true, slots: [...], events: [...], metadata: {...} }`
5. Client-side: Render both slots and events from single response

**Alternatives Considered**:
- **Separate `getCalendarEvents()` server function**: Would require second API call, additional loading states
- **Rejected because**: Unnecessary complexity; violates spec requirement (2-second total time includes events)

**Performance Notes**:
- CalendarApp.getEvents() is fast (Google-optimized API)
- Typical load: 5-10 events per day × 5 days = 25-50 events total
- Event formatting (title truncation, time formatting) is negligible overhead
- No caching needed for this feature (events are ephemeral, search-scoped)

### 5. Error Handling - Event Fetch Failures

**Question**: What should happen if calendar events fail to fetch but availability calculation succeeds?

**Decision**: Graceful degradation - show available slots with warning message about events

**Rationale**:
- Availability search is primary feature; events are supplementary context (per spec FR-009)
- User can still accomplish core task (select availability) even without event visibility
- Clear error messaging informs user that event data is incomplete
- Prevents total failure of feature due to transient API issues

**Implementation Approach**:
1. Wrap event fetching in try-catch block within `findAvailability` function
2. If event fetch fails: Log error, set `events: []` and `eventsError: "message"` in response
3. Client-side: Display warning banner if `eventsError` is present (e.g., "Unable to load calendar events. Showing availability only.")
4. Available slots display normally; Scheduled section shows error state

**Error Scenarios**:
- **Calendar permission denied**: Show "Calendar access denied. Showing availability only."
- **Calendar API timeout**: Show "Calendar events unavailable. Showing availability only."
- **Unknown error**: Show generic message with suggestion to retry search

**Testing Notes**:
- Manually test by temporarily revoking calendar permissions
- Verify availability slots still render correctly
- Verify error message is visible but not intrusive

## Summary of Key Decisions

| Area | Decision | Rationale |
|------|----------|-----------|
| Event Fetching | CalendarApp.getEvents() in same call as availability | Performance; simplicity; existing API |
| Visual Distinction | Separate "Available" and "Scheduled" sections per date | Clear hierarchy; compact; accessible |
| Event Format | "[Time] - [Title]" single-line format | Compact; consistent with slots; easy to read |
| Performance | Fetch in same server call (no separate API) | <2s requirement; data consistency |
| Error Handling | Graceful degradation with warning message | Availability is primary; events are supplementary |

## Dependencies

- **Google Apps Script CalendarApp Service**: Already in use
- **Existing TimeSlot formatting utilities**: Reuse for time formatting
- **Existing card/list UI patterns**: Reuse for event display

## Next Steps

Proceed to Phase 1:
1. Define CalendarEvent data model (data-model.md)
2. Specify server function contract for enhanced findAvailability (contracts/server-functions.md)
3. Create implementation quickstart (quickstart.md)
