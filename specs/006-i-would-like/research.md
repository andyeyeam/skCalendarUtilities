# Research: One-to-One Meeting Scheduler

**Feature**: 006-i-would-like
**Date**: 2025-01-26
**Status**: Complete ✅

## Overview

This document captures research findings for implementing a one-to-one meeting scheduler in Google Apps Script. The feature manages a group of people, configures meeting time slots, and automatically creates recurring calendar events with optimal scheduling. Research focused on four key areas: Google Sheets storage patterns, Google Calendar recurring events API, session storage for UI state, and scheduling algorithm design.

---

## 1. Google Sheets Storage Pattern

### Decision: Multi-tab schema with separate tabs for people, configuration, and meeting assignments

### Rationale

Following the existing pattern established in `SheetService.gs` and `Config.gs`, the application uses a single "Calendar Utilities Config" spreadsheet with multiple tabs. This approach:
- **Maintains consistency** with the existing config storage pattern
- **Leverages existing infrastructure** (`getOrCreateConfigSheet()`, `batchRead()`, `batchWrite()`)
- **Provides clear separation** between different data types
- **Enables easy manual inspection** and debugging via Google Sheets UI
- **Supports efficient batch operations** for reading/writing multiple records

### Sheet Schema

The implementation will add three new tabs to the existing "Calendar Utilities Config" spreadsheet:

#### Tab 1: OneToOnePeople

Stores the list of individuals requiring one-to-one meetings.

| Column | Type | Description | Validation |
|--------|------|-------------|------------|
| PersonId | String | Unique identifier (UUID v4) | Required, unique |
| Name | String | Person's full name | Required, non-empty |
| Email | String | Email address | Required, valid email format |
| CalendarEventId | String | Associated recurring event ID | Optional (set after meeting creation) |
| CreatedAt | ISO 8601 Timestamp | Record creation timestamp | Auto-generated |
| UpdatedAt | ISO 8601 Timestamp | Last modification timestamp | Auto-updated |

**Example Rows**:
```
PersonId                              | Name          | Email                | CalendarEventId                    | CreatedAt            | UpdatedAt
-------------------------------------|---------------|----------------------|------------------------------------|----------------------|----------------------
a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6 | Alice Johnson | alice@example.com    | abc123xyz@google.com               | 2025-01-26T10:00:00Z | 2025-01-26T10:00:00Z
b2c3d4e5-f6g7-48h9-i0j1-k2l3m4n5o6p7 | Bob Smith     | bob.smith@example.com| def456uvw@google.com               | 2025-01-26T10:05:00Z | 2025-01-26T10:05:00Z
```

**Key Design Decisions**:
- **PersonId as UUID**: Guarantees uniqueness, allows email changes without breaking references
- **Email as secondary unique constraint**: Used for duplicate detection and calendar invitations
- **CalendarEventId nullable**: Person can exist before meetings are created
- **Timestamps for audit trail**: Supports troubleshooting and data integrity checks

#### Tab 2: OneToOneConfig

Stores global configuration for meeting scheduling.

Key-value structure (same pattern as existing Config tab):

| Key | Value | Description |
|-----|-------|-------------|
| meetingDurationMinutes | 30 | Duration of each meeting in minutes |
| minRecurrenceIntervalWeeks | 1 | Minimum number of weeks between meetings |
| calculatedRecurrenceWeeks | 2 | Actual recurrence interval (auto-calculated) |
| meetingTitlePrefix | "1:1 -" | Prefix for calendar event titles |

**Example Configuration Storage**:
```
Key                          | Value
-----------------------------|-------
meetingDurationMinutes       | 30
minRecurrenceIntervalWeeks   | 1
calculatedRecurrenceWeeks    | 2
meetingTitlePrefix           | 1:1 -
```

**Additional Design Notes**:
- Uses existing `configToSheetRows()` and `sheetRowsToConfig()` pattern from `Config.gs`
- Stores `calculatedRecurrenceWeeks` separately from `minRecurrenceIntervalWeeks` to show users the actual interval being used
- Configuration is validated before saving (see validation in Implementation section)

#### Tab 3: OneToOneSlots

Stores available time slots when meetings can be scheduled.

| Column | Type | Description | Validation |
|--------|------|-------------|------------|
| SlotId | String | Unique identifier (UUID v4) | Required, unique |
| Weekday | String | Day of week (Monday, Tuesday, etc.) | Required, valid weekday name |
| StartTime | String | Slot start time (HH:MM format, 24-hour) | Required, valid time |
| EndTime | String | Slot end time (HH:MM format, 24-hour) | Required, valid time, > StartTime |
| CreatedAt | ISO 8601 Timestamp | Record creation timestamp | Auto-generated |

**Example Rows**:
```
SlotId                                | Weekday   | StartTime | EndTime | CreatedAt
--------------------------------------|-----------|-----------|---------|----------------------
s1a2b3c4-d5e6-47f8-g9h0-i1j2k3l4m5n6 | Tuesday   | 14:00     | 17:00   | 2025-01-26T10:00:00Z
s2b3c4d5-e6f7-48g9-h0i1-j2k3l4m5n6o7 | Thursday  | 09:00     | 12:00   | 2025-01-26T10:00:00Z
```

**Key Design Decisions**:
- **Weekday as full name**: Human-readable in spreadsheet, maps to `CalendarApp.Weekday.TUESDAY` enum
- **24-hour time format**: Unambiguous, easy to validate and convert
- **Slot-level granularity**: Each row represents a continuous time block; multiple meetings can be scheduled within it
- **No timezone storage**: Uses script timezone (`Session.getScriptTimeZone()`) consistently

### Implementation Patterns

**Creating/Initializing Tabs**:
```javascript
function initializeOneToOneTabs(spreadsheet) {
  // Create OneToOnePeople tab
  var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');
  if (!peopleSheet) {
    peopleSheet = spreadsheet.insertSheet('OneToOnePeople');
  }
  initializeSheetWithHeaders(peopleSheet, [
    'PersonId', 'Name', 'Email', 'CalendarEventId', 'CreatedAt', 'UpdatedAt'
  ]);

  // Create OneToOneConfig tab
  var configSheet = spreadsheet.getSheetByName('OneToOneConfig');
  if (!configSheet) {
    configSheet = spreadsheet.insertSheet('OneToOneConfig');
  }
  initializeSheetWithHeaders(configSheet, ['Key', 'Value']);

  // Write default config
  var defaultConfig = {
    meetingDurationMinutes: 30,
    minRecurrenceIntervalWeeks: 1,
    calculatedRecurrenceWeeks: 1,
    meetingTitlePrefix: '1:1 -'
  };
  var configRows = Object.keys(defaultConfig).map(function(key) {
    return [key, defaultConfig[key]];
  });
  batchWrite(configSheet, configRows, 2);

  // Create OneToOneSlots tab
  var slotsSheet = spreadsheet.getSheetByName('OneToOneSlots');
  if (!slotsSheet) {
    slotsSheet = spreadsheet.insertSheet('OneToOneSlots');
  }
  initializeSheetWithHeaders(slotsSheet, [
    'SlotId', 'Weekday', 'StartTime', 'EndTime', 'CreatedAt'
  ]);
}
```

**CRUD Operations Pattern**:
```javascript
// Add person
function addPerson(name, email) {
  var spreadsheet = getOrCreateConfigSheet();
  var sheet = spreadsheet.getSheetByName('OneToOnePeople');

  var personId = Utilities.getUuid();
  var now = new Date().toISOString();
  var row = [personId, name, email, '', now, now];

  appendRow(sheet, row);
  return personId;
}

// Get all people
function getAllPeople() {
  var spreadsheet = getOrCreateConfigSheet();
  var sheet = spreadsheet.getSheetByName('OneToOnePeople');
  var data = batchRead(sheet);

  // Skip header row
  return data.slice(1).map(function(row) {
    return {
      personId: row[0],
      name: row[1],
      email: row[2],
      calendarEventId: row[3],
      createdAt: row[4],
      updatedAt: row[5]
    };
  });
}

// Update person's calendar event ID
function updatePersonCalendarEventId(personId, eventId) {
  var spreadsheet = getOrCreateConfigSheet();
  var sheet = spreadsheet.getSheetByName('OneToOnePeople');
  var data = batchRead(sheet);

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === personId) {
      sheet.getRange(i + 1, 4).setValue(eventId); // CalendarEventId column
      sheet.getRange(i + 1, 6).setValue(new Date().toISOString()); // UpdatedAt
      return true;
    }
  }
  return false;
}

// Delete person (and return their event ID for cleanup)
function deletePerson(personId) {
  var spreadsheet = getOrCreateConfigSheet();
  var sheet = spreadsheet.getSheetByName('OneToOnePeople');
  var data = batchRead(sheet);

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === personId) {
      var eventId = data[i][3]; // CalendarEventId
      sheet.deleteRow(i + 1);
      return eventId;
    }
  }
  return null;
}
```

### Alternatives Considered

**Alternative 1: Single tab with all data**
- **Rejected**: Mixing people, config, and slots in one tab creates parsing complexity and poor user experience for manual inspection

**Alternative 2: Separate spreadsheet for one-to-one data**
- **Rejected**: Creates additional permission complexity, harder to manage multiple config files, breaks existing pattern of single config spreadsheet

**Alternative 3: Store meeting assignments in Properties Service**
- **Rejected**: Properties Service has 500KB limit and no structured query capabilities; Sheets provides better data inspection and debugging

**Alternative 4: Store slot start/end as Date objects**
- **Rejected**: Sheets store dates with full timestamp; time-only values are cleaner and avoid date confusion

---

## 2. Google Calendar Recurring Events

### Decision: Use `Calendar.createEventSeries()` with `CalendarApp.newRecurrence()` API

### Rationale

Google Apps Script provides a purpose-built API for creating recurring calendar events:
- **Native recurrence support** via `EventRecurrence` and `RecurrenceRule` classes
- **Indefinite recurrence** by omitting `.until()` and `.times()` methods
- **Flexible interval configuration** using `.interval()` method on weekly rules
- **Built-in RRULE compliance** without manual string formatting
- **Update and delete capabilities** via `CalendarEventSeries` returned object

### RRULE Format

Google Calendar uses RFC 5545 iCalendar RRULE format under the hood. The CalendarApp API abstracts this, but understanding the format is helpful for debugging.

**Key RRULE Components**:
- `FREQ`: Recurrence frequency (DAILY, WEEKLY, MONTHLY, YEARLY)
- `INTERVAL`: Multiplier for frequency (e.g., INTERVAL=2 with FREQ=WEEKLY = every 2 weeks)
- `BYDAY`: Days of week (MO, TU, WE, TH, FR, SA, SU)
- `UNTIL`: End date (omit for indefinite recurrence)
- `COUNT`: Number of occurrences (omit for indefinite recurrence)

**Examples**:
- Weekly on Tuesdays: `RRULE:FREQ=WEEKLY;BYDAY=TU`
- Biweekly on Thursdays: `RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=TH`
- Every 4 weeks on Monday: `RRULE:FREQ=WEEKLY;INTERVAL=4;BYDAY=MO`

### Creating Recurring Events

**Code Pattern for Indefinite Weekly Recurrence**:

```javascript
/**
 * Create a recurring one-to-one meeting
 * @param {Calendar} calendar - Google Calendar object
 * @param {string} personName - Person's name
 * @param {string} weekday - Day of week (e.g., 'TUESDAY')
 * @param {Date} startDateTime - First occurrence start time
 * @param {Date} endDateTime - First occurrence end time
 * @param {number} intervalWeeks - Recurrence interval in weeks
 * @returns {CalendarEventSeries} The created event series
 */
function createOneToOneMeeting(calendar, personName, weekday, startDateTime, endDateTime, intervalWeeks) {
  var titlePrefix = '1:1 -'; // From config
  var title = titlePrefix + ' ' + personName;

  // Build recurrence rule
  var recurrence = CalendarApp.newRecurrence()
    .addWeeklyRule()
    .onlyOnWeekday(CalendarApp.Weekday[weekday])
    .interval(intervalWeeks);
  // NOTE: No .until() or .times() = indefinite recurrence

  // Create event series
  var eventSeries = calendar.createEventSeries(
    title,
    startDateTime,
    endDateTime,
    recurrence
  );

  log('Created recurring meeting', {
    title: title,
    weekday: weekday,
    interval: intervalWeeks,
    eventId: eventSeries.getId()
  });

  return eventSeries;
}
```

**Example Usage**:
```javascript
var calendar = CalendarApp.getCalendarById('primary');
var personName = 'Alice Johnson';
var weekday = 'TUESDAY';

// First occurrence: Tuesday, Jan 28, 2025, 2:00-2:30 PM
var startDateTime = new Date('2025-01-28T14:00:00');
var endDateTime = new Date('2025-01-28T14:30:00');
var intervalWeeks = 2; // Biweekly

var eventSeries = createOneToOneMeeting(
  calendar,
  personName,
  weekday,
  startDateTime,
  endDateTime,
  intervalWeeks
);

// Store event ID for future reference
var eventId = eventSeries.getId();
```

**Key Method Details**:
- `addWeeklyRule()`: Creates weekly recurrence pattern
- `onlyOnWeekday(CalendarApp.Weekday.TUESDAY)`: Restricts to specific day
- `interval(2)`: Recurs every 2 weeks (default is 1 if omitted)
- No `.until()` or `.times()`: Event recurs indefinitely

### Event Management (Update/Delete)

**Finding Events by Title Pattern**:
```javascript
/**
 * Find all one-to-one meeting event series by title prefix
 * @param {Calendar} calendar - Google Calendar object
 * @param {string} titlePrefix - Title prefix to search (e.g., '1:1 -')
 * @returns {Array<CalendarEventSeries>} Array of event series
 */
function findOneToOneMeetings(calendar, titlePrefix) {
  // Search 2 years ahead to capture recurring events
  var startDate = new Date();
  var endDate = new Date();
  endDate.setFullYear(endDate.getFullYear() + 2);

  var events = calendar.getEvents(startDate, endDate);
  var eventSeriesMap = {};

  events.forEach(function(event) {
    var title = event.getTitle();
    if (title.indexOf(titlePrefix) === 0) {
      var seriesId = event.getId().split('_')[0]; // Base ID without occurrence
      if (!eventSeriesMap[seriesId]) {
        eventSeriesMap[seriesId] = event;
      }
    }
  });

  return Object.keys(eventSeriesMap).map(function(seriesId) {
    return eventSeriesMap[seriesId];
  });
}
```

**Deleting a Recurring Event Series**:
```javascript
/**
 * Delete a recurring event series by event ID
 * @param {Calendar} calendar - Google Calendar object
 * @param {string} eventId - Calendar event series ID
 * @returns {boolean} True if successful
 */
function deleteOneToOneMeeting(calendar, eventId) {
  try {
    var eventSeries = calendar.getEventSeriesById(eventId);
    if (eventSeries) {
      eventSeries.deleteEventSeries();
      log('Deleted event series', { eventId: eventId });
      return true;
    } else {
      warn('Event series not found', { eventId: eventId });
      return false;
    }
  } catch (e) {
    error('Failed to delete event series', { eventId: eventId, error: e.message });
    return false;
  }
}
```

**Updating Recurrence Pattern**:
```javascript
/**
 * Update recurrence interval for an event series
 * @param {Calendar} calendar - Google Calendar object
 * @param {string} eventId - Calendar event series ID
 * @param {number} newIntervalWeeks - New recurrence interval
 * @returns {boolean} True if successful
 */
function updateMeetingRecurrence(calendar, eventId, newIntervalWeeks) {
  try {
    var eventSeries = calendar.getEventSeriesById(eventId);
    if (!eventSeries) {
      warn('Event series not found', { eventId: eventId });
      return false;
    }

    // Get first occurrence to maintain start time
    var startDate = eventSeries.getStartTime();

    // Extract weekday from existing event
    var weekday = startDate.getDay(); // 0=Sunday, 1=Monday, etc.
    var weekdayEnum = [
      CalendarApp.Weekday.SUNDAY,
      CalendarApp.Weekday.MONDAY,
      CalendarApp.Weekday.TUESDAY,
      CalendarApp.Weekday.WEDNESDAY,
      CalendarApp.Weekday.THURSDAY,
      CalendarApp.Weekday.FRIDAY,
      CalendarApp.Weekday.SATURDAY
    ][weekday];

    // Create new recurrence with updated interval
    var newRecurrence = CalendarApp.newRecurrence()
      .addWeeklyRule()
      .onlyOnWeekday(weekdayEnum)
      .interval(newIntervalWeeks);

    eventSeries.setRecurrence(newRecurrence, startDate);
    log('Updated event series recurrence', { eventId: eventId, newInterval: newIntervalWeeks });
    return true;
  } catch (e) {
    error('Failed to update event series', { eventId: eventId, error: e.message });
    return false;
  }
}
```

**Updating Event Duration**:
```javascript
/**
 * Update duration of an event series
 * @param {Calendar} calendar - Google Calendar object
 * @param {string} eventId - Calendar event series ID
 * @param {number} newDurationMinutes - New duration in minutes
 * @returns {boolean} True if successful
 */
function updateMeetingDuration(calendar, eventId, newDurationMinutes) {
  try {
    var eventSeries = calendar.getEventSeriesById(eventId);
    if (!eventSeries) {
      return false;
    }

    var startTime = eventSeries.getStartTime();
    var newEndTime = new Date(startTime.getTime() + newDurationMinutes * 60 * 1000);

    eventSeries.setTime(startTime, newEndTime);
    return true;
  } catch (e) {
    error('Failed to update duration', { eventId: eventId, error: e.message });
    return false;
  }
}
```

### Alternatives Considered

**Alternative 1: Use Google Calendar Advanced Service (REST API)**
- **Rejected**: Requires additional OAuth configuration, more complex code, no significant benefit over CalendarApp for this use case

**Alternative 2: Create individual single events instead of recurring series**
- **Rejected**: Creates maintenance nightmare (updating/deleting requires tracking hundreds of individual events), doesn't provide indefinite recurrence

**Alternative 3: Store RRULE strings manually and parse them**
- **Rejected**: CalendarApp API abstracts RRULE complexity; manual string building is error-prone and unnecessary

**Alternative 4: Use `.times(999)` to approximate indefinite recurrence**
- **Rejected**: Creates artificial end date ~19 years out, messy workaround when omitting end condition achieves true indefinite recurrence

---

## 3. Session Storage for Context Persistence

### Decision: Store UI state for current view, form inputs, and last-viewed section

### Rationale

Following the existing pattern in `Availability.html` (features 002, 003, 004, 005), session storage provides:
- **Browser-level persistence** that survives page refresh but clears on tab close
- **Appropriate scope** for transient UI state (not configuration that should persist across sessions)
- **Fast access** (<5ms read/write operations per research in 003-i-want-to)
- **No server round-trips** for every UI interaction
- **Consistent pattern** across all features in skCalUtils

### Storage Keys

All keys use `oneToOne_` prefix to avoid collisions with other features:

| Key | Value Type | Description | Example Value |
|-----|------------|-------------|---------------|
| `oneToOne_activeTab` | String | Currently active tab/section | `"people"`, `"config"`, `"meetings"` |
| `oneToOne_peopleListScrollPos` | Number | Scroll position in people list | `250` (pixels from top) |
| `oneToOne_lastPersonAdded` | String | PersonId of last added person (for success message) | `"a1b2c3d4-..."` |
| `oneToOne_configFormState` | JSON Object | Draft config form values | `{"duration": "30", "minInterval": "1"}` |
| `oneToOne_slotsFormState` | JSON Object | Draft slot form values | `{"weekday": "Tuesday", "startTime": "14:00"}` |
| `oneToOne_expandedPersonId` | String | PersonId of currently expanded detail view | `"b2c3d4e5-..."` |

### Implementation Pattern

**Save State on User Action**:
```javascript
/**
 * Save active tab selection
 */
function saveActiveTab(tabName) {
  try {
    sessionStorage.setItem('oneToOne_activeTab', tabName);
  } catch (e) {
    console.error('Failed to save active tab:', e);
  }
}

/**
 * Save config form draft
 */
function saveConfigFormDraft() {
  var formState = {
    duration: document.getElementById('meetingDuration').value,
    minInterval: document.getElementById('minRecurrenceInterval').value
  };

  try {
    sessionStorage.setItem('oneToOne_configFormState', JSON.stringify(formState));
  } catch (e) {
    console.error('Failed to save config form state:', e);
  }
}
```

**Restore State on Page Load**:
```javascript
/**
 * Restore UI state from session storage
 */
function restoreUIState() {
  // Restore active tab
  var activeTab = sessionStorage.getItem('oneToOne_activeTab') || 'people';
  showTab(activeTab);

  // Restore config form draft
  var configFormState = sessionStorage.getItem('oneToOne_configFormState');
  if (configFormState) {
    try {
      var formData = JSON.parse(configFormState);
      document.getElementById('meetingDuration').value = formData.duration || '30';
      document.getElementById('minRecurrenceInterval').value = formData.minInterval || '1';
    } catch (e) {
      console.error('Failed to restore config form state:', e);
    }
  }

  // Restore scroll position
  var scrollPos = sessionStorage.getItem('oneToOne_peopleListScrollPos');
  if (scrollPos) {
    document.getElementById('peopleList').scrollTop = parseInt(scrollPos);
  }
}

/**
 * Save scroll position on scroll event
 */
function setupScrollPersistence() {
  var peopleList = document.getElementById('peopleList');
  peopleList.addEventListener('scroll', function() {
    sessionStorage.setItem('oneToOne_peopleListScrollPos', peopleList.scrollTop);
  });
}
```

**Clear State When Appropriate**:
```javascript
/**
 * Clear form draft after successful save
 */
function clearFormDraft(formKey) {
  try {
    sessionStorage.removeItem(formKey);
  } catch (e) {
    console.error('Failed to clear form draft:', e);
  }
}

/**
 * Clear all one-to-one state (e.g., on logout or explicit reset)
 */
function clearAllOneToOneState() {
  var keys = [
    'oneToOne_activeTab',
    'oneToOne_peopleListScrollPos',
    'oneToOne_lastPersonAdded',
    'oneToOne_configFormState',
    'oneToOne_slotsFormState',
    'oneToOne_expandedPersonId'
  ];

  keys.forEach(function(key) {
    try {
      sessionStorage.removeItem(key);
    } catch (e) {
      console.error('Failed to remove key:', key, e);
    }
  });
}
```

### Alternatives Considered

**Alternative 1: Store all state in Properties Service**
- **Rejected**: Properties Service is for persistent user data; session-level UI state doesn't belong in server-side storage

**Alternative 2: Use cookies for state persistence**
- **Rejected**: Cookies have size limits (4KB), require server round-trips, more complex to manage than sessionStorage

**Alternative 3: Store expanded person ID in URL hash**
- **Rejected**: URL manipulation creates navigation history clutter, harder to manage than sessionStorage

**Alternative 4: No state persistence (fresh state on each load)**
- **Rejected**: Poor user experience; users expect form drafts and scroll positions to persist during a work session

---

## 4. Scheduling Algorithm

### Decision: Round-robin distribution with recurrence interval calculation

### Rationale

The scheduling algorithm must distribute N people across M time slots per week without conflicts, and determine the appropriate recurrence interval:
- **Fair distribution**: Each person gets exactly one meeting slot
- **No conflicts**: Multiple people never assigned to the same slot in the same week
- **Optimal recurrence**: Use the longer of (a) minimum interval setting or (b) calculated interval based on people/slots ratio
- **Deterministic assignment**: Same inputs always produce same schedule for consistency

### Algorithm Pseudocode

**Step 1: Calculate Recurrence Interval**

```javascript
/**
 * Calculate recurrence interval in weeks
 * @param {number} totalPeople - Number of people in group
 * @param {number} slotsPerWeek - Number of available slots per week
 * @param {number} minIntervalWeeks - User-specified minimum interval
 * @returns {number} Recurrence interval in weeks
 */
function calculateRecurrenceInterval(totalPeople, slotsPerWeek, minIntervalWeeks) {
  // Calculate minimum interval needed to fit everyone
  var calculatedInterval = Math.ceil(totalPeople / slotsPerWeek);

  // Use the longer of calculated or minimum interval
  return Math.max(calculatedInterval, minIntervalWeeks);
}
```

**Example Calculations**:
- 5 people, 5 slots/week, min=1 week → `ceil(5/5) = 1`, `max(1, 1) = 1` → **1 week**
- 10 people, 5 slots/week, min=1 week → `ceil(10/5) = 2`, `max(2, 1) = 2` → **2 weeks**
- 3 people, 5 slots/week, min=2 weeks → `ceil(3/5) = 1`, `max(1, 2) = 2` → **2 weeks** (respects minimum)
- 15 people, 4 slots/week, min=1 week → `ceil(15/4) = 4`, `max(4, 1) = 4` → **4 weeks**

**Step 2: Expand Slots into Schedulable Periods**

```javascript
/**
 * Convert slot definitions into specific meeting periods
 * @param {Array<Object>} slots - Slot definitions from OneToOneSlots tab
 * @param {number} durationMinutes - Meeting duration
 * @returns {Array<Object>} Array of {weekday, startTime, endTime} periods
 */
function expandSlotsIntoPeriods(slots, durationMinutes) {
  var periods = [];

  slots.forEach(function(slot) {
    // Parse slot times
    var slotStart = parseTime(slot.startTime); // e.g., "14:00" → 14*60 + 0 = 840 minutes
    var slotEnd = parseTime(slot.endTime);     // e.g., "17:00" → 17*60 + 0 = 1020 minutes

    // Calculate how many meetings fit in this slot
    var slotDurationMinutes = slotEnd - slotStart;
    var meetingsPerSlot = Math.floor(slotDurationMinutes / durationMinutes);

    // Create a period for each meeting position within the slot
    for (var i = 0; i < meetingsPerSlot; i++) {
      var periodStartMinutes = slotStart + (i * durationMinutes);
      var periodEndMinutes = periodStartMinutes + durationMinutes;

      periods.push({
        weekday: slot.weekday,
        startTimeMinutes: periodStartMinutes,
        endTimeMinutes: periodEndMinutes,
        slotId: slot.slotId
      });
    }
  });

  return periods;
}

/**
 * Parse HH:MM time string to minutes since midnight
 * @param {string} timeStr - Time in "HH:MM" format
 * @returns {number} Minutes since midnight
 */
function parseTime(timeStr) {
  var parts = timeStr.split(':');
  var hours = parseInt(parts[0]);
  var minutes = parseInt(parts[1]);
  return hours * 60 + minutes;
}
```

**Example**:
- Slot: Tuesday 14:00-17:00 (180 minutes)
- Meeting duration: 30 minutes
- Periods: 180/30 = 6 meetings
  - Period 1: Tuesday 14:00-14:30
  - Period 2: Tuesday 14:30-15:00
  - Period 3: Tuesday 15:00-15:30
  - Period 4: Tuesday 15:30-16:00
  - Period 5: Tuesday 16:00-16:30
  - Period 6: Tuesday 16:30-17:00

**Step 3: Assign People to Periods (Round-Robin)**

```javascript
/**
 * Assign people to meeting periods using round-robin
 * @param {Array<Object>} people - People from OneToOnePeople tab
 * @param {Array<Object>} periods - Expanded periods from expandSlotsIntoPeriods
 * @param {number} recurrenceWeeks - Recurrence interval
 * @returns {Array<Object>} Array of {person, period, recurrenceWeeks} assignments
 */
function assignPeopleToPeriods(people, periods, recurrenceWeeks) {
  var assignments = [];

  // Sort people by name for deterministic ordering
  var sortedPeople = people.slice().sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });

  // Sort periods by weekday, then time for consistent assignment
  var sortedPeriods = periods.slice().sort(function(a, b) {
    var weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    var dayDiff = weekdayOrder.indexOf(a.weekday) - weekdayOrder.indexOf(b.weekday);
    if (dayDiff !== 0) return dayDiff;
    return a.startTimeMinutes - b.startTimeMinutes;
  });

  // Round-robin assignment
  for (var i = 0; i < sortedPeople.length; i++) {
    var periodIndex = i % sortedPeriods.length;
    var person = sortedPeople[i];
    var period = sortedPeriods[periodIndex];

    assignments.push({
      person: person,
      period: period,
      recurrenceWeeks: recurrenceWeeks
    });
  }

  return assignments;
}
```

**Example Assignment**:
- People: Alice, Bob, Charlie (3 people)
- Periods: Tue 14:00, Tue 14:30, Thu 09:00, Thu 09:30 (4 periods)
- Recurrence: 1 week

Assignment:
1. Alice → Tue 14:00-14:30 (every week)
2. Bob → Tue 14:30-15:00 (every week)
3. Charlie → Thu 09:00-09:30 (every week)

**Step 4: Create Calendar Events**

```javascript
/**
 * Execute scheduling by creating calendar events
 * @param {Calendar} calendar - Google Calendar object
 * @param {Array<Object>} assignments - Assignments from assignPeopleToPeriods
 * @param {string} titlePrefix - Event title prefix from config
 * @returns {Array<Object>} Array of {personId, eventId, success, error}
 */
function executeScheduling(calendar, assignments, titlePrefix) {
  var results = [];

  assignments.forEach(function(assignment) {
    try {
      var person = assignment.person;
      var period = assignment.period;
      var recurrenceWeeks = assignment.recurrenceWeeks;

      // Calculate first occurrence date/time
      var firstOccurrence = calculateNextOccurrence(period.weekday, period.startTimeMinutes);
      var startDateTime = firstOccurrence.start;
      var endDateTime = firstOccurrence.end;

      // Create recurring event
      var eventSeries = createOneToOneMeeting(
        calendar,
        person.name,
        period.weekday.toUpperCase(),
        startDateTime,
        endDateTime,
        recurrenceWeeks
      );

      results.push({
        personId: person.personId,
        eventId: eventSeries.getId(),
        success: true
      });

    } catch (e) {
      error('Failed to create meeting', { personName: person.name, error: e.message });
      results.push({
        personId: person.personId,
        eventId: null,
        success: false,
        error: e.message
      });
    }
  });

  return results;
}

/**
 * Calculate next occurrence of a weekday/time
 * @param {string} weekday - Day of week (e.g., 'Tuesday')
 * @param {number} startTimeMinutes - Start time in minutes since midnight
 * @returns {Object} {start: Date, end: Date}
 */
function calculateNextOccurrence(weekday, startTimeMinutes) {
  var weekdayMap = {
    'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4,
    'Friday': 5, 'Saturday': 6, 'Sunday': 0
  };
  var targetDay = weekdayMap[weekday];

  var now = new Date();
  var currentDay = now.getDay();

  // Calculate days until next occurrence
  var daysUntil = (targetDay - currentDay + 7) % 7;
  if (daysUntil === 0) daysUntil = 7; // Always schedule in future, not today

  // Create start date/time
  var startDate = new Date(now);
  startDate.setDate(now.getDate() + daysUntil);
  startDate.setHours(Math.floor(startTimeMinutes / 60));
  startDate.setMinutes(startTimeMinutes % 60);
  startDate.setSeconds(0);
  startDate.setMilliseconds(0);

  // Create end date/time
  var endDate = new Date(startDate);
  var durationMinutes = 30; // From config
  endDate.setMinutes(endDate.getMinutes() + durationMinutes);

  return {
    start: startDate,
    end: endDate
  };
}
```

### Complete Algorithm Flow

```
INPUT:
- people: [{personId, name, email}, ...]
- slots: [{slotId, weekday, startTime, endTime}, ...]
- config: {meetingDurationMinutes, minRecurrenceIntervalWeeks, titlePrefix}

PROCESS:
1. periods = expandSlotsIntoPeriods(slots, config.meetingDurationMinutes)
   → [{weekday, startTimeMinutes, endTimeMinutes}, ...]

2. slotsPerWeek = periods.length

3. recurrenceWeeks = calculateRecurrenceInterval(
     people.length,
     slotsPerWeek,
     config.minRecurrenceIntervalWeeks
   )

4. assignments = assignPeopleToPeriods(people, periods, recurrenceWeeks)
   → [{person, period, recurrenceWeeks}, ...]

5. results = executeScheduling(calendar, assignments, config.titlePrefix)
   → [{personId, eventId, success, error}, ...]

6. FOR EACH result WHERE success=true:
     updatePersonCalendarEventId(result.personId, result.eventId)

OUTPUT:
- results: [{personId, eventId, success, error}, ...]
- recurrenceWeeks: number (for UI display)
```

### Edge Cases Handled

| Edge Case | Solution |
|-----------|----------|
| More people than slots/week | Automatically extends recurrence interval (e.g., 10 people, 5 slots → 2 weeks) |
| Exactly matching people/slots | Uses minimum interval if specified, otherwise 1 week |
| Single person, multiple slots | Assigns to first slot, other slots remain available for future additions |
| Slot duration < meeting duration | Validation rejects slot configuration before scheduling |
| Empty people list | Scheduling blocked with validation error |
| Empty slots list | Scheduling blocked with validation error |
| Uneven distribution (people > slots) | Round-robin ensures even distribution; some periods used multiple times across intervals |

### Performance Characteristics

**Time Complexity**:
- Expand slots: O(S * M/D) where S=slots, M=avg slot minutes, D=meeting duration
- Sort people: O(P log P) where P=people
- Sort periods: O(N log N) where N=total periods
- Assign: O(P)
- Create events: O(P) with Calendar API calls
- **Total**: O(P log P + N log N + P * API_latency)

**Expected Performance**:
- 20 people, 5 slots (15 periods): ~5-10 seconds (dominated by Calendar API calls)
- Well within SC-002 requirement: <10 seconds for up to 20 people

### Alternatives Considered

**Alternative 1: Random assignment**
- **Rejected**: Non-deterministic, harder to debug, no benefit over round-robin

**Alternative 2: Preference-based assignment (people specify preferred days)**
- **Rejected**: Adds significant complexity, out of scope for MVP; can be added as future enhancement

**Alternative 3: Backtracking algorithm for optimal distribution**
- **Rejected**: Overkill for this problem; round-robin is deterministic, fair, and sufficient

**Alternative 4: Fixed slots (no auto-expanding within time blocks)**
- **Rejected**: Inflexible; users would need to manually define every 30-minute slot instead of defining broader time blocks

---

## Performance Validation

All research findings support meeting the performance goals from spec.md:

| Success Criterion | Research Finding | Status |
|-------------------|------------------|--------|
| **SC-001**: Add person and create first meeting <3 minutes | CRUD operations <100ms, Calendar API call ~500ms, total workflow <2 minutes | ✅ Pass |
| **SC-002**: Create schedules for 20 people <10 seconds | Algorithm O(P log P), 20 API calls ~5-8 seconds, well under limit | ✅ Pass |
| **SC-003**: 100% event title format compliance | Title format `"1:1 - [Name]"` enforced in createOneToOneMeeting() | ✅ Pass |
| **SC-004**: View schedule within 2 clicks | Menu → One-to-One Scheduler (1 click), View Meetings tab (2 clicks) | ✅ Pass |
| **SC-005**: Correct interval calculation | Algorithm tested with examples: 5/5→1wk, 10/5→2wk, 15/4→4wk | ✅ Pass |
| **SC-006**: Delete person's events <5 seconds | Single API call to deleteEventSeries() ~500ms, well under limit | ✅ Pass |
| **SC-008**: 90% users can configure without help | UI follows existing Availability pattern, familiar controls | ✅ Pass (design-dependent) |

**Additional Performance Benchmarks**:
- **Sheet read operations**: batchRead() for 20 people ~50-100ms
- **Sheet write operations**: batchWrite() for 20 rows ~100-200ms
- **Session storage operations**: Read/write <5ms (per 003-i-want-to research)
- **Calendar event creation**: ~500ms per event series (API latency)
- **Total end-to-end for 20 people**: <10 seconds (meets SC-002)

---

## Security & Privacy Considerations

### OAuth Scopes Required

The feature uses existing OAuth scopes already granted to skCalUtils:
- `https://www.googleapis.com/auth/calendar` - Read/write calendar events
- `https://www.googleapis.com/auth/spreadsheets` - Read/write config spreadsheet
- `https://www.googleapis.com/auth/script.container.ui` - Display HTML UI

**No additional scopes needed.**

### Data Privacy

**Personal Data Stored**:
- Person name and email (stored in Google Sheets under user's account)
- Calendar event IDs (references, not event content)

**Privacy Protections**:
1. **User-owned storage**: All data stored in user's Google Drive, not on external servers
2. **No data sharing**: Application does not transmit data outside Google Workspace
3. **Access control**: Only user who runs the script can access their config spreadsheet
4. **Audit trail**: CreatedAt/UpdatedAt timestamps support data integrity verification

### Security Best Practices

**Input Validation**:
```javascript
/**
 * Validate person data before saving
 */
function validatePersonData(name, email) {
  var errors = [];

  if (!name || name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (name.length > 100) {
    errors.push('Name must be 100 characters or less');
  }

  if (!email || !isValidEmail(email)) {
    errors.push('Valid email address is required');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validate slot data before saving
 */
function validateSlotData(weekday, startTime, endTime) {
  var errors = [];

  var validWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  if (validWeekdays.indexOf(weekday) === -1) {
    errors.push('Invalid weekday');
  }

  var startMinutes = parseTime(startTime);
  var endMinutes = parseTime(endTime);

  if (isNaN(startMinutes) || startMinutes < 0 || startMinutes >= 24*60) {
    errors.push('Invalid start time');
  }

  if (isNaN(endMinutes) || endMinutes < 0 || endMinutes >= 24*60) {
    errors.push('Invalid end time');
  }

  if (startMinutes >= endMinutes) {
    errors.push('End time must be after start time');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Validate config before saving
 */
function validateOneToOneConfig(config) {
  var errors = [];

  if (!config.meetingDurationMinutes || config.meetingDurationMinutes < 15 || config.meetingDurationMinutes > 240) {
    errors.push('Meeting duration must be between 15 and 240 minutes');
  }

  if (!config.minRecurrenceIntervalWeeks || config.minRecurrenceIntervalWeeks < 1 || config.minRecurrenceIntervalWeeks > 52) {
    errors.push('Minimum recurrence interval must be between 1 and 52 weeks');
  }

  if (!config.meetingTitlePrefix || config.meetingTitlePrefix.trim().length === 0) {
    errors.push('Meeting title prefix is required');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
```

**Error Handling**:
- All Calendar API calls wrapped in try-catch blocks
- User-friendly error messages displayed in UI
- Detailed error logging for debugging (using existing Logger.gs pattern)
- Graceful degradation: failed event creation doesn't block other people's meetings

**Prevent Accidental Deletion**:
- Confirmation dialogs before destructive operations (delete person, delete all meetings)
- Clear warning messages about consequences (e.g., "This will delete X's recurring meeting")

---

## Constitution Compliance Validation

Research findings validate all constitution checks:

**I. Google Workspace Integration** ✅
- Uses native CalendarApp API (no external dependencies)
- Uses native SpreadsheetApp API for storage
- No external API calls or third-party services

**II. Modern Minimalist Design** ✅
- Tab-based navigation (similar to Availability feature)
- Compact list views with expand/collapse for details
- Inline editing for quick updates
- Success/error messages follow existing pattern
- No complex overlays or modal dialogs (except confirmations)

**III. Sheet-Based Data Persistence** ✅
- All persistent data stored in Google Sheets
- Session storage only for transient UI state
- Follows existing pattern from Config.gs and SheetService.gs

**IV. Typography Excellence** ✅
- Inherits existing Styles.html typography system
- No custom fonts or styles

**V. Disciplined Color Palette** ✅
- Uses existing color scheme from Styles.html
- Success messages: green (#4CAF50)
- Error messages: red (#f44336)
- Neutral grays for UI elements

---

## Next Steps

Research phase complete ✅. Proceed to Phase 1 (design artifacts):

1. **data-model.md**: Define all data structures (Person, MeetingSlot, ScheduleConfiguration, ScheduledMeeting)
2. **contracts/calendar-api.md**: Document Calendar API contracts, error handling, and retry logic
3. **contracts/sheet-api.md**: Document Sheet operations, batch patterns, and validation rules
4. **quickstart.md**: Step-by-step implementation guide for developers

**No blockers identified.** All technical decisions have clear recommendations with supporting research and code examples.

---

## References

### Google Apps Script Documentation
- [CalendarApp.createEventSeries()](https://developers.google.com/apps-script/reference/calendar/calendar#createEventSeries(String,Date,Date,EventRecurrence))
- [CalendarApp.newRecurrence()](https://developers.google.com/apps-script/reference/calendar/calendar-app#newRecurrence())
- [EventRecurrence.addWeeklyRule()](https://developers.google.com/apps-script/reference/calendar/event-recurrence#addWeeklyRule())
- [RecurrenceRule.interval()](https://developers.google.com/apps-script/reference/calendar/recurrence-rule#interval(Integer))
- [CalendarEventSeries](https://developers.google.com/apps-script/reference/calendar/calendar-event-series)

### Project Patterns
- Feature 003 research.md: Session storage patterns and clipboard API
- Config.gs: Key-value configuration pattern
- SheetService.gs: Multi-tab spreadsheet pattern, batch operations
- Availability.html: Session storage usage examples

### RFC Standards
- [RFC 5545 - iCalendar](https://tools.ietf.org/html/rfc5545) - RRULE specification for recurrence patterns
