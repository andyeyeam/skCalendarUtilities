# Server Function Contracts: One-to-One Meeting Scheduler

**Feature**: 006-i-would-like (One-to-One Meeting Scheduler)
**Created**: 2025-01-26
**Purpose**: Define the server-side API contracts for people management, configuration, slot management, and scheduling

## Overview

This document defines all server-side functions exposed to the client via Google Apps Script's `google.script.run` interface. All functions are defined in `src/Code.gs` and delegate to service layer components (PeopleService.gs, OneToOneConfigService.gs, MeetingSlotService.gs, SchedulingService.gs).

**Consistent Error Response Format**: All functions follow a standardized response pattern with `success` boolean and `error` field when applicable.

---

## People Management Functions

### Function: addPerson

Add a new person to the one-to-one meeting group.

#### Signature

```javascript
/**
 * Add a person to the one-to-one group
 * @param {string} name - Person's full name
 * @param {string} email - Person's email address
 * @returns {Object} Response with person ID or error
 */
function addPerson(name, email)
```

#### Parameters

| Parameter | Type | Required | Validation | Example |
|-----------|------|----------|------------|---------|
| `name` | String | Yes | Non-empty, max 100 chars | "Alice Johnson" |
| `email` | String | Yes | Valid email format, unique in group | "alice@example.com" |

#### Validation Rules

1. **Name validation**:
   - Must not be empty or whitespace-only
   - Maximum length: 100 characters
   - Trimmed before saving

2. **Email validation**:
   - Must match valid email format (regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`)
   - Must be unique across all people in group
   - Case-insensitive uniqueness check
   - Trimmed before saving

#### Response Format

**Success Response**:
```javascript
{
  success: true,
  person: {
    personId: "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
    name: "Alice Johnson",
    email: "alice@example.com",
    calendarEventId: "",
    createdAt: "2025-01-26T10:00:00.000Z",
    updatedAt: "2025-01-26T10:00:00.000Z"
  }
}
```

**Error Response**:
```javascript
{
  success: false,
  error: "Email address already exists in group",
  errorType: "validation"
}
```

#### Error Scenarios

| Error Condition | Response | errorType |
|----------------|----------|-----------|
| Name is empty or whitespace | `{ success: false, error: "Name is required", errorType: "validation" }` | validation |
| Name exceeds 100 characters | `{ success: false, error: "Name must be 100 characters or less", errorType: "validation" }` | validation |
| Email is invalid format | `{ success: false, error: "Valid email address is required", errorType: "validation" }` | validation |
| Email already exists | `{ success: false, error: "Email address already exists in group", errorType: "validation" }` | validation |
| Sheet access error | `{ success: false, error: "Unable to access configuration", errorType: "system" }` | system |

#### Example Usage

```javascript
// Add a new person
google.script.run
  .withSuccessHandler(function(response) {
    if (response.success) {
      console.log('Person added:', response.person.name);
      displaySuccessMessage('Person added successfully');
      refreshPeopleList();
    } else {
      displayError(response.error);
    }
  })
  .withFailureHandler(function(error) {
    displayError('Server error: ' + error.message);
  })
  .addPerson('Alice Johnson', 'alice@example.com');
```

#### Related Requirements
- FR-002: System MUST allow users to add people to the one-to-one group with name and email address
- FR-006: System MUST persist the list of people in the group across sessions

---

### Function: editPerson

Update details of an existing person in the group.

#### Signature

```javascript
/**
 * Edit a person's details
 * @param {string} personId - Unique person identifier
 * @param {string} name - Updated name
 * @param {string} email - Updated email address
 * @returns {Object} Response with updated person or error
 */
function editPerson(personId, name, email)
```

#### Parameters

| Parameter | Type | Required | Validation | Example |
|-----------|------|----------|------------|---------|
| `personId` | String | Yes | Must exist in OneToOnePeople sheet | "a1b2c3d4-..." |
| `name` | String | Yes | Non-empty, max 100 chars | "Alice Johnson" |
| `email` | String | Yes | Valid email format, unique (excluding this person) | "alice.j@example.com" |

#### Validation Rules

1. **PersonId validation**:
   - Must be a valid UUID format
   - Must exist in the OneToOnePeople sheet

2. **Name and Email validation**:
   - Same rules as `addPerson`
   - Email uniqueness check excludes the current person being edited

#### Response Format

**Success Response**:
```javascript
{
  success: true,
  person: {
    personId: "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
    name: "Alice Johnson",
    email: "alice.j@example.com",
    calendarEventId: "abc123xyz@google.com",
    createdAt: "2025-01-26T10:00:00.000Z",
    updatedAt: "2025-01-26T10:30:00.000Z"
  }
}
```

**Error Response**:
```javascript
{
  success: false,
  error: "Person not found",
  errorType: "validation"
}
```

#### Error Scenarios

| Error Condition | Response | errorType |
|----------------|----------|-----------|
| PersonId not found | `{ success: false, error: "Person not found", errorType: "validation" }` | validation |
| Name validation fails | Same as `addPerson` | validation |
| Email validation fails | Same as `addPerson` | validation |
| Email already used by another person | `{ success: false, error: "Email address already exists in group", errorType: "validation" }` | validation |

#### Example Usage

```javascript
google.script.run
  .withSuccessHandler(function(response) {
    if (response.success) {
      displaySuccessMessage('Person updated successfully');
      refreshPeopleList();
    } else {
      displayError(response.error);
    }
  })
  .editPerson('a1b2c3d4-...', 'Alice Johnson', 'alice.j@example.com');
```

#### Related Requirements
- FR-004: System MUST allow users to edit person details (name, email)

---

### Function: deletePerson

Remove a person from the one-to-one group and delete their associated calendar event.

#### Signature

```javascript
/**
 * Delete a person and their associated meeting
 * @param {string} personId - Unique person identifier
 * @returns {Object} Response with deletion status or error
 */
function deletePerson(personId)
```

#### Parameters

| Parameter | Type | Required | Validation | Example |
|-----------|------|----------|------------|---------|
| `personId` | String | Yes | Must exist in OneToOnePeople sheet | "a1b2c3d4-..." |

#### Response Format

**Success Response** (with calendar event deleted):
```javascript
{
  success: true,
  personId: "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
  calendarEventDeleted: true,
  message: "Person and recurring meeting deleted successfully"
}
```

**Success Response** (person had no calendar event):
```javascript
{
  success: true,
  personId: "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
  calendarEventDeleted: false,
  message: "Person deleted successfully (no calendar event to remove)"
}
```

**Error Response**:
```javascript
{
  success: false,
  error: "Person not found",
  errorType: "validation"
}
```

#### Error Scenarios

| Error Condition | Response | errorType |
|----------------|----------|-----------|
| PersonId not found | `{ success: false, error: "Person not found", errorType: "validation" }` | validation |
| Calendar event deletion fails | `{ success: true, personId: "...", calendarEventDeleted: false, warning: "Person deleted but calendar event removal failed" }` | partial_success |
| Sheet access error | `{ success: false, error: "Unable to access configuration", errorType: "system" }` | system |

#### Example Usage

```javascript
// With confirmation dialog
if (confirm('Delete this person and their recurring meeting?')) {
  google.script.run
    .withSuccessHandler(function(response) {
      if (response.success) {
        if (response.calendarEventDeleted) {
          displaySuccessMessage('Person and meeting deleted successfully');
        } else if (response.warning) {
          displayWarning(response.warning);
        } else {
          displaySuccessMessage(response.message);
        }
        refreshPeopleList();
      } else {
        displayError(response.error);
      }
    })
    .deletePerson('a1b2c3d4-...');
}
```

#### Related Requirements
- FR-005: System MUST allow users to remove people from the one-to-one group
- FR-022: System MUST delete all calendar events for a person when they are removed from the group

---

### Function: listPeople

Retrieve the complete list of people in the one-to-one group.

#### Signature

```javascript
/**
 * Get all people in the one-to-one group
 * @returns {Object} Response with people array or error
 */
function listPeople()
```

#### Parameters

None

#### Response Format

**Success Response**:
```javascript
{
  success: true,
  people: [
    {
      personId: "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
      name: "Alice Johnson",
      email: "alice@example.com",
      calendarEventId: "abc123xyz@google.com",
      createdAt: "2025-01-26T10:00:00.000Z",
      updatedAt: "2025-01-26T10:00:00.000Z"
    },
    {
      personId: "b2c3d4e5-f6g7-48h9-i0j1-k2l3m4n5o6p7",
      name: "Bob Smith",
      email: "bob.smith@example.com",
      calendarEventId: "def456uvw@google.com",
      createdAt: "2025-01-26T10:05:00.000Z",
      updatedAt: "2025-01-26T10:05:00.000Z"
    }
  ],
  count: 2
}
```

**Empty List Response**:
```javascript
{
  success: true,
  people: [],
  count: 0
}
```

**Error Response**:
```javascript
{
  success: false,
  error: "Unable to access configuration",
  errorType: "system"
}
```

#### Example Usage

```javascript
google.script.run
  .withSuccessHandler(function(response) {
    if (response.success) {
      if (response.count === 0) {
        displayEmptyState('No people in your group yet. Add your first person to get started.');
      } else {
        renderPeopleList(response.people);
      }
    } else {
      displayError(response.error);
    }
  })
  .listPeople();
```

#### Related Requirements
- FR-003: System MUST allow users to view a list of all people in the one-to-one group

---

## Configuration Functions

### Function: getOneToOneConfig

Retrieve the current one-to-one scheduler configuration.

#### Signature

```javascript
/**
 * Get current configuration for one-to-one scheduler
 * @returns {Object} Response with configuration or error
 */
function getOneToOneConfig()
```

#### Parameters

None

#### Response Format

**Success Response**:
```javascript
{
  success: true,
  config: {
    meetingDurationMinutes: 30,
    minRecurrenceIntervalWeeks: 1,
    calculatedRecurrenceWeeks: 2,
    meetingTitlePrefix: "1:1 -"
  }
}
```

**Default Configuration Response** (first access):
```javascript
{
  success: true,
  config: {
    meetingDurationMinutes: 30,
    minRecurrenceIntervalWeeks: 1,
    calculatedRecurrenceWeeks: 1,
    meetingTitlePrefix: "1:1 -"
  },
  isDefault: true
}
```

**Error Response**:
```javascript
{
  success: false,
  error: "Unable to access configuration",
  errorType: "system"
}
```

#### Example Usage

```javascript
google.script.run
  .withSuccessHandler(function(response) {
    if (response.success) {
      populateConfigForm(response.config);
      if (response.isDefault) {
        displayInfo('Using default configuration');
      }
    } else {
      displayError(response.error);
    }
  })
  .getOneToOneConfig();
```

#### Related Requirements
- FR-011: System MUST persist configuration settings across sessions

---

### Function: updateOneToOneConfig

Update the one-to-one scheduler configuration settings.

#### Signature

```javascript
/**
 * Update one-to-one scheduler configuration
 * @param {Object} config - Configuration object
 * @returns {Object} Response with updated config or error
 */
function updateOneToOneConfig(config)
```

#### Parameters

| Parameter | Type | Required | Validation | Example |
|-----------|------|----------|------------|---------|
| `config` | Object | Yes | Must contain valid configuration fields | See below |

**Config Object Schema**:
```javascript
{
  meetingDurationMinutes: 30,        // Integer, 15-240
  minRecurrenceIntervalWeeks: 1,     // Integer, 1-52
  meetingTitlePrefix: "1:1 -"        // String, non-empty, max 20 chars
}
```

#### Validation Rules

1. **meetingDurationMinutes**:
   - Must be an integer between 15 and 240
   - Must be divisible by 15 (15, 30, 45, 60, etc.)

2. **minRecurrenceIntervalWeeks**:
   - Must be an integer between 1 and 52

3. **meetingTitlePrefix**:
   - Must be non-empty
   - Maximum length: 20 characters
   - Trimmed before saving

#### Response Format

**Success Response**:
```javascript
{
  success: true,
  config: {
    meetingDurationMinutes: 30,
    minRecurrenceIntervalWeeks: 2,
    calculatedRecurrenceWeeks: 2,
    meetingTitlePrefix: "1:1 -"
  },
  message: "Configuration updated successfully"
}
```

**Error Response**:
```javascript
{
  success: false,
  error: "Meeting duration must be between 15 and 240 minutes",
  errorType: "validation"
}
```

#### Error Scenarios

| Error Condition | Response | errorType |
|----------------|----------|-----------|
| Duration < 15 or > 240 | `{ success: false, error: "Meeting duration must be between 15 and 240 minutes", errorType: "validation" }` | validation |
| Duration not divisible by 15 | `{ success: false, error: "Meeting duration must be divisible by 15 minutes", errorType: "validation" }` | validation |
| Interval < 1 or > 52 | `{ success: false, error: "Minimum recurrence interval must be between 1 and 52 weeks", errorType: "validation" }` | validation |
| Title prefix empty | `{ success: false, error: "Meeting title prefix is required", errorType: "validation" }` | validation |
| Title prefix > 20 chars | `{ success: false, error: "Meeting title prefix must be 20 characters or less", errorType: "validation" }` | validation |

#### Example Usage

```javascript
var config = {
  meetingDurationMinutes: 30,
  minRecurrenceIntervalWeeks: 2,
  meetingTitlePrefix: "1:1 -"
};

google.script.run
  .withSuccessHandler(function(response) {
    if (response.success) {
      displaySuccessMessage(response.message);
      updateUIWithNewConfig(response.config);
    } else {
      displayError(response.error);
    }
  })
  .updateOneToOneConfig(config);
```

#### Related Requirements
- FR-008: System MUST allow users to specify a fixed meeting duration in minutes
- FR-009: System MUST allow users to specify a minimum recurrence interval
- FR-011: System MUST persist configuration settings across sessions

---

## Slot Management Functions

### Function: addMeetingSlot

Add a new available time slot for scheduling meetings.

#### Signature

```javascript
/**
 * Add an available meeting time slot
 * @param {string} weekday - Day of week (Monday-Sunday)
 * @param {string} startTime - Start time in HH:MM format
 * @param {string} endTime - End time in HH:MM format
 * @returns {Object} Response with slot or error
 */
function addMeetingSlot(weekday, startTime, endTime)
```

#### Parameters

| Parameter | Type | Required | Validation | Example |
|-----------|------|----------|------------|---------|
| `weekday` | String | Yes | Must be valid weekday name | "Tuesday" |
| `startTime` | String | Yes | HH:MM format (24-hour) | "14:00" |
| `endTime` | String | Yes | HH:MM format (24-hour), > startTime | "17:00" |

#### Validation Rules

1. **Weekday validation**:
   - Must be one of: Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday
   - Case-sensitive

2. **Time validation**:
   - Must be in HH:MM format (24-hour)
   - Hours: 00-23, Minutes: 00-59
   - End time must be after start time
   - Time range must be at least 15 minutes

3. **Duration validation**:
   - Slot duration must be at least equal to configured meeting duration
   - Cross-check against current `meetingDurationMinutes` setting

#### Response Format

**Success Response**:
```javascript
{
  success: true,
  slot: {
    slotId: "s1a2b3c4-d5e6-47f8-g9h0-i1j2k3l4m5n6",
    weekday: "Tuesday",
    startTime: "14:00",
    endTime: "17:00",
    createdAt: "2025-01-26T10:00:00.000Z"
  }
}
```

**Error Response**:
```javascript
{
  success: false,
  error: "Slot duration (120 minutes) is less than meeting duration (180 minutes)",
  errorType: "validation"
}
```

#### Error Scenarios

| Error Condition | Response | errorType |
|----------------|----------|-----------|
| Invalid weekday | `{ success: false, error: "Invalid weekday", errorType: "validation" }` | validation |
| Invalid time format | `{ success: false, error: "Invalid time format (use HH:MM)", errorType: "validation" }` | validation |
| End time <= start time | `{ success: false, error: "End time must be after start time", errorType: "validation" }` | validation |
| Slot too short for meeting | `{ success: false, error: "Slot duration (X minutes) is less than meeting duration (Y minutes)", errorType: "validation" }` | validation |

#### Example Usage

```javascript
google.script.run
  .withSuccessHandler(function(response) {
    if (response.success) {
      displaySuccessMessage('Time slot added successfully');
      refreshSlotsList();
    } else {
      displayError(response.error);
    }
  })
  .addMeetingSlot('Tuesday', '14:00', '17:00');
```

#### Related Requirements
- FR-007: System MUST allow users to define available meeting time slots by specifying weekday and time ranges
- FR-010: System MUST validate that meeting duration does not exceed any single available time slot

---

### Function: editMeetingSlot

Update details of an existing meeting time slot.

#### Signature

```javascript
/**
 * Edit a meeting time slot
 * @param {string} slotId - Unique slot identifier
 * @param {string} weekday - Updated day of week
 * @param {string} startTime - Updated start time
 * @param {string} endTime - Updated end time
 * @returns {Object} Response with updated slot or error
 */
function editMeetingSlot(slotId, weekday, startTime, endTime)
```

#### Parameters

| Parameter | Type | Required | Validation | Example |
|-----------|------|----------|------------|---------|
| `slotId` | String | Yes | Must exist in OneToOneSlots sheet | "s1a2b3c4-..." |
| `weekday` | String | Yes | Valid weekday name | "Thursday" |
| `startTime` | String | Yes | HH:MM format (24-hour) | "09:00" |
| `endTime` | String | Yes | HH:MM format (24-hour), > startTime | "12:00" |

#### Validation Rules

Same as `addMeetingSlot`

#### Response Format

**Success Response**:
```javascript
{
  success: true,
  slot: {
    slotId: "s1a2b3c4-d5e6-47f8-g9h0-i1j2k3l4m5n6",
    weekday: "Thursday",
    startTime: "09:00",
    endTime: "12:00",
    createdAt: "2025-01-26T10:00:00.000Z"
  }
}
```

**Error Response**:
```javascript
{
  success: false,
  error: "Slot not found",
  errorType: "validation"
}
```

#### Error Scenarios

Same as `addMeetingSlot` plus:

| Error Condition | Response | errorType |
|----------------|----------|-----------|
| SlotId not found | `{ success: false, error: "Slot not found", errorType: "validation" }` | validation |

#### Example Usage

```javascript
google.script.run
  .withSuccessHandler(function(response) {
    if (response.success) {
      displaySuccessMessage('Time slot updated successfully');
      refreshSlotsList();
    } else {
      displayError(response.error);
    }
  })
  .editMeetingSlot('s1a2b3c4-...', 'Thursday', '09:00', '12:00');
```

---

### Function: deleteMeetingSlot

Remove a time slot from available meeting times.

#### Signature

```javascript
/**
 * Delete a meeting time slot
 * @param {string} slotId - Unique slot identifier
 * @returns {Object} Response with deletion status or error
 */
function deleteMeetingSlot(slotId)
```

#### Parameters

| Parameter | Type | Required | Validation | Example |
|-----------|------|----------|------------|---------|
| `slotId` | String | Yes | Must exist in OneToOneSlots sheet | "s1a2b3c4-..." |

#### Response Format

**Success Response**:
```javascript
{
  success: true,
  slotId: "s1a2b3c4-d5e6-47f8-g9h0-i1j2k3l4m5n6",
  message: "Time slot deleted successfully"
}
```

**Error Response**:
```javascript
{
  success: false,
  error: "Slot not found",
  errorType: "validation"
}
```

#### Error Scenarios

| Error Condition | Response | errorType |
|----------------|----------|-----------|
| SlotId not found | `{ success: false, error: "Slot not found", errorType: "validation" }` | validation |
| Last remaining slot with active meetings | `{ success: false, error: "Cannot delete last time slot while meetings exist", errorType: "validation" }` | validation |

#### Example Usage

```javascript
if (confirm('Delete this time slot?')) {
  google.script.run
    .withSuccessHandler(function(response) {
      if (response.success) {
        displaySuccessMessage(response.message);
        refreshSlotsList();
      } else {
        displayError(response.error);
      }
    })
    .deleteMeetingSlot('s1a2b3c4-...');
}
```

---

### Function: listMeetingSlots

Retrieve all available meeting time slots.

#### Signature

```javascript
/**
 * Get all available meeting time slots
 * @returns {Object} Response with slots array or error
 */
function listMeetingSlots()
```

#### Parameters

None

#### Response Format

**Success Response**:
```javascript
{
  success: true,
  slots: [
    {
      slotId: "s1a2b3c4-d5e6-47f8-g9h0-i1j2k3l4m5n6",
      weekday: "Tuesday",
      startTime: "14:00",
      endTime: "17:00",
      createdAt: "2025-01-26T10:00:00.000Z"
    },
    {
      slotId: "s2b3c4d5-e6f7-48g9-h0i1-j2k3l4m5n6o7",
      weekday: "Thursday",
      startTime: "09:00",
      endTime: "12:00",
      createdAt: "2025-01-26T10:00:00.000Z"
    }
  ],
  count: 2
}
```

**Empty List Response**:
```javascript
{
  success: true,
  slots: [],
  count: 0
}
```

#### Example Usage

```javascript
google.script.run
  .withSuccessHandler(function(response) {
    if (response.success) {
      if (response.count === 0) {
        displayEmptyState('No time slots configured. Add your first slot to get started.');
      } else {
        renderSlotsList(response.slots);
      }
    } else {
      displayError(response.error);
    }
  })
  .listMeetingSlots();
```

---

## Scheduling Functions

### Function: createAllMeetings

Create recurring calendar events for all people in the group according to configured rules.

#### Signature

```javascript
/**
 * Create recurring calendar events for all people
 * @returns {Object} Response with scheduling results or error
 */
function createAllMeetings()
```

#### Parameters

None

#### Pre-conditions

1. At least one person must exist in the group
2. At least one time slot must be configured
3. Configuration must be valid (meeting duration fits in slots)

#### Response Format

**Success Response**:
```javascript
{
  success: true,
  results: [
    {
      personId: "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
      personName: "Alice Johnson",
      eventId: "abc123xyz@google.com",
      weekday: "Tuesday",
      startTime: "14:00",
      endTime: "14:30",
      success: true
    },
    {
      personId: "b2c3d4e5-f6g7-48h9-i0j1-k2l3m4n5o6p7",
      personName: "Bob Smith",
      eventId: "def456uvw@google.com",
      weekday: "Thursday",
      startTime: "09:00",
      endTime: "09:30",
      success: true
    }
  ],
  metadata: {
    totalPeople: 2,
    successCount: 2,
    failureCount: 0,
    recurrenceWeeks: 1,
    slotsPerWeek: 6
  },
  message: "Successfully created 2 recurring meetings (every 1 week)"
}
```

**Partial Success Response** (some meetings failed):
```javascript
{
  success: true,
  results: [
    {
      personId: "a1b2c3d4-...",
      personName: "Alice Johnson",
      eventId: "abc123xyz@google.com",
      weekday: "Tuesday",
      startTime: "14:00",
      endTime: "14:30",
      success: true
    },
    {
      personId: "b2c3d4e5-...",
      personName: "Bob Smith",
      eventId: null,
      success: false,
      error: "Calendar access denied"
    }
  ],
  metadata: {
    totalPeople: 2,
    successCount: 1,
    failureCount: 1,
    recurrenceWeeks: 1,
    slotsPerWeek: 6
  },
  warning: "1 meeting failed to create. See results for details."
}
```

**Error Response** (pre-conditions not met):
```javascript
{
  success: false,
  error: "Cannot create meetings: no people in group",
  errorType: "validation"
}
```

#### Error Scenarios

| Error Condition | Response | errorType |
|----------------|----------|-----------|
| No people in group | `{ success: false, error: "Cannot create meetings: no people in group", errorType: "validation" }` | validation |
| No time slots configured | `{ success: false, error: "Cannot create meetings: no time slots configured", errorType: "validation" }` | validation |
| Meeting duration exceeds all slots | `{ success: false, error: "Meeting duration exceeds all available time slots", errorType: "validation" }` | validation |
| Meetings already exist | `{ success: false, error: "Meetings already exist. Delete existing meetings first or use regenerate.", errorType: "validation" }` | validation |
| Calendar access error | `{ success: false, error: "Unable to access calendar", errorType: "api" }` | api |

#### Example Usage

```javascript
google.script.run
  .withSuccessHandler(function(response) {
    if (response.success) {
      if (response.warning) {
        displayWarning(response.warning);
      } else {
        displaySuccessMessage(response.message);
      }
      displaySchedulingResults(response.results);
      displayRecurrenceInfo(response.metadata.recurrenceWeeks);
      refreshPeopleList();
    } else {
      displayError(response.error);
    }
  })
  .withFailureHandler(function(error) {
    displayError('Failed to create meetings: ' + error.message);
  })
  .createAllMeetings();
```

#### Related Requirements
- FR-012: System MUST create one recurring calendar event for each person in the group
- FR-013: System MUST distribute meetings across available time slots without scheduling multiple meetings in the same slot
- FR-014: System MUST set recurrence interval to the longer of: (a) user-specified minimum interval, or (b) the calculated interval needed to fit all people into available slots
- FR-015: System MUST format calendar event titles with an identifiable prefix or pattern
- FR-016: System MUST create recurring events that repeat indefinitely (no end date)
- FR-017: System MUST ensure each person is assigned exactly one recurring meeting slot

---

### Function: viewMeetings

Retrieve all scheduled one-to-one meetings with assignment details.

#### Signature

```javascript
/**
 * Get all scheduled one-to-one meetings
 * @returns {Object} Response with meetings array or error
 */
function viewMeetings()
```

#### Parameters

None

#### Response Format

**Success Response**:
```javascript
{
  success: true,
  meetings: [
    {
      personId: "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
      personName: "Alice Johnson",
      personEmail: "alice@example.com",
      eventId: "abc123xyz@google.com",
      eventTitle: "1:1 - Alice Johnson",
      weekday: "Tuesday",
      startTime: "14:00",
      endTime: "14:30",
      recurrenceWeeks: 1,
      recurrenceDescription: "Every week",
      nextOccurrence: "2025-01-28T14:00:00.000Z"
    },
    {
      personId: "b2c3d4e5-f6g7-48h9-i0j1-k2l3m4n5o6p7",
      personName: "Bob Smith",
      personEmail: "bob.smith@example.com",
      eventId: "def456uvw@google.com",
      eventTitle: "1:1 - Bob Smith",
      weekday: "Thursday",
      startTime: "09:00",
      endTime: "09:30",
      recurrenceWeeks: 1,
      recurrenceDescription: "Every week",
      nextOccurrence: "2025-01-30T09:00:00.000Z"
    }
  ],
  count: 2,
  metadata: {
    recurrenceWeeks: 1,
    peopleWithMeetings: 2,
    peopleWithoutMeetings: 0
  }
}
```

**Empty List Response**:
```javascript
{
  success: true,
  meetings: [],
  count: 0,
  metadata: {
    recurrenceWeeks: null,
    peopleWithMeetings: 0,
    peopleWithoutMeetings: 5
  },
  message: "No meetings scheduled yet"
}
```

#### Example Usage

```javascript
google.script.run
  .withSuccessHandler(function(response) {
    if (response.success) {
      if (response.count === 0) {
        displayEmptyState(response.message);
      } else {
        renderMeetingsList(response.meetings);
        displayMetadata(response.metadata);
      }
    } else {
      displayError(response.error);
    }
  })
  .viewMeetings();
```

#### Related Requirements
- FR-020: System MUST display a list of all scheduled meetings showing person name, day, time, and recurrence pattern
- FR-021: System MUST allow users to view details of any scheduled meeting

---

### Function: deleteMeeting

Delete a single person's recurring meeting.

#### Signature

```javascript
/**
 * Delete a single person's recurring meeting
 * @param {string} personId - Unique person identifier
 * @returns {Object} Response with deletion status or error
 */
function deleteMeeting(personId)
```

#### Parameters

| Parameter | Type | Required | Validation | Example |
|-----------|------|----------|------------|---------|
| `personId` | String | Yes | Must exist and have a calendar event | "a1b2c3d4-..." |

#### Response Format

**Success Response**:
```javascript
{
  success: true,
  personId: "a1b2c3d4-e5f6-47g8-h9i0-j1k2l3m4n5o6",
  personName: "Alice Johnson",
  message: "Meeting deleted successfully"
}
```

**Error Response**:
```javascript
{
  success: false,
  error: "Person has no scheduled meeting",
  errorType: "validation"
}
```

#### Error Scenarios

| Error Condition | Response | errorType |
|----------------|----------|-----------|
| Person not found | `{ success: false, error: "Person not found", errorType: "validation" }` | validation |
| No calendar event for person | `{ success: false, error: "Person has no scheduled meeting", errorType: "validation" }` | validation |
| Calendar API error | `{ success: false, error: "Unable to delete calendar event", errorType: "api" }` | api |

#### Example Usage

```javascript
if (confirm('Delete this person\'s recurring meeting?')) {
  google.script.run
    .withSuccessHandler(function(response) {
      if (response.success) {
        displaySuccessMessage(response.message);
        refreshMeetingsList();
      } else {
        displayError(response.error);
      }
    })
    .deleteMeeting('a1b2c3d4-...');
}
```

---

### Function: regenerateAllMeetings

Delete all existing meetings and recreate them with current configuration.

#### Signature

```javascript
/**
 * Delete and recreate all meetings with current configuration
 * @returns {Object} Response with regeneration results or error
 */
function regenerateAllMeetings()
```

#### Parameters

None

#### Pre-conditions

Same as `createAllMeetings`

#### Response Format

**Success Response**:
```javascript
{
  success: true,
  deleted: {
    count: 5,
    eventIds: ["abc123@google.com", "def456@google.com", ...]
  },
  created: {
    count: 5,
    results: [
      {
        personId: "a1b2c3d4-...",
        personName: "Alice Johnson",
        eventId: "xyz789@google.com",
        weekday: "Tuesday",
        startTime: "14:00",
        endTime: "14:30",
        success: true
      },
      // ... more results
    ]
  },
  metadata: {
    recurrenceWeeks: 2,
    slotsPerWeek: 6
  },
  message: "Successfully regenerated 5 meetings (every 2 weeks)"
}
```

**Error Response**:
```javascript
{
  success: false,
  error: "Cannot regenerate meetings: no people in group",
  errorType: "validation"
}
```

#### Error Scenarios

Same as `createAllMeetings`

#### Example Usage

```javascript
if (confirm('This will delete and recreate ALL meetings. Continue?')) {
  google.script.run
    .withSuccessHandler(function(response) {
      if (response.success) {
        displaySuccessMessage(response.message);
        displayRegenerationSummary(response.deleted.count, response.created.count);
        refreshMeetingsList();
      } else {
        displayError(response.error);
      }
    })
    .withFailureHandler(function(error) {
      displayError('Failed to regenerate meetings: ' + error.message);
    })
    .regenerateAllMeetings();
}
```

#### Related Requirements
- FR-023: System MUST provide a way to delete all meetings and recreate them with updated configuration
- FR-031: System MUST show confirmation dialogs before destructive actions

---

## Common Patterns

### Error Response Format

All functions follow a consistent error response pattern:

```javascript
{
  success: false,
  error: "Human-readable error message",
  errorType: "validation" | "api" | "system"
}
```

**Error Types**:
- `validation`: Client-side or server-side input validation failures
- `api`: External API errors (Calendar API, Sheets API)
- `system`: Unexpected system errors, exceptions

### Success Response Pattern

Success responses always include:
- `success: true`
- Relevant data fields (person, config, slot, etc.)
- Optional `message` field for user-facing success messages
- Optional `warning` field for partial success scenarios

### Date Serialization

Google Apps Script's `google.script.run` automatically serializes Date objects to ISO 8601 strings when passing from server to client. The client must parse these strings back to Date objects:

```javascript
// Client-side parsing
response.meetings.forEach(function(meeting) {
  meeting.nextOccurrence = new Date(meeting.nextOccurrence);
});
```

### Logging

All server functions log execution details using the existing Logger.gs pattern:

```javascript
// Start of function
log('addPerson started', { name: name, email: email });

// Success
log('addPerson completed', { personId: personId });

// Error
error('addPerson failed', { error: e.message, stack: e.stack });
```

---

## Performance Targets

| Function | Target Response Time | Notes |
|----------|---------------------|-------|
| `addPerson` | < 500ms | Single sheet write |
| `editPerson` | < 500ms | Single sheet update |
| `deletePerson` | < 2s | Sheet delete + calendar API call |
| `listPeople` | < 500ms | Sheet read (batch) |
| `getOneToOneConfig` | < 300ms | Sheet read (small dataset) |
| `updateOneToOneConfig` | < 500ms | Sheet write (small dataset) |
| `addMeetingSlot` | < 500ms | Single sheet write |
| `editMeetingSlot` | < 500ms | Single sheet update |
| `deleteMeetingSlot` | < 500ms | Single sheet delete |
| `listMeetingSlots` | < 500ms | Sheet read (batch) |
| `createAllMeetings` | < 10s | 20 people × ~500ms per calendar API call |
| `viewMeetings` | < 2s | Sheet read + calendar API metadata fetch |
| `deleteMeeting` | < 2s | Sheet update + calendar API call |
| `regenerateAllMeetings` | < 15s | Delete all + create all |

---

## Security Considerations

1. **Authorization**: All functions check that user is authorized via existing authentication mechanism
2. **Input Sanitization**: All string inputs are trimmed and validated before use
3. **SQL Injection Prevention**: N/A (using Sheets API, not SQL)
4. **Rate Limiting**: Relies on Google Apps Script built-in quotas
5. **Data Privacy**: All data stored in user's own Google Drive; no cross-user access

---

## Summary

This API provides 14 server functions organized into 4 categories:

**People Management** (4 functions):
- `addPerson(name, email)` → Person object
- `editPerson(personId, name, email)` → Person object
- `deletePerson(personId)` → Deletion status
- `listPeople()` → People array

**Configuration** (2 functions):
- `getOneToOneConfig()` → Config object
- `updateOneToOneConfig(config)` → Updated config

**Slot Management** (4 functions):
- `addMeetingSlot(weekday, startTime, endTime)` → Slot object
- `editMeetingSlot(slotId, weekday, startTime, endTime)` → Slot object
- `deleteMeetingSlot(slotId)` → Deletion status
- `listMeetingSlots()` → Slots array

**Scheduling** (4 functions):
- `createAllMeetings()` → Scheduling results
- `viewMeetings()` → Meetings array
- `deleteMeeting(personId)` → Deletion status
- `regenerateAllMeetings()` → Regeneration results

All functions follow consistent error handling patterns and return structured responses with `success` boolean and appropriate data or error fields.
