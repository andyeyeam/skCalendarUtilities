/**
 * Availability Service
 * Core business logic for calculating available time slots
 */

// Working hours configuration
var WORKING_HOURS = {
  START_HOUR: 9,
  START_MINUTE: 0,
  END_HOUR: 17,
  END_MINUTE: 30,
  TOTAL_MINUTES: 510, // 8.5 hours
  INTERVAL_MINUTES: 15,
  INTERVALS_PER_DAY: 34 // 510 / 15 = 34 intervals
};

// Error messages for validation
var ERROR_MESSAGES = {
  INVALID_DATE_RANGE: 'Start date must be before or equal to end date',
  RANGE_TOO_LONG: 'Date range must be 14 days or less',
  NO_WORKING_DAYS: 'No working days in selected range',
  NO_CALENDAR_SELECTED: 'Please select a calendar first',
  CALENDAR_ACCESS_DENIED: 'Unable to access calendar',
  INVALID_MIN_DURATION: 'Minimum duration must be at least 15 minutes'
};

/**
 * Generate 15-minute time intervals for a working day
 * @param {Date} date - The calendar date
 * @returns {Array<Object>} Array of TimeInterval objects { startTime, endTime, isBusy }
 */
function generateWorkingDayIntervals(date) {
  var intervals = [];

  // Create working hours boundaries for this date
  var workStart = new Date(date);
  workStart.setHours(WORKING_HOURS.START_HOUR, WORKING_HOURS.START_MINUTE, 0, 0);

  // Generate 34 intervals (09:00 to 17:30 in 15-minute increments)
  for (var i = 0; i < WORKING_HOURS.INTERVALS_PER_DAY; i++) {
    var intervalStart = new Date(workStart.getTime() + (i * WORKING_HOURS.INTERVAL_MINUTES * 60 * 1000));
    var intervalEnd = new Date(intervalStart.getTime() + (WORKING_HOURS.INTERVAL_MINUTES * 60 * 1000));

    intervals.push({
      startTime: intervalStart,
      endTime: intervalEnd,
      isBusy: false
    });
  }

  return intervals;
}

/**
 * Mark intervals as busy based on calendar events
 * @param {Array<Object>} intervals - Array of TimeInterval objects
 * @param {Array<Object>} events - Array of CalendarEvent objects
 * @returns {void} Modifies intervals array in place
 */
function markIntervalsAsBusy(intervals, events) {
  if (!events || events.length === 0) {
    return; // No events to process
  }

  // Get the date for these intervals (all intervals are on same day)
  var intervalDate = new Date(intervals[0].startTime);
  intervalDate.setHours(0, 0, 0, 0);

  // Process each event
  events.forEach(function(event) {
    // Clip events to working hours (FR-012)
    var clipped = clipToWorkingHours(event.startTime, event.endTime, intervalDate);
    var eventStart = clipped.start;
    var eventEnd = clipped.end;

    // Skip if event is completely outside working hours
    if (eventStart >= eventEnd) {
      return;
    }

    // Mark overlapping intervals as busy (FR-015)
    intervals.forEach(function(interval) {
      // Check if event overlaps with this interval
      // Event overlaps if: event starts before interval ends AND event ends after interval starts
      // Use <= and >= to include events that touch interval boundaries
      if (eventStart < interval.endTime && eventEnd >= interval.startTime) {
        interval.isBusy = true;
      }
    });
  });
}

/**
 * Convert marked intervals into continuous time slots
 * @param {Array<Object>} intervals - Array of marked TimeInterval objects
 * @returns {Array<Object>} Array of TimeSlot objects
 */
function intervalsToTimeSlots(intervals) {
  var slots = [];
  var currentSlotStart = null;
  var date = new Date(intervals[0].startTime);
  date.setHours(0, 0, 0, 0);

  // Iterate through intervals and merge consecutive free intervals
  for (var i = 0; i < intervals.length; i++) {
    var interval = intervals[i];

    if (!interval.isBusy) {
      // Start of a free slot
      if (currentSlotStart === null) {
        currentSlotStart = new Date(interval.startTime);
      }
    } else {
      // Busy interval - finalize current slot if exists
      if (currentSlotStart !== null) {
        var slotEnd = new Date(intervals[i - 1].endTime);
        var slot = createTimeSlot(date, currentSlotStart, slotEnd);

        // Only add slots >= 15 minutes (FR-018)
        if (slot.durationMinutes >= 15) {
          slots.push(slot);
        }

        currentSlotStart = null;
      }
    }
  }

  // Finalize last slot if day ends with free time
  if (currentSlotStart !== null) {
    var lastInterval = intervals[intervals.length - 1];
    var slotEnd = new Date(lastInterval.endTime);
    var slot = createTimeSlot(date, currentSlotStart, slotEnd);

    // Only add slots >= 15 minutes (FR-018)
    if (slot.durationMinutes >= 15) {
      slots.push(slot);
    }
  }

  return slots;
}

/**
 * Split a contiguous time slot into multiple discrete slots of specified duration
 * @param {Object} slot - TimeSlot object with contiguous availability
 * @param {Number} durationMinutes - Duration for each discrete slot
 * @returns {Array<Object>} Array of discrete TimeSlot objects
 */
function splitSlotByDuration(slot, durationMinutes) {
  var discreteSlots = [];

  // If the slot is shorter than the requested duration, return empty array
  if (slot.durationMinutes < durationMinutes) {
    return discreteSlots;
  }

  // Get the date object for the slot
  var dateObj = slot.dateObj || new Date(slot.date);

  // Calculate how many complete slots fit in the contiguous time
  var numSlots = Math.floor(slot.durationMinutes / durationMinutes);

  // Create discrete slots
  for (var i = 0; i < numSlots; i++) {
    var slotStartTime = new Date(slot.startTime.getTime() + (i * durationMinutes * 60 * 1000));
    var slotEndTime = new Date(slotStartTime.getTime() + (durationMinutes * 60 * 1000));

    var discreteSlot = createTimeSlot(dateObj, slotStartTime, slotEndTime);
    discreteSlots.push(discreteSlot);
  }

  return discreteSlots;
}

/**
 * Validate availability search request
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @param {string} calendarId - Calendar ID to search
 * @returns {Object} { valid: true } or { valid: false, error: "message", errorType: "validation" }
 */
function validateAvailabilityRequest(startDate, endDate, calendarId) {
  // Check calendar ID is provided
  if (!calendarId || calendarId.trim() === '') {
    return {
      valid: false,
      error: ERROR_MESSAGES.NO_CALENDAR_SELECTED,
      errorType: 'validation'
    };
  }

  // Check start date <= end date (FR-010)
  if (startDate > endDate) {
    return {
      valid: false,
      error: ERROR_MESSAGES.INVALID_DATE_RANGE,
      errorType: 'validation'
    };
  }

  // Check date range <= 14 days (FR-016)
  var daysDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
  if (daysDiff > 14) {
    return {
      valid: false,
      error: ERROR_MESSAGES.RANGE_TOO_LONG,
      errorType: 'validation'
    };
  }

  // Check range contains >= 1 working day (FR-020)
  var workingDays = countWorkingDays(startDate, endDate);
  if (workingDays === 0) {
    return {
      valid: false,
      error: ERROR_MESSAGES.NO_WORKING_DAYS,
      errorType: 'validation'
    };
  }

  // All validations passed
  return { valid: true };
}

/**
 * Calculate availability across a date range
 * @param {Array<Object>} events - Array of CalendarEvent objects
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @param {Number} durationMinutes - Slot duration to check (default: 15)
 * @returns {Array<Object>} Array of TimeSlot objects for available slots, sorted by date then time
 */
function calculateAvailability(events, startDate, endDate, durationMinutes) {
  durationMinutes = durationMinutes || 15;
  var availableSlots = [];

  // Get all days in range
  var days = getDaysBetween(startDate, endDate);

  // Process each working day
  days.forEach(function(day) {
    // Skip weekends (FR-004)
    if (!isWorkingDay(day)) {
      return;
    }

    // Filter events to this day
    var dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);

    var dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    var dayEvents = events.filter(function(event) {
      // Include event if it overlaps with this day AND is not an all-day event
      return event.startTime < dayEnd && event.endTime > dayStart && !event.isAllDay;
    });

    // Log events for this day (excluding all-day events)
    log('Events found for day', {
      day: day.toISOString().split('T')[0],
      eventCount: dayEvents.length,
      events: dayEvents.map(function(e) {
        return {
          title: e.title,
          start: e.startTime.toISOString(),
          end: e.endTime.toISOString(),
          isAllDay: e.isAllDay
        };
      })
    });

    // Generate discrete intervals of the requested duration
    // IMPORTANT: We need to create times in the script's timezone, not UTC
    var workStart = new Date(day);
    workStart.setHours(WORKING_HOURS.START_HOUR, WORKING_HOURS.START_MINUTE, 0, 0);

    var workEnd = new Date(day);
    workEnd.setHours(WORKING_HOURS.END_HOUR, WORKING_HOURS.END_MINUTE, 0, 0);

    log('Working hours for day', {
      day: day.toISOString().split('T')[0],
      workStart: workStart.toISOString(),
      workEnd: workEnd.toISOString(),
      timezone: Session.getScriptTimeZone()
    });

    // Calculate how many intervals fit in the working day
    var totalWorkingMinutes = WORKING_HOURS.TOTAL_MINUTES;
    var numIntervals = Math.floor(totalWorkingMinutes / durationMinutes);

    // Check each interval for availability
    for (var i = 0; i < numIntervals; i++) {
      var intervalStart = new Date(workStart.getTime() + (i * durationMinutes * 60 * 1000));
      var intervalEnd = new Date(intervalStart.getTime() + (durationMinutes * 60 * 1000));

      // Make sure we don't exceed working hours
      if (intervalEnd > workEnd) {
        break;
      }

      // Check if this interval conflicts with any events
      var hasConflict = false;
      for (var j = 0; j < dayEvents.length; j++) {
        var event = dayEvents[j];

        // Get event times
        var eventStart = event.startTime;
        var eventEnd = event.endTime;

        // Log the comparison for debugging
        log('Checking interval against event', {
          day: day.toISOString().split('T')[0],
          intervalStart: intervalStart.toISOString(),
          intervalEnd: intervalEnd.toISOString(),
          eventTitle: event.title,
          eventStart: eventStart.toISOString(),
          eventEnd: eventEnd.toISOString()
        });

        // Check if event overlaps with this interval
        // Event blocks interval if: event starts before interval ends AND event ends after (or at) interval start
        // Use >= to catch events that end exactly when interval starts (no zero-duration gaps allowed)
        if (eventStart < intervalEnd && eventEnd >= intervalStart) {
          log('Conflict detected', {
            intervalStart: intervalStart.toISOString(),
            intervalEnd: intervalEnd.toISOString(),
            eventStart: eventStart.toISOString(),
            eventEnd: eventEnd.toISOString()
          });
          hasConflict = true;
          break;
        }
      }

      // If interval is available, add it to results
      if (!hasConflict) {
        log('Interval is available', {
          day: day.toISOString().split('T')[0],
          intervalStart: intervalStart.toISOString(),
          intervalEnd: intervalEnd.toISOString()
        });
        var slot = createTimeSlot(day, intervalStart, intervalEnd);
        availableSlots.push(slot);
      }
    }
  });

  // Sort slots by date, then by time (FR-007: chronological order)
  availableSlots.sort(function(a, b) {
    // First sort by date string (YYYY-MM-DD format sorts correctly as strings)
    var dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    // Then sort by start time
    return a.startTime.getTime() - b.startTime.getTime();
  });

  return availableSlots;
}

/**
 * Calculate contiguous availability blocks across a date range
 * Returns all uninterrupted free time blocks without filtering by minimum duration
 * @param {Array<Object>} events - Array of CalendarEvent objects
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Array<Object>} Array of TimeSlot objects for contiguous availability blocks, sorted by date then time
 */
function calculateContiguousAvailability(events, startDate, endDate) {
  var availableSlots = [];

  // Get all days in range
  var days = getDaysBetween(startDate, endDate);

  // Process each working day
  days.forEach(function(day) {
    // Skip weekends (FR-004)
    if (!isWorkingDay(day)) {
      return;
    }

    // Filter events to this day
    var dayStart = new Date(day);
    dayStart.setHours(0, 0, 0, 0);

    var dayEnd = new Date(day);
    dayEnd.setHours(23, 59, 59, 999);

    var dayEvents = events.filter(function(event) {
      // Include event if it overlaps with this day AND is not an all-day event
      return event.startTime < dayEnd && event.endTime > dayStart && !event.isAllDay;
    });

    // Log events for this day (excluding all-day events)
    log('Contiguous mode: Events found for day', {
      day: day.toISOString().split('T')[0],
      eventCount: dayEvents.length
    });

    // Generate 15-minute intervals for granularity
    var intervals = generateWorkingDayIntervals(day);

    // Mark intervals as busy based on calendar events
    markIntervalsAsBusy(intervals, dayEvents);

    // Convert marked intervals to contiguous time slots (merges consecutive free intervals)
    var daySlots = intervalsToTimeSlots(intervals);

    // Add this day's slots to the overall collection
    availableSlots = availableSlots.concat(daySlots);

    log('Contiguous mode: Slots found for day', {
      day: day.toISOString().split('T')[0],
      slotCount: daySlots.length
    });
  });

  // Sort slots by date, then by time (FR-007: chronological order)
  availableSlots.sort(function(a, b) {
    // First sort by date string (YYYY-MM-DD format sorts correctly as strings)
    var dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) {
      return dateCompare;
    }
    // Then sort by start time
    return a.startTime.getTime() - b.startTime.getTime();
  });

  log('Contiguous mode: Total slots found', {
    totalSlots: availableSlots.length
  });

  return availableSlots;
}
