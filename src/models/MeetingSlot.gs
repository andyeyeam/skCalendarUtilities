/**
 * MeetingSlot Model
 * Represents an available time window when one-to-one meetings can be scheduled
 */

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
 * Normalize time value to HH:MM string format
 * Handles both string and Date object inputs
 * @param {string|Date} timeValue - Time value (HH:MM string or Date object)
 * @returns {string} Time in HH:MM format
 */
function normalizeTimeValue(timeValue) {
  if (!timeValue) {
    return '';
  }

  // If already in HH:MM format, return as-is
  if (typeof timeValue === 'string' && /^([01]\d|2[0-3]):([0-5]\d)$/.test(timeValue)) {
    return timeValue;
  }

  // If it's a Date object, extract hours and minutes
  if (timeValue instanceof Date) {
    var hours = timeValue.getHours();
    var minutes = timeValue.getMinutes();
    return padZero(hours) + ':' + padZero(minutes);
  }

  // If it's a string that might be a date string, try to parse it
  if (typeof timeValue === 'string') {
    var date = new Date(timeValue);
    if (!isNaN(date.getTime())) {
      var hours = date.getHours();
      var minutes = date.getMinutes();
      return padZero(hours) + ':' + padZero(minutes);
    }

    // Try to extract HH:MM from string
    var match = timeValue.match(/(\d{1,2}):(\d{2})/);
    if (match) {
      return padZero(parseInt(match[1], 10)) + ':' + match[2];
    }
  }

  // Fallback: return as string
  return String(timeValue);
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
