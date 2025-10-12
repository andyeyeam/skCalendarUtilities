# Quickstart Guide: Availability Finder Implementation

**Feature**: 002-i-want-to (Availability Finder)
**Branch**: 002-i-want-to
**Date**: 2025-01-11

## Overview

This guide provides implementation instructions for the Availability Finder feature. Follow these steps in order to build the feature incrementally with working checkpoints.

---

## Prerequisites

- Feature 001 (Calendar Utilities - Menu MVP) must be deployed and working
- Access to Google Apps Script editor
- Selected calendar configured in application
- Review completed:
  - [spec.md](./spec.md) - Feature requirements
  - [research.md](./research.md) - Technical decisions
  - [data-model.md](./data-model.md) - Data structures
  - [contracts/](./contracts/) - API specifications

---

## Implementation Phases

### Phase 0: Setup & Utilities (Foundation)

**Goal**: Create reusable utilities for date/time operations.

#### Step 0.1: Create DateUtils.gs

**File**: `src/utils/DateUtils.gs`

**Functions to implement** (in order):
1. `isWorkingDay(date)` - Check if date is Monday-Friday
2. `countWorkingDays(startDate, endDate)` - Count working days in range
3. `getDaysBetween(startDate, endDate)` - Get array of dates in range
4. `formatTime12Hour(date)` - Format time as "9:00 AM"
5. `formatDuration(minutes)` - Format duration as "1 hour 30 minutes"
6. `roundToQuarterHour(date)` - Round to nearest 15-minute boundary
7. `clipToWorkingHours(startTime, endTime, date)` - Clip times to 09:00-17:30

**Test checkpoint**:
```javascript
// In Apps Script editor, run these tests manually:
function testDateUtils() {
  Logger.log('Is Monday working day? ' + isWorkingDay(new Date(2025, 0, 13))); // true (Mon)
  Logger.log('Is Saturday working day? ' + isWorkingDay(new Date(2025, 0, 18))); // false (Sat)
  Logger.log('Working days Jan 15-21: ' + countWorkingDays(new Date(2025, 0, 15), new Date(2025, 0, 21))); // 5
  Logger.log('Format 9:30 AM: ' + formatTime12Hour(new Date(2025, 0, 15, 9, 30, 0))); // "9:30 AM"
  Logger.log('Format 90 min: ' + formatDuration(90)); // "1 hour 30 minutes"
}
```

Expected output: All assertions should be true/match expected values.

**Reference**: [contracts/service-layer.md](./contracts/service-layer.md#dateutilsgs)

---

### Phase 1: Data Models

**Goal**: Define data structures for time slots and requests.

#### Step 1.1: Create TimeSlot.gs

**File**: `src/models/TimeSlot.gs`

**Functions to implement**:
1. `createTimeSlot(date, startTime, endTime)` - Factory function
   - Calculates `durationMinutes`
   - Populates formatted fields using DateUtils
   - Returns TimeSlot object
2. `validateTimeSlot(slot)` - Validation function
   - Check duration ≥ 15 minutes
   - Check startTime < endTime
   - Check times within working hours
   - Check date is working day

**Test checkpoint**:
```javascript
function testTimeSlot() {
  var slot = createTimeSlot(
    new Date(2025, 0, 15),
    new Date(2025, 0, 15, 9, 0, 0),
    new Date(2025, 0, 15, 10, 30, 0)
  );
  Logger.log('Slot: ' + JSON.stringify(slot, null, 2));
  Logger.log('Valid? ' + validateTimeSlot(slot)); // true
  Logger.log('Duration: ' + slot.durationMinutes); // 90
  Logger.log('Formatted: ' + slot.formattedStart + ' - ' + slot.formattedEnd); // "9:00 AM - 10:30 AM"
}
```

**Reference**: [data-model.md](./data-model.md#1-timeslot)

---

### Phase 2: Calendar Service Layer

**Goal**: Abstract Calendar API operations.

#### Step 2.1: Create CalendarService.gs

**File**: `src/services/CalendarService.gs`

**Functions to implement**:
1. `getCalendarEvents(calendarId, startDate, endDate)`
   - Retrieve events using `CalendarApp.getCalendarById(calendarId).getEvents(startDate, endDate)`
   - Convert to CalendarEvent objects using `createEventFromGCal()`
   - Handle errors (calendar not found, access denied)
   - Log event count
2. `getCalendarById(calendarId)`
   - Retrieve calendar metadata
   - Return `{ id, name, isPrimary, color }`

**Test checkpoint**:
```javascript
function testCalendarService() {
  var config = getConfig();
  var calendarId = config.selectedCalendarId;

  var startDate = new Date(2025, 0, 15);
  var endDate = new Date(2025, 0, 17);

  var events = getCalendarEvents(calendarId, startDate, endDate);
  Logger.log('Retrieved ' + events.length + ' events');

  var calendar = getCalendarById(calendarId);
  Logger.log('Calendar: ' + JSON.stringify(calendar, null, 2));
}
```

**Reference**: [contracts/service-layer.md](./contracts/service-layer.md#calendarservicegs)

---

### Phase 3: Availability Calculation (Core Algorithm)

**Goal**: Implement time slot calculation logic.

#### Step 3.1: Create AvailabilityService.gs - Part 1 (Constants & Intervals)

**File**: `src/services/AvailabilityService.gs`

**Define constants**:
```javascript
var WORKING_HOURS = {
  START_HOUR: 9,
  START_MINUTE: 0,
  END_HOUR: 17,
  END_MINUTE: 30,
  TOTAL_MINUTES: 510,
  INTERVAL_MINUTES: 15,
  INTERVALS_PER_DAY: 34
};

var ERROR_MESSAGES = {
  INVALID_DATE_RANGE: 'Start date must be before or equal to end date',
  RANGE_TOO_LONG: 'Date range must be 7 days or less',
  NO_WORKING_DAYS: 'No working days in selected range',
  NO_CALENDAR_SELECTED: 'Please select a calendar first',
  CALENDAR_ACCESS_DENIED: 'Unable to access calendar',
  INVALID_MIN_DURATION: 'Minimum duration must be at least 15 minutes'
};
```

**Function 1**: `generateWorkingDayIntervals(date)`
- Create 34 intervals from 09:00 to 17:30 (15-minute increments)
- Each interval: `{ startTime: Date, endTime: Date, isBusy: false }`

**Test checkpoint**:
```javascript
function testGenerateIntervals() {
  var intervals = generateWorkingDayIntervals(new Date(2025, 0, 15));
  Logger.log('Generated ' + intervals.length + ' intervals'); // 34
  Logger.log('First interval: ' + formatTime12Hour(intervals[0].startTime)); // "9:00 AM"
  Logger.log('Last interval: ' + formatTime12Hour(intervals[33].startTime)); // "5:15 PM"
}
```

#### Step 3.2: AvailabilityService.gs - Part 2 (Mark Busy)

**Function 2**: `markIntervalsAsBusy(intervals, events)`
- For each event:
  - If all-day: mark all intervals busy
  - Otherwise: clip to working hours, mark overlapping intervals busy
- Modify `intervals` array in place

**Test checkpoint**:
```javascript
function testMarkIntervalsAsBusy() {
  var intervals = generateWorkingDayIntervals(new Date(2025, 0, 15));

  // Create fake event 10:00-11:00
  var events = [{
    isAllDay: false,
    startTime: new Date(2025, 0, 15, 10, 0, 0),
    endTime: new Date(2025, 0, 15, 11, 0, 0)
  }];

  markIntervalsAsBusy(intervals, events);

  // Check intervals 4-7 are busy (10:00-11:00 = 4 intervals)
  Logger.log('Interval at 9:45 busy? ' + intervals[3].isBusy); // false
  Logger.log('Interval at 10:00 busy? ' + intervals[4].isBusy); // true
  Logger.log('Interval at 11:00 busy? ' + intervals[8].isBusy); // false
}
```

#### Step 3.3: AvailabilityService.gs - Part 3 (Merge Slots)

**Function 3**: `intervalsToTimeSlots(intervals)`
- Iterate through intervals
- Merge consecutive free intervals into TimeSlot objects
- Filter out slots < 15 minutes
- Add formatted fields

**Test checkpoint**:
```javascript
function testIntervalsToTimeSlots() {
  var intervals = generateWorkingDayIntervals(new Date(2025, 0, 15));

  // Mark 10:00-11:00 busy
  intervals[4].isBusy = true;
  intervals[5].isBusy = true;
  intervals[6].isBusy = true;
  intervals[7].isBusy = true;

  var slots = intervalsToTimeSlots(intervals);
  Logger.log('Found ' + slots.length + ' slots'); // 2 (09:00-10:00, 11:00-17:30)
  Logger.log('First slot: ' + slots[0].formattedStart + ' - ' + slots[0].formattedEnd);
  Logger.log('Second slot: ' + slots[1].formattedStart + ' - ' + slots[1].formattedEnd);
}
```

#### Step 3.4: AvailabilityService.gs - Part 4 (Validation)

**Function 4**: `validateAvailabilityRequest(startDate, endDate, calendarId)`
- Check start ≤ end (FR-010)
- Check range ≤ 7 days (FR-016)
- Check ≥ 1 working day (FR-020)
- Check calendar ID valid
- Return `{ valid: true }` or `{ valid: false, error: "...", errorType: "validation" }`

**Test checkpoint**:
```javascript
function testValidation() {
  // Valid request
  var result1 = validateAvailabilityRequest(
    new Date(2025, 0, 15),
    new Date(2025, 0, 17),
    'user@example.com'
  );
  Logger.log('Valid? ' + result1.valid); // true

  // Invalid: > 7 days
  var result2 = validateAvailabilityRequest(
    new Date(2025, 0, 15),
    new Date(2025, 0, 23),
    'user@example.com'
  );
  Logger.log('Valid? ' + result2.valid); // false
  Logger.log('Error: ' + result2.error); // "Date range must be 7 days or less"
}
```

#### Step 3.5: AvailabilityService.gs - Part 5 (Main Function)

**Function 5**: `calculateAvailability(events, startDate, endDate, minDurationMinutes)`
- Get all days in range using `getDaysBetween()`
- Filter to working days using `isWorkingDay()`
- For each working day:
  - Generate intervals
  - Filter events to current day
  - Mark intervals busy
  - Convert to slots
- Flatten all slots into single array
- Filter by `minDurationMinutes`
- Return slots

**Test checkpoint**:
```javascript
function testCalculateAvailability() {
  var config = getConfig();
  var calendarId = config.selectedCalendarId;

  var startDate = new Date(2025, 0, 15);
  var endDate = new Date(2025, 0, 17);

  var events = getCalendarEvents(calendarId, startDate, endDate);
  var slots = calculateAvailability(events, startDate, endDate, 15);

  Logger.log('Found ' + slots.length + ' available slots');
  slots.forEach(function(slot) {
    Logger.log('Slot: ' + formatDate(slot.date) + ' ' + slot.formattedStart + ' - ' + slot.formattedEnd + ' (' + slot.formattedDuration + ')');
  });
}
```

**Reference**: [contracts/service-layer.md](./contracts/service-layer.md#availabilityservicegs)

---

### Phase 4: Server API Functions

**Goal**: Expose availability search to client.

#### Step 4.1: Update Code.gs

**File**: `src/Code.gs`

**Modify**:
1. Update `validUtilities` array:
   ```javascript
   const validUtilities = ['BulkOps', 'Analytics', 'Cleanup', 'Availability'];
   ```

**Add new function**:
```javascript
/**
 * Find available time slots in calendar
 * @param {string} startDateStr - Start date (ISO 8601 YYYY-MM-DD)
 * @param {string} endDateStr - End date (ISO 8601 YYYY-MM-DD)
 * @param {number} minDurationMinutes - Minimum slot duration (optional, default 15)
 * @returns {AvailabilityResponse} Response object with slots or error
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

    // Build response
    var response = {
      success: true,
      slots: slots,
      metadata: {
        dateRange: {
          start: startDate,
          end: endDate
        },
        workingDaysCount: countWorkingDays(startDate, endDate),
        totalSlotsFound: slots.length,
        calendarId: config.selectedCalendarId
      }
    };

    log('findAvailability completed', { slotsFound: slots.length });
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
    return { success: true, calendar: calendar };
  } catch (e) {
    error('getSelectedCalendar failed', e);
    return { success: false, error: e.message };
  }
}
```

**Test checkpoint**: Test from Apps Script editor
```javascript
function testFindAvailability() {
  var response = findAvailability('2025-01-15', '2025-01-17', 30);
  Logger.log(JSON.stringify(response, null, 2));
}
```

**Reference**: [contracts/server-functions.md](./contracts/server-functions.md)

---

### Phase 5: User Interface

**Goal**: Create availability finder UI screen.

#### Step 5.1: Update Menu.html

**File**: `src/ui/Menu.html`

**Modify**: Add fourth button after Cleanup button (around line 46):
```html
<button onclick="navigateToUtility('Availability')" id="availabilityBtn" disabled>
  <strong>Find Availability</strong>
  <div style="font-size: 0.875rem; font-weight: 400; margin-top: 0.25rem;">
    Find available time slots in your calendar for scheduling meetings
  </div>
</button>
```

**Modify**: Enable button when calendar selected (update `enableUtilityButtons` function around line 246):
```javascript
function enableUtilityButtons() {
  document.getElementById('bulkOpsBtn').disabled = false;
  document.getElementById('analyticsBtn').disabled = false;
  document.getElementById('cleanupBtn').disabled = false;
  document.getElementById('availabilityBtn').disabled = false; // ADD THIS LINE
}
```

**Modify**: Disable button when no calendar (update `disableUtilityButtons` function around line 254):
```javascript
function disableUtilityButtons() {
  document.getElementById('bulkOpsBtn').disabled = true;
  document.getElementById('analyticsBtn').disabled = true;
  document.getElementById('cleanupBtn').disabled = true;
  document.getElementById('availabilityBtn').disabled = true; // ADD THIS LINE
}
```

**Test checkpoint**: Refresh web app, verify fourth button appears and enables when calendar selected.

#### Step 5.2: Create Availability.html

**File**: `src/ui/Availability.html`

**Structure**:
1. Header with back button
2. Search form card:
   - Start date input
   - End date input
   - Minimum duration dropdown (optional)
   - "Find Availability" button
3. Loading indicator
4. Results section (initially hidden):
   - Metadata display (date range, working days count, slots found)
   - Slots grouped by date in cards
5. Error message area
6. Empty state (no slots found)

**Key JavaScript functions**:
- `initializeAvailabilityScreen()` - Load selected calendar info
- `handleFindAvailability()` - Form submission, call `findAvailability()`
- `displayResults(response)` - Render slots grouped by date
- `groupSlotsByDate(slots)` - Group slots into date buckets
- `showError(message)` - Display error card
- `showEmptyState()` - Display "No availability found" message

**Implementation template**:
```html
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Find Availability</title>
    <?!= include('ui/Styles'); ?>
  </head>
  <body>
    <div class="container">
      <!-- Back button -->
      <button class="back-button" onclick="navigateToMenu()">
        ← Back to Menu
      </button>

      <h1>Find Availability</h1>

      <!-- Calendar info -->
      <div id="calendarInfo" class="card mb-3">
        <p class="text-muted mb-0" style="font-size: 0.875rem;">
          Searching calendar: <span id="calendarName">Loading...</span>
        </p>
      </div>

      <!-- Search form -->
      <div class="card mb-3">
        <form id="searchForm" onsubmit="handleFindAvailability(event); return false;">
          <div class="form-group">
            <label for="startDate">Start Date:</label>
            <input type="date" id="startDate" required>
          </div>

          <div class="form-group">
            <label for="endDate">End Date:</label>
            <input type="date" id="endDate" required>
          </div>

          <div class="form-group">
            <label for="minDuration">Minimum Duration (optional):</label>
            <select id="minDuration">
              <option value="15">Any duration (15 min+)</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour</option>
              <option value="120">2 hours</option>
            </select>
          </div>

          <button type="submit" class="button">Find Availability</button>
        </form>
      </div>

      <!-- Loading indicator -->
      <div id="loadingIndicator" class="loading hidden">
        <div class="spinner"></div>
        <p>Searching calendar...</p>
      </div>

      <!-- Results section -->
      <div id="resultsSection" class="hidden">
        <div id="resultsMetadata" class="card mb-3"></div>
        <div id="resultsSlots"></div>
      </div>

      <!-- Empty state -->
      <div id="emptyState" class="card hidden">
        <div class="empty-state">
          <h3>No Availability Found</h3>
          <p>There are no available time slots matching your search criteria.</p>
          <p class="text-muted">Try expanding your date range or reducing the minimum duration.</p>
        </div>
      </div>

      <!-- Error message -->
      <div id="errorMessage" class="message error hidden"></div>
    </div>

    <script>
      // State
      let selectedCalendar = null;

      // Initialize on load
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeAvailabilityScreen);
      } else {
        initializeAvailabilityScreen();
      }

      function initializeAvailabilityScreen() {
        // Load selected calendar
        google.script.run
          .withSuccessHandler(function(response) {
            if (response.success) {
              selectedCalendar = response.calendar;
              document.getElementById('calendarName').textContent = response.calendar.name;
            } else {
              showError('No calendar selected. Please return to menu and select a calendar.');
            }
          })
          .withFailureHandler(function(error) {
            showError('Failed to load calendar: ' + error.message);
          })
          .getSelectedCalendar();

        // Set default dates (today to 7 days from now)
        var today = new Date();
        var nextWeek = new Date(today);
        nextWeek.setDate(nextWeek.getDate() + 7);

        document.getElementById('startDate').valueAsDate = today;
        document.getElementById('endDate').valueAsDate = nextWeek;
      }

      function handleFindAvailability(event) {
        event.preventDefault();

        var startDate = document.getElementById('startDate').value;
        var endDate = document.getElementById('endDate').value;
        var minDuration = parseInt(document.getElementById('minDuration').value);

        // Client-side validation
        if (!startDate || !endDate) {
          showError('Please select both start and end dates');
          return;
        }

        var startDateObj = new Date(startDate);
        var endDateObj = new Date(endDate);

        if (startDateObj > endDateObj) {
          showError('Start date must be before or equal to end date');
          return;
        }

        // Calculate days
        var daysDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
        if (daysDiff > 7) {
          showError('Date range must be 7 days or less');
          return;
        }

        // Hide previous results/errors
        hideAll();
        showLoading(true);

        // Call server
        google.script.run
          .withSuccessHandler(function(response) {
            showLoading(false);
            if (response.success) {
              displayResults(response);
            } else {
              showError(response.error);
            }
          })
          .withFailureHandler(function(error) {
            showLoading(false);
            showError('Server error: ' + error.message);
          })
          .findAvailability(startDate, endDate, minDuration);
      }

      function displayResults(response) {
        if (response.slots.length === 0) {
          showEmptyState();
          return;
        }

        // Show metadata
        var metadata = response.metadata;
        var metadataHtml = '<p><strong>Search Results</strong></p>' +
          '<p class="text-muted" style="font-size: 0.875rem;">' +
          'Date range: ' + formatDate(new Date(metadata.dateRange.start)) + ' - ' + formatDate(new Date(metadata.dateRange.end)) + '<br>' +
          'Working days: ' + metadata.workingDaysCount + '<br>' +
          'Available slots: ' + metadata.totalSlotsFound +
          '</p>';
        document.getElementById('resultsMetadata').innerHTML = metadataHtml;

        // Group slots by date
        var slotsByDate = groupSlotsByDate(response.slots);

        // Render slots
        var slotsHtml = '';
        for (var dateStr in slotsByDate) {
          var dateSlots = slotsByDate[dateStr];
          slotsHtml += '<div class="card mb-2">';
          slotsHtml += '<h3 style="font-size: 1.125rem; margin-bottom: 0.5rem;">' + formatDate(new Date(dateStr)) + '</h3>';
          slotsHtml += '<div>';

          dateSlots.forEach(function(slot) {
            slotsHtml += '<div style="padding: 0.5rem 0; border-bottom: 1px solid #f0f0f0;">';
            slotsHtml += '<span style="font-weight: 600;">' + slot.formattedStart + ' - ' + slot.formattedEnd + '</span>';
            slotsHtml += '<span style="color: #666; margin-left: 1rem;">(' + slot.formattedDuration + ')</span>';
            slotsHtml += '</div>';
          });

          slotsHtml += '</div>';
          slotsHtml += '</div>';
        }

        document.getElementById('resultsSlots').innerHTML = slotsHtml;
        document.getElementById('resultsSection').classList.remove('hidden');
      }

      function groupSlotsByDate(slots) {
        var grouped = {};
        slots.forEach(function(slot) {
          var dateStr = slot.date;
          if (!grouped[dateStr]) {
            grouped[dateStr] = [];
          }
          grouped[dateStr].push(slot);
        });
        return grouped;
      }

      function formatDate(date) {
        var options = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
      }

      function navigateToMenu() {
        window.top.location.reload();
      }

      function showLoading(show) {
        var indicator = document.getElementById('loadingIndicator');
        if (show) {
          indicator.classList.remove('hidden');
        } else {
          indicator.classList.add('hidden');
        }
      }

      function showError(message) {
        var errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.classList.remove('hidden');
        setTimeout(function() {
          errorDiv.classList.add('hidden');
        }, 5000);
      }

      function showEmptyState() {
        document.getElementById('emptyState').classList.remove('hidden');
      }

      function hideAll() {
        document.getElementById('resultsSection').classList.add('hidden');
        document.getElementById('emptyState').classList.add('hidden');
        document.getElementById('errorMessage').classList.add('hidden');
      }
    </script>
  </body>
</html>
```

**Test checkpoint**: Navigate to Availability screen from menu, verify:
- Calendar name displayed
- Form fields present with default dates
- Can submit form (should work if all previous phases complete)
- Results display in grouped cards
- Error handling works for invalid inputs

---

## Testing Checklist

After implementation, test all acceptance scenarios from spec.md:

### User Story 1 (P1 - MVP)
- [ ] Search with some booked events → displays available slots
- [ ] Completely free day → shows single 09:00-17:30 slot
- [ ] Meeting 10:00-11:00 → shows two slots (09:00-10:00, 11:00-17:30)
- [ ] Multi-day range → slots grouped by date

### User Story 2 (P2)
- [ ] Filter by 1-hour minimum → only slots ≥60 min shown
- [ ] Filter by 2-hour minimum with only short gaps → "No availability" message
- [ ] No filter specified → all slots shown

### Edge Cases
- [ ] Weekend-only range → "No working days in selected range" error
- [ ] Start date after end date → validation error
- [ ] Fully booked day → "No availability" message
- [ ] Event before 09:00 extending into working hours → clipped to 09:00
- [ ] Event during hours extending past 17:30 → clipped to 17:30
- [ ] All-day event → entire working day blocked
- [ ] Date range > 7 days → validation error
- [ ] Overlapping events → time correctly marked unavailable

### Cross-Device
- [ ] Test in Google Sites iframe on desktop
- [ ] Test on mobile viewport

---

## Deployment

Once all testing passes:

1. Deploy updated web app:
   ```
   Publish → Deploy as web app → Update
   ```

2. Refresh Google Sites page containing iframe

3. Verify availability finder button appears in menu

4. Run end-to-end test: Select calendar → Navigate to Availability → Search dates → View results

---

## Summary

**Implementation Order**:
1. Phase 0: DateUtils.gs (7 functions)
2. Phase 1: TimeSlot.gs (2 functions)
3. Phase 2: CalendarService.gs (2 functions)
4. Phase 3: AvailabilityService.gs (5 functions + constants)
5. Phase 4: Code.gs updates (2 new functions, 1 array update)
6. Phase 5: UI (Menu.html update + Availability.html creation)

**Total Estimated Time**: 4-6 hours for experienced Apps Script developer

**Files Created**: 5 new files (DateUtils.gs, TimeSlot.gs, CalendarService.gs, AvailabilityService.gs, Availability.html)

**Files Modified**: 2 files (Code.gs, Menu.html)

**Lines of Code**: ~800 lines total
