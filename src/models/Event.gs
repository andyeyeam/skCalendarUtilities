/**
 * Calendar Event Data Model
 * Represents a calendar event with validation methods
 */

/**
 * CalendarEvent data structure
 * @typedef {Object} CalendarEvent
 * @property {string} id - Unique event ID from Google Calendar
 * @property {string} title - Event title/summary
 * @property {Date} startTime - Event start time
 * @property {Date} endTime - Event end time
 * @property {string} color - Event color (numeric string: "1"-"11")
 * @property {string} calendarId - Calendar ID containing this event
 * @property {boolean} isAllDay - Whether event is all-day
 * @property {string} description - Event description (optional)
 */

/**
 * Create a CalendarEvent object from Google Calendar API event
 * @param {CalendarEvent} gcalEvent - Event object from CalendarApp
 * @param {string} calendarId - Calendar ID containing the event
 * @returns {CalendarEvent} Normalized event object
 */
function createEventFromGCal(gcalEvent, calendarId) {
  return {
    id: gcalEvent.getId(),
    title: gcalEvent.getTitle(),
    startTime: gcalEvent.getStartTime(),
    endTime: gcalEvent.getEndTime(),
    color: String(gcalEvent.getColor()),
    calendarId: calendarId,
    isAllDay: gcalEvent.isAllDayEvent(),
    description: gcalEvent.getDescription() || ''
  };
}

/**
 * Validate event object structure
 * @param {Object} event - Event object to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
function validateEvent(event) {
  const errors = [];

  // Validate required fields
  if (!event.id || typeof event.id !== 'string') {
    errors.push('id is required and must be a string');
  }

  if (!event.title || typeof event.title !== 'string') {
    errors.push('title is required and must be a string');
  }

  if (!(event.startTime instanceof Date) || isNaN(event.startTime.getTime())) {
    errors.push('startTime must be a valid Date object');
  }

  if (!(event.endTime instanceof Date) || isNaN(event.endTime.getTime())) {
    errors.push('endTime must be a valid Date object');
  }

  // Validate startTime < endTime
  if (event.startTime instanceof Date && event.endTime instanceof Date) {
    if (event.startTime >= event.endTime) {
      errors.push('startTime must be before endTime');
    }
  }

  // Validate color (optional, but must be valid if present)
  if (event.color !== undefined && event.color !== null) {
    const colorNum = parseInt(event.color);
    if (isNaN(colorNum) || colorNum < 1 || colorNum > 11) {
      errors.push('color must be a number between 1 and 11');
    }
  }

  // Validate calendarId
  if (!event.calendarId || typeof event.calendarId !== 'string') {
    errors.push('calendarId is required and must be a string');
  }

  // Validate isAllDay
  if (typeof event.isAllDay !== 'boolean') {
    errors.push('isAllDay must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Check if event matches search criteria
 * @param {CalendarEvent} event - Event to check
 * @param {Object} criteria - Search criteria object
 * @param {string} criteria.keyword - Optional keyword to search in title
 * @param {string} criteria.color - Optional color to match
 * @param {Date} criteria.startDate - Optional start date range
 * @param {Date} criteria.endDate - Optional end date range
 * @returns {boolean} True if event matches criteria
 */
function eventMatchesCriteria(event, criteria) {
  // Keyword search (case-insensitive)
  if (criteria.keyword) {
    const keyword = criteria.keyword.toLowerCase();
    if (!event.title.toLowerCase().includes(keyword)) {
      return false;
    }
  }

  // Color match
  if (criteria.color) {
    if (event.color !== String(criteria.color)) {
      return false;
    }
  }

  // Date range match
  if (criteria.startDate && event.startTime < criteria.startDate) {
    return false;
  }

  if (criteria.endDate && event.startTime > criteria.endDate) {
    return false;
  }

  return true;
}

/**
 * Calculate event duration in hours
 * @param {CalendarEvent} event - Event object
 * @returns {number} Duration in hours
 */
function getEventDurationHours(event) {
  const durationMs = event.endTime.getTime() - event.startTime.getTime();
  return durationMs / (1000 * 60 * 60); // Convert ms to hours
}

/**
 * Generate composite key for duplicate detection
 * @param {CalendarEvent} event - Event object
 * @returns {string} Composite key "title|startTime"
 */
function getEventCompositeKey(event) {
  const startTimeStr = event.startTime.toISOString();
  return `${event.title}|${startTimeStr}`;
}

/**
 * Format event for display
 * @param {CalendarEvent} event - Event object
 * @returns {string} Formatted event string
 */
function formatEventForDisplay(event) {
  const startStr = Utilities.formatDate(event.startTime, Session.getScriptTimeZone(), 'MMM dd, yyyy HH:mm');
  const endStr = Utilities.formatDate(event.endTime, Session.getScriptTimeZone(), 'HH:mm');
  return `${event.title} (${startStr} - ${endStr})`;
}
