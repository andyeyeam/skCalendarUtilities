/**
 * Date and Time Utility Functions
 * Provides date/time operations for availability calculation
 */

/**
 * Check if a date is a working day (Monday-Friday)
 * @param {Date} date - Date to check
 * @returns {Boolean} true if Monday-Friday, false if Saturday-Sunday
 */
function isWorkingDay(date) {
  var day = date.getDay(); // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6;
}

/**
 * Count working days in a date range
 * @param {Date} startDate - Start of range (inclusive)
 * @param {Date} endDate - End of range (inclusive)
 * @returns {Number} Count of working days
 */
function countWorkingDays(startDate, endDate) {
  var count = 0;
  var current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  var end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    if (isWorkingDay(current)) {
      count++;
    }
    current.setDate(current.getDate() + 1);
  }

  return count;
}

/**
 * Get array of dates between start and end (inclusive)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {Array<Date>} Array of dates
 */
function getDaysBetween(startDate, endDate) {
  var days = [];
  var current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  var end = new Date(endDate);
  end.setHours(0, 0, 0, 0);

  while (current <= end) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Format time as 12-hour format with AM/PM
 * @param {Date} date - Date/time to format
 * @returns {String} Formatted time (e.g., "9:00 AM", "2:30 PM")
 */
function formatTime12Hour(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // Convert 0 to 12

  var minutesStr = minutes < 10 ? '0' + minutes : minutes.toString();

  return hours + ':' + minutesStr + ' ' + ampm;
}

/**
 * Format duration in minutes as human-readable string
 * @param {Number} minutes - Duration in minutes
 * @returns {String} Formatted duration (e.g., "1 hour", "2 hours 30 minutes")
 */
function formatDuration(minutes) {
  if (minutes < 60) {
    return minutes + ' minute' + (minutes === 1 ? '' : 's');
  }

  var hours = Math.floor(minutes / 60);
  var remainingMinutes = minutes % 60;

  var result = hours + ' hour' + (hours === 1 ? '' : 's');

  if (remainingMinutes > 0) {
    result += ' ' + remainingMinutes + ' minute' + (remainingMinutes === 1 ? '' : 's');
  }

  return result;
}

/**
 * Round a Date to the nearest 15-minute boundary
 * @param {Date} date - Date/time to round
 * @returns {Date} Rounded date (new Date object)
 */
function roundToQuarterHour(date) {
  var rounded = new Date(date);
  var minutes = rounded.getMinutes();

  // Round to nearest 15-minute boundary
  var roundedMinutes = Math.round(minutes / 15) * 15;

  if (roundedMinutes === 60) {
    rounded.setHours(rounded.getHours() + 1);
    rounded.setMinutes(0);
  } else {
    rounded.setMinutes(roundedMinutes);
  }

  rounded.setSeconds(0);
  rounded.setMilliseconds(0);

  return rounded;
}

/**
 * Clip a time range to working hours (09:00-17:30)
 * @param {Date} startTime - Original start time
 * @param {Date} endTime - Original end time
 * @param {Date} date - The calendar date
 * @returns {Object} { start: Date, end: Date } clipped to 09:00-17:30
 */
function clipToWorkingHours(startTime, endTime, date) {
  // Create working hours boundaries for this date
  var workStart = new Date(date);
  workStart.setHours(9, 0, 0, 0);

  var workEnd = new Date(date);
  workEnd.setHours(17, 30, 0, 0);

  // Clip start time
  var clippedStart = new Date(startTime);
  if (clippedStart < workStart) {
    clippedStart = new Date(workStart);
  }

  // Clip end time
  var clippedEnd = new Date(endTime);
  if (clippedEnd > workEnd) {
    clippedEnd = new Date(workEnd);
  }

  return {
    start: clippedStart,
    end: clippedEnd
  };
}
