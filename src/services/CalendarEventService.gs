/**
 * Calendar Event Service
 * Handles fetching and formatting calendar events for display
 */

/**
 * Fetch and format calendar events for a date range
 * @param {Calendar} calendar - Google Calendar object
 * @param {Date} startDate - Range start
 * @param {Date} endDate - Range end
 * @returns {Array<Object>} Array of formatted CalendarEvent objects
 * @throws {Error} If calendar access fails
 */
function fetchAndFormatEvents(calendar, startDate, endDate) {
  try {
    // Fetch events from Google Calendar
    var rawEvents = calendar.getEvents(startDate, endDate);

    // Format each event
    var formattedEvents = rawEvents.map(function(rawEvent) {
      return createCalendarEvent(rawEvent);
    });

    // Sort by date, then start time
    formattedEvents.sort(function(a, b) {
      var dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.startTime.getTime() - b.startTime.getTime();
    });

    return formattedEvents;

  } catch (error) {
    Logger.log('Error fetching calendar events: ' + error.message);
    throw new Error('Calendar access denied');
  }
}
