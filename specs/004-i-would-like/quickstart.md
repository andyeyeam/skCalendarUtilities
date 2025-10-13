# Implementation Quickstart: Calendar Event Display

**Feature**: 004-i-would-like
**Branch**: `004-i-would-like`
**Estimated Effort**: 3-4 hours

## Overview

This feature enhances the Find Availability screen by displaying calendar events alongside available time slots. Users will see their complete schedule (busy times + available times) in a compact, readable format.

## Prerequisites

- Existing availability search feature is working (feature 002-i-want-to)
- Google Calendar API access is configured (CalendarApp service)
- Development environment set up with clasp CLI

## Implementation Order

Implement in this order to maintain working state and allow incremental testing:

### Phase 1: Server-Side (Backend) - 1.5 hours

1. **Create CalendarEvent Model** (15 min)
   - File: `src/models/CalendarEvent.gs`
   - Define CalendarEvent structure with formatted fields
   - Add JSDoc comments

2. **Create CalendarEventService** (45 min)
   - File: `src/services/CalendarEventService.gs`
   - Implement `fetchAndFormatEvents(calendar, startDate, endDate)`
   - Implement `formatCalendarEvent(rawEvent)`
   - Add helper functions: `truncateTitle()`, `formatEventDuration()`
   - Use existing time formatting utilities from project

3. **Enhance findAvailability Function** (30 min)
   - File: `src/Code.gs`
   - Import CalendarEventService
   - Add event fetching logic after availability calculation
   - Wrap event fetch in try-catch for graceful degradation
   - Enhance response to include `events` array and `eventsError` field
   - Update metadata to include `totalEventsFound`

**Testing Checkpoint**: Test server function using Apps Script debugger
- Verify events are fetched and formatted correctly
- Verify graceful degradation if calendar access fails
- Check response structure matches contract

### Phase 2: Client-Side (Frontend) - 1.5 hours

4. **Add Event Rendering Logic** (45 min)
   - File: `src/ui/Availability.html`
   - Store events in global variable: `var allCalendarEvents = []`
   - Modify `displayResults()` to handle events array
   - Create `groupEventsByDate()` function (parallel to slot grouping)
   - Create `renderEventsForDate()` function for event display

5. **Update UI Layout** (30 min)
   - File: `src/ui/Availability.html`
   - Modify date card rendering to include "Scheduled" section
   - Add event HTML structure: simple list with time + title
   - Style events: compact spacing, clear typography, visual distinction from slots
   - Handle empty state: "No events scheduled" or omit section

6. **Add Error Handling** (15 min)
   - File: `src/ui/Availability.html`
   - Check for `response.eventsError` in `displayResults()`
   - Display warning banner if events failed to load
   - Ensure available slots still render correctly

**Testing Checkpoint**: Test in browser
- Verify events display alongside slots
- Verify visual distinction between events and slots
- Check all edge cases: no events, all-day events, long titles

### Phase 3: Styling & Polish - 30 min

7. **Apply Constitution Styling** (30 min)
   - File: `src/ui/Availability.html` (inline styles)
   - Apply typography hierarchy: event title (16px, weight 600), time/duration (14px, weight 400)
   - Apply disciplined color palette: neutral backgrounds, sufficient contrast
   - Ensure compact layout per user requirements
   - Verify WCAG AA contrast (4.5:1 minimum)
   - Test responsiveness in mobile viewport

**Testing Checkpoint**: Visual QA
- Verify "easy to read" requirement met
- Verify "compact" layout per user instructions
- Check constitution compliance (typography, color, minimalism)

## Implementation Details

### 1. CalendarEvent Model (src/models/CalendarEvent.gs)

```javascript
/**
 * Create a formatted CalendarEvent object from a raw Google Calendar event
 * @param {GoogleCalendarEvent} rawEvent - Event from CalendarApp.getEvents()
 * @returns {Object} Formatted CalendarEvent object
 */
function createCalendarEvent(rawEvent) {
  var startTime = rawEvent.getStartTime();
  var endTime = rawEvent.getEndTime();
  var isAllDay = rawEvent.isAllDayEvent();
  var title = rawEvent.getTitle() || 'Untitled Event';

  // Get date in YYYY-MM-DD format (same as TimeSlot)
  var date = Utilities.formatDate(startTime, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  // Format times
  var formattedStart = isAllDay ? 'All Day' : formatTime12Hour(startTime);
  var formattedEnd = isAllDay ? 'All Day' : formatTime12Hour(endTime);

  // Calculate duration
  var durationMinutes = isAllDay ? 0 : Math.round((endTime - startTime) / (1000 * 60));
  var formattedDuration = isAllDay ? 'All Day' : durationMinutes + ' min';

  // Truncate title if too long
  var displayTitle = title.length > 40 ? title.substring(0, 37) + '...' : title;

  return {
    title: title,
    startTime: startTime,
    endTime: endTime,
    isAllDay: isAllDay,
    date: date,
    formattedStart: formattedStart,
    formattedEnd: formattedEnd,
    formattedDuration: formattedDuration,
    displayTitle: displayTitle
  };
}
```

### 2. CalendarEventService (src/services/CalendarEventService.gs)

```javascript
/**
 * Fetch and format calendar events for a date range
 * @param {Calendar} calendar - Google Calendar object
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @returns {Array<Object>} Array of formatted CalendarEvent objects
 * @throws {Error} If calendar access fails
 */
function fetchAndFormatEvents(calendar, startDate, endDate) {
  try {
    // Fetch events from Google Calendar
    var rawEvents = calendar.getEvents(startDate, endDate);

    // Format each event
    var formattedEvents = rawEvents.map(function(rawEvent) {
      return createCalendarEvent(rawEvent);
    });

    // Sort by date, then start time
    formattedEvents.sort(function(a, b) {
      var dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.getTime() - b.startTime.getTime();
    });

    return formattedEvents;

  } catch (error) {
    Logger.log('Error fetching calendar events: ' + error.message);
    throw new Error('Calendar access denied');
  }
}
```

### 3. Enhanced findAvailability (src/Code.gs)

```javascript
function findAvailability(startDateTime, endDateTime, minDuration) {
  try {
    // ... existing validation and availability calculation ...

    // NEW: Fetch calendar events
    var events = [];
    var eventsError = null;

    try {
      events = fetchAndFormatEvents(calendar, startDate, endDate);
    } catch (eventError) {
      // Graceful degradation: availability still works
      eventsError = 'Calendar events unavailable. Showing availability only.';
      Logger.log('Event fetch error: ' + eventError.message);
    }

    // Enhanced response
    return {
      success: true,
      slots: availableSlots,
      events: events,
      metadata: {
        dateRange: { start: startDateTime, end: endDateTime },
        workingDaysCount: countWorkingDays(startDate, endDate),
        totalSlotsFound: availableSlots.length,
        totalEventsFound: events.length
      },
      eventsError: eventsError
    };

  } catch (error) {
    // ... existing error handling ...
  }
}
```

### 4. Client-Side Event Rendering (src/ui/Availability.html)

```javascript
// Global variable to store events
var allCalendarEvents = [];

// Enhanced displayResults function
function displayResults(response, minDuration) {
  // ... existing slot rendering ...

  // Store events
  allCalendarEvents = response.events || [];

  // Check for events error
  if (response.eventsError) {
    showMessage(response.eventsError, 'warning');
  }

  // Group events by date
  var eventsByDate = {};
  allCalendarEvents.forEach(function(event) {
    if (!eventsByDate[event.date]) {
      eventsByDate[event.date] = [];
    }
    eventsByDate[event.date].push(event);
  });

  // Render slots and events together
  for (var dateStr in slotsByDate) {
    var dateSlots = slotsByDate[dateStr];
    var dateEvents = eventsByDate[dateStr] || [];

    slotsHtml += '<div class="card mb-2">';
    slotsHtml += '<h3>' + formatDate(new Date(dateStr)) + '</h3>';

    // Available section (existing)
    if (dateSlots.length > 0) {
      slotsHtml += '<div class="section-header">Available</div>';
      dateSlots.forEach(function(slot) {
        // ... existing slot rendering ...
      });
    }

    // Scheduled section (NEW)
    if (dateEvents.length > 0) {
      slotsHtml += '<div class="section-header">Scheduled</div>';
      dateEvents.forEach(function(event) {
        slotsHtml += '<div class="event-item">';
        slotsHtml += '<span class="event-time">' + event.formattedStart + ' - ' + event.formattedEnd + '</span>';
        slotsHtml += '<span class="event-title">' + event.displayTitle + '</span>';
        slotsHtml += '</div>';
      });
    }

    slotsHtml += '</div>';
  }
}
```

### 5. Event Styling (src/ui/Availability.html)

```css
/* Section headers */
.section-header {
  font-weight: 600;
  font-size: 0.875rem;
  color: #666;
  margin-top: 0.75rem;
  margin-bottom: 0.5rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* Event items */
.event-item {
  padding: 0.5rem 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.event-item:last-child {
  border-bottom: none;
}

.event-time {
  font-size: 0.875rem;
  color: #666;
  font-weight: 400;
}

.event-title {
  font-size: 1rem;
  color: #333;
  font-weight: 500;
}

/* Visual distinction: events have subtle background */
.event-item {
  background-color: #fafafa;
  padding: 0.5rem;
  border-radius: 4px;
  margin-bottom: 0.25rem;
}
```

## Testing Plan

### Manual Test Cases

1. **Happy Path**: Search Jan 15-19, verify both slots and events display
2. **No Events**: Search date range with no calendar events, verify only slots show
3. **No Slots**: Search fully booked date range, verify only events show
4. **All-Day Event**: Create all-day event, verify "All Day" displays correctly
5. **Long Title**: Create event with 60-char title, verify truncation to 40 chars
6. **Event Extends Range**: Event 4-6PM, search ends at 5PM, verify full time shown
7. **Multiple Events Per Day**: 10 events in one day, verify readable layout
8. **Events Error**: Revoke calendar permission, verify graceful degradation
9. **Mobile Viewport**: Test in 375px width, verify responsive layout
10. **Contrast Check**: Use contrast checker to verify WCAG AA compliance

### Test Checklist

- [ ] Events display alongside slots
- [ ] Visual distinction clear between events and slots
- [ ] Typography meets constitution standards (16px min, clear hierarchy)
- [ ] Color palette limited to neutrals (no new colors)
- [ ] Compact layout per user requirement
- [ ] Easy to read per user requirement
- [ ] All-day events formatted correctly
- [ ] Long titles truncated properly
- [ ] Events extending beyond range show full time
- [ ] Error handling works (events fail, slots succeed)
- [ ] Responsive on mobile (375px width)
- [ ] Accessible (keyboard nav, ARIA labels if needed)

## Deployment

1. **Test in Apps Script Editor**: Use built-in debugger and Execution log
2. **Test in Google Sites**: Deploy as test version, embed in test page
3. **Manual QA**: Run all test cases from Testing Plan section
4. **Deploy**: Use clasp push to deploy to production
5. **Monitor**: Check execution logs for errors in first 24 hours

## Rollback Plan

If issues arise:
1. Revert `findAvailability` function to return only slots (remove `events` field)
2. Client will ignore missing `events` array (backward compatible)
3. Redeploy previous version using clasp

## Success Criteria

- [ ] SC-001: Users can view both slots and events in same view
- [ ] SC-002: Events display within 2 seconds of search completing
- [ ] SC-003: Visual distinction clear at a glance (<1 second)
- [ ] SC-004: Readable with up to 10 events per day
- [ ] SC-005: Graceful degradation if events fail

## Tips

- **Reuse Existing Patterns**: Follow TimeSlot rendering pattern for CalendarEvent rendering
- **Test Incrementally**: Test server-side first, then client-side, then styling
- **Constitution Compliance**: Keep checking typography, color, minimalism principles
- **User Requirements**: "Compact" and "easy to read" should guide every design decision
- **Logging**: Add Logger.log() statements for debugging server-side logic

## Resources

- **Existing Code**: Study `TimeSlot.gs` model and slot rendering in Availability.html
- **Google Calendar API**: [CalendarApp Documentation](https://developers.google.com/apps-script/reference/calendar)
- **Constitution**: `.specify/memory/constitution.md` for design principles
- **Contracts**: `specs/004-i-would-like/contracts/server-functions.md` for API details
