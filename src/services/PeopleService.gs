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

    // Check for duplicates
    var existingPeopleResponse = listPeople();
    if (existingPeopleResponse.success && existingPeopleResponse.people.length > 0) {
      for (var i = 0; i < existingPeopleResponse.people.length; i++) {
        if (existingPeopleResponse.people[i].name.toLowerCase() === name.toLowerCase()) {
           return {
            success: false,
            error: 'Person with name "' + name + '" already exists',
            errorType: 'validation'
          };
        }
      }
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
 * Add multiple people to the one-to-one group (Batch Operation)
 * @param {Array<string>} names - Array of names to add
 * @returns {Object} {success: boolean, count: number, addedPeople: Array<Object>, error: string}
 */
function addPeople(names) {
  try {
    log('addPeople started', { count: names ? names.length : 0 });

    if (!names || !Array.isArray(names) || names.length === 0) {
      return {
        success: false,
        error: 'No names provided',
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

    var addedPeople = [];
    var newRows = [];
    var errors = [];

    // Get existing people to check for duplicates
    var existingPeopleResponse = listPeople();
    var existingNames = new Set(); // Use Set for faster lookup if environment supports it, else array
    
    // Polyfill Set if needed or just use object map for safety in Apps Script ES5
    var existingNameMap = {};
    
    if (existingPeopleResponse.success && existingPeopleResponse.people) {
      for (var j = 0; j < existingPeopleResponse.people.length; j++) {
        var existingName = existingPeopleResponse.people[j].name.toLowerCase();
        existingNameMap[existingName] = true;
      }
    }

    // Process each name
    for (var i = 0; i < names.length; i++) {
      var name = names[i] ? names[i].toString().trim() : '';
      
      if (!name) continue; // Skip empty names
      
      // Basic validation (length check)
      if (name.length > 100) {
        errors.push('Skipped "' + name + '": Name too long (>100 chars)');
        continue;
      }

      // Check for duplicate (case-insensitive)
      var nameLower = name.toLowerCase();
      if (existingNameMap[nameLower]) {
        errors.push('Skipped "' + name + '": Name already exists');
        continue;
      }
      
      // Add to map to prevent duplicates within the same batch
      existingNameMap[nameLower] = true;

      // Create person object
      var person = createPerson(null, name);
      addedPeople.push(person);
      
      // Convert to row
      newRows.push(personToRow(person));
    }

    if (newRows.length === 0) {
      return {
        success: false,
        error: 'No valid names to add',
        errorType: 'validation'
      };
    }

    // Batch write to sheet
    // We can use the batchWrite helper if it supports append, or just standard range setValues
    // standard setValues is safest for append if we calculate last row
    
    var lastRow = peopleSheet.getLastRow();
    peopleSheet.getRange(lastRow + 1, 1, newRows.length, newRows[0].length).setValues(newRows);

    log('addPeople completed', { addedCount: newRows.length });
    
    var result = {
      success: true,
      count: newRows.length,
      addedPeople: addedPeople
    };
    
    if (errors.length > 0) {
      result.warning = 'Added ' + newRows.length + ' people. ' + errors.length + ' skipped.';
      result.errors = errors;
    }
    
    return result;

  } catch (e) {
    error('addPeople failed', e);
    return {
      success: false,
      error: e.message || 'Failed to add people',
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
      existingPerson.meetingDay,
      existingPerson.meetingTime,
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

/**
 * Clear all people from the one-to-one group
 * Deletes all people and their associated calendar events in a single batch operation
 * Preserves configuration settings (OneToOneConfig and OneToOneSlots)
 * @returns {Object} {success: boolean, deletedPeople: number, deletedEvents: number, failedEvents: number, failedPeople: Array, message: string}
 */
function clearAllPeople() {
  try {
    log('clearAllPeople started');

    // Get all people
    var peopleResponse = listPeople();
    if (!peopleResponse.success) {
      return {
        success: false,
        deletedPeople: 0,
        deletedEvents: 0,
        failedEvents: 0,
        failedPeople: [],
        error: 'Failed to load people',
        errorType: 'system'
      };
    }

    var people = peopleResponse.people;

    // Handle empty state
    if (people.length === 0) {
      log('clearAllPeople: no people to delete');
      return {
        success: true,
        deletedPeople: 0,
        deletedEvents: 0,
        failedEvents: 0,
        failedPeople: [],
        message: 'No people to delete - the group is already empty'
      };
    }

    log('clearAllPeople: deleting ' + people.length + ' people');

    // Initialize counters
    var deletedPeople = 0;
    var deletedEvents = 0;
    var failedEvents = 0;
    var failedPeople = [];

    // Get calendar configuration
    var config = getConfig();
    var calendar = null;
    if (config.selectedCalendarId) {
      calendar = CalendarApp.getCalendarById(config.selectedCalendarId);
    }

    // Get spreadsheet and people sheet for deletion
    var spreadsheet = getOrCreateConfigSheet();
    var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');

    if (!peopleSheet) {
      return {
        success: false,
        deletedPeople: 0,
        deletedEvents: 0,
        failedEvents: 0,
        failedPeople: [],
        error: 'OneToOnePeople sheet not found',
        errorType: 'system'
      };
    }

    // Iterate through people in reverse order (to avoid row index shifting issues)
    var allData = batchRead(peopleSheet);
    for (var i = allData.length - 1; i >= 1; i--) {
      var person = rowToPerson(allData[i]);

      // Attempt calendar event deletion if exists
      if (person.calendarEventId && person.calendarEventId.trim().length > 0 && calendar) {
        try {
          var eventSeries = calendar.getEventSeriesById(person.calendarEventId);
          if (eventSeries) {
            eventSeries.deleteEventSeries();
            deletedEvents++;
            log('Deleted calendar event for person', { personId: person.personId, personName: person.name });
          }
        } catch (calError) {
          failedEvents++;
          failedPeople.push({
            personId: person.personId,
            personName: person.name,
            calendarEventId: person.calendarEventId,
            error: calError.message
          });
          warn('Failed to delete calendar event during clear all', { personId: person.personId, error: calError.message });
        }
      }

      // Delete person row from sheet (i+1 because sheet rows are 1-indexed)
      var rowIndex = i + 1;
      peopleSheet.deleteRow(rowIndex);
      deletedPeople++;
    }

    // Construct success message
    var message;
    if (failedEvents === 0) {
      message = 'Cleared all people and meetings: deleted ' + deletedPeople + ' people and ' +
                deletedEvents + ' recurring meetings';
    } else {
      message = 'Cleared all people: deleted ' + deletedPeople + ' people, ' +
                deletedEvents + ' meetings deleted successfully, ' +
                failedEvents + ' meeting deletions failed';
    }

    log('clearAllPeople completed', {
      deletedPeople: deletedPeople,
      deletedEvents: deletedEvents,
      failedEvents: failedEvents
    });

    return {
      success: true,
      deletedPeople: deletedPeople,
      deletedEvents: deletedEvents,
      failedEvents: failedEvents,
      failedPeople: failedPeople,
      message: message
    };

  } catch (e) {
    error('clearAllPeople failed', e);
    return {
      success: false,
      deletedPeople: 0,
      deletedEvents: 0,
      failedEvents: 0,
      failedPeople: [],
      error: e.message || 'Failed to clear all people',
      errorType: 'system'
    };
  }
}
