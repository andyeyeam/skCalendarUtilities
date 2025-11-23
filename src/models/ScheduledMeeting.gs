/**
 * ScheduledMeeting Model
 * Represents a created recurring calendar meeting assignment
 */

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
