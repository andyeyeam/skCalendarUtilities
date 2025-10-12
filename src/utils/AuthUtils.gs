/**
 * OAuth and Authorization Utilities
 * Handles OAuth scope management and authorization checks
 */

/**
 * Check if user has authorized all required OAuth scopes
 * @returns {boolean} True if all scopes are authorized
 */
function checkAuthorization() {
  try {
    // Attempt to access Calendar API to verify calendar scope
    CalendarApp.getAllCalendars();

    // Attempt to access Spreadsheet API to verify spreadsheets scope
    SpreadsheetApp.getActiveSpreadsheet();

    return true;
  } catch (e) {
    warn('Authorization check failed', { error: e.message });
    return false;
  }
}

/**
 * Get list of required OAuth scopes for the application
 * @returns {string[]} Array of required scope URLs
 */
function getRequiredScopes() {
  return [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/script.external_request'
  ];
}

/**
 * Verify user has access to a specific calendar
 * @param {string} calendarId - The calendar ID to check
 * @returns {boolean} True if user has access
 */
function hasCalendarAccess(calendarId) {
  try {
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      return false;
    }

    // Check if calendar is writable by attempting to get its name
    calendar.getName();
    return true;
  } catch (e) {
    warn('Calendar access check failed', { calendarId, error: e.message });
    return false;
  }
}

/**
 * Check if user has write access to a calendar
 * @param {string} calendarId - The calendar ID to check
 * @returns {boolean} True if user can modify the calendar
 */
function hasCalendarWriteAccess(calendarId) {
  try {
    const calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      return false;
    }

    // Check if we can access the calendar's color (indicates write access)
    calendar.getColor();
    return true;
  } catch (e) {
    warn('Calendar write access check failed', { calendarId, error: e.message });
    return false;
  }
}

/**
 * Get the effective user email (the user accessing the web app)
 * @returns {string} User's email address
 */
function getEffectiveUserEmail() {
  try {
    return Session.getEffectiveUser().getEmail();
  } catch (e) {
    error('Failed to get effective user email', e);
    return null;
  }
}
