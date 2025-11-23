# Quickstart Guide: One-to-One Meeting Scheduler Implementation

**Feature**: 006-i-would-like (One-to-One Meeting Scheduler)
**Branch**: 006-i-would-like
**Date**: 2025-01-26

## Overview

This guide provides step-by-step implementation instructions for the One-to-One Meeting Scheduler feature. This feature enables managers to automatically create and manage recurring calendar events for regular check-ins with team members. The system intelligently distributes meetings across available time slots and calculates optimal recurrence intervals.

**What will be built**:
- People management interface (add, edit, delete, list)
- Meeting configuration system (duration, slots, recurrence)
- Intelligent scheduling algorithm with automatic interval calculation
- Recurring calendar event creation with Google Calendar API
- Multi-tab UI for people, settings, and meetings management

**Key capabilities**:
- Auto-schedules recurring 1:1 meetings for all team members
- Calculates optimal recurrence interval based on people/slots ratio
- Creates recurring events that repeat indefinitely
- Uses identifiable title format for tracking ("1:1 - [Person Name]")
- Provides complete CRUD operations for people and meeting slots

---

## Prerequisites

- Feature 001 (Calendar Utilities - Menu MVP) must be deployed and working
- Access to Google Apps Script editor
- Existing "Calendar Utilities Config" spreadsheet
- Selected calendar configured in application
- Review completed:
  - [spec.md](./spec.md) - Feature requirements
  - [research.md](./research.md) - Technical decisions
  - [plan.md](./plan.md) - Implementation plan
  - Data model documentation (if available)

---

## Implementation Phases

### Phase 0: Sheet Initialization (Foundation)

**Goal**: Create three new tabs in the config spreadsheet for data storage.

#### Step 0.1: Update SheetService.gs

**File**: `src/services/SheetService.gs`

Add initialization function for One-to-One tabs at the end of the file:

```javascript
/**
 * Initialize One-to-One Meeting Scheduler tabs
 * Creates three tabs: OneToOnePeople, OneToOneConfig, OneToOneSlots
 */
function initializeOneToOneTabs() {
  try {
    var spreadsheet = getOrCreateConfigSheet();

    // Tab 1: OneToOnePeople
    var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');
    if (!peopleSheet) {
      peopleSheet = spreadsheet.insertSheet('OneToOnePeople');
      var headers = ['PersonId', 'Name', 'Email', 'CalendarEventId', 'CreatedAt', 'UpdatedAt'];
      peopleSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      peopleSheet.setFrozenRows(1);
      log('Created OneToOnePeople tab');
    }

    // Tab 2: OneToOneConfig
    var configSheet = spreadsheet.getSheetByName('OneToOneConfig');
    if (!configSheet) {
      configSheet = spreadsheet.insertSheet('OneToOneConfig');
      var headers = ['Key', 'Value'];
      configSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      configSheet.setFrozenRows(1);

      // Write default configuration
      var defaultConfig = [
        ['meetingDurationMinutes', '30'],
        ['minRecurrenceIntervalWeeks', '1'],
        ['calculatedRecurrenceWeeks', '1'],
        ['meetingTitlePrefix', '1:1 -']
      ];
      configSheet.getRange(2, 1, defaultConfig.length, 2).setValues(defaultConfig);
      log('Created OneToOneConfig tab with defaults');
    }

    // Tab 3: OneToOneSlots
    var slotsSheet = spreadsheet.getSheetByName('OneToOneSlots');
    if (!slotsSheet) {
      slotsSheet = spreadsheet.insertSheet('OneToOneSlots');
      var headers = ['SlotId', 'Weekday', 'StartTime', 'EndTime', 'CreatedAt'];
      slotsSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
      slotsSheet.setFrozenRows(1);
      log('Created OneToOneSlots tab');
    }

    return { success: true };
  } catch (e) {
    error('Failed to initialize One-to-One tabs', e);
    return { success: false, error: e.message };
  }
}
```

**Test checkpoint**:
```javascript
function testInitializeOneToOneTabs() {
  var result = initializeOneToOneTabs();
  Logger.log('Initialization result: ' + JSON.stringify(result));

  // Verify tabs exist
  var spreadsheet = getOrCreateConfigSheet();
  Logger.log('OneToOnePeople exists: ' + (spreadsheet.getSheetByName('OneToOnePeople') !== null));
  Logger.log('OneToOneConfig exists: ' + (spreadsheet.getSheetByName('OneToOneConfig') !== null));
  Logger.log('OneToOneSlots exists: ' + (spreadsheet.getSheetByName('OneToOneSlots') !== null));
}
```

Expected output: All three tabs should exist in the config spreadsheet with proper headers.

---

### Phase 1: Data Models

**Goal**: Define data structures for Person, MeetingSlot, and ScheduledMeeting.

#### Step 1.1: Create Person.gs

**File**: `src/models/Person.gs`

```javascript
/**
 * Create a Person object
 * @param {string} personId - Unique identifier (UUID)
 * @param {string} name - Person's full name
 * @param {string} email - Email address
 * @param {string} calendarEventId - Associated calendar event ID (optional)
 * @param {string} createdAt - ISO timestamp (optional)
 * @param {string} updatedAt - ISO timestamp (optional)
 * @returns {Object} Person object
 */
function createPerson(personId, name, email, calendarEventId, createdAt, updatedAt) {
  var now = new Date().toISOString();

  return {
    personId: personId || Utilities.getUuid(),
    name: name,
    email: email,
    calendarEventId: calendarEventId || '',
    createdAt: createdAt || now,
    updatedAt: updatedAt || now
  };
}

/**
 * Validate person data
 * @param {string} name - Person's name
 * @param {string} email - Email address
 * @returns {Object} {isValid: boolean, errors: Array<string>}
 */
function validatePersonData(name, email) {
  var errors = [];

  if (!name || name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (name && name.length > 100) {
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
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Convert person object to sheet row
 * @param {Object} person - Person object
 * @returns {Array} Row values
 */
function personToRow(person) {
  return [
    person.personId,
    person.name,
    person.email,
    person.calendarEventId,
    person.createdAt,
    person.updatedAt
  ];
}

/**
 * Convert sheet row to person object
 * @param {Array} row - Sheet row values
 * @returns {Object} Person object
 */
function rowToPerson(row) {
  return createPerson(
    row[0], // personId
    row[1], // name
    row[2], // email
    row[3], // calendarEventId
    row[4], // createdAt
    row[5]  // updatedAt
  );
}
```

**Test checkpoint**:
```javascript
function testPersonModel() {
  var person = createPerson(null, 'Alice Johnson', 'alice@example.com');
  Logger.log('Created person: ' + JSON.stringify(person, null, 2));

  var validation1 = validatePersonData('Alice Johnson', 'alice@example.com');
  Logger.log('Valid data: ' + validation1.isValid); // true

  var validation2 = validatePersonData('', 'invalid-email');
  Logger.log('Invalid data: ' + validation2.isValid); // false
  Logger.log('Errors: ' + validation2.errors.join(', '));

  var row = personToRow(person);
  Logger.log('Person to row: ' + row);

  var reconstructed = rowToPerson(row);
  Logger.log('Row to person: ' + JSON.stringify(reconstructed, null, 2));
}
```

#### Step 1.2: Create MeetingSlot.gs

**File**: `src/models/MeetingSlot.gs`

```javascript
/**
 * Create a MeetingSlot object
 * @param {string} slotId - Unique identifier (UUID)
 * @param {string} weekday - Day of week (Monday, Tuesday, etc.)
 * @param {string} startTime - Start time in HH:MM format (24-hour)
 * @param {string} endTime - End time in HH:MM format (24-hour)
 * @param {string} createdAt - ISO timestamp (optional)
 * @returns {Object} MeetingSlot object
 */
function createMeetingSlot(slotId, weekday, startTime, endTime, createdAt) {
  return {
    slotId: slotId || Utilities.getUuid(),
    weekday: weekday,
    startTime: startTime,
    endTime: endTime,
    createdAt: createdAt || new Date().toISOString()
  };
}

/**
 * Validate meeting slot data
 * @param {string} weekday - Day of week
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @param {number} meetingDuration - Meeting duration in minutes (optional)
 * @returns {Object} {isValid: boolean, errors: Array<string>}
 */
function validateSlotData(weekday, startTime, endTime, meetingDuration) {
  var errors = [];

  var validWeekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  if (validWeekdays.indexOf(weekday) === -1) {
    errors.push('Invalid weekday. Must be one of: ' + validWeekdays.join(', '));
  }

  var startMinutes = parseTime(startTime);
  var endMinutes = parseTime(endTime);

  if (isNaN(startMinutes) || startMinutes < 0 || startMinutes >= 24 * 60) {
    errors.push('Invalid start time format. Use HH:MM (24-hour)');
  }

  if (isNaN(endMinutes) || endMinutes < 0 || endMinutes >= 24 * 60) {
    errors.push('Invalid end time format. Use HH:MM (24-hour)');
  }

  if (!isNaN(startMinutes) && !isNaN(endMinutes)) {
    if (startMinutes >= endMinutes) {
      errors.push('End time must be after start time');
    }

    var slotDuration = endMinutes - startMinutes;
    if (meetingDuration && slotDuration < meetingDuration) {
      errors.push('Slot duration (' + slotDuration + ' min) must be at least as long as meeting duration (' + meetingDuration + ' min)');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Parse HH:MM time string to minutes since midnight
 * @param {string} timeStr - Time in HH:MM format
 * @returns {number} Minutes since midnight, or NaN if invalid
 */
function parseTime(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    return NaN;
  }

  var parts = timeStr.split(':');
  if (parts.length !== 2) {
    return NaN;
  }

  var hours = parseInt(parts[0], 10);
  var minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes)) {
    return NaN;
  }

  return hours * 60 + minutes;
}

/**
 * Convert minutes to HH:MM format
 * @param {number} minutes - Minutes since midnight
 * @returns {string} Time in HH:MM format
 */
function minutesToTime(minutes) {
  var hours = Math.floor(minutes / 60);
  var mins = minutes % 60;
  return padZero(hours) + ':' + padZero(mins);
}

/**
 * Pad number with leading zero
 * @param {number} num - Number to pad
 * @returns {string} Zero-padded string
 */
function padZero(num) {
  return num < 10 ? '0' + num : '' + num;
}

/**
 * Convert slot object to sheet row
 * @param {Object} slot - MeetingSlot object
 * @returns {Array} Row values
 */
function slotToRow(slot) {
  return [
    slot.slotId,
    slot.weekday,
    slot.startTime,
    slot.endTime,
    slot.createdAt
  ];
}

/**
 * Convert sheet row to slot object
 * @param {Array} row - Sheet row values
 * @returns {Object} MeetingSlot object
 */
function rowToSlot(row) {
  return createMeetingSlot(
    row[0], // slotId
    row[1], // weekday
    row[2], // startTime
    row[3], // endTime
    row[4]  // createdAt
  );
}
```

**Test checkpoint**:
```javascript
function testMeetingSlotModel() {
  var slot = createMeetingSlot(null, 'Tuesday', '14:00', '17:00');
  Logger.log('Created slot: ' + JSON.stringify(slot, null, 2));

  var validation1 = validateSlotData('Tuesday', '14:00', '17:00', 30);
  Logger.log('Valid slot: ' + validation1.isValid); // true

  var validation2 = validateSlotData('Tuesday', '14:00', '14:15', 30);
  Logger.log('Invalid slot (too short): ' + validation2.isValid); // false
  Logger.log('Errors: ' + validation2.errors.join(', '));

  Logger.log('Parse 14:00: ' + parseTime('14:00')); // 840
  Logger.log('Minutes to time 840: ' + minutesToTime(840)); // 14:00
}
```

#### Step 1.3: Create ScheduledMeeting.gs

**File**: `src/models/ScheduledMeeting.gs`

```javascript
/**
 * Create a ScheduledMeeting object (assignment of person to slot)
 * @param {Object} person - Person object
 * @param {string} weekday - Day of week
 * @param {string} startTime - Time in HH:MM format
 * @param {string} endTime - Time in HH:MM format
 * @param {number} recurrenceWeeks - Recurrence interval in weeks
 * @param {string} calendarEventId - Calendar event series ID (optional)
 * @returns {Object} ScheduledMeeting object
 */
function createScheduledMeeting(person, weekday, startTime, endTime, recurrenceWeeks, calendarEventId) {
  return {
    person: person,
    weekday: weekday,
    startTime: startTime,
    endTime: endTime,
    recurrenceWeeks: recurrenceWeeks,
    calendarEventId: calendarEventId || person.calendarEventId || '',
    // Formatted fields for display
    formattedTime: formatTime12Hour(startTime) + ' - ' + formatTime12Hour(endTime),
    formattedRecurrence: formatRecurrence(recurrenceWeeks)
  };
}

/**
 * Format time from HH:MM (24-hour) to 12-hour AM/PM format
 * @param {string} time24 - Time in HH:MM format
 * @returns {string} Formatted time (e.g., "2:00 PM")
 */
function formatTime12Hour(time24) {
  var minutes = parseTime(time24);
  var hours = Math.floor(minutes / 60);
  var mins = minutes % 60;

  var period = hours >= 12 ? 'PM' : 'AM';
  var displayHours = hours % 12;
  if (displayHours === 0) displayHours = 12;

  return displayHours + ':' + padZero(mins) + ' ' + period;
}

/**
 * Format recurrence interval for display
 * @param {number} weeks - Recurrence interval in weeks
 * @returns {string} Formatted recurrence (e.g., "Every week", "Every 2 weeks")
 */
function formatRecurrence(weeks) {
  if (weeks === 1) {
    return 'Every week';
  } else {
    return 'Every ' + weeks + ' weeks';
  }
}
```

**Test checkpoint**:
```javascript
function testScheduledMeetingModel() {
  var person = createPerson(null, 'Alice Johnson', 'alice@example.com');
  var meeting = createScheduledMeeting(person, 'Tuesday', '14:00', '14:30', 2);

  Logger.log('Scheduled meeting: ' + JSON.stringify(meeting, null, 2));
  Logger.log('Formatted time: ' + meeting.formattedTime); // "2:00 PM - 2:30 PM"
  Logger.log('Formatted recurrence: ' + meeting.formattedRecurrence); // "Every 2 weeks"
}
```

---

### Phase 2: Services Layer

**Goal**: Implement CRUD operations and business logic for people, config, slots, and scheduling.

#### Step 2.1: Create PeopleService.gs

**File**: `src/services/PeopleService.gs`

```javascript
/**
 * Add a new person to the one-to-one group
 * @param {string} name - Person's name
 * @param {string} email - Email address
 * @returns {Object} {success: boolean, personId: string, error: string}
 */
function addPerson(name, email) {
  try {
    // Validate input
    var validation = validatePersonData(name, email);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join('; ')
      };
    }

    // Check for duplicate email
    var existing = getPersonByEmail(email);
    if (existing) {
      return {
        success: false,
        error: 'A person with email ' + email + ' already exists'
      };
    }

    // Create person
    var person = createPerson(null, name.trim(), email.trim());

    // Save to sheet
    var spreadsheet = getOrCreateConfigSheet();
    var sheet = spreadsheet.getSheetByName('OneToOnePeople');

    if (!sheet) {
      initializeOneToOneTabs();
      sheet = spreadsheet.getSheetByName('OneToOnePeople');
    }

    var row = personToRow(person);
    sheet.appendRow(row);

    log('Added person', { personId: person.personId, name: name, email: email });

    return {
      success: true,
      personId: person.personId,
      person: person
    };
  } catch (e) {
    error('Failed to add person', e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Get all people in the one-to-one group
 * @returns {Object} {success: boolean, people: Array<Object>, error: string}
 */
function getAllPeople() {
  try {
    var spreadsheet = getOrCreateConfigSheet();
    var sheet = spreadsheet.getSheetByName('OneToOnePeople');

    if (!sheet) {
      return {
        success: true,
        people: []
      };
    }

    var data = sheet.getDataRange().getValues();

    // Skip header row
    var people = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) { // Check if row has data
        people.push(rowToPerson(data[i]));
      }
    }

    return {
      success: true,
      people: people
    };
  } catch (e) {
    error('Failed to get all people', e);
    return {
      success: false,
      people: [],
      error: e.message
    };
  }
}

/**
 * Get person by ID
 * @param {string} personId - Person's unique ID
 * @returns {Object|null} Person object or null if not found
 */
function getPersonById(personId) {
  var result = getAllPeople();
  if (!result.success) {
    return null;
  }

  for (var i = 0; i < result.people.length; i++) {
    if (result.people[i].personId === personId) {
      return result.people[i];
    }
  }

  return null;
}

/**
 * Get person by email
 * @param {string} email - Email address
 * @returns {Object|null} Person object or null if not found
 */
function getPersonByEmail(email) {
  var result = getAllPeople();
  if (!result.success) {
    return null;
  }

  for (var i = 0; i < result.people.length; i++) {
    if (result.people[i].email === email) {
      return result.people[i];
    }
  }

  return null;
}

/**
 * Update person details
 * @param {string} personId - Person's unique ID
 * @param {string} name - New name
 * @param {string} email - New email
 * @returns {Object} {success: boolean, error: string}
 */
function updatePerson(personId, name, email) {
  try {
    // Validate input
    var validation = validatePersonData(name, email);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join('; ')
      };
    }

    // Check if email is taken by another person
    var existingPerson = getPersonByEmail(email);
    if (existingPerson && existingPerson.personId !== personId) {
      return {
        success: false,
        error: 'Email is already in use by another person'
      };
    }

    var spreadsheet = getOrCreateConfigSheet();
    var sheet = spreadsheet.getSheetByName('OneToOnePeople');
    var data = sheet.getDataRange().getValues();

    // Find and update row
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === personId) {
        sheet.getRange(i + 1, 2).setValue(name.trim()); // Name column
        sheet.getRange(i + 1, 3).setValue(email.trim()); // Email column
        sheet.getRange(i + 1, 6).setValue(new Date().toISOString()); // UpdatedAt column

        log('Updated person', { personId: personId, name: name, email: email });

        return { success: true };
      }
    }

    return {
      success: false,
      error: 'Person not found'
    };
  } catch (e) {
    error('Failed to update person', e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Delete person from group
 * @param {string} personId - Person's unique ID
 * @returns {Object} {success: boolean, calendarEventId: string, error: string}
 */
function deletePerson(personId) {
  try {
    var spreadsheet = getOrCreateConfigSheet();
    var sheet = spreadsheet.getSheetByName('OneToOnePeople');
    var data = sheet.getDataRange().getValues();

    // Find and delete row
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === personId) {
        var calendarEventId = data[i][3]; // CalendarEventId column
        sheet.deleteRow(i + 1);

        log('Deleted person', { personId: personId });

        return {
          success: true,
          calendarEventId: calendarEventId
        };
      }
    }

    return {
      success: false,
      error: 'Person not found'
    };
  } catch (e) {
    error('Failed to delete person', e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Update person's calendar event ID
 * @param {string} personId - Person's unique ID
 * @param {string} eventId - Calendar event series ID
 * @returns {boolean} True if successful
 */
function updatePersonCalendarEventId(personId, eventId) {
  try {
    var spreadsheet = getOrCreateConfigSheet();
    var sheet = spreadsheet.getSheetByName('OneToOnePeople');
    var data = sheet.getDataRange().getValues();

    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === personId) {
        sheet.getRange(i + 1, 4).setValue(eventId); // CalendarEventId column
        sheet.getRange(i + 1, 6).setValue(new Date().toISOString()); // UpdatedAt column
        return true;
      }
    }

    return false;
  } catch (e) {
    error('Failed to update calendar event ID', e);
    return false;
  }
}
```

**Test checkpoint**:
```javascript
function testPeopleService() {
  // Add person
  var result1 = addPerson('Alice Johnson', 'alice@example.com');
  Logger.log('Add person result: ' + JSON.stringify(result1));

  // Get all people
  var result2 = getAllPeople();
  Logger.log('All people: ' + JSON.stringify(result2));

  // Update person
  if (result1.success) {
    var result3 = updatePerson(result1.personId, 'Alice J.', 'alice@example.com');
    Logger.log('Update result: ' + JSON.stringify(result3));
  }

  // Delete person
  if (result1.success) {
    var result4 = deletePerson(result1.personId);
    Logger.log('Delete result: ' + JSON.stringify(result4));
  }
}
```

#### Step 2.2: Create OneToOneConfigService.gs

**File**: `src/services/OneToOneConfigService.gs`

```javascript
/**
 * Get one-to-one configuration
 * @returns {Object} {success: boolean, config: Object, error: string}
 */
function getOneToOneConfig() {
  try {
    var spreadsheet = getOrCreateConfigSheet();
    var sheet = spreadsheet.getSheetByName('OneToOneConfig');

    if (!sheet) {
      initializeOneToOneTabs();
      sheet = spreadsheet.getSheetByName('OneToOneConfig');
    }

    var data = sheet.getDataRange().getValues();
    var config = {};

    // Skip header row, convert to object
    for (var i = 1; i < data.length; i++) {
      var key = data[i][0];
      var value = data[i][1];

      if (key) {
        // Convert numeric values
        if (key === 'meetingDurationMinutes' || key === 'minRecurrenceIntervalWeeks' || key === 'calculatedRecurrenceWeeks') {
          config[key] = parseInt(value, 10);
        } else {
          config[key] = value;
        }
      }
    }

    // Set defaults if missing
    if (!config.meetingDurationMinutes) config.meetingDurationMinutes = 30;
    if (!config.minRecurrenceIntervalWeeks) config.minRecurrenceIntervalWeeks = 1;
    if (!config.calculatedRecurrenceWeeks) config.calculatedRecurrenceWeeks = 1;
    if (!config.meetingTitlePrefix) config.meetingTitlePrefix = '1:1 -';

    return {
      success: true,
      config: config
    };
  } catch (e) {
    error('Failed to get one-to-one config', e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Update one-to-one configuration
 * @param {Object} config - Configuration object
 * @returns {Object} {success: boolean, error: string}
 */
function updateOneToOneConfig(config) {
  try {
    // Validate config
    var validation = validateOneToOneConfig(config);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join('; ')
      };
    }

    var spreadsheet = getOrCreateConfigSheet();
    var sheet = spreadsheet.getSheetByName('OneToOneConfig');

    // Convert config object to rows
    var configRows = [
      ['meetingDurationMinutes', config.meetingDurationMinutes.toString()],
      ['minRecurrenceIntervalWeeks', config.minRecurrenceIntervalWeeks.toString()],
      ['calculatedRecurrenceWeeks', config.calculatedRecurrenceWeeks.toString()],
      ['meetingTitlePrefix', config.meetingTitlePrefix]
    ];

    // Clear existing data (except header)
    var lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, 2).clear();
    }

    // Write new data
    sheet.getRange(2, 1, configRows.length, 2).setValues(configRows);

    log('Updated one-to-one config', config);

    return { success: true };
  } catch (e) {
    error('Failed to update one-to-one config', e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Validate one-to-one configuration
 * @param {Object} config - Configuration object
 * @returns {Object} {isValid: boolean, errors: Array<string>}
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

**Test checkpoint**:
```javascript
function testOneToOneConfigService() {
  // Get config
  var result1 = getOneToOneConfig();
  Logger.log('Get config result: ' + JSON.stringify(result1, null, 2));

  // Update config
  var newConfig = {
    meetingDurationMinutes: 45,
    minRecurrenceIntervalWeeks: 2,
    calculatedRecurrenceWeeks: 2,
    meetingTitlePrefix: '1:1 Meeting -'
  };
  var result2 = updateOneToOneConfig(newConfig);
  Logger.log('Update config result: ' + JSON.stringify(result2));

  // Verify update
  var result3 = getOneToOneConfig();
  Logger.log('Updated config: ' + JSON.stringify(result3.config, null, 2));
}
```

#### Step 2.3: Create MeetingSlotService.gs

**File**: `src/services/MeetingSlotService.gs`

```javascript
/**
 * Add a new meeting slot
 * @param {string} weekday - Day of week
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {Object} {success: boolean, slotId: string, error: string}
 */
function addMeetingSlot(weekday, startTime, endTime) {
  try {
    // Get meeting duration from config
    var configResult = getOneToOneConfig();
    var meetingDuration = configResult.success ? configResult.config.meetingDurationMinutes : 30;

    // Validate slot
    var validation = validateSlotData(weekday, startTime, endTime, meetingDuration);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join('; ')
      };
    }

    // Create slot
    var slot = createMeetingSlot(null, weekday, startTime, endTime);

    // Save to sheet
    var spreadsheet = getOrCreateConfigSheet();
    var sheet = spreadsheet.getSheetByName('OneToOneSlots');

    if (!sheet) {
      initializeOneToOneTabs();
      sheet = spreadsheet.getSheetByName('OneToOneSlots');
    }

    var row = slotToRow(slot);
    sheet.appendRow(row);

    log('Added meeting slot', { slotId: slot.slotId, weekday: weekday, startTime: startTime, endTime: endTime });

    return {
      success: true,
      slotId: slot.slotId,
      slot: slot
    };
  } catch (e) {
    error('Failed to add meeting slot', e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Get all meeting slots
 * @returns {Object} {success: boolean, slots: Array<Object>, error: string}
 */
function getAllMeetingSlots() {
  try {
    var spreadsheet = getOrCreateConfigSheet();
    var sheet = spreadsheet.getSheetByName('OneToOneSlots');

    if (!sheet) {
      return {
        success: true,
        slots: []
      };
    }

    var data = sheet.getDataRange().getValues();

    // Skip header row
    var slots = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][0]) { // Check if row has data
        slots.push(rowToSlot(data[i]));
      }
    }

    return {
      success: true,
      slots: slots
    };
  } catch (e) {
    error('Failed to get meeting slots', e);
    return {
      success: false,
      slots: [],
      error: e.message
    };
  }
}

/**
 * Delete meeting slot
 * @param {string} slotId - Slot's unique ID
 * @returns {Object} {success: boolean, error: string}
 */
function deleteMeetingSlot(slotId) {
  try {
    var spreadsheet = getOrCreateConfigSheet();
    var sheet = spreadsheet.getSheetByName('OneToOneSlots');
    var data = sheet.getDataRange().getValues();

    // Find and delete row
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === slotId) {
        sheet.deleteRow(i + 1);
        log('Deleted meeting slot', { slotId: slotId });
        return { success: true };
      }
    }

    return {
      success: false,
      error: 'Slot not found'
    };
  } catch (e) {
    error('Failed to delete meeting slot', e);
    return {
      success: false,
      error: e.message
    };
  }
}
```

**Test checkpoint**:
```javascript
function testMeetingSlotService() {
  // Add slot
  var result1 = addMeetingSlot('Tuesday', '14:00', '17:00');
  Logger.log('Add slot result: ' + JSON.stringify(result1));

  // Get all slots
  var result2 = getAllMeetingSlots();
  Logger.log('All slots: ' + JSON.stringify(result2));

  // Delete slot
  if (result1.success) {
    var result3 = deleteMeetingSlot(result1.slotId);
    Logger.log('Delete slot result: ' + JSON.stringify(result3));
  }
}
```

#### Step 2.4: Create SchedulingService.gs (Part 1 - Algorithm)

**File**: `src/services/SchedulingService.gs`

```javascript
/**
 * Calculate recurrence interval in weeks
 * @param {number} totalPeople - Number of people in group
 * @param {number} slotsPerWeek - Number of available meeting periods per week
 * @param {number} minIntervalWeeks - User-specified minimum interval
 * @returns {number} Recurrence interval in weeks
 */
function calculateRecurrenceInterval(totalPeople, slotsPerWeek, minIntervalWeeks) {
  if (slotsPerWeek === 0) {
    return minIntervalWeeks;
  }

  // Calculate minimum interval needed to fit everyone
  var calculatedInterval = Math.ceil(totalPeople / slotsPerWeek);

  // Use the longer of calculated or minimum interval
  return Math.max(calculatedInterval, minIntervalWeeks);
}

/**
 * Expand slots into specific meeting periods
 * @param {Array<Object>} slots - Slot definitions from OneToOneSlots
 * @param {number} durationMinutes - Meeting duration
 * @returns {Array<Object>} Array of {weekday, startTimeMinutes, endTimeMinutes, slotId} periods
 */
function expandSlotsIntoPeriods(slots, durationMinutes) {
  var periods = [];

  slots.forEach(function(slot) {
    var slotStart = parseTime(slot.startTime);
    var slotEnd = parseTime(slot.endTime);

    if (isNaN(slotStart) || isNaN(slotEnd)) {
      warn('Invalid slot time format', { slot: slot });
      return;
    }

    var slotDurationMinutes = slotEnd - slotStart;
    var meetingsPerSlot = Math.floor(slotDurationMinutes / durationMinutes);

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
 * Assign people to meeting periods using round-robin
 * @param {Array<Object>} people - People from OneToOnePeople
 * @param {Array<Object>} periods - Expanded periods from expandSlotsIntoPeriods
 * @param {number} recurrenceWeeks - Recurrence interval
 * @returns {Array<Object>} Array of {person, period, recurrenceWeeks} assignments
 */
function assignPeopleToPeriods(people, periods, recurrenceWeeks) {
  var assignments = [];

  if (people.length === 0 || periods.length === 0) {
    return assignments;
  }

  // Sort people by name for deterministic ordering
  var sortedPeople = people.slice().sort(function(a, b) {
    return a.name.localeCompare(b.name);
  });

  // Sort periods by weekday, then time
  var weekdayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  var sortedPeriods = periods.slice().sort(function(a, b) {
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

/**
 * Calculate next occurrence of a weekday/time
 * @param {string} weekday - Day of week (e.g., 'Tuesday')
 * @param {number} startTimeMinutes - Start time in minutes since midnight
 * @param {number} durationMinutes - Meeting duration
 * @returns {Object} {start: Date, end: Date}
 */
function calculateNextOccurrence(weekday, startTimeMinutes, durationMinutes) {
  var weekdayMap = {
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6,
    'Sunday': 0
  };

  var targetDay = weekdayMap[weekday];
  var now = new Date();
  var currentDay = now.getDay();

  // Calculate days until next occurrence
  var daysUntil = (targetDay - currentDay + 7) % 7;
  if (daysUntil === 0) daysUntil = 7; // Always schedule in future

  // Create start date/time
  var startDate = new Date(now);
  startDate.setDate(now.getDate() + daysUntil);
  startDate.setHours(Math.floor(startTimeMinutes / 60));
  startDate.setMinutes(startTimeMinutes % 60);
  startDate.setSeconds(0);
  startDate.setMilliseconds(0);

  // Create end date/time
  var endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + durationMinutes);

  return {
    start: startDate,
    end: endDate
  };
}
```

**Test checkpoint**:
```javascript
function testSchedulingAlgorithm() {
  // Test recurrence calculation
  Logger.log('5 people, 5 slots, min 1 week: ' + calculateRecurrenceInterval(5, 5, 1)); // 1
  Logger.log('10 people, 5 slots, min 1 week: ' + calculateRecurrenceInterval(10, 5, 1)); // 2
  Logger.log('3 people, 5 slots, min 2 weeks: ' + calculateRecurrenceInterval(3, 5, 2)); // 2

  // Test slot expansion
  var slots = [
    createMeetingSlot(null, 'Tuesday', '14:00', '15:00'),
    createMeetingSlot(null, 'Thursday', '09:00', '10:00')
  ];
  var periods = expandSlotsIntoPeriods(slots, 30);
  Logger.log('Periods from 2 slots (30 min meetings): ' + JSON.stringify(periods, null, 2)); // 4 periods

  // Test assignment
  var people = [
    createPerson(null, 'Alice', 'alice@example.com'),
    createPerson(null, 'Bob', 'bob@example.com'),
    createPerson(null, 'Charlie', 'charlie@example.com')
  ];
  var assignments = assignPeopleToPeriods(people, periods, 1);
  Logger.log('Assignments: ' + JSON.stringify(assignments, null, 2));
}
```

#### Step 2.5: Create SchedulingService.gs (Part 2 - Calendar Operations)

Add these functions to the same `src/services/SchedulingService.gs` file:

```javascript
/**
 * Create a recurring one-to-one meeting
 * @param {Calendar} calendar - Google Calendar object
 * @param {string} personName - Person's name
 * @param {string} weekday - Day of week (e.g., 'TUESDAY')
 * @param {Date} startDateTime - First occurrence start time
 * @param {Date} endDateTime - First occurrence end time
 * @param {number} intervalWeeks - Recurrence interval in weeks
 * @param {string} titlePrefix - Event title prefix
 * @returns {CalendarEventSeries} The created event series
 */
function createOneToOneMeeting(calendar, personName, weekday, startDateTime, endDateTime, intervalWeeks, titlePrefix) {
  var title = titlePrefix + ' ' + personName;

  // Convert weekday string to CalendarApp.Weekday enum
  var weekdayEnum = CalendarApp.Weekday[weekday.toUpperCase()];

  // Build recurrence rule
  var recurrence = CalendarApp.newRecurrence()
    .addWeeklyRule()
    .onlyOnWeekday(weekdayEnum)
    .interval(intervalWeeks);
  // No .until() or .times() = indefinite recurrence

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

/**
 * Delete a recurring event series by event ID
 * @param {Calendar} calendar - Google Calendar object
 * @param {string} eventId - Calendar event series ID
 * @returns {boolean} True if successful
 */
function deleteOneToOneMeeting(calendar, eventId) {
  try {
    if (!eventId) {
      return false;
    }

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

/**
 * Execute scheduling by creating calendar events
 * @param {Calendar} calendar - Google Calendar object
 * @param {Array<Object>} assignments - Assignments from assignPeopleToPeriods
 * @param {string} titlePrefix - Event title prefix
 * @param {number} durationMinutes - Meeting duration
 * @returns {Array<Object>} Array of {personId, eventId, success, error}
 */
function executeScheduling(calendar, assignments, titlePrefix, durationMinutes) {
  var results = [];

  assignments.forEach(function(assignment) {
    try {
      var person = assignment.person;
      var period = assignment.period;
      var recurrenceWeeks = assignment.recurrenceWeeks;

      // Calculate first occurrence date/time
      var firstOccurrence = calculateNextOccurrence(
        period.weekday,
        period.startTimeMinutes,
        durationMinutes
      );

      // Create recurring event
      var eventSeries = createOneToOneMeeting(
        calendar,
        person.name,
        period.weekday,
        firstOccurrence.start,
        firstOccurrence.end,
        recurrenceWeeks,
        titlePrefix
      );

      results.push({
        personId: person.personId,
        personName: person.name,
        eventId: eventSeries.getId(),
        weekday: period.weekday,
        startTime: minutesToTime(period.startTimeMinutes),
        endTime: minutesToTime(period.endTimeMinutes),
        recurrenceWeeks: recurrenceWeeks,
        success: true
      });

    } catch (e) {
      error('Failed to create meeting', { personName: person.name, error: e.message });
      results.push({
        personId: person.personId,
        personName: person.name,
        eventId: null,
        success: false,
        error: e.message
      });
    }
  });

  return results;
}

/**
 * Create all one-to-one meetings
 * Main scheduling function called from UI
 * @returns {Object} {success: boolean, results: Array, recurrenceWeeks: number, error: string}
 */
function createAllOneToOneMeetings() {
  try {
    // Get people
    var peopleResult = getAllPeople();
    if (!peopleResult.success) {
      return {
        success: false,
        error: 'Failed to load people: ' + peopleResult.error
      };
    }

    if (peopleResult.people.length === 0) {
      return {
        success: false,
        error: 'No people in group. Please add people before creating meetings.'
      };
    }

    // Get slots
    var slotsResult = getAllMeetingSlots();
    if (!slotsResult.success) {
      return {
        success: false,
        error: 'Failed to load meeting slots: ' + slotsResult.error
      };
    }

    if (slotsResult.slots.length === 0) {
      return {
        success: false,
        error: 'No meeting slots configured. Please add time slots before creating meetings.'
      };
    }

    // Get config
    var configResult = getOneToOneConfig();
    if (!configResult.success) {
      return {
        success: false,
        error: 'Failed to load configuration: ' + configResult.error
      };
    }

    var config = configResult.config;

    // Get calendar
    var mainConfig = getConfig();
    if (!mainConfig.selectedCalendarId) {
      return {
        success: false,
        error: 'No calendar selected. Please select a calendar first.'
      };
    }

    var calendar = CalendarApp.getCalendarById(mainConfig.selectedCalendarId);
    if (!calendar) {
      return {
        success: false,
        error: 'Unable to access calendar. Please check permissions.'
      };
    }

    // Expand slots into periods
    var periods = expandSlotsIntoPeriods(slotsResult.slots, config.meetingDurationMinutes);

    if (periods.length === 0) {
      return {
        success: false,
        error: 'No valid meeting periods. Check that meeting duration fits within time slots.'
      };
    }

    // Calculate recurrence interval
    var recurrenceWeeks = calculateRecurrenceInterval(
      peopleResult.people.length,
      periods.length,
      config.minRecurrenceIntervalWeeks
    );

    // Update calculated recurrence in config
    config.calculatedRecurrenceWeeks = recurrenceWeeks;
    updateOneToOneConfig(config);

    // Assign people to periods
    var assignments = assignPeopleToPeriods(
      peopleResult.people,
      periods,
      recurrenceWeeks
    );

    // Execute scheduling (create calendar events)
    var results = executeScheduling(
      calendar,
      assignments,
      config.meetingTitlePrefix,
      config.meetingDurationMinutes
    );

    // Update calendar event IDs for successful creations
    results.forEach(function(result) {
      if (result.success) {
        updatePersonCalendarEventId(result.personId, result.eventId);
      }
    });

    // Count successes and failures
    var successCount = 0;
    var failureCount = 0;
    results.forEach(function(r) {
      if (r.success) successCount++;
      else failureCount++;
    });

    log('Completed meeting creation', {
      total: results.length,
      successful: successCount,
      failed: failureCount,
      recurrenceWeeks: recurrenceWeeks
    });

    return {
      success: true,
      results: results,
      recurrenceWeeks: recurrenceWeeks,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    };

  } catch (e) {
    error('Failed to create meetings', e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Delete all one-to-one meetings
 * @returns {Object} {success: boolean, deletedCount: number, error: string}
 */
function deleteAllOneToOneMeetings() {
  try {
    // Get people with calendar event IDs
    var peopleResult = getAllPeople();
    if (!peopleResult.success) {
      return {
        success: false,
        error: 'Failed to load people'
      };
    }

    // Get calendar
    var mainConfig = getConfig();
    var calendar = CalendarApp.getCalendarById(mainConfig.selectedCalendarId);

    var deletedCount = 0;

    peopleResult.people.forEach(function(person) {
      if (person.calendarEventId) {
        var deleted = deleteOneToOneMeeting(calendar, person.calendarEventId);
        if (deleted) {
          updatePersonCalendarEventId(person.personId, '');
          deletedCount++;
        }
      }
    });

    log('Deleted all meetings', { count: deletedCount });

    return {
      success: true,
      deletedCount: deletedCount
    };

  } catch (e) {
    error('Failed to delete all meetings', e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Get all scheduled meetings with details
 * @returns {Object} {success: boolean, meetings: Array, error: string}
 */
function getAllScheduledMeetings() {
  try {
    var peopleResult = getAllPeople();
    if (!peopleResult.success) {
      return {
        success: false,
        error: 'Failed to load people'
      };
    }

    var configResult = getOneToOneConfig();
    var config = configResult.success ? configResult.config : {};

    var meetings = [];

    // Get calendar
    var mainConfig = getConfig();
    var calendar = CalendarApp.getCalendarById(mainConfig.selectedCalendarId);

    peopleResult.people.forEach(function(person) {
      if (person.calendarEventId) {
        try {
          var eventSeries = calendar.getEventSeriesById(person.calendarEventId);
          if (eventSeries) {
            var startTime = eventSeries.getStartTime();
            var endTime = eventSeries.getEndTime();

            // Extract weekday
            var weekdayIndex = startTime.getDay();
            var weekdayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            var weekday = weekdayNames[weekdayIndex];

            // Format times
            var startHours = startTime.getHours();
            var startMinutes = startTime.getMinutes();
            var startTimeStr = padZero(startHours) + ':' + padZero(startMinutes);

            var endHours = endTime.getHours();
            var endMinutes = endTime.getMinutes();
            var endTimeStr = padZero(endHours) + ':' + padZero(endMinutes);

            meetings.push(createScheduledMeeting(
              person,
              weekday,
              startTimeStr,
              endTimeStr,
              config.calculatedRecurrenceWeeks || 1,
              person.calendarEventId
            ));
          }
        } catch (e) {
          warn('Failed to load event for person', { personName: person.name, error: e.message });
        }
      }
    });

    return {
      success: true,
      meetings: meetings
    };

  } catch (e) {
    error('Failed to get scheduled meetings', e);
    return {
      success: false,
      error: e.message
    };
  }
}
```

**Test checkpoint**:
```javascript
function testSchedulingService() {
  // Note: This test creates real calendar events
  // Make sure you have test data set up first

  // Create meetings
  var result1 = createAllOneToOneMeetings();
  Logger.log('Create meetings result: ' + JSON.stringify(result1, null, 2));

  // Get scheduled meetings
  var result2 = getAllScheduledMeetings();
  Logger.log('Scheduled meetings: ' + JSON.stringify(result2, null, 2));

  // Delete all meetings (cleanup)
  // Uncomment to run cleanup:
  // var result3 = deleteAllOneToOneMeetings();
  // Logger.log('Delete result: ' + JSON.stringify(result3));
}
```

---

### Phase 3: Server Functions (Code.gs)

**Goal**: Expose scheduling functions to the client UI.

#### Step 3.1: Update Code.gs

**File**: `src/Code.gs`

**Modify**: Add 'OneToOne' to validUtilities array (around line 20):

```javascript
const validUtilities = ['BulkOps', 'Analytics', 'Cleanup', 'Availability', 'OneToOne'];
```

**Add**: New server functions at the end of the file:

```javascript
// ============================================================================
// One-to-One Meeting Scheduler Server Functions
// ============================================================================

/**
 * Initialize One-to-One tabs (called from UI on first load)
 * @returns {Object} {success: boolean, error: string}
 */
function initOneToOne() {
  try {
    return initializeOneToOneTabs();
  } catch (e) {
    error('initOneToOne failed', e);
    return { success: false, error: e.message };
  }
}

/**
 * Get all people in one-to-one group
 * @returns {Object} {success: boolean, people: Array, error: string}
 */
function getOneToOnePeople() {
  try {
    return getAllPeople();
  } catch (e) {
    error('getOneToOnePeople failed', e);
    return { success: false, people: [], error: e.message };
  }
}

/**
 * Add person to one-to-one group
 * @param {string} name - Person's name
 * @param {string} email - Email address
 * @returns {Object} {success: boolean, personId: string, error: string}
 */
function addOneToOnePerson(name, email) {
  try {
    return addPerson(name, email);
  } catch (e) {
    error('addOneToOnePerson failed', e);
    return { success: false, error: e.message };
  }
}

/**
 * Update person details
 * @param {string} personId - Person's unique ID
 * @param {string} name - New name
 * @param {string} email - New email
 * @returns {Object} {success: boolean, error: string}
 */
function updateOneToOnePerson(personId, name, email) {
  try {
    return updatePerson(personId, name, email);
  } catch (e) {
    error('updateOneToOnePerson failed', e);
    return { success: false, error: e.message };
  }
}

/**
 * Delete person from group (and their meeting)
 * @param {string} personId - Person's unique ID
 * @returns {Object} {success: boolean, error: string}
 */
function deleteOneToOnePerson(personId) {
  try {
    // Delete person from sheet
    var deleteResult = deletePerson(personId);

    if (!deleteResult.success) {
      return deleteResult;
    }

    // Delete calendar event if exists
    if (deleteResult.calendarEventId) {
      var mainConfig = getConfig();
      var calendar = CalendarApp.getCalendarById(mainConfig.selectedCalendarId);
      deleteOneToOneMeeting(calendar, deleteResult.calendarEventId);
    }

    return { success: true };
  } catch (e) {
    error('deleteOneToOnePerson failed', e);
    return { success: false, error: e.message };
  }
}

/**
 * Get one-to-one configuration
 * @returns {Object} {success: boolean, config: Object, error: string}
 */
function getOneToOneSettings() {
  try {
    return getOneToOneConfig();
  } catch (e) {
    error('getOneToOneSettings failed', e);
    return { success: false, error: e.message };
  }
}

/**
 * Update one-to-one configuration
 * @param {Object} config - Configuration object
 * @returns {Object} {success: boolean, error: string}
 */
function updateOneToOneSettings(config) {
  try {
    return updateOneToOneConfig(config);
  } catch (e) {
    error('updateOneToOneSettings failed', e);
    return { success: false, error: e.message };
  }
}

/**
 * Get all meeting slots
 * @returns {Object} {success: boolean, slots: Array, error: string}
 */
function getOneToOneSlots() {
  try {
    return getAllMeetingSlots();
  } catch (e) {
    error('getOneToOneSlots failed', e);
    return { success: false, slots: [], error: e.message };
  }
}

/**
 * Add meeting slot
 * @param {string} weekday - Day of week
 * @param {string} startTime - Start time (HH:MM)
 * @param {string} endTime - End time (HH:MM)
 * @returns {Object} {success: boolean, slotId: string, error: string}
 */
function addOneToOneSlot(weekday, startTime, endTime) {
  try {
    return addMeetingSlot(weekday, startTime, endTime);
  } catch (e) {
    error('addOneToOneSlot failed', e);
    return { success: false, error: e.message };
  }
}

/**
 * Delete meeting slot
 * @param {string} slotId - Slot's unique ID
 * @returns {Object} {success: boolean, error: string}
 */
function deleteOneToOneSlot(slotId) {
  try {
    return deleteMeetingSlot(slotId);
  } catch (e) {
    error('deleteOneToOneSlot failed', e);
    return { success: false, error: e.message };
  }
}

/**
 * Create all one-to-one meetings
 * @returns {Object} {success: boolean, results: Array, recurrenceWeeks: number, error: string}
 */
function createOneToOneMeetings() {
  try {
    return createAllOneToOneMeetings();
  } catch (e) {
    error('createOneToOneMeetings failed', e);
    return { success: false, error: e.message };
  }
}

/**
 * Get all scheduled meetings
 * @returns {Object} {success: boolean, meetings: Array, error: string}
 */
function getOneToOneMeetings() {
  try {
    return getAllScheduledMeetings();
  } catch (e) {
    error('getOneToOneMeetings failed', e);
    return { success: false, meetings: [], error: e.message };
  }
}

/**
 * Delete all one-to-one meetings
 * @returns {Object} {success: boolean, deletedCount: number, error: string}
 */
function deleteAllOneToOneMeetings() {
  try {
    return deleteAllOneToOneMeetings();
  } catch (e) {
    error('deleteAllOneToOneMeetings failed', e);
    return { success: false, error: e.message };
  }
}
```

**Test checkpoint**: Test each function from Apps Script editor
```javascript
function testCodeGsServerFunctions() {
  // Initialize
  var init = initOneToOne();
  Logger.log('Init: ' + JSON.stringify(init));

  // Add person
  var addResult = addOneToOnePerson('Test Person', 'test@example.com');
  Logger.log('Add person: ' + JSON.stringify(addResult));

  // Get config
  var config = getOneToOneSettings();
  Logger.log('Config: ' + JSON.stringify(config));

  // Add slot
  var slotResult = addOneToOneSlot('Tuesday', '14:00', '15:00');
  Logger.log('Add slot: ' + JSON.stringify(slotResult));
}
```

---

### Phase 4: User Interface (OneToOne.html)

**Goal**: Create multi-tab UI for people management, configuration, and meetings viewing.

#### Step 4.1: Create OneToOne.html

**File**: `src/ui/OneToOne.html`

Due to the length of this file, I'll provide it in sections:

**Section 1: HTML Structure and Styles**

```html
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>One-to-One Scheduler</title>
    <?!= include('ui/Styles'); ?>
    <style>
      /* Tab navigation */
      .tabs {
        display: flex;
        border-bottom: 2px solid #e0e0e0;
        margin-bottom: 1.5rem;
      }

      .tab {
        padding: 0.75rem 1.5rem;
        cursor: pointer;
        border: none;
        background: none;
        font-size: 1rem;
        font-weight: 500;
        color: #666;
        border-bottom: 3px solid transparent;
        transition: all 0.2s;
      }

      .tab:hover {
        color: #333;
      }

      .tab.active {
        color: #4285f4;
        border-bottom-color: #4285f4;
      }

      .tab-content {
        display: none;
      }

      .tab-content.active {
        display: block;
      }

      /* People list */
      .people-list {
        max-height: 400px;
        overflow-y: auto;
      }

      .person-item {
        padding: 1rem;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .person-item:hover {
        background: #f9f9f9;
      }

      .person-info {
        flex: 1;
      }

      .person-name {
        font-weight: 600;
        margin-bottom: 0.25rem;
      }

      .person-email {
        color: #666;
        font-size: 0.875rem;
      }

      .person-actions {
        display: flex;
        gap: 0.5rem;
      }

      .btn-small {
        padding: 0.375rem 0.75rem;
        font-size: 0.875rem;
      }

      .btn-danger {
        background: #f44336;
        color: white;
      }

      .btn-danger:hover {
        background: #d32f2f;
      }

      /* Slots list */
      .slots-list {
        max-height: 300px;
        overflow-y: auto;
      }

      .slot-item {
        padding: 0.75rem;
        border-bottom: 1px solid #f0f0f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .slot-item:hover {
        background: #f9f9f9;
      }

      /* Meetings list */
      .meetings-list {
        max-height: 400px;
        overflow-y: auto;
      }

      .meeting-item {
        padding: 1rem;
        border-bottom: 1px solid #f0f0f0;
      }

      .meeting-person {
        font-weight: 600;
        margin-bottom: 0.5rem;
      }

      .meeting-details {
        color: #666;
        font-size: 0.875rem;
      }

      /* Empty state */
      .empty-state {
        text-align: center;
        padding: 3rem 1rem;
        color: #999;
      }

      .empty-state-icon {
        font-size: 3rem;
        margin-bottom: 1rem;
      }

      /* Form sections */
      .form-section {
        margin-bottom: 1.5rem;
      }

      .form-section h3 {
        margin-bottom: 1rem;
        font-size: 1.125rem;
      }

      /* Success/error messages */
      .message {
        padding: 1rem;
        border-radius: 4px;
        margin-bottom: 1rem;
      }

      .message.success {
        background: #e8f5e9;
        color: #2e7d32;
        border: 1px solid #4caf50;
      }

      .message.error {
        background: #ffebee;
        color: #c62828;
        border: 1px solid #f44336;
      }

      .message.info {
        background: #e3f2fd;
        color: #1565c0;
        border: 1px solid #2196f3;
      }

      /* Loading state */
      .loading {
        text-align: center;
        padding: 2rem;
      }

      .spinner {
        border: 3px solid #f3f3f3;
        border-top: 3px solid #4285f4;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 1rem;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .hidden {
        display: none !important;
      }
    </style>
  </head>
  <body>
    <div class="container">
      <!-- Back button -->
      <button class="back-button" onclick="navigateToMenu()">
        ← Back to Menu
      </button>

      <h1>One-to-One Scheduler</h1>

      <!-- Message area -->
      <div id="messageArea"></div>

      <!-- Tab navigation -->
      <div class="tabs">
        <button class="tab active" onclick="showTab('people')" id="peopleTab">
          People
        </button>
        <button class="tab" onclick="showTab('settings')" id="settingsTab">
          Settings
        </button>
        <button class="tab" onclick="showTab('meetings')" id="meetingsTab">
          Meetings
        </button>
      </div>

      <!-- People Tab -->
      <div id="peopleContent" class="tab-content active">
        <div class="card">
          <h2>Manage People</h2>

          <!-- Add person form -->
          <form id="addPersonForm" onsubmit="handleAddPerson(event); return false;">
            <div class="form-group">
              <label for="personName">Name:</label>
              <input type="text" id="personName" required maxlength="100">
            </div>

            <div class="form-group">
              <label for="personEmail">Email:</label>
              <input type="email" id="personEmail" required>
            </div>

            <button type="submit" class="button">Add Person</button>
          </form>
        </div>

        <!-- People list -->
        <div class="card">
          <h3>People in Group (<span id="peopleCount">0</span>)</h3>

          <div id="peopleListContainer">
            <div id="peopleLoading" class="loading">
              <div class="spinner"></div>
              <p>Loading people...</p>
            </div>

            <div id="peopleEmptyState" class="empty-state hidden">
              <div class="empty-state-icon">👥</div>
              <p>No people in your one-to-one group yet.</p>
              <p style="font-size: 0.875rem; color: #999;">Add your first person using the form above.</p>
            </div>

            <div id="peopleList" class="people-list hidden"></div>
          </div>
        </div>
      </div>

      <!-- Settings Tab -->
      <div id="settingsContent" class="tab-content">
        <div class="card">
          <h2>Meeting Configuration</h2>

          <form id="configForm" onsubmit="handleUpdateConfig(event); return false;">
            <div class="form-group">
              <label for="meetingDuration">Meeting Duration (minutes):</label>
              <select id="meetingDuration" required>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
              </select>
            </div>

            <div class="form-group">
              <label for="minRecurrenceInterval">Minimum Recurrence Interval (weeks):</label>
              <select id="minRecurrenceInterval" required>
                <option value="1">Every week</option>
                <option value="2">Every 2 weeks</option>
                <option value="3">Every 3 weeks</option>
                <option value="4">Every 4 weeks</option>
              </select>
            </div>

            <div class="form-group">
              <label for="titlePrefix">Calendar Event Title Prefix:</label>
              <input type="text" id="titlePrefix" required value="1:1 -">
              <small style="color: #666;">Events will be titled: "[Prefix] Person Name"</small>
            </div>

            <button type="submit" class="button">Save Configuration</button>
          </form>
        </div>

        <div class="card">
          <h2>Available Meeting Slots</h2>

          <p style="color: #666; margin-bottom: 1rem;">
            Define when one-to-one meetings can be scheduled.
          </p>

          <!-- Add slot form -->
          <form id="addSlotForm" onsubmit="handleAddSlot(event); return false;">
            <div class="form-group">
              <label for="slotWeekday">Weekday:</label>
              <select id="slotWeekday" required>
                <option value="Monday">Monday</option>
                <option value="Tuesday">Tuesday</option>
                <option value="Wednesday">Wednesday</option>
                <option value="Thursday">Thursday</option>
                <option value="Friday">Friday</option>
                <option value="Saturday">Saturday</option>
                <option value="Sunday">Sunday</option>
              </select>
            </div>

            <div class="form-group">
              <label for="slotStartTime">Start Time (24-hour):</label>
              <input type="time" id="slotStartTime" required>
            </div>

            <div class="form-group">
              <label for="slotEndTime">End Time (24-hour):</label>
              <input type="time" id="slotEndTime" required>
            </div>

            <button type="submit" class="button">Add Slot</button>
          </form>

          <!-- Slots list -->
          <div style="margin-top: 1.5rem;">
            <h3>Configured Slots (<span id="slotsCount">0</span>)</h3>

            <div id="slotsEmptyState" class="empty-state hidden">
              <p>No time slots configured yet.</p>
            </div>

            <div id="slotsList" class="slots-list hidden"></div>
          </div>
        </div>
      </div>

      <!-- Meetings Tab -->
      <div id="meetingsContent" class="tab-content">
        <div class="card">
          <h2>Scheduled Meetings</h2>

          <div style="margin-bottom: 1.5rem;">
            <button class="button" onclick="handleCreateMeetings()">
              Create All Meetings
            </button>

            <button class="button btn-danger" onclick="handleDeleteAllMeetings()" style="margin-left: 0.5rem;">
              Delete All Meetings
            </button>
          </div>

          <div id="meetingsInfo" class="message info hidden">
            <p><strong>Calculated Recurrence:</strong> <span id="calculatedRecurrence">-</span></p>
            <p style="margin-top: 0.5rem; font-size: 0.875rem;">
              Based on the number of people and available slots per week.
            </p>
          </div>

          <div id="meetingsListContainer">
            <div id="meetingsLoading" class="loading hidden">
              <div class="spinner"></div>
              <p>Loading meetings...</p>
            </div>

            <div id="meetingsEmptyState" class="empty-state hidden">
              <div class="empty-state-icon">📅</div>
              <p>No meetings scheduled yet.</p>
              <p style="font-size: 0.875rem; color: #999;">
                Add people and configure slots, then click "Create All Meetings".
              </p>
            </div>

            <div id="meetingsList" class="meetings-list hidden"></div>
          </div>
        </div>
      </div>
    </div>

    <script>
      // State
      let currentTab = 'people';
      let people = [];
      let slots = [];
      let meetings = [];
      let config = {};

      // Initialize on load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeOneToOne);
      } else {
        initializeOneToOne();
      }

      // ========================================================================
      // Initialization
      // ========================================================================

      function initializeOneToOne() {
        // Initialize tabs
        google.script.run
          .withSuccessHandler(function(result) {
            if (result.success) {
              loadAllData();
            } else {
              showError('Failed to initialize: ' + (result.error || 'Unknown error'));
            }
          })
          .withFailureHandler(function(error) {
            showError('Initialization failed: ' + error.message);
          })
          .initOneToOne();

        // Restore active tab from session storage
        var savedTab = sessionStorage.getItem('oneToOne_activeTab');
        if (savedTab) {
          showTab(savedTab);
        }

        // Set up form auto-save
        setupFormAutoSave();
      }

      function loadAllData() {
        loadPeople();
        loadConfig();
        loadSlots();
      }

      // ========================================================================
      // Tab Management
      // ========================================================================

      function showTab(tabName) {
        currentTab = tabName;

        // Save to session storage
        try {
          sessionStorage.setItem('oneToOne_activeTab', tabName);
        } catch (e) {
          console.error('Failed to save active tab:', e);
        }

        // Update tab buttons
        document.querySelectorAll('.tab').forEach(function(tab) {
          tab.classList.remove('active');
        });
        document.getElementById(tabName + 'Tab').classList.add('active');

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(function(content) {
          content.classList.remove('active');
        });
        document.getElementById(tabName + 'Content').classList.add('active');

        // Load data for tab if needed
        if (tabName === 'meetings') {
          loadMeetings();
        }
      }

      // ========================================================================
      // People Management
      // ========================================================================

      function loadPeople() {
        showElement('peopleLoading');
        hideElement('peopleEmptyState');
        hideElement('peopleList');

        google.script.run
          .withSuccessHandler(function(result) {
            hideElement('peopleLoading');

            if (result.success) {
              people = result.people;
              renderPeopleList();
            } else {
              showError('Failed to load people: ' + result.error);
            }
          })
          .withFailureHandler(function(error) {
            hideElement('peopleLoading');
            showError('Failed to load people: ' + error.message);
          })
          .getOneToOnePeople();
      }

      function renderPeopleList() {
        var peopleList = document.getElementById('peopleList');
        var emptyState = document.getElementById('peopleEmptyState');
        var countSpan = document.getElementById('peopleCount');

        countSpan.textContent = people.length;

        if (people.length === 0) {
          hideElement('peopleList');
          showElement('peopleEmptyState');
          return;
        }

        hideElement('peopleEmptyState');
        showElement('peopleList');

        var html = '';
        people.forEach(function(person) {
          html += '<div class="person-item">';
          html += '  <div class="person-info">';
          html += '    <div class="person-name">' + escapeHtml(person.name) + '</div>';
          html += '    <div class="person-email">' + escapeHtml(person.email) + '</div>';
          if (person.calendarEventId) {
            html += '    <div style="font-size: 0.75rem; color: #4caf50; margin-top: 0.25rem;">✓ Meeting scheduled</div>';
          }
          html += '  </div>';
          html += '  <div class="person-actions">';
          html += '    <button class="btn-small button" onclick="editPerson(\'' + person.personId + '\')">Edit</button>';
          html += '    <button class="btn-small btn-danger" onclick="confirmDeletePerson(\'' + person.personId + '\', \'' + escapeHtml(person.name) + '\')">Delete</button>';
          html += '  </div>';
          html += '</div>';
        });

        peopleList.innerHTML = html;
      }

      function handleAddPerson(event) {
        event.preventDefault();

        var name = document.getElementById('personName').value.trim();
        var email = document.getElementById('personEmail').value.trim();

        google.script.run
          .withSuccessHandler(function(result) {
            if (result.success) {
              showSuccess('Person added successfully!');
              document.getElementById('addPersonForm').reset();
              loadPeople();

              // Save to session storage for highlighting
              try {
                sessionStorage.setItem('oneToOne_lastPersonAdded', result.personId);
              } catch (e) {}
            } else {
              showError(result.error);
            }
          })
          .withFailureHandler(function(error) {
            showError('Failed to add person: ' + error.message);
          })
          .addOneToOnePerson(name, email);
      }

      function editPerson(personId) {
        var person = people.find(function(p) { return p.personId === personId; });
        if (!person) return;

        var newName = prompt('Enter new name:', person.name);
        if (!newName) return;

        var newEmail = prompt('Enter new email:', person.email);
        if (!newEmail) return;

        google.script.run
          .withSuccessHandler(function(result) {
            if (result.success) {
              showSuccess('Person updated successfully!');
              loadPeople();
            } else {
              showError(result.error);
            }
          })
          .withFailureHandler(function(error) {
            showError('Failed to update person: ' + error.message);
          })
          .updateOneToOnePerson(personId, newName, newEmail);
      }

      function confirmDeletePerson(personId, personName) {
        var confirmed = confirm('Delete ' + personName + ' from the one-to-one group?\n\nThis will also delete their calendar event if one exists.');
        if (!confirmed) return;

        google.script.run
          .withSuccessHandler(function(result) {
            if (result.success) {
              showSuccess('Person deleted successfully!');
              loadPeople();
              loadMeetings(); // Refresh meetings list
            } else {
              showError(result.error);
            }
          })
          .withFailureHandler(function(error) {
            showError('Failed to delete person: ' + error.message);
          })
          .deleteOneToOnePerson(personId);
      }

      // ========================================================================
      // Configuration Management
      // ========================================================================

      function loadConfig() {
        google.script.run
          .withSuccessHandler(function(result) {
            if (result.success) {
              config = result.config;
              populateConfigForm();
            } else {
              showError('Failed to load configuration: ' + result.error);
            }
          })
          .withFailureHandler(function(error) {
            showError('Failed to load configuration: ' + error.message);
          })
          .getOneToOneSettings();
      }

      function populateConfigForm() {
        document.getElementById('meetingDuration').value = config.meetingDurationMinutes || 30;
        document.getElementById('minRecurrenceInterval').value = config.minRecurrenceIntervalWeeks || 1;
        document.getElementById('titlePrefix').value = config.meetingTitlePrefix || '1:1 -';

        // Update calculated recurrence display
        if (config.calculatedRecurrenceWeeks) {
          var recurrenceText = config.calculatedRecurrenceWeeks === 1
            ? 'Every week'
            : 'Every ' + config.calculatedRecurrenceWeeks + ' weeks';
          document.getElementById('calculatedRecurrence').textContent = recurrenceText;
          showElement('meetingsInfo');
        }
      }

      function handleUpdateConfig(event) {
        event.preventDefault();

        var newConfig = {
          meetingDurationMinutes: parseInt(document.getElementById('meetingDuration').value),
          minRecurrenceIntervalWeeks: parseInt(document.getElementById('minRecurrenceInterval').value),
          calculatedRecurrenceWeeks: config.calculatedRecurrenceWeeks || 1,
          meetingTitlePrefix: document.getElementById('titlePrefix').value.trim()
        };

        google.script.run
          .withSuccessHandler(function(result) {
            if (result.success) {
              showSuccess('Configuration saved successfully!');
              config = newConfig;
              clearFormDraft('oneToOne_configFormState');
            } else {
              showError(result.error);
            }
          })
          .withFailureHandler(function(error) {
            showError('Failed to save configuration: ' + error.message);
          })
          .updateOneToOneSettings(newConfig);
      }

      // ========================================================================
      // Slots Management
      // ========================================================================

      function loadSlots() {
        google.script.run
          .withSuccessHandler(function(result) {
            if (result.success) {
              slots = result.slots;
              renderSlotsList();
            } else {
              showError('Failed to load slots: ' + result.error);
            }
          })
          .withFailureHandler(function(error) {
            showError('Failed to load slots: ' + error.message);
          })
          .getOneToOneSlots();
      }

      function renderSlotsList() {
        var slotsList = document.getElementById('slotsList');
        var emptyState = document.getElementById('slotsEmptyState');
        var countSpan = document.getElementById('slotsCount');

        countSpan.textContent = slots.length;

        if (slots.length === 0) {
          hideElement('slotsList');
          showElement('slotsEmptyState');
          return;
        }

        hideElement('slotsEmptyState');
        showElement('slotsList');

        var html = '';
        slots.forEach(function(slot) {
          html += '<div class="slot-item">';
          html += '  <div>';
          html += '    <strong>' + slot.weekday + '</strong> ';
          html += '    ' + slot.startTime + ' - ' + slot.endTime;
          html += '  </div>';
          html += '  <button class="btn-small btn-danger" onclick="confirmDeleteSlot(\'' + slot.slotId + '\', \'' + slot.weekday + ' ' + slot.startTime + '-' + slot.endTime + '\')">Delete</button>';
          html += '</div>';
        });

        slotsList.innerHTML = html;
      }

      function handleAddSlot(event) {
        event.preventDefault();

        var weekday = document.getElementById('slotWeekday').value;
        var startTime = document.getElementById('slotStartTime').value;
        var endTime = document.getElementById('slotEndTime').value;

        google.script.run
          .withSuccessHandler(function(result) {
            if (result.success) {
              showSuccess('Slot added successfully!');
              document.getElementById('addSlotForm').reset();
              loadSlots();
            } else {
              showError(result.error);
            }
          })
          .withFailureHandler(function(error) {
            showError('Failed to add slot: ' + error.message);
          })
          .addOneToOneSlot(weekday, startTime, endTime);
      }

      function confirmDeleteSlot(slotId, slotDescription) {
        var confirmed = confirm('Delete slot: ' + slotDescription + '?');
        if (!confirmed) return;

        google.script.run
          .withSuccessHandler(function(result) {
            if (result.success) {
              showSuccess('Slot deleted successfully!');
              loadSlots();
            } else {
              showError(result.error);
            }
          })
          .withFailureHandler(function(error) {
            showError('Failed to delete slot: ' + error.message);
          })
          .deleteOneToOneSlot(slotId);
      }

      // ========================================================================
      // Meetings Management
      // ========================================================================

      function loadMeetings() {
        showElement('meetingsLoading');
        hideElement('meetingsEmptyState');
        hideElement('meetingsList');

        google.script.run
          .withSuccessHandler(function(result) {
            hideElement('meetingsLoading');

            if (result.success) {
              meetings = result.meetings;
              renderMeetingsList();
            } else {
              showError('Failed to load meetings: ' + result.error);
            }
          })
          .withFailureHandler(function(error) {
            hideElement('meetingsLoading');
            showError('Failed to load meetings: ' + error.message);
          })
          .getOneToOneMeetings();
      }

      function renderMeetingsList() {
        var meetingsList = document.getElementById('meetingsList');
        var emptyState = document.getElementById('meetingsEmptyState');

        if (meetings.length === 0) {
          hideElement('meetingsList');
          showElement('meetingsEmptyState');
          return;
        }

        hideElement('meetingsEmptyState');
        showElement('meetingsList');

        var html = '';
        meetings.forEach(function(meeting) {
          html += '<div class="meeting-item">';
          html += '  <div class="meeting-person">' + escapeHtml(meeting.person.name) + '</div>';
          html += '  <div class="meeting-details">';
          html += '    <div><strong>Day:</strong> ' + meeting.weekday + '</div>';
          html += '    <div><strong>Time:</strong> ' + meeting.formattedTime + '</div>';
          html += '    <div><strong>Recurrence:</strong> ' + meeting.formattedRecurrence + '</div>';
          html += '  </div>';
          html += '</div>';
        });

        meetingsList.innerHTML = html;
      }

      function handleCreateMeetings() {
        var confirmed = confirm(
          'Create recurring calendar events for all people in the group?\n\n' +
          'This will:\n' +
          '- Create one recurring event per person\n' +
          '- Distribute meetings across available slots\n' +
          '- Calculate optimal recurrence interval'
        );

        if (!confirmed) return;

        showElement('meetingsLoading');

        google.script.run
          .withSuccessHandler(function(result) {
            hideElement('meetingsLoading');

            if (result.success) {
              var summary = result.summary;
              var message = 'Created ' + summary.successful + ' meeting(s) successfully!';

              if (summary.failed > 0) {
                message += '\n' + summary.failed + ' meeting(s) failed to create.';
              }

              message += '\n\nRecurrence interval: ' +
                (result.recurrenceWeeks === 1 ? 'Every week' : 'Every ' + result.recurrenceWeeks + ' weeks');

              showSuccess(message);
              loadPeople(); // Refresh to show calendar event IDs
              loadConfig(); // Refresh to show calculated recurrence
              loadMeetings();
            } else {
              showError(result.error);
            }
          })
          .withFailureHandler(function(error) {
            hideElement('meetingsLoading');
            showError('Failed to create meetings: ' + error.message);
          })
          .createOneToOneMeetings();
      }

      function handleDeleteAllMeetings() {
        var confirmed = confirm(
          'Delete ALL recurring one-to-one meetings from your calendar?\n\n' +
          'This action cannot be undone. All recurring events will be permanently deleted.'
        );

        if (!confirmed) return;

        showElement('meetingsLoading');

        google.script.run
          .withSuccessHandler(function(result) {
            hideElement('meetingsLoading');

            if (result.success) {
              showSuccess('Deleted ' + result.deletedCount + ' meeting(s) successfully!');
              loadPeople();
              loadMeetings();
            } else {
              showError(result.error);
            }
          })
          .withFailureHandler(function(error) {
            hideElement('meetingsLoading');
            showError('Failed to delete meetings: ' + error.message);
          })
          .deleteAllOneToOneMeetings();
      }

      // ========================================================================
      // Session Storage (Form Auto-Save)
      // ========================================================================

      function setupFormAutoSave() {
        // Config form auto-save
        var configInputs = ['meetingDuration', 'minRecurrenceInterval', 'titlePrefix'];
        configInputs.forEach(function(id) {
          var input = document.getElementById(id);
          if (input) {
            input.addEventListener('input', saveConfigFormDraft);
          }
        });

        // Restore config form draft
        restoreConfigFormDraft();
      }

      function saveConfigFormDraft() {
        var formState = {
          duration: document.getElementById('meetingDuration').value,
          minInterval: document.getElementById('minRecurrenceInterval').value,
          prefix: document.getElementById('titlePrefix').value
        };

        try {
          sessionStorage.setItem('oneToOne_configFormState', JSON.stringify(formState));
        } catch (e) {
          console.error('Failed to save form draft:', e);
        }
      }

      function restoreConfigFormDraft() {
        try {
          var formState = sessionStorage.getItem('oneToOne_configFormState');
          if (formState) {
            var data = JSON.parse(formState);
            if (data.duration) document.getElementById('meetingDuration').value = data.duration;
            if (data.minInterval) document.getElementById('minRecurrenceInterval').value = data.minInterval;
            if (data.prefix) document.getElementById('titlePrefix').value = data.prefix;
          }
        } catch (e) {
          console.error('Failed to restore form draft:', e);
        }
      }

      function clearFormDraft(key) {
        try {
          sessionStorage.removeItem(key);
        } catch (e) {
          console.error('Failed to clear form draft:', e);
        }
      }

      // ========================================================================
      // UI Helpers
      // ========================================================================

      function showElement(id) {
        document.getElementById(id).classList.remove('hidden');
      }

      function hideElement(id) {
        document.getElementById(id).classList.add('hidden');
      }

      function showMessage(message, type) {
        var messageArea = document.getElementById('messageArea');
        var messageDiv = document.createElement('div');
        messageDiv.className = 'message ' + type;
        messageDiv.textContent = message;

        messageArea.appendChild(messageDiv);

        // Auto-dismiss after 5 seconds
        setTimeout(function() {
          messageDiv.remove();
        }, 5000);

        // Scroll to top
        window.scrollTo(0, 0);
      }

      function showSuccess(message) {
        showMessage(message, 'success');
      }

      function showError(message) {
        showMessage(message, 'error');
      }

      function escapeHtml(text) {
        var div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
      }

      function navigateToMenu() {
        window.top.location.reload();
      }
    </script>
  </body>
</html>
```

**Test checkpoint**:
1. Navigate to the OneToOne screen from the menu
2. Verify all three tabs render correctly
3. Try adding a person (should save to sheet)
4. Try adding a slot (should save to sheet)
5. Try updating configuration (should save)
6. Verify tab switching persists in session storage

---

### Phase 5: Integration (Menu.html Update)

**Goal**: Add "One-to-One Scheduler" button to main menu.

#### Step 5.1: Update Menu.html

**File**: `src/ui/Menu.html`

**Add** this button after the "Find Availability" button (around line 50):

```html
<button onclick="navigateToUtility('OneToOne')" id="oneToOneBtn" disabled>
  <strong>One-to-One Scheduler</strong>
  <div style="font-size: 0.875rem; font-weight: 400; margin-top: 0.25rem;">
    Automatically schedule recurring meetings with your team members
  </div>
</button>
```

**Modify** `enableUtilityButtons()` function to enable the new button:

```javascript
function enableUtilityButtons() {
  document.getElementById('bulkOpsBtn').disabled = false;
  document.getElementById('analyticsBtn').disabled = false;
  document.getElementById('cleanupBtn').disabled = false;
  document.getElementById('availabilityBtn').disabled = false;
  document.getElementById('oneToOneBtn').disabled = false; // ADD THIS LINE
}
```

**Modify** `disableUtilityButtons()` function:

```javascript
function disableUtilityButtons() {
  document.getElementById('bulkOpsBtn').disabled = true;
  document.getElementById('analyticsBtn').disabled = true;
  document.getElementById('cleanupBtn').disabled = true;
  document.getElementById('availabilityBtn').disabled = true;
  document.getElementById('oneToOneBtn').disabled = true; // ADD THIS LINE
}
```

**Test checkpoint**:
1. Reload the web app
2. Verify the new "One-to-One Scheduler" button appears
3. Verify it's disabled when no calendar is selected
4. Verify it becomes enabled when a calendar is selected
5. Click the button to navigate to OneToOne.html

---

## Testing Checklist

After implementation, test all user stories from spec.md:

### User Story 1: Manage People (P1 - MVP)

- [ ] Navigate to One-to-One Scheduler → see empty people list with "Add Person" form
- [ ] Add person "Alice Johnson" (alice@example.com) → appears in list
- [ ] Add 5 more people → all 6 visible in list
- [ ] Edit Alice's email → changes reflected immediately
- [ ] Delete one person → disappears from list
- [ ] Try adding duplicate email → validation error shown

### User Story 2: Configure Meeting Slots (P1 - MVP)

- [ ] Navigate to Settings tab → see configuration form and empty slots list
- [ ] Set meeting duration to 30 minutes → saves successfully
- [ ] Set minimum interval to 1 week → saves successfully
- [ ] Add slot: Tuesday 14:00-17:00 → appears in list
- [ ] Add slot: Thursday 09:00-12:00 → appears in list
- [ ] Try adding invalid slot (end before start) → validation error
- [ ] Delete one slot → disappears from list

### User Story 3: Create and View Meetings (P1 - MVP)

- [ ] With 3 people and 2 slots configured, click "Create Meetings"
- [ ] Confirmation dialog explains what will happen → click OK
- [ ] Success message shows "Created 3 meeting(s)"
- [ ] Navigate to Meetings tab → see 3 scheduled meetings listed
- [ ] Each meeting shows person name, day, time, recurrence pattern
- [ ] Check Google Calendar → 3 recurring events created with "1:1 - [Name]" format
- [ ] Verify each event recurs correctly (check series in Calendar)

### User Story 4: Update and Delete Meetings (P2)

- [ ] Delete one person who has a meeting → their calendar event is deleted
- [ ] Check Google Calendar → event no longer exists
- [ ] Click "Delete All Meetings" → confirmation dialog appears
- [ ] Confirm deletion → all calendar events removed
- [ ] Meetings tab shows empty state

### User Story 5: Reschedule After Changes (P3)

- [ ] Create meetings for 5 people
- [ ] Add 5 more people (total 10)
- [ ] Delete all meetings and recreate → system recalculates interval (should be 2 weeks if 5 slots/week)
- [ ] Verify new recurrence interval displayed in Meetings tab

### Edge Cases

- [ ] Try creating meetings with no people → error message
- [ ] Try creating meetings with no slots → error message
- [ ] Add 10 people with only 1 slot configured → calculated interval shows "Every 10 weeks"
- [ ] Configure 60-minute meeting duration with 30-minute slot → validation error
- [ ] Add slot on Saturday → system allows it
- [ ] Add two people with same name but different emails → both allowed
- [ ] Calendar API fails during creation → error message with details, other meetings still created

### Cross-Device Testing

- [ ] Test in Google Sites iframe on desktop browser
- [ ] Test on mobile viewport (responsive layout)
- [ ] Verify tab navigation works on mobile
- [ ] Verify forms are usable on small screens

### Session Storage

- [ ] Fill out config form partially → refresh page → form values restored
- [ ] Switch between tabs → refresh page → returns to last active tab
- [ ] Complete an action → session storage cleared appropriately

---

## Deployment Steps

Once all testing passes:

### 1. Deploy via clasp (if using clasp CLI)

```bash
# From project root
clasp push
clasp deploy --description "Feature 006: One-to-One Meeting Scheduler"
```

### 2. Deploy via Apps Script Editor

1. Open Google Apps Script editor
2. Click **Deploy** → **New deployment**
3. Select type: **Web app**
4. Description: "Feature 006: One-to-One Meeting Scheduler"
5. Execute as: **Me**
6. Who has access: **Anyone** (or appropriate setting)
7. Click **Deploy**
8. Authorize if prompted
9. Copy deployment URL

### 3. Update Google Sites iframe

1. Open Google Sites page
2. Edit the iframe embed URL to new deployment URL
3. Save and publish

### 4. Verify deployment

1. Navigate to Google Sites page
2. Verify "One-to-One Scheduler" button appears in menu
3. Run complete test suite again on production deployment

---

## Troubleshooting

### Common Issues and Solutions

#### Issue: "Failed to initialize tabs" error

**Cause**: Spreadsheet permissions or sheet creation failure

**Solution**:
1. Check that script has access to create sheets in the config spreadsheet
2. Manually run `initializeOneToOneTabs()` from Apps Script editor
3. Check execution logs for detailed error messages

---

#### Issue: Calendar events not creating

**Cause**: Calendar API permissions or invalid calendar ID

**Solution**:
1. Verify selected calendar ID is correct
2. Check OAuth scopes include `https://www.googleapis.com/auth/calendar`
3. Try creating event manually using `CalendarApp.getDefaultCalendar().createEvent()`
4. Check that calendar is not read-only

---

#### Issue: "Person with email already exists" when adding person

**Cause**: Duplicate email validation

**Solution**:
- This is expected behavior (email uniqueness constraint)
- Use different email or delete existing person first
- Check OneToOnePeople sheet for existing entries

---

#### Issue: Slots not expanding into periods

**Cause**: Meeting duration longer than slot duration

**Solution**:
1. Check that slot end time is after start time
2. Verify meeting duration (e.g., 30 min) fits within slot (e.g., 60 min slot = 2 periods)
3. Increase slot duration or decrease meeting duration

---

#### Issue: Calculated recurrence interval too long

**Cause**: Too many people, not enough slots

**Solution**:
- Add more time slots to increase slots per week
- Example: 10 people, 2 slots/week → 5 weeks recurrence
- Add 3 more slots → 5 slots/week → 2 weeks recurrence

---

#### Issue: Session storage not persisting

**Cause**: Browser privacy settings or incognito mode

**Solution**:
- Check browser allows session storage
- Disable incognito/private browsing mode
- This is graceful degradation – feature works without session storage, just no state persistence

---

#### Issue: UI not loading in iframe

**Cause**: Content Security Policy or iframe restrictions

**Solution**:
1. Check Google Sites iframe settings allow Apps Script web app
2. Verify web app is deployed with correct access settings
3. Check browser console for CSP errors

---

#### Issue: "Event series not found" when deleting

**Cause**: Event was manually deleted from calendar

**Solution**:
- This is expected if user deleted event directly in Google Calendar
- Clear calendar event ID from person record:
  ```javascript
  updatePersonCalendarEventId(personId, '');
  ```
- Or delete and re-add the person

---

#### Issue: Wrong recurrence interval calculated

**Cause**: Algorithm logic error or misunderstanding

**Solution**:
1. Verify formula: `ceil(people_count / slots_per_week)`
2. Then: `max(calculated, min_interval)`
3. Example: 7 people, 5 slots → ceil(7/5) = 2 weeks
4. Check logs for calculated values

---

## Summary

**Implementation Order**:
1. **Phase 0**: Sheet initialization (initializeOneToOneTabs in SheetService.gs)
2. **Phase 1**: Data models (Person.gs, MeetingSlot.gs, ScheduledMeeting.gs)
3. **Phase 2**: Services layer (PeopleService.gs, OneToOneConfigService.gs, MeetingSlotService.gs, SchedulingService.gs)
4. **Phase 3**: Server functions (Code.gs additions)
5. **Phase 4**: User interface (OneToOne.html)
6. **Phase 5**: Integration (Menu.html update)

**Total Estimated Time**: 12-16 hours for experienced Apps Script developer

**Files Created**:
- 3 model files (Person.gs, MeetingSlot.gs, ScheduledMeeting.gs)
- 4 service files (PeopleService.gs, OneToOneConfigService.gs, MeetingSlotService.gs, SchedulingService.gs)
- 1 UI file (OneToOne.html)

**Files Modified**:
- SheetService.gs (added initializeOneToOneTabs)
- Code.gs (added validUtilities entry + 11 server functions)
- Menu.html (added button + enable/disable logic)

**Lines of Code**: ~2000 lines total (including HTML/CSS/JS)

**Key Features Delivered**:
- Complete CRUD for people and meeting slots
- Intelligent scheduling algorithm with automatic interval calculation
- Recurring calendar event creation with indefinite recurrence
- Multi-tab UI with session storage persistence
- Comprehensive validation and error handling
- Graceful degradation for edge cases

---

**Next Steps After Implementation**:
1. Complete all manual testing scenarios
2. Deploy to production
3. Monitor user feedback and error logs
4. Consider future enhancements (P2/P3 user stories)
5. Update CLAUDE.md with feature summary
