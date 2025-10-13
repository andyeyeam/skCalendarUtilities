/**
 * CalendarEvent Model
 * Represents a scheduled calendar event with formatted display fields
 */

/**
 * Create a CalendarEvent object from a raw Google Calendar event
 * @param {GoogleCalendarEvent} rawEvent - Event from CalendarApp.getEvents()
 * @returns {Object} CalendarEvent object with formatted fields
 */
function createCalendarEvent(rawEvent) {
  var startTime = rawEvent.getStartTime();
  var endTime = rawEvent.getEndTime();
  var isAllDay = rawEvent.isAllDayEvent();
  var title = rawEvent.getTitle() || 'Untitled Event';

  // Get date in YYYY-MM-DD format (same as TimeSlot)
  var date = Utilities.formatDate(startTime, Session.getScriptTimeZone(), 'yyyy-MM-dd');

  // Format times
  var formattedStart = isAllDay ? 'All Day' : formatTime12Hour(startTime);
  var formattedEnd = isAllDay ? 'All Day' : formatTime12Hour(endTime);

  // Calculate duration
  var durationMinutes = isAllDay ? 0 : Math.round((endTime - startTime) / (1000 * 60));
  var formattedDuration = isAllDay ? 'All Day' : durationMinutes + ' min';

  // Truncate title if too long (max 40 characters)
  var displayTitle = title.length > 40 ? title.substring(0, 37) + '...' : title;

  // Check if event spans multiple days (for non-all-day events)
  if (!isAllDay) {
    var startDate = new Date(startTime);
    var endDate = new Date(endTime);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);
    if (endDate > startDate) {
      displayTitle = displayTitle + ' (multi-day)';
    }
  }

  return {
    title: title,
    startTime: startTime,
    endTime: endTime,
    isAllDay: isAllDay,
    date: date,
    formattedStart: formattedStart,
    formattedEnd: formattedEnd,
    formattedDuration: formattedDuration,
    displayTitle: displayTitle
  };
}
