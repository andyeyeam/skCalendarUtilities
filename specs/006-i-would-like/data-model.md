# Data Model: One-to-One Meeting Scheduler

**Feature**: 006-i-would-like (One-to-One Meeting Scheduler)
**Date**: 2025-01-26
**Status**: Complete

## Overview

This document defines the data structures used in the one-to-one meeting scheduler feature. All models are implemented as JavaScript objects (no classes) following Google Apps Script ES5+ conventions.

The feature manages a group of people, configures available meeting time slots, and automatically creates recurring calendar events with optimal scheduling. Data is persisted across three Google Sheets tabs and transiently stored in session storage for UI state.

---

## Core Entities

### 1. Person

Represents an individual in the one-to-one meeting group who requires regular recurring meetings.

**Fields**:
- `personId` (String): Unique identifier (UUID v4) for the person
- `name` (String): Person's full name
- `email` (String): Email address (unique constraint)
- `calendarEventId` (String, nullable): Associated recurring calendar event series ID
- `createdAt` (String): ISO 8601 timestamp of record creation
- `updatedAt` (String): ISO 8601 timestamp of last modification

**Example**:
```javascript
{
  personId: "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
  name: "Alice Johnson",
  email: "alice.johnson@example.com",
  calendarEventId: "abc123xyz@google.com",
  createdAt: "2025-01-26T10:00:00Z",
  updatedAt: "2025-01-26T10:00:00Z"
}
```

**Validation Rules**:
- `personId` must be unique (UUID v4 format)
- `name` must be non-empty, max 100 characters
- `email` must be valid email format, unique across all people
- `calendarEventId` can be empty before meetings are created
- `createdAt` must be valid ISO 8601 timestamp
- `updatedAt` must be valid ISO 8601 timestamp, >= createdAt

**Related Requirements**:
- FR-002: Allow users to add people with name and email
- FR-003: View list of all people
- FR-004: Edit person details
- FR-005: Remove people from group
- FR-006: Persist people across sessions
- FR-012: Create one recurring event per person
- FR-017: Ensure each person gets exactly one meeting slot
- FR-022: Delete calendar events when person is removed

---

### 2. MeetingSlot

Represents an available time window when one-to-one meetings can be scheduled.

**Fields**:
- `slotId` (String): Unique identifier (UUID v4) for the slot
- `weekday` (String): Day of week (Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday)
- `startTime` (String): Slot start time in HH:MM format (24-hour)
- `endTime` (String): Slot end time in HH:MM format (24-hour)
- `createdAt` (String): ISO 8601 timestamp of record creation

**Example**:
```javascript
{
  slotId: "s1a2b3c4-d5e6-47f8-g9h0-i1j2k3l4m5n6",
  weekday: "Tuesday",
  startTime: "14:00",
  endTime: "17:00",
  createdAt: "2025-01-26T10:00:00Z"
}
```

**Validation Rules**:
- `slotId` must be unique (UUID v4 format)
- `weekday` must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
- `startTime` must be valid HH:MM format (00:00 to 23:59)
- `endTime` must be valid HH:MM format (00:00 to 23:59)
- `endTime` must be greater than `startTime`
- Slot duration (endTime - startTime) must be >= meeting duration configured in ScheduleConfiguration
- `createdAt` must be valid ISO 8601 timestamp

**Related Requirements**:
- FR-007: Define available time slots by weekday and time range
- FR-010: Validate meeting duration does not exceed any slot
- FR-011: Persist slots across sessions
- FR-013: Distribute meetings across available slots
- FR-029: Handle slots spanning multiple days of week

---

### 3. ScheduleConfiguration

Represents the global settings for meeting scheduling behavior.

**Fields**:
- `meetingDurationMinutes` (Number): Fixed duration of each meeting in minutes
- `minRecurrenceIntervalWeeks` (Number): User-specified minimum recurrence interval in weeks
- `calculatedRecurrenceWeeks` (Number): Actual recurrence interval calculated by the system in weeks
- `meetingTitlePrefix` (String): Prefix for calendar event titles (e.g., "1:1 -")

**Example**:
```javascript
{
  meetingDurationMinutes: 30,
  minRecurrenceIntervalWeeks: 1,
  calculatedRecurrenceWeeks: 2,
  meetingTitlePrefix: "1:1 -"
}
```

**Default Values**:
- `meetingDurationMinutes`: 30 (standard one-to-one duration)
- `minRecurrenceIntervalWeeks`: 1 (weekly meetings)
- `calculatedRecurrenceWeeks`: 1 (will be recalculated when meetings are created)
- `meetingTitlePrefix`: "1:1 -" (human-readable, identifiable format)

**Validation Rules**:
- `meetingDurationMinutes` must be >= 15 and <= 240 (15 minutes to 4 hours)
- `minRecurrenceIntervalWeeks` must be >= 1 and <= 52 (1 week to 1 year)
- `calculatedRecurrenceWeeks` must be >= 1
- `calculatedRecurrenceWeeks` must be >= `minRecurrenceIntervalWeeks`
- `meetingTitlePrefix` must be non-empty, max 50 characters

**Related Requirements**:
- FR-008: Specify fixed meeting duration
- FR-009: Specify minimum recurrence interval
- FR-011: Persist configuration across sessions
- FR-014: Calculate recurrence interval as longer of (a) minimum or (b) calculated
- FR-015: Format event titles with identifiable prefix
- FR-027: Calculate minimum recurrence interval based on people/slots ratio
- FR-033: Display calculated recurrence interval to user

---

### 4. ScheduledMeeting

Represents a created recurring calendar meeting assignment. This is a derived entity constructed from Person data with calendarEventId populated.

**Fields**:
- `personId` (String): Reference to Person.personId
- `personName` (String): Person's name (denormalized for display)
- `personEmail` (String): Person's email (denormalized for display)
- `calendarEventId` (String): Google Calendar event series ID
- `weekday` (String): Day of week when meeting occurs
- `startTime` (String): Meeting start time in HH:MM format
- `endTime` (String): Meeting end time in HH:MM format
- `recurrenceWeeks` (Number): Recurrence interval in weeks
- `createdAt` (String): When the meeting was created

**Example**:
```javascript
{
  personId: "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
  personName: "Alice Johnson",
  personEmail: "alice.johnson@example.com",
  calendarEventId: "abc123xyz@google.com",
  weekday: "Tuesday",
  startTime: "14:00",
  endTime: "14:30",
  recurrenceWeeks: 2,
  createdAt: "2025-01-26T10:05:00Z"
}
```

**Construction**:
This entity is not stored separately but constructed by:
1. Reading Person records with non-empty calendarEventId
2. Fetching corresponding CalendarEventSeries from Google Calendar
3. Extracting recurrence information from the event series
4. Combining Person data with event metadata

**Related Requirements**:
- FR-012: One recurring event per person
- FR-020: Display list of scheduled meetings
- FR-021: View details of scheduled meetings
- FR-026: Identify meetings created by this application

---

### 5. MeetingAssignment (Internal)

Represents the assignment of a person to a specific meeting period. Used internally during scheduling algorithm execution.

**Fields**:
- `person` (Person): Person object being assigned
- `period` (MeetingPeriod): Specific time period assignment
- `recurrenceWeeks` (Number): Recurrence interval in weeks

**Example**:
```javascript
{
  person: {
    personId: "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
    name: "Alice Johnson",
    email: "alice.johnson@example.com"
  },
  period: {
    weekday: "Tuesday",
    startTimeMinutes: 840,  // 14:00 in minutes since midnight
    endTimeMinutes: 870,    // 14:30 in minutes since midnight
    slotId: "s1a2b3c4-d5e6-47f8-g9h0-i1j2k3l4m5n6"
  },
  recurrenceWeeks: 2
}
```

**Usage**:
- Generated by `assignPeopleToPeriods()` function during scheduling
- Passed to `executeScheduling()` to create calendar events
- Not persisted to storage

**Related Requirements**:
- FR-013: Distribute meetings across slots without conflicts
- FR-017: Each person assigned exactly one slot
- FR-028: Distribute people evenly across weekday slots

---

### 6. MeetingPeriod (Internal)

Represents a specific schedulable time period within a MeetingSlot. Used internally to divide time slots into individual meeting positions.

**Fields**:
- `weekday` (String): Day of week
- `startTimeMinutes` (Number): Start time in minutes since midnight (0-1439)
- `endTimeMinutes` (Number): End time in minutes since midnight (0-1439)
- `slotId` (String): Reference to parent MeetingSlot.slotId

**Example**:
```javascript
{
  weekday: "Tuesday",
  startTimeMinutes: 840,  // 14:00
  endTimeMinutes: 870,    // 14:30
  slotId: "s1a2b3c4-d5e6-47f8-g9h0-i1j2k3l4m5n6"
}
```

**Construction**:
Created by `expandSlotsIntoPeriods()` function which divides each MeetingSlot into multiple periods based on meeting duration.

**Example Expansion**:
```javascript
// Input Slot:
{
  slotId: "s1...",
  weekday: "Tuesday",
  startTime: "14:00",
  endTime: "17:00"
}

// Meeting Duration: 30 minutes
// Output Periods (180 minutes / 30 = 6 periods):
[
  { weekday: "Tuesday", startTimeMinutes: 840, endTimeMinutes: 870, slotId: "s1..." },  // 14:00-14:30
  { weekday: "Tuesday", startTimeMinutes: 870, endTimeMinutes: 900, slotId: "s1..." },  // 14:30-15:00
  { weekday: "Tuesday", startTimeMinutes: 900, endTimeMinutes: 930, slotId: "s1..." },  // 15:00-15:30
  { weekday: "Tuesday", startTimeMinutes: 930, endTimeMinutes: 960, slotId: "s1..." },  // 15:30-16:00
  { weekday: "Tuesday", startTimeMinutes: 960, endTimeMinutes: 990, slotId: "s1..." },  // 16:00-16:30
  { weekday: "Tuesday", startTimeMinutes: 990, endTimeMinutes: 1020, slotId: "s1..." }  // 16:30-17:00
]
```

**Usage**:
- Used by scheduling algorithm to determine how many meeting positions exist per week
- Sorted deterministically for consistent round-robin assignment
- Not persisted to storage

**Related Requirements**:
- FR-013: Distribute meetings across slots
- FR-027: Calculate recurrence based on total_people / total_slots_per_interval

---

## Google Sheets Schema

All persistent data is stored in the "Calendar Utilities Config" spreadsheet across three dedicated tabs.

### Tab: OneToOnePeople

Stores the list of individuals requiring one-to-one meetings.

**Sheet Name**: `OneToOnePeople`

**Columns**:

| Column | Index | Type | Description | Validation |
|--------|-------|------|-------------|------------|
| PersonId | 1 (A) | String | UUID v4 identifier | Required, unique, UUID format |
| Name | 2 (B) | String | Person's full name | Required, non-empty, max 100 chars |
| Email | 3 (C) | String | Email address | Required, valid email format, unique |
| CalendarEventId | 4 (D) | String | Calendar event series ID | Optional (empty before meeting creation) |
| CreatedAt | 5 (E) | ISO 8601 String | Record creation timestamp | Auto-generated on add |
| UpdatedAt | 6 (F) | ISO 8601 String | Last modification timestamp | Auto-updated on edit |

**Header Row** (Row 1):
```
PersonId | Name | Email | CalendarEventId | CreatedAt | UpdatedAt
```

**Example Data Rows**:
```
a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6 | Alice Johnson | alice.johnson@example.com | abc123xyz@google.com | 2025-01-26T10:00:00Z | 2025-01-26T10:00:00Z
b2c3d4e5-f6g7-48h9-i0j1-k2l3m4n5o6p7 | Bob Smith | bob.smith@example.com | def456uvw@google.com | 2025-01-26T10:05:00Z | 2025-01-26T10:05:00Z
c3d4e5f6-g7h8-49i0-j1k2-l3m4n5o6p7q8 | Carol Davis | carol.davis@example.com | | 2025-01-26T10:10:00Z | 2025-01-26T10:10:00Z
```

**Indexing Strategy**:
- Primary lookup: Linear scan by PersonId (acceptable for N <= 100 people)
- Email uniqueness check: Linear scan before insert
- No Google Sheets native indexing (small dataset size)

**CRUD Operations**:
- **Create**: `Utilities.getUuid()` for PersonId, append row with batchWrite()
- **Read**: `batchRead()` entire sheet, filter in memory
- **Update**: Find row by PersonId, update specific cells
- **Delete**: Find row by PersonId, `deleteRow(rowIndex)`

**Related Requirements**:
- FR-002, FR-003, FR-004, FR-005, FR-006: People management operations
- FR-022: Store CalendarEventId for deletion when person removed

---

### Tab: OneToOneConfig

Stores global configuration settings for meeting scheduling.

**Sheet Name**: `OneToOneConfig`

**Structure**: Key-value pairs (same pattern as existing Config tab)

**Columns**:

| Column | Index | Type | Description |
|--------|-------|------|-------------|
| Key | 1 (A) | String | Configuration key name |
| Value | 2 (B) | String | Configuration value (stored as string, parsed to appropriate type) |

**Header Row** (Row 1):
```
Key | Value
```

**Configuration Keys**:

| Key | Value Type | Description | Default | Validation |
|-----|------------|-------------|---------|------------|
| meetingDurationMinutes | Number | Meeting duration in minutes | 30 | 15-240 |
| minRecurrenceIntervalWeeks | Number | Minimum recurrence interval in weeks | 1 | 1-52 |
| calculatedRecurrenceWeeks | Number | Calculated recurrence interval | 1 | >= 1, >= minRecurrenceIntervalWeeks |
| meetingTitlePrefix | String | Calendar event title prefix | "1:1 -" | Non-empty, max 50 chars |

**Example Data Rows**:
```
meetingDurationMinutes | 30
minRecurrenceIntervalWeeks | 1
calculatedRecurrenceWeeks | 2
meetingTitlePrefix | 1:1 -
```

**Storage Pattern**:
```javascript
// Write config (follows existing configToSheetRows() pattern from Config.gs)
var config = {
  meetingDurationMinutes: 30,
  minRecurrenceIntervalWeeks: 1,
  calculatedRecurrenceWeeks: 2,
  meetingTitlePrefix: "1:1 -"
};

var rows = Object.keys(config).map(function(key) {
  return [key, String(config[key])];
});
batchWrite(sheet, rows, 2); // Start at row 2 (after header)

// Read config (follows existing sheetRowsToConfig() pattern)
var data = batchRead(sheet);
var config = {};
for (var i = 1; i < data.length; i++) { // Skip header row
  var key = data[i][0];
  var value = data[i][1];

  // Parse numeric values
  if (key === 'meetingDurationMinutes' ||
      key === 'minRecurrenceIntervalWeeks' ||
      key === 'calculatedRecurrenceWeeks') {
    config[key] = parseInt(value);
  } else {
    config[key] = value;
  }
}
```

**Related Requirements**:
- FR-008, FR-009, FR-011: Configuration management
- FR-015: Title prefix for event identification
- FR-033: Display calculated recurrence interval

---

### Tab: OneToOneSlots

Stores available time slots when meetings can be scheduled.

**Sheet Name**: `OneToOneSlots`

**Columns**:

| Column | Index | Type | Description | Validation |
|--------|-------|------|-------------|------------|
| SlotId | 1 (A) | String | UUID v4 identifier | Required, unique, UUID format |
| Weekday | 2 (B) | String | Day of week (full name) | Required, valid weekday |
| StartTime | 3 (C) | String | Slot start time (HH:MM) | Required, valid HH:MM format |
| EndTime | 4 (D) | String | Slot end time (HH:MM) | Required, valid HH:MM, > StartTime |
| CreatedAt | 5 (E) | ISO 8601 String | Record creation timestamp | Auto-generated on add |

**Header Row** (Row 1):
```
SlotId | Weekday | StartTime | EndTime | CreatedAt
```

**Example Data Rows**:
```
s1a2b3c4-d5e6-47f8-g9h0-i1j2k3l4m5n6 | Tuesday | 14:00 | 17:00 | 2025-01-26T10:00:00Z
s2b3c4d5-e6f7-48g9-h0i1-j2k3l4m5n6o7 | Thursday | 09:00 | 12:00 | 2025-01-26T10:00:00Z
s3c4d5e6-f7g8-49h0-i1j2-k3l4m5n6o7p8 | Friday | 13:00 | 16:30 | 2025-01-26T10:05:00Z
```

**Weekday Valid Values**:
```javascript
var validWeekdays = [
  'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'
];
```

**Time Format**:
- 24-hour format: HH:MM (e.g., "09:00", "14:30", "17:00")
- No timezone stored (uses script timezone via `Session.getScriptTimeZone()`)

**CRUD Operations**:
- **Create**: `Utilities.getUuid()` for SlotId, append row
- **Read**: `batchRead()` entire sheet, filter in memory
- **Update**: Find row by SlotId, update cells
- **Delete**: Find row by SlotId, `deleteRow(rowIndex)`

**Related Requirements**:
- FR-007: Define slots by weekday and time range
- FR-010: Validate duration fits within slots
- FR-029: Handle multi-day slot configuration

---

## State Transitions

The one-to-one meeting scheduling feature follows a clear lifecycle with distinct states.

### Person Lifecycle

```
[Not Created]
    |
    | User adds person (FR-002)
    v
[Created - No Meeting]
    personId: generated
    calendarEventId: null
    |
    | User triggers "Create Meetings" (FR-012)
    v
[Created - Meeting Scheduled]
    personId: set
    calendarEventId: set (Google Calendar event series ID)
    |
    +---> User edits person details (FR-004)
    |     |
    |     v
    |   [Created - Meeting Scheduled] (calendarEventId unchanged, updatedAt updated)
    |
    +---> User deletes person (FR-005)
          |
          v
        [Deleted]
          - Row removed from OneToOnePeople sheet
          - Calendar event deleted via CalendarEventSeries.deleteEventSeries()
```

**State Validation**:
- Person can exist without calendarEventId (meeting not yet created)
- Person cannot have calendarEventId without existing calendar event (integrity check on UI load)
- Deleting person MUST delete associated calendar event if calendarEventId is set

---

### MeetingSlot Lifecycle

```
[Not Created]
    |
    | User adds slot (FR-007)
    v
[Created - Available]
    slotId: generated
    weekday, startTime, endTime: set
    |
    +---> User edits slot (FR-007)
    |     |
    |     v
    |   [Created - Available] (fields updated, existing meetings NOT auto-updated)
    |
    +---> User deletes slot (FR-007)
          |
          v
        [Deleted]
          - Row removed from OneToOneSlots sheet
          - Existing meetings using this slot remain (no cascade delete)
```

**State Validation**:
- Slot can be deleted even if meetings reference it (user responsibility)
- Editing slot does NOT automatically update existing meetings (FR-023 required for regeneration)

---

### ScheduleConfiguration Lifecycle

```
[Not Created]
    |
    | System initialization (first use)
    v
[Created - Default Values]
    meetingDurationMinutes: 30
    minRecurrenceIntervalWeeks: 1
    calculatedRecurrenceWeeks: 1
    meetingTitlePrefix: "1:1 -"
    |
    +---> User edits configuration (FR-008, FR-009)
    |     |
    |     v
    |   [Created - Custom Values] (existing meetings NOT auto-updated)
    |
    +---> System calculates recurrence (FR-027)
          |
          v
        [Created - Recurrence Calculated]
          calculatedRecurrenceWeeks updated based on people/slots ratio
```

**State Validation**:
- Configuration always exists (created with defaults on first access)
- `calculatedRecurrenceWeeks` is recalculated before each scheduling operation
- Changing configuration does NOT update existing meetings (FR-023 for regeneration)

---

### Scheduled Meeting Lifecycle

```
[Not Created]
    |
    | User triggers "Create Meetings" (FR-012)
    | (Person exists, Slots exist, Config valid)
    v
[Scheduled - Active]
    Calendar event series created (indefinite recurrence)
    Person.calendarEventId populated
    |
    +---> User updates recurrence interval (FR-023, P2)
    |     |
    |     v
    |   [Scheduled - Active] (event series updated with setRecurrence())
    |
    +---> User updates meeting duration (FR-023, P2)
    |     |
    |     v
    |   [Scheduled - Active] (event series updated with setTime())
    |
    +---> User deletes person (FR-022)
    |     |
    |     v
    |   [Deleted]
    |       - CalendarEventSeries.deleteEventSeries() called
    |       - Person.calendarEventId cleared before person deletion
    |
    +---> User regenerates all meetings (FR-023, P3)
          |
          v
        [Deleted] → [Not Created] → [Scheduled - Active]
            All existing events deleted, new events created with updated config
```

**State Validation**:
- Meeting can only be created if Person exists and Slots exist
- Deleting meeting MUST update Person.calendarEventId to null or delete Person
- Regenerating meetings deletes ALL existing meetings and creates fresh schedule

---

## Validation Rules

### Person Validation

**Add Person**:
```javascript
function validateAddPerson(name, email, existingPeople) {
  var errors = [];

  // Name validation
  if (!name || name.trim().length === 0) {
    errors.push("Name is required");
  }
  if (name.length > 100) {
    errors.push("Name must be 100 characters or less");
  }

  // Email validation
  if (!email || email.trim().length === 0) {
    errors.push("Email is required");
  }
  var emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (email && !emailPattern.test(email)) {
    errors.push("Email must be a valid email address");
  }

  // Email uniqueness
  var emailExists = existingPeople.some(function(person) {
    return person.email.toLowerCase() === email.toLowerCase();
  });
  if (emailExists) {
    errors.push("A person with this email already exists");
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
```

**Edit Person**:
```javascript
function validateEditPerson(personId, name, email, existingPeople) {
  var errors = [];

  // Same validation as Add Person
  var addValidation = validateAddPerson(name, email, []);
  errors = errors.concat(addValidation.errors);

  // Email uniqueness (exclude current person)
  var emailExists = existingPeople.some(function(person) {
    return person.personId !== personId &&
           person.email.toLowerCase() === email.toLowerCase();
  });
  if (emailExists) {
    errors.push("Another person with this email already exists");
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
```

---

### MeetingSlot Validation

**Add/Edit Slot**:
```javascript
function validateSlot(weekday, startTime, endTime, meetingDurationMinutes) {
  var errors = [];

  // Weekday validation
  var validWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  if (validWeekdays.indexOf(weekday) === -1) {
    errors.push("Weekday must be one of: " + validWeekdays.join(", "));
  }

  // Time format validation
  var timePattern = /^([01]\d|2[0-3]):([0-5]\d)$/;
  if (!timePattern.test(startTime)) {
    errors.push("Start time must be in HH:MM format (00:00 to 23:59)");
  }
  if (!timePattern.test(endTime)) {
    errors.push("End time must be in HH:MM format (00:00 to 23:59)");
  }

  // Time range validation
  var startMinutes = parseTime(startTime);
  var endMinutes = parseTime(endTime);
  if (startMinutes >= endMinutes) {
    errors.push("End time must be after start time");
  }

  // Duration validation (FR-010)
  var slotDuration = endMinutes - startMinutes;
  if (slotDuration < meetingDurationMinutes) {
    errors.push("Slot duration (" + slotDuration + " min) must be at least as long as meeting duration (" + meetingDurationMinutes + " min)");
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

function parseTime(timeStr) {
  var parts = timeStr.split(':');
  return parseInt(parts[0]) * 60 + parseInt(parts[1]);
}
```

---

### ScheduleConfiguration Validation

**Update Configuration**:
```javascript
function validateConfig(config) {
  var errors = [];

  // Meeting duration validation
  if (!config.meetingDurationMinutes || isNaN(config.meetingDurationMinutes)) {
    errors.push("Meeting duration must be a number");
  } else if (config.meetingDurationMinutes < 15) {
    errors.push("Meeting duration must be at least 15 minutes");
  } else if (config.meetingDurationMinutes > 240) {
    errors.push("Meeting duration cannot exceed 240 minutes (4 hours)");
  }

  // Minimum recurrence interval validation
  if (!config.minRecurrenceIntervalWeeks || isNaN(config.minRecurrenceIntervalWeeks)) {
    errors.push("Minimum recurrence interval must be a number");
  } else if (config.minRecurrenceIntervalWeeks < 1) {
    errors.push("Minimum recurrence interval must be at least 1 week");
  } else if (config.minRecurrenceIntervalWeeks > 52) {
    errors.push("Minimum recurrence interval cannot exceed 52 weeks (1 year)");
  }

  // Title prefix validation
  if (!config.meetingTitlePrefix || config.meetingTitlePrefix.trim().length === 0) {
    errors.push("Meeting title prefix is required");
  }
  if (config.meetingTitlePrefix && config.meetingTitlePrefix.length > 50) {
    errors.push("Meeting title prefix must be 50 characters or less");
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
```

---

### Scheduling Prerequisites Validation

**Before Creating Meetings**:
```javascript
function validateSchedulingPrerequisites(people, slots, config) {
  var errors = [];

  // People validation (FR-018)
  if (!people || people.length === 0) {
    errors.push("Cannot create meetings: No people in the group. Add at least one person first.");
  }

  // Slots validation (FR-019)
  if (!slots || slots.length === 0) {
    errors.push("Cannot create meetings: No available time slots configured. Add at least one slot first.");
  }

  // Config validation
  if (!config || !config.meetingDurationMinutes) {
    errors.push("Cannot create meetings: Invalid configuration. Please configure meeting settings.");
  }

  // Slot duration validation (all slots must fit meeting duration)
  if (slots && config && config.meetingDurationMinutes) {
    slots.forEach(function(slot) {
      var slotDuration = parseTime(slot.endTime) - parseTime(slot.startTime);
      if (slotDuration < config.meetingDurationMinutes) {
        errors.push("Slot " + slot.weekday + " " + slot.startTime + "-" + slot.endTime + " is too short for " + config.meetingDurationMinutes + " minute meetings");
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
```

---

## Related Requirements Mapping

### Person Entity

| Requirement | Description | Validation/Constraint |
|-------------|-------------|----------------------|
| FR-002 | Add people with name and email | `name` required, max 100 chars; `email` required, valid format |
| FR-003 | View list of all people | Read all rows from OneToOnePeople sheet |
| FR-004 | Edit person details | Update Name, Email, UpdatedAt; preserve PersonId |
| FR-005 | Remove people from group | Delete row, return CalendarEventId for cleanup |
| FR-006 | Persist people across sessions | Store in OneToOnePeople sheet |
| FR-012 | One recurring event per person | `calendarEventId` unique per person |
| FR-017 | Each person assigned exactly one slot | Round-robin algorithm ensures 1:1 mapping |
| FR-022 | Delete events when person removed | Use `calendarEventId` to delete event series |

---

### MeetingSlot Entity

| Requirement | Description | Validation/Constraint |
|-------------|-------------|----------------------|
| FR-007 | Define slots by weekday and time range | `weekday` valid, `startTime` < `endTime` |
| FR-010 | Meeting duration must fit in slots | `slotDuration` >= `meetingDurationMinutes` |
| FR-011 | Persist slots across sessions | Store in OneToOneSlots sheet |
| FR-013 | Distribute without conflicts | Periods expanded from slots, round-robin assignment |
| FR-029 | Handle multi-day slot configuration | Each slot has `weekday` field, can configure multiple days |

---

### ScheduleConfiguration Entity

| Requirement | Description | Validation/Constraint |
|-------------|-------------|----------------------|
| FR-008 | Specify meeting duration | `meetingDurationMinutes` 15-240 |
| FR-009 | Specify minimum recurrence interval | `minRecurrenceIntervalWeeks` 1-52 |
| FR-011 | Persist configuration | Store in OneToOneConfig sheet |
| FR-014 | Recurrence = max(min, calculated) | `calculatedRecurrenceWeeks` >= `minRecurrenceIntervalWeeks` |
| FR-015 | Identifiable title format | `meetingTitlePrefix` used in event titles |
| FR-027 | Calculate interval from people/slots | `calculatedRecurrenceWeeks` = ceil(people / slotsPerWeek) |
| FR-033 | Display calculated interval to user | Show `calculatedRecurrenceWeeks` before creating meetings |

---

### ScheduledMeeting Entity

| Requirement | Description | Validation/Constraint |
|-------------|-------------|----------------------|
| FR-012 | Create one recurring event per person | Each Person gets unique CalendarEventSeries |
| FR-016 | Recurring events repeat indefinitely | No `.until()` or `.times()` in EventRecurrence |
| FR-020 | Display list of scheduled meetings | Construct from Person + CalendarEventSeries data |
| FR-021 | View meeting details | Fetch event series by `calendarEventId` |
| FR-026 | Identify app-created meetings | Title format `[prefix] [personName]` |

---

## Data Flow

### Complete Scheduling Flow

```
User Input (OneToOneScheduler.html)
  |
  | User clicks "Create Meetings"
  v
validateSchedulingPrerequisites()
  |
  +---> people = getAllPeople() [OneToOnePeople sheet]
  +---> slots = getAllSlots() [OneToOneSlots sheet]
  +---> config = getOneToOneConfig() [OneToOneConfig sheet]
  v
  Validation passed?
  |
  | Yes
  v
periods = expandSlotsIntoPeriods(slots, config.meetingDurationMinutes)
  |
  | Convert each slot into individual meeting periods
  | Example: Tue 14:00-17:00, 30min duration → 6 periods
  v
slotsPerWeek = periods.length
  |
  v
calculatedRecurrenceWeeks = calculateRecurrenceInterval(
    people.length,
    slotsPerWeek,
    config.minRecurrenceIntervalWeeks
  )
  |
  | Example: 10 people, 5 slots/week, min=1 → calculated=2
  v
assignments = assignPeopleToPeriods(people, periods, calculatedRecurrenceWeeks)
  |
  | Round-robin: Alice→Tue 14:00, Bob→Tue 14:30, Charlie→Thu 09:00...
  v
results = executeScheduling(calendar, assignments, config.meetingTitlePrefix)
  |
  | For each assignment:
  |   1. Calculate first occurrence date/time
  |   2. Create CalendarEventSeries with recurrence rule
  |   3. Store event ID
  v
Update OneToOnePeople sheet
  |
  | For each successful result:
  |   updatePersonCalendarEventId(personId, eventId)
  v
Display results to user
  |
  | Success: "Created X meetings with Y-week recurrence"
  | Partial failure: "Created X of Y meetings. Z failed."
```

---

## Summary

The data model for the one-to-one meeting scheduler uses plain JavaScript objects to represent:

1. **Person**: Individual requiring recurring meetings (persisted in OneToOnePeople sheet)
2. **MeetingSlot**: Available time window for scheduling (persisted in OneToOneSlots sheet)
3. **ScheduleConfiguration**: Global settings for duration and recurrence (persisted in OneToOneConfig sheet)
4. **ScheduledMeeting**: Derived entity combining Person and CalendarEventSeries data (constructed at runtime)
5. **MeetingAssignment**: Internal algorithm structure for assignment logic (not persisted)
6. **MeetingPeriod**: Internal algorithm structure for slot expansion (not persisted)

All entities include comprehensive validation rules aligned with functional requirements. The model integrates with Google Calendar API via CalendarEventSeries for recurring event management and uses Google Sheets for persistent storage following the existing skCalUtils pattern.

**Key Design Principles**:
- **Separation of concerns**: People, slots, and configuration stored independently
- **Referential integrity**: CalendarEventId links Person to Google Calendar event
- **Deterministic scheduling**: Same inputs produce consistent schedules (name-sorted round-robin)
- **Graceful degradation**: Partial failures during scheduling don't block successful meetings
- **User control**: Configuration changes don't automatically update existing meetings (explicit regeneration required)
