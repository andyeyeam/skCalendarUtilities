/**
 * Calendar Service
 * Abstraction layer for Google Calendar API operations
 */

/**
 * Retrieve calendar events within a date range
 * @param {string} calendarId - Google Calendar ID
 * @param {Date} startDate - Start of range (inclusive)
 * @param {Date} endDate - End of range (inclusive)
 * @returns {Array<CalendarEvent>} Events in the range
 */
function getCalendarEvents(calendarId, startDate, endDate) {
  try {
    // Get calendar by ID
    var calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      error('Calendar not found', { calendarId: calendarId });
      throw {
        message: 'Calendar not found',
        type: 'api'
      };
    }

    // Retrieve events from Calendar API
    var gcalEvents = calendar.getEvents(startDate, endDate);

    // Convert to CalendarEvent objects using existing model
    var events = [];
    gcalEvents.forEach(function(gcalEvent) {
      try {
        var event = createEventFromGCal(gcalEvent);
        events.push(event);
      } catch (e) {
        // Skip events that can't be converted
        warn('Failed to convert calendar event', { error: e.message });
      }
    });

    log('Retrieved calendar events', {
      calendarId: calendarId,
      count: events.length,
      dateRange: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      }
    });

    return events;
  } catch (e) {
    error('Failed to retrieve calendar events', {
      calendarId: calendarId,
      error: e.message || e.toString()
    });

    // Re-throw with appropriate error type
    if (e.type) {
      throw e;
    }
    throw {
      message: 'Unable to access calendar',
      type: 'api'
    };
  }
}

/**
 * Retrieve calendar metadata by ID
 * @param {string} calendarId - Google Calendar ID
 * @returns {Object} Calendar info { id, name, isPrimary, color } or null if not found
 */
function getCalendarById(calendarId) {
  try {
    var calendar = CalendarApp.getCalendarById(calendarId);
    if (!calendar) {
      return null;
    }

    // Build calendar info object
    var calendarInfo = {
      id: calendar.getId(),
      name: calendar.getName(),
      isPrimary: calendar.getId() === CalendarApp.getDefaultCalendar().getId(),
      color: calendar.getColor()
    };

    log('Retrieved calendar metadata', { calendarId: calendarId });
    return calendarInfo;
  } catch (e) {
    error('Failed to retrieve calendar metadata', {
      calendarId: calendarId,
      error: e.message
    });
    return null;
  }
}
