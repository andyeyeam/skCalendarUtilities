/**
 * TimeSlot Model
 * Represents a continuous block of free time in the calendar
 */

/**
 * Create a TimeSlot object
 * @param {Date} date - The calendar date for this slot (time set to midnight)
 * @param {Date} startTime - Start of the free time slot (with full date-time)
 * @param {Date} endTime - End of the free time slot (with full date-time)
 * @returns {Object} TimeSlot object with formatted fields
 */
function createTimeSlot(date, startTime, endTime) {
  // Calculate duration in minutes
  var durationMinutes = Math.floor((endTime - startTime) / (1000 * 60));

  // Format date as YYYY-MM-DD for grouping
  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  var dateStr = year + '-' + month + '-' + day;

  // Create TimeSlot object
  var slot = {
    date: dateStr,  // ISO date string for grouping (YYYY-MM-DD)
    dateObj: date,  // Keep original Date object for reference
    startTime: startTime,
    endTime: endTime,
    durationMinutes: durationMinutes,
    formattedStart: formatTime12Hour(startTime),
    formattedEnd: formatTime12Hour(endTime),
    formattedDuration: formatDuration(durationMinutes)
  };

  return slot;
}

/**
 * Validate a TimeSlot object
 * @param {Object} slot - TimeSlot object to validate
 * @returns {Boolean} true if valid, false otherwise
 */
function validateTimeSlot(slot) {
  // Check required fields exist
  if (!slot || !slot.date || !slot.startTime || !slot.endTime) {
    return false;
  }

  // Check startTime < endTime
  if (slot.startTime >= slot.endTime) {
    return false;
  }

  // Check duration ≥ 15 minutes (FR-018)
  if (slot.durationMinutes < 15) {
    return false;
  }

  // Check date is working day (Mon-Fri)
  // Use dateObj if available, otherwise parse date string
  var dateToCheck = slot.dateObj || new Date(slot.date);
  if (!isWorkingDay(dateToCheck)) {
    return false;
  }

  // Check times are within working hours (09:00-17:30)
  var startHour = slot.startTime.getHours();
  var startMinute = slot.startTime.getMinutes();
  var endHour = slot.endTime.getHours();
  var endMinute = slot.endTime.getMinutes();

  // Start time must be >= 09:00
  if (startHour < 9) {
    return false;
  }

  // End time must be <= 17:30
  if (endHour > 17 || (endHour === 17 && endMinute > 30)) {
    return false;
  }

  return true;
}
