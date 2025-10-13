/**
 * Calendar Utilities Application - Main Entry Point
 * Google Apps Script web app for calendar management utilities - test
 */

/**
 * Main web app entry point
 * Handles HTTP GET requests and serves the application UI
 * @param {Object} e - Event object from Apps Script
 * @returns {HtmlOutput} HTML page to display
 */
function doGet(e) {
  try {
    // Check authorization
    if (!checkAuthorization()) {
      return createAuthorizationPage();
    }

    // Initialize config sheet on first run
    getOrCreateConfigSheet();

    // Load main menu template
    const template = HtmlService.createTemplateFromFile('ui/Menu');

    // Evaluate template and configure output
    return template.evaluate()
      .setTitle('Calendar Utilities')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (e) {
    error('Error in doGet', e);
    return createErrorPage(e.message);
  }
}

/**
 * Include HTML file content (for template includes)
 * Used by templates to include shared HTML/CSS files
 * @param {string} filename - Name of file to include (without .html extension)
 * @returns {string} HTML content of the file
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (e) {
    error('Failed to include file', { filename, error: e.message });
    return `<!-- Error loading ${filename} -->`;
  }
}

/**
 * Load a utility HTML page
 * @param {string} utilityName - Name of utility (BulkOps, Analytics, Cleanup)
 * @returns {string} HTML content for the utility
 */
function loadUtility(utilityName) {
  try {
    // Validate utility name (prevent directory traversal)
    const validUtilities = ['BulkOps', 'Analytics', 'Cleanup', 'Availability'];
    if (!validUtilities.includes(utilityName)) {
      throw new Error('Invalid utility name');
    }

    // Load utility template
    const template = HtmlService.createTemplateFromFile(`ui/${utilityName}`);
    return template.evaluate().getContent();
  } catch (e) {
    error('Failed to load utility', { utilityName, error: e.message });
    return `<div class="error">Failed to load ${utilityName}: ${e.message}</div>`;
  }
}

/**
 * Load the main menu page
 * @returns {string} HTML content for the menu
 */
function loadMenu() {
  try {
    const template = HtmlService.createTemplateFromFile('ui/Menu');
    return template.evaluate().getContent();
  } catch (e) {
    error('Failed to load menu', e);
    return '<div class="error">Failed to load menu</div>';
  }
}

/**
 * Get list of available calendars for current user
 * @returns {Array<Object>} Array of calendar objects with id, name, isPrimary
 */
function getAvailableCalendars() {
  try {
    const calendars = CalendarApp.getAllCalendars();
    const result = [];

    calendars.forEach(calendar => {
      try {
        // Only include calendars with write access
        if (hasCalendarWriteAccess(calendar.getId())) {
          result.push({
            id: calendar.getId(),
            name: calendar.getName(),
            isPrimary: calendar.getId() === CalendarApp.getDefaultCalendar().getId(),
            color: calendar.getColor()
          });
        }
      } catch (e) {
        // Skip calendars we can't access
        warn('Skipping calendar due to access error', { error: e.message });
      }
    });

    // Sort: primary calendar first, then alphabetically
    result.sort((a, b) => {
      if (a.isPrimary) return -1;
      if (b.isPrimary) return 1;
      return a.name.localeCompare(b.name);
    });

    log('Retrieved available calendars', { count: result.length });
    return result;
  } catch (e) {
    error('Failed to get available calendars', e);
    return [];
  }
}

/**
 * Select a calendar for use in utilities
 * @param {string} calendarId - Calendar ID to select
 * @returns {Object} Result object with success status
 */
function selectCalendar(calendarId) {
  try {
    // Validate calendar access
    if (!hasCalendarAccess(calendarId)) {
      return {
        success: false,
        error: 'You do not have access to this calendar'
      };
    }

    // Update config
    const updated = updateConfig({ selectedCalendarId: calendarId });

    if (updated) {
      log('Selected calendar', { calendarId });
      return {
        success: true,
        calendarId: calendarId
      };
    } else {
      return {
        success: false,
        error: 'Failed to update configuration'
      };
    }
  } catch (e) {
    error('Failed to select calendar', e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Get current configuration
 * @returns {UserConfiguration} Current user configuration
 */
function getUserConfig() {
  try {
    return getConfig();
  } catch (e) {
    error('Failed to get user config', e);
    return getDefaultConfig();
  }
}

/**
 * Update user configuration
 * @param {Object} updates - Partial config object with updates
 * @returns {Object} Result object with success status
 */
function updateUserConfig(updates) {
  try {
    const success = updateConfig(updates);
    return {
      success: success,
      error: success ? null : 'Failed to update configuration'
    };
  } catch (e) {
    error('Failed to update user config', e);
    return {
      success: false,
      error: e.message
    };
  }
}

/**
 * Create authorization required page
 * @returns {HtmlOutput} Authorization prompt page
 */
function createAuthorizationPage() {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Roboto", sans-serif;
            font-size: 16px;
            line-height: 1.5;
            color: #333333;
            background-color: #FFFFFF;
            margin: 0;
            padding: 2rem;
            text-align: center;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
          }
          h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #333333;
            margin-bottom: 1rem;
          }
          p {
            margin-bottom: 1.5rem;
          }
          .button {
            background-color: #4285f4;
            color: white;
            border: none;
            border-radius: 6px;
            padding: 1rem 2rem;
            font-size: 1rem;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
          }
          .button:hover {
            background-color: #3367d6;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Authorization Required</h1>
          <p>This application needs permission to access your Google Calendar and create a configuration spreadsheet.</p>
          <p>Please click the button below to authorize access. You only need to do this once.</p>
          <a href="#" class="button" onclick="location.reload(); return false;">Authorize Access</a>
        </div>
      </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Authorization Required')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Create error page
 * @param {string} message - Error message to display
 * @returns {HtmlOutput} Error page
 */
function createErrorPage(message) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <base target="_top">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Roboto", sans-serif;
            font-size: 16px;
            line-height: 1.5;
            color: #333333;
            background-color: #FFFFFF;
            margin: 0;
            padding: 2rem;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
          }
          h1 {
            font-size: 2rem;
            font-weight: 700;
            color: #d32f2f;
            margin-bottom: 1rem;
          }
          .error-message {
            background-color: #ffebee;
            border-left: 4px solid #d32f2f;
            padding: 1rem;
            margin-bottom: 1rem;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Error</h1>
          <div class="error-message">
            ${message}
          </div>
          <p>Please try refreshing the page. If the problem persists, contact your administrator.</p>
        </div>
      </body>
    </html>
  `;

  return HtmlService.createHtmlOutput(html)
    .setTitle('Error')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Find available time slots in calendar
 * @param {string} startDateStr - Start date (ISO 8601 YYYY-MM-DD)
 * @param {string} endDateStr - End date (ISO 8601 YYYY-MM-DD)
 * @param {number} minDurationMinutes - Minimum slot duration (optional, default 15)
 * @returns {Object} AvailabilityResponse with slots or error
 */
function findAvailability(startDateStr, endDateStr, minDurationMinutes) {
  try {
    log('findAvailability started', { startDateStr, endDateStr, minDurationMinutes });

    // Parse dates
    var startDate = new Date(startDateStr);
    var endDate = new Date(endDateStr);
    minDurationMinutes = minDurationMinutes || 15;

    // Get selected calendar
    var config = getConfig();
    if (!config.selectedCalendarId) {
      return {
        success: false,
        slots: [],
        error: ERROR_MESSAGES.NO_CALENDAR_SELECTED,
        errorType: 'validation'
      };
    }

    // Validate request
    var validation = validateAvailabilityRequest(startDate, endDate, config.selectedCalendarId);
    if (!validation.valid) {
      return {
        success: false,
        slots: [],
        error: validation.error,
        errorType: validation.errorType
      };
    }

    // Get calendar events
    var events = getCalendarEvents(config.selectedCalendarId, startDate, endDate);

    // Calculate availability
    var slots = calculateAvailability(events, startDate, endDate, minDurationMinutes);

    // Serialize slots for client (convert Date objects to ISO strings)
    var serializedSlots = slots.map(function(slot) {
      return {
        date: slot.date,  // Already a string (YYYY-MM-DD)
        startTime: slot.startTime.toISOString(),
        endTime: slot.endTime.toISOString(),
        durationMinutes: slot.durationMinutes,
        formattedStart: slot.formattedStart,
        formattedEnd: slot.formattedEnd,
        formattedDuration: slot.formattedDuration
      };
    });

    // Fetch calendar events for display (NEW)
    var calendarEvents = [];
    var eventsError = null;

    try {
      var calendar = CalendarApp.getCalendarById(config.selectedCalendarId);
      calendarEvents = fetchAndFormatEvents(calendar, startDate, endDate);
    } catch (eventError) {
      // Graceful degradation: availability still works
      eventsError = 'Calendar events unavailable. Showing availability only.';
      Logger.log('Event fetch error: ' + eventError.message);
    }

    // Serialize calendar events for client (convert Date objects to ISO strings)
    var serializedEvents = calendarEvents.map(function(event) {
      return {
        title: event.title,
        startTime: event.startTime.toISOString(),
        endTime: event.endTime.toISOString(),
        isAllDay: event.isAllDay,
        date: event.date,
        formattedStart: event.formattedStart,
        formattedEnd: event.formattedEnd,
        formattedDuration: event.formattedDuration,
        displayTitle: event.displayTitle
      };
    });

    // Build enhanced response
    var response = {
      success: true,
      slots: serializedSlots,
      events: serializedEvents,
      metadata: {
        dateRange: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        workingDaysCount: countWorkingDays(startDate, endDate),
        totalSlotsFound: serializedSlots.length,
        totalEventsFound: serializedEvents.length,
        calendarId: config.selectedCalendarId
      }
    };

    // Add eventsError if present
    if (eventsError) {
      response.eventsError = eventsError;
    }

    log('findAvailability completed', { slotsFound: serializedSlots.length, eventsFound: serializedEvents.length });
    return response;
  } catch (e) {
    error('findAvailability failed', e);
    return {
      success: false,
      slots: [],
      error: e.message || 'An unexpected error occurred',
      errorType: e.type || 'system'
    };
  }
}

/**
 * Get selected calendar information
 * @returns {Object} Calendar info or error
 */
function getSelectedCalendar() {
  try {
    var config = getConfig();
    if (!config.selectedCalendarId) {
      return { success: false, error: 'No calendar selected' };
    }

    var calendar = getCalendarById(config.selectedCalendarId);
    if (!calendar) {
      return { success: false, error: 'Calendar not found' };
    }

    return { success: true, calendar: calendar };
  } catch (e) {
    error('getSelectedCalendar failed', e);
    return { success: false, error: e.message };
  }
}
