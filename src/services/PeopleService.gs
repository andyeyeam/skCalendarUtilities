/**
 * People Service
 * Manages CRUD operations for people in the one-to-one meeting group
 */

/**
 * Add a new person to the one-to-one group
 * @param {string} name - Person's name
 * @returns {Object} {success: boolean, person: Object, error: string}
 */
function addPerson(name) {
  try {
    log('addPerson started', { name: name });

    // Trim inputs
    name = name ? name.trim() : '';

    // Validate person data
    var validation = validatePersonData(name);
    if (!validation.isValid) {
      return {
        success: false,
        error: formatValidationErrors(validation.errors),
        errorType: 'validation'
      };
    }

    // Get spreadsheet and people sheet
    var spreadsheet = getOrCreateConfigSheet();
    var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');

    if (!peopleSheet) {
      return {
        success: false,
        error: 'OneToOnePeople sheet not found. Please run initialization.',
        errorType: 'system'
      };
    }

    // Create person object
    var person = createPerson(null, name);

    // Convert to row and append to sheet
    var row = personToRow(person);
    appendRow(peopleSheet, row);

    log('addPerson completed', { personId: person.personId });
    return {
      success: true,
      person: person
    };
  } catch (e) {
    error('addPerson failed', e);
    return {
      success: false,
      error: e.message || 'Failed to add person',
      errorType: 'system'
    };
  }
}

/**
 * Edit a person's details
 * @param {string} personId - Unique person identifier
 * @param {string} name - Updated name
 * @returns {Object} {success: boolean, person: Object, error: string}
 */
function editPerson(personId, name) {
  try {
    log('editPerson started', { personId: personId, name: name });

    // Trim inputs
    name = name ? name.trim() : '';

    // Validate person data
    var validation = validatePersonData(name);
    if (!validation.isValid) {
      return {
        success: false,
        error: formatValidationErrors(validation.errors),
        errorType: 'validation'
      };
    }

    // Get spreadsheet and people sheet
    var spreadsheet = getOrCreateConfigSheet();
    var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');

    if (!peopleSheet) {
      return {
        success: false,
        error: 'OneToOnePeople sheet not found',
        errorType: 'system'
      };
    }

    // Find the person by personId
    var allData = batchRead(peopleSheet);
    var personRowIndex = -1;
    var existingPerson = null;

    for (var i = 1; i < allData.length; i++) {
      if (allData[i][0] === personId) {
        personRowIndex = i + 1; // Convert to 1-indexed
        existingPerson = rowToPerson(allData[i]);
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

    // Update person object
    var updatedPerson = createPerson(
      personId,
      name,
      existingPerson.calendarEventId,
      existingPerson.createdAt,
      new Date().toISOString() // Update updatedAt timestamp
    );

    // Convert to row and update sheet
    var row = personToRow(updatedPerson);
    peopleSheet.getRange(personRowIndex, 1, 1, row.length).setValues([row]);

    log('editPerson completed', { personId: personId });
    return {
      success: true,
      person: updatedPerson
    };
  } catch (e) {
    error('editPerson failed', e);
    return {
      success: false,
      error: e.message || 'Failed to edit person',
      errorType: 'system'
    };
  }
}

/**
 * Delete a person from the one-to-one group
 * Removes the person from the sheet and deletes their calendar event if it exists
 * @param {string} personId - Unique person identifier
 * @returns {Object} {success: boolean, personId: string, calendarEventDeleted: boolean, error: string}
 */
function deletePerson(personId) {
  try {
    log('deletePerson started', { personId: personId });

    // Get spreadsheet and people sheet
    var spreadsheet = getOrCreateConfigSheet();
    var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');

    if (!peopleSheet) {
      return {
        success: false,
        error: 'OneToOnePeople sheet not found',
        errorType: 'system'
      };
    }

    // Find the person by personId
    var allData = batchRead(peopleSheet);
    var personRowIndex = -1;
    var person = null;

    for (var i = 1; i < allData.length; i++) {
      if (allData[i][0] === personId) {
        personRowIndex = i + 1; // Convert to 1-indexed
        person = rowToPerson(allData[i]);
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

    // Delete calendar event if it exists
    var calendarEventDeleted = false;
    var calendarEventId = person.calendarEventId;

    if (calendarEventId && calendarEventId.trim().length > 0) {
      try {
        var config = getConfig();
        if (config.selectedCalendarId) {
          var calendar = CalendarApp.getCalendarById(config.selectedCalendarId);
          if (calendar) {
            var eventSeries = calendar.getEventSeriesById(calendarEventId);
            if (eventSeries) {
              eventSeries.deleteEventSeries();
              calendarEventDeleted = true;
              log('Deleted calendar event series', { eventId: calendarEventId });
            }
          }
        }
      } catch (calError) {
        warn('Failed to delete calendar event, continuing with person deletion', calError);
      }
    }

    // Delete the row from sheet
    peopleSheet.deleteRow(personRowIndex);

    log('deletePerson completed', { personId: personId, calendarEventDeleted: calendarEventDeleted });

    var result = {
      success: true,
      personId: personId,
      calendarEventDeleted: calendarEventDeleted
    };

    if (calendarEventDeleted) {
      result.message = 'Person and recurring meeting deleted successfully';
    } else if (calendarEventId && calendarEventId.trim().length > 0) {
      result.warning = 'Person deleted but calendar event removal failed';
    } else {
      result.message = 'Person deleted successfully (no calendar event to remove)';
    }

    return result;
  } catch (e) {
    error('deletePerson failed', e);
    return {
      success: false,
      error: e.message || 'Failed to delete person',
      errorType: 'system'
    };
  }
}

/**
 * Get all people in the one-to-one group
 * @returns {Object} {success: boolean, people: Array<Object>, count: number, error: string}
 */
function listPeople() {
  try {
    log('listPeople started');

    // Get spreadsheet and people sheet
    var spreadsheet = getOrCreateConfigSheet();
    var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');

    if (!peopleSheet) {
      return {
        success: false,
        error: 'OneToOnePeople sheet not found',
        errorType: 'system'
      };
    }

    // Read all data from sheet
    var allData = batchRead(peopleSheet);

    // Skip header row and convert to person objects
    var people = [];
    for (var i = 1; i < allData.length; i++) {
      // Skip empty rows
      if (allData[i][0] && allData[i][0].toString().trim().length > 0) {
        var person = rowToPerson(allData[i]);
        people.push(person);
      }
    }

    log('listPeople completed', { count: people.length });
    return {
      success: true,
      people: people,
      count: people.length
    };
  } catch (e) {
    error('listPeople failed', e);
    return {
      success: false,
      error: e.message || 'Failed to list people',
      errorType: 'system',
      people: [],
      count: 0
    };
  }
}
