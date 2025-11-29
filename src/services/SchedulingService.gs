/**
 * Scheduling Service
 * Manages creation and viewing of one-to-one meeting schedules
 */

/**
 * Calculate optimal recurrence interval based on people count and available slots
 * @param {number} peopleCount - Number of people to schedule
 * @param {number} slotsPerWeek - Number of available slots per week
 * @param {number} minInterval - Minimum acceptable interval in weeks
 * @returns {number} Recurrence interval in weeks
 */
function calculateRecurrenceInterval(peopleCount, slotsPerWeek, minInterval) {
  if (peopleCount === 0 || slotsPerWeek === 0) {
    return minInterval;
  }

  // Calculate weeks needed to fit all people into available slots
  var weeksNeeded = Math.ceil(peopleCount / slotsPerWeek);

  // Return the longer of: minimum interval or calculated interval
  return Math.max(minInterval, weeksNeeded);
}

/**
 * Expand time slots into individual meeting periods
 * Each slot can accommodate multiple meetings (one per configured duration)
 * @param {Array<Object>} slots - Array of MeetingSlot objects
 * @param {number} durationMinutes - Meeting duration in minutes
 * @returns {Array<Object>} Array of period objects {weekday, startTime, endTime}
 */
function expandSlotsIntoPeriods(slots, durationMinutes) {
  var periods = [];

  for (var i = 0; i < slots.length; i++) {
    var slot = slots[i];

    // Parse slot times to minutes
    var slotStartMinutes = parseTime(slot.startTime);
    var slotEndMinutes = parseTime(slot.endTime);

    // Calculate how many meetings fit in this slot
    var slotDuration = slotEndMinutes - slotStartMinutes;
    var meetingsInSlot = Math.floor(slotDuration / durationMinutes);

    // Create a period for each meeting that fits
    for (var j = 0; j < meetingsInSlot; j++) {
      var periodStartMinutes = slotStartMinutes + (j * durationMinutes);
      var periodEndMinutes = periodStartMinutes + durationMinutes;

      periods.push({
        weekday: slot.weekday,
        startTime: minutesToTime(periodStartMinutes),
        endTime: minutesToTime(periodEndMinutes)
      });
    }
  }

  return periods;
}

/**
 * Assign people to meeting periods using round-robin distribution
 * @param {Array<Object>} people - Array of Person objects
 * @param {Array<Object>} periods - Array of period objects
 * @param {number} recurrenceWeeks - Recurrence interval in weeks
 * @returns {Array<Object>} Array of assignments {person, period}
 */
function assignPeopleToPeriods(people, periods, recurrenceWeeks) {
  var assignments = [];
  var periodIndex = 0;

  for (var i = 0; i < people.length; i++) {
    var person = people[i];
    var period = periods[periodIndex];

    assignments.push({
      person: person,
      weekday: period.weekday,
      startTime: period.startTime,
      endTime: period.endTime,
      recurrenceWeeks: recurrenceWeeks
    });

    // Move to next period (round-robin)
    periodIndex = (periodIndex + 1) % periods.length;
  }

  return assignments;
}

/**
 * Create a recurring one-to-one meeting in Google Calendar
 * @param {Calendar} calendar - Calendar object
 * @param {string} personName - Person's name
 * @param {string} weekday - Day of week
 * @param {Date} startDateTime - Start date/time
 * @param {Date} endDateTime - End date/time
 * @param {number} intervalWeeks - Recurrence interval in weeks
 * @returns {string} Event series ID
 */
function createOneToOneMeeting(calendar, personName, weekday, startDateTime, endDateTime, intervalWeeks) {
  try {
    // Create event title in format: <Full Name> + "Andy Cheetham" + "1:1 meeting"
    var title = personName + ' + Andy Cheetham + 1:1 meeting';

    // Create recurrence rule (repeats indefinitely)
    var recurrence = CalendarApp.newRecurrence()
      .addWeeklyRule()
      .interval(intervalWeeks);

    // Create recurring event series
    var eventSeries = calendar.createEventSeries(
      title,
      startDateTime,
      endDateTime,
      recurrence
    );

    log('Created recurring event series', {
      title: title,
      weekday: weekday,
      start: startDateTime.toISOString(),
      intervalWeeks: intervalWeeks,
      eventId: eventSeries.getId()
    });

    return eventSeries.getId();
  } catch (e) {
    error('Failed to create recurring event', e);
    throw e;
  }
}

/**
 * Calculate next occurrence date for a given weekday
 * @param {string} weekday - Day of week (Monday, Tuesday, etc.)
 * @param {number} startTimeMinutes - Start time in minutes since midnight
 * @param {number} durationMinutes - Meeting duration in minutes
 * @returns {Object} {startDateTime: Date, endDateTime: Date}
 */
function calculateNextOccurrence(weekday, startTimeMinutes, durationMinutes) {
  var weekdayMap = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };

  var targetDay = weekdayMap[weekday];
  var today = new Date();
  var currentDay = today.getDay();

  // Calculate days until next occurrence
  var daysUntil = (targetDay - currentDay + 7) % 7;
  if (daysUntil === 0) {
    daysUntil = 7; // If it's today, schedule for next week
  }

  // Create start date/time
  var startDate = new Date(today);
  startDate.setDate(today.getDate() + daysUntil);
  startDate.setHours(Math.floor(startTimeMinutes / 60));
  startDate.setMinutes(startTimeMinutes % 60);
  startDate.setSeconds(0);
  startDate.setMilliseconds(0);

  // Create end date/time
  var endDate = new Date(startDate);
  endDate.setMinutes(endDate.getMinutes() + durationMinutes);

  return {
    startDateTime: startDate,
    endDateTime: endDate
  };
}

/**
 * Execute scheduling - create calendar events for all assignments
 * @param {Calendar} calendar - Calendar object
 * @param {Array<Object>} assignments - Array of assignment objects
 * @param {number} durationMinutes - Meeting duration in minutes
 * @returns {Array<Object>} Results array with success/failure for each person
 */
function executeScheduling(calendar, assignments, durationMinutes) {
  var results = [];

  for (var i = 0; i < assignments.length; i++) {
    var assignment = assignments[i];
    var person = assignment.person;

    try {
      // Calculate next occurrence date/time
      var startTimeMinutes = parseTime(assignment.startTime);
      var occurrence = calculateNextOccurrence(assignment.weekday, startTimeMinutes, durationMinutes);

      // Create recurring event
      var eventId = createOneToOneMeeting(
        calendar,
        person.name,
        assignment.weekday,
        occurrence.startDateTime,
        occurrence.endDateTime,
        assignment.recurrenceWeeks
      );

      results.push({
        personId: person.personId,
        personName: person.name,
        eventId: eventId,
        weekday: assignment.weekday,
        startTime: assignment.startTime,
        endTime: assignment.endTime,
        success: true
      });
    } catch (e) {
      error('Failed to create meeting for person', { personId: person.personId, error: e.message });
      results.push({
        personId: person.personId,
        personName: person.name,
        eventId: null,
        success: false,
        error: e.message
      });
    }
  }

  return results;
}

/**
 * Create recurring calendar events for all people in the group
 * Main orchestration function
 * @returns {Object} {success: boolean, results: Array, metadata: Object, error: string}
 */
function createAllMeetings() {
  try {
    log('createAllMeetings started');

    // Get people
    var peopleResponse = listPeople();
    if (!peopleResponse.success || peopleResponse.count === 0) {
      return {
        success: false,
        error: 'Cannot create meetings: no people in group',
        errorType: 'validation'
      };
    }

    var people = peopleResponse.people;

    // Check if any people already have meetings
    var existingMeetings = 0;
    for (var i = 0; i < people.length; i++) {
      if (people[i].calendarEventId && people[i].calendarEventId.trim().length > 0) {
        existingMeetings++;
      }
    }

    if (existingMeetings > 0) {
      return {
        success: false,
        error: 'Meetings already exist. Delete existing meetings first or use regenerate.',
        errorType: 'validation'
      };
    }

    // Get configuration
    var configResponse = getOneToOneConfig();
    if (!configResponse.success) {
      return {
        success: false,
        error: 'Failed to load configuration',
        errorType: 'system'
      };
    }

    var config = configResponse.config;

    // Get time slots
    var slotsResponse = listMeetingSlots();
    if (!slotsResponse.success || slotsResponse.count === 0) {
      return {
        success: false,
        error: 'Cannot create meetings: no time slots configured',
        errorType: 'validation'
      };
    }

    var slots = slotsResponse.slots;

    // Expand slots into periods
    var periods = expandSlotsIntoPeriods(slots, config.meetingDurationMinutes);
    var slotsPerWeek = periods.length;

    if (slotsPerWeek === 0) {
      return {
        success: false,
        error: 'Meeting duration exceeds all available time slots',
        errorType: 'validation'
      };
    }

    // Calculate recurrence interval
    var recurrenceWeeks = calculateRecurrenceInterval(
      people.length,
      slotsPerWeek,
      config.minRecurrenceIntervalWeeks
    );

    // Assign people to periods
    var assignments = assignPeopleToPeriods(people, periods, recurrenceWeeks);

    // Get calendar
    var userConfig = getConfig();
    if (!userConfig.selectedCalendarId) {
      return {
        success: false,
        error: 'No calendar selected',
        errorType: 'validation'
      };
    }

    var calendar = CalendarApp.getCalendarById(userConfig.selectedCalendarId);
    if (!calendar) {
      return {
        success: false,
        error: 'Calendar not found',
        errorType: 'system'
      };
    }

    // Execute scheduling
    var results = executeScheduling(
      calendar,
      assignments,
      config.meetingDurationMinutes
    );

    // Update people sheet with calendar event IDs
    var spreadsheet = getOrCreateConfigSheet();
    var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');

    for (var i = 0; i < results.length; i++) {
      var result = results[i];
      if (result.success && result.eventId) {
        // Find person row and update calendarEventId
        var allData = batchRead(peopleSheet);
        for (var j = 1; j < allData.length; j++) {
          if (allData[j][0] === result.personId) {
            var rowIndex = j + 1;
            peopleSheet.getRange(rowIndex, 3).setValue(result.eventId); // Column 3 is calendarEventId (1-indexed)
            break;
          }
        }
      }
    }

    // Calculate success/failure counts
    var successCount = 0;
    var failureCount = 0;
    for (var i = 0; i < results.length; i++) {
      if (results[i].success) {
        successCount++;
      } else {
        failureCount++;
      }
    }

    var metadata = {
      totalPeople: people.length,
      successCount: successCount,
      failureCount: failureCount,
      recurrenceWeeks: recurrenceWeeks,
      slotsPerWeek: slotsPerWeek
    };

    var message = 'Successfully created ' + successCount + ' recurring meeting' +
      (successCount === 1 ? '' : 's') + ' (every ' + recurrenceWeeks + ' week' +
      (recurrenceWeeks === 1 ? '' : 's') + ')';

    var response = {
      success: true,
      results: results,
      metadata: metadata,
      message: message
    };

    if (failureCount > 0) {
      response.warning = failureCount + ' meeting' + (failureCount === 1 ? '' : 's') +
        ' failed to create. See results for details.';
    }

    log('createAllMeetings completed', metadata);
    return response;
  } catch (e) {
    error('createAllMeetings failed', e);
    return {
      success: false,
      error: e.message || 'Failed to create meetings',
      errorType: 'system'
    };
  }
}

/**
 * Get all scheduled one-to-one meetings with details
 * @returns {Object} {success: boolean, meetings: Array, count: number, metadata: Object}
 */
function viewMeetings() {
  try {
    log('viewMeetings started');

    // Get people
    var peopleResponse = listPeople();
    if (!peopleResponse.success) {
      return {
        success: false,
        error: 'Failed to load people',
        errorType: 'system'
      };
    }

    var people = peopleResponse.people;

    // Get configuration for title prefix
    var configResponse = getOneToOneConfig();
    var config = configResponse.success ? configResponse.config : getDefaultOneToOneConfig();

    // Build meetings array
    var meetings = [];
    var peopleWithMeetings = 0;

    log('Processing people for meetings', { totalPeople: people.length });

    for (var i = 0; i < people.length; i++) {
      var person = people[i];
      log('Checking person', {
        personId: person.personId,
        name: person.name,
        calendarEventId: person.calendarEventId,
        hasEventId: !!(person.calendarEventId && person.calendarEventId.trim().length > 0)
      });

      if (person.calendarEventId && person.calendarEventId.trim().length > 0) {
        peopleWithMeetings++;

        // For now, we'll create a meeting object without fetching calendar details
        // Calendar details would require additional API calls which might be slow
        meetings.push({
          personId: person.personId,
          personName: person.name,
          eventId: person.calendarEventId,
          eventTitle: person.name + ' + Andy Cheetham + 1:1 meeting'
        });
        log('Added meeting for person', { personName: person.name });
      }
    }

    var metadata = {
      recurrenceWeeks: config.calculatedRecurrenceWeeks || null,
      peopleWithMeetings: peopleWithMeetings,
      peopleWithoutMeetings: people.length - peopleWithMeetings
    };

    log('viewMeetings completed', { count: meetings.length });
    return {
      success: true,
      meetings: meetings,
      count: meetings.length,
      metadata: metadata,
      message: meetings.length === 0 ? 'No meetings scheduled yet' : null
    };
  } catch (e) {
    error('viewMeetings failed', e);
    return {
      success: false,
      error: e.message || 'Failed to view meetings',
      errorType: 'system'
    };
  }
}

/**
 * Delete a one-to-one meeting for a specific person
 * Removes the calendar event and clears the calendarEventId from the person record
 * @param {string} personId - Unique person identifier
 * @returns {Object} {success: boolean, personId: string, eventDeleted: boolean, error: string}
 */
function deleteMeeting(personId) {
  try {
    log('deleteMeeting started', { personId: personId });

    // Get person details
    var spreadsheet = getOrCreateConfigSheet();
    var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');

    if (!peopleSheet) {
      return {
        success: false,
        error: 'OneToOnePeople sheet not found',
        errorType: 'system'
      };
    }

    // Find person by personId
    var allData = batchRead(peopleSheet);
    var personRowIndex = -1;
    var eventId = null;
    var personName = '';

    for (var i = 1; i < allData.length; i++) {
      if (allData[i][0] === personId) {
        personRowIndex = i + 1; // Convert to 1-indexed
        personName = allData[i][1];
        eventId = allData[i][2]; // Column 3 is calendarEventId (array is 0-indexed)
        break;
      }
    }

    if (personRowIndex === -1) {
      return {
        success: false,
        error: 'Person not found',
        errorType: 'validation'
      };
    }

    // Check if person has a calendar event
    if (!eventId || eventId.trim().length === 0) {
      return {
        success: true,
        personId: personId,
        eventDeleted: false,
        message: personName + ' has no meeting to delete',
        warning: 'No calendar event found for this person'
      };
    }

    // Get calendar
    var userConfig = getConfig();
    if (!userConfig.selectedCalendarId) {
      return {
        success: false,
        error: 'No calendar selected',
        errorType: 'validation'
      };
    }

    var calendar = CalendarApp.getCalendarById(userConfig.selectedCalendarId);
    if (!calendar) {
      return {
        success: false,
        error: 'Calendar not found',
        errorType: 'system'
      };
    }

    // Delete calendar event series
    var eventDeleted = false;
    try {
      var eventSeries = calendar.getEventSeriesById(eventId);
      if (eventSeries) {
        eventSeries.deleteEventSeries();
        eventDeleted = true;
        log('Calendar event deleted', { eventId: eventId, personName: personName });
      } else {
        warn('Calendar event not found', { eventId: eventId });
      }
    } catch (calError) {
      warn('Failed to delete calendar event', { eventId: eventId, error: calError.message });
      // Continue to clear the calendarEventId even if calendar deletion fails
    }

    // Clear calendarEventId from person record
    peopleSheet.getRange(personRowIndex, 3).setValue(''); // Column 3 is calendarEventId (1-indexed)

    log('deleteMeeting completed', { personId: personId, eventDeleted: eventDeleted });
    return {
      success: true,
      personId: personId,
      eventDeleted: eventDeleted,
      message: 'Meeting deleted for ' + personName
    };
  } catch (e) {
    error('deleteMeeting failed', e);
    return {
      success: false,
      error: e.message || 'Failed to delete meeting',
      errorType: 'system'
    };
  }
}

/**
 * Regenerate all one-to-one meetings
 * Deletes all existing meetings and creates new ones based on current configuration
 * Used when configuration changes significantly (e.g., new people added, slots changed)
 * @returns {Object} {success: boolean, deletedCount: number, createdCount: number, metadata: Object}
 */
function regenerateAllMeetings() {
  try {
    log('regenerateAllMeetings started');

    // Get all people
    var peopleResponse = listPeople();
    if (!peopleResponse.success) {
      return {
        success: false,
        error: 'Failed to load people',
        errorType: 'system'
      };
    }

    var people = peopleResponse.people;

    // Get calendar
    var userConfig = getConfig();
    if (!userConfig.selectedCalendarId) {
      return {
        success: false,
        error: 'No calendar selected',
        errorType: 'validation'
      };
    }

    var calendar = CalendarApp.getCalendarById(userConfig.selectedCalendarId);
    if (!calendar) {
      return {
        success: false,
        error: 'Calendar not found',
        errorType: 'system'
      };
    }

    // Step 1: Delete all existing meetings
    var deletedCount = 0;
    var deleteFailures = 0;

    for (var i = 0; i < people.length; i++) {
      var person = people[i];
      if (person.calendarEventId && person.calendarEventId.trim().length > 0) {
        try {
          var eventSeries = calendar.getEventSeriesById(person.calendarEventId);
          if (eventSeries) {
            eventSeries.deleteEventSeries();
            deletedCount++;
            log('Deleted meeting for regeneration', { personId: person.personId, personName: person.name });
          }
        } catch (delError) {
          warn('Failed to delete meeting during regeneration', { personId: person.personId, error: delError.message });
          deleteFailures++;
        }

        // Clear calendarEventId from person record
        var spreadsheet = getOrCreateConfigSheet();
        var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');
        var allData = batchRead(peopleSheet);

        for (var j = 1; j < allData.length; j++) {
          if (allData[j][0] === person.personId) {
            var rowIndex = j + 1;
            peopleSheet.getRange(rowIndex, 3).setValue(''); // Clear calendarEventId (column 3, 1-indexed)
            break;
          }
        }
      }
    }

    log('Deletion phase complete', { deletedCount: deletedCount, deleteFailures: deleteFailures });

    // Step 2: Create new meetings using createAllMeetings logic
    var configResponse = getOneToOneConfig();
    if (!configResponse.success) {
      return {
        success: false,
        error: 'Failed to load configuration after deletion',
        errorType: 'system',
        deletedCount: deletedCount
      };
    }

    var config = configResponse.config;

    // Get time slots
    var slotsResponse = listMeetingSlots();
    if (!slotsResponse.success || slotsResponse.count === 0) {
      return {
        success: false,
        error: 'Cannot create meetings: no time slots configured',
        errorType: 'validation',
        deletedCount: deletedCount
      };
    }

    var slots = slotsResponse.slots;

    // Expand slots into periods
    var periods = expandSlotsIntoPeriods(slots, config.meetingDurationMinutes);
    var slotsPerWeek = periods.length;

    if (slotsPerWeek === 0) {
      return {
        success: false,
        error: 'Meeting duration exceeds all available time slots',
        errorType: 'validation',
        deletedCount: deletedCount
      };
    }

    // Calculate recurrence interval
    var recurrenceWeeks = calculateRecurrenceInterval(
      people.length,
      slotsPerWeek,
      config.minRecurrenceIntervalWeeks
    );

    // Assign people to periods
    var assignments = assignPeopleToPeriods(people, periods, recurrenceWeeks);

    // Execute scheduling
    var results = executeScheduling(
      calendar,
      assignments,
      config.meetingDurationMinutes
    );

    // Update people sheet with new calendar event IDs
    var spreadsheet = getOrCreateConfigSheet();
    var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');

    for (var i = 0; i < results.length; i++) {
      var result = results[i];
      if (result.success && result.eventId) {
        var allData = batchRead(peopleSheet);
        for (var j = 1; j < allData.length; j++) {
          if (allData[j][0] === result.personId) {
            var rowIndex = j + 1;
            peopleSheet.getRange(rowIndex, 3).setValue(result.eventId); // Column 3 is calendarEventId (1-indexed)
            break;
          }
        }
      }
    }

    // Calculate success/failure counts
    var createdCount = 0;
    var createFailures = 0;

    for (var i = 0; i < results.length; i++) {
      if (results[i].success) {
        createdCount++;
      } else {
        createFailures++;
      }
    }

    var metadata = {
      totalPeople: people.length,
      deletedCount: deletedCount,
      deleteFailures: deleteFailures,
      createdCount: createdCount,
      createFailures: createFailures,
      recurrenceWeeks: recurrenceWeeks,
      slotsPerWeek: slotsPerWeek
    };

    var message = 'Regenerated meetings: deleted ' + deletedCount + ', created ' + createdCount +
      ' (recurrence: every ' + recurrenceWeeks + ' week' + (recurrenceWeeks === 1 ? '' : 's') + ')';

    log('regenerateAllMeetings completed', metadata);

    return {
      success: true,
      deletedCount: deletedCount,
      createdCount: createdCount,
      metadata: metadata,
      message: message
    };
  } catch (e) {
    error('regenerateAllMeetings failed', e);
    return {
      success: false,
      error: e.message || 'Failed to regenerate meetings',
      errorType: 'system'
    };
  }
}
