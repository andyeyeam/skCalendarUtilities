/**
 * Person Model
 * Represents an individual in the one-to-one meeting group
 */

/**
 * Create a Person object
 * @param {string} personId - Unique identifier (UUID)
 * @param {string} name - Person's full name
 * @param {string} calendarEventId - Associated calendar event ID (optional)
 * @param {string} meetingDay - Scheduled meeting day (optional)
 * @param {string} meetingTime - Scheduled meeting time (optional)
 * @param {string} createdAt - ISO timestamp (optional)
 * @param {string} updatedAt - ISO timestamp (optional)
 * @returns {Object} Person object
 */
function createPerson(personId, name, calendarEventId, meetingDay, meetingTime, createdAt, updatedAt) {
  var now = new Date().toISOString();

  return {
    personId: personId || Utilities.getUuid(),
    name: name,
    calendarEventId: calendarEventId || '',
    meetingDay: meetingDay || '',
    meetingTime: meetingTime || '',
    createdAt: createdAt || now,
    updatedAt: updatedAt || now
  };
}

/**
 * Validate person data
 * @param {string} name - Person's name
 * @returns {Object} {isValid: boolean, errors: Array<string>}
 */
function validatePersonData(name) {
  var errors = [];

  if (!name || name.trim().length === 0) {
    errors.push('Name is required');
  }

  if (name && name.length > 100) {
    errors.push('Name must be 100 characters or less');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
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
    person.calendarEventId,
    person.createdAt,
    person.updatedAt,
    person.meetingDay,
    person.meetingTime
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
    row[2], // calendarEventId
    row[5], // meetingDay (New Col 6)
    row[6], // meetingTime (New Col 7)
    row[3], // createdAt
    row[4]  // updatedAt
  );
}
