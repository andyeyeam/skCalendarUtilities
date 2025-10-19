# Implementation Quickstart: Contiguous Availability Blocks

**Feature**: 005-add-a-new
**Date**: 2025-01-19
**Estimated Implementation Time**: 3-4 hours

## Overview

This guide provides step-by-step instructions for implementing the contiguous availability blocks feature. The implementation extends the existing Find Availability feature with mode selection, requiring changes to 2 files (AvailabilityService.gs and Availability.html) and minimal modifications to Code.gs.

**Prerequisites**:
- Existing availability finder (feature 004) is implemented and working
- Access to Google Apps Script editor
- clasp CLI configured for deployment (optional)

---

## Implementation Sequence

Implementation follows this dependency order:

1. **Server-Side Logic** (AvailabilityService.gs) - Add contiguous calculation function
2. **Server Handler** (Code.gs) - Update findAvailability() to accept mode parameter
3. **Client-Side UI** (Availability.html) - Add mode selection and update display
4. **Testing** - Manual testing of both modes
5. **Deployment** - Deploy to Google Apps Script

---

## Step 1: Server-Side Logic (AvailabilityService.gs)

**File**: `src/services/AvailabilityService.gs`
**Estimated Time**: 45 minutes

### 1.1 Add Contiguous Availability Function

Add the following function at the end of AvailabilityService.gs (after `calculateAvailability`):

```javascript
/**
 * Calculate contiguous availability blocks (unfiltered by duration)
 * @param {Array<Object>} events - Array of CalendarEvent objects
 * @param {Date} startDate - Start of date range
 * @param {Date} endDate - End of date range
 * @returns {Array<Object>} Array of TimeSlot objects for contiguous availability blocks
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
      // Include event if it overlaps with this day
      return event.startTime < dayEnd && event.endTime > dayStart;
    });

    // Log events for this day
    log('Contiguous mode: Events found for day', {
      day: day.toISOString().split('T')[0],
      eventCount: dayEvents.length
    });

    // Check if this day has any all-day events (blocks entire working day)
    var hasAllDayEvent = dayEvents.some(function(event) {
      return event.isAllDay;
    });

    if (hasAllDayEvent) {
      // Entire working day is blocked, skip this day
      log('Contiguous mode: Day has all-day event, skipping', {
        day: day.toISOString().split('T')[0]
      });
      return;
    }

    // Generate 15-minute intervals for granularity (reuse existing function)
    var intervals = generateWorkingDayIntervals(day);

    // Mark intervals as busy based on events (reuse existing function)
    markIntervalsAsBusy(intervals, dayEvents);

    // Convert marked intervals into contiguous time slots (reuse existing function)
    // This function already merges consecutive free intervals
    var daySlots = intervalsToTimeSlots(intervals);

    // Add all slots to results (no duration filtering in contiguous mode)
    availableSlots = availableSlots.concat(daySlots);
  });

  // Sort slots by date, then by time (same as duration mode)
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
```

**Implementation Notes**:
- Reuses existing helper functions: `generateWorkingDayIntervals()`, `markIntervalsAsBusy()`, `intervalsToTimeSlots()`
- No duration filtering applied (all blocks ≥15 min shown)
- Same validation and edge case handling as duration mode

**Testing Checkpoint**: Verify function is added without syntax errors (check Apps Script editor for red underlines)

---

## Step 2: Server Handler (Code.gs)

**File**: `src/Code.gs`
**Estimated Time**: 20 minutes

### 2.1 Update findAvailability Handler

Locate the `findAvailability` function in Code.gs and update it to accept and process the `searchMode` parameter:

**FIND THIS CODE** (approximate location based on existing pattern):
```javascript
function findAvailability(startDateTime, endDateTime, minDuration) {
  // ... validation code ...

  // Calculate availability
  var slots = calculateAvailability(events, startDate, endDate, minDuration);

  // ... return response ...
}
```

**REPLACE WITH**:
```javascript
function findAvailability(startDateTime, endDateTime, minDuration, searchMode) {
  // Default searchMode to "duration" if not provided (backward compatibility)
  searchMode = searchMode || 'duration';

  // ... existing validation code (unchanged) ...

  // Calculate availability based on selected mode
  var slots;
  if (searchMode === 'contiguous') {
    log('Using contiguous availability mode', {});
    slots = calculateContiguousAvailability(events, startDate, endDate);
  } else {
    // Default to duration-based mode
    log('Using duration-based mode', { minDuration: minDuration });
    slots = calculateAvailability(events, startDate, endDate, minDuration);
  }

  // ... existing response building code (unchanged) ...
  // Add searchMode to metadata before returning
  var metadata = {
    dateRange: {
      start: formatDate(startDate),
      end: formatDate(endDate)
    },
    workingDaysCount: workingDaysCount,
    totalSlotsFound: slots.length,
    searchMode: searchMode  // NEW: Add mode to metadata
  };

  return {
    success: true,
    slots: slots,
    events: calendarEvents,
    metadata: metadata
  };
}
```

**Implementation Notes**:
- `searchMode` parameter is optional (defaults to "duration")
- Conditional logic selects calculation function based on mode
- `metadata.searchMode` added for client-side display
- All existing validation and error handling preserved

**Testing Checkpoint**: Verify no syntax errors in Code.gs

---

## Step 3: Client-Side UI (Availability.html)

**File**: `src/ui/Availability.html`
**Estimated Time**: 1.5 hours

### 3.1 Add Mode Selection UI

**FIND THIS CODE** (inside the search form, before startDateTime field):
```html
<div class="card mb-3">
  <form id="searchForm" onsubmit="handleFindAvailability(event); return false;">
    <div class="form-group">
      <label for="startDateTime">From Date+Time: ...
```

**ADD THIS CODE** (right after `<form>` opening tag, before startDateTime):
```html
    <!-- Search Mode Selection -->
    <div class="form-group">
      <label>Search Mode:</label>
      <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
          <input type="radio" name="searchMode" value="duration" checked onchange="handleModeChange()">
          <span><strong>Duration-based slots</strong> - Find slots of specific duration</span>
        </label>
        <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
          <input type="radio" name="searchMode" value="contiguous" onchange="handleModeChange()">
          <span><strong>Contiguous blocks</strong> - Show all uninterrupted free time</span>
        </label>
      </div>
    </div>
```

### 3.2 Add Mode Change Handler

**FIND THIS CODE** (in `<script>` section, near other function definitions):
```javascript
function initializeAvailabilityScreen() {
  // ... existing initialization code ...
}
```

**ADD THIS FUNCTION** (before `initializeAvailabilityScreen`):
```javascript
/**
 * Handle search mode change (duration vs contiguous)
 */
function handleModeChange() {
  var selectedMode = document.querySelector('input[name="searchMode"]:checked').value;

  // Save mode to session storage
  sessionStorage.setItem('availability_searchMode', selectedMode);

  // Show/hide duration input based on mode
  updateDurationFieldVisibility();
}

/**
 * Update visibility and requirement of duration input based on selected mode
 */
function updateDurationFieldVisibility() {
  var selectedMode = document.querySelector('input[name="searchMode"]:checked').value;
  var durationGroup = document.getElementById('minDuration').closest('.form-group');
  var durationInput = document.getElementById('minDuration');

  if (selectedMode === 'contiguous') {
    // Hide duration input in contiguous mode (not needed)
    durationGroup.style.display = 'none';
    durationInput.removeAttribute('required');
    durationInput.value = '15'; // Set to minimum for server-side granularity
  } else {
    // Show duration input in duration mode
    durationGroup.style.display = 'block';
    durationInput.setAttribute('required', 'required');
    // Restore previous value if cached, otherwise default to 30
    var cachedDuration = sessionStorage.getItem('availability_minDuration') || '30';
    durationInput.value = cachedDuration;
  }
}
```

### 3.3 Restore Mode on Page Load

**FIND THIS CODE** (in `initializeAvailabilityScreen` function):
```javascript
function initializeAvailabilityScreen() {
  // ... calendar loading code ...

  // Try to restore previous search settings from sessionStorage
  var cachedStartDateTime = sessionStorage.getItem('availability_startDateTime');
  var cachedEndDateTime = sessionStorage.getItem('availability_endDateTime');
  var cachedMinDuration = sessionStorage.getItem('availability_minDuration');
```

**ADD THIS CODE** (right after the cached variable declarations):
```javascript
  var cachedMode = sessionStorage.getItem('availability_searchMode') || 'duration';
```

**FIND THIS CODE** (later in same function, after setting datetime values):
```javascript
  // Initial update of day of week
  updateStartDayOfWeek();
  updateEndDayOfWeek();
}
```

**ADD THIS CODE** (before the closing brace of initializeAvailabilityScreen):
```javascript
  // Restore search mode from session storage
  document.querySelector('input[name="searchMode"][value="' + cachedMode + '"]').checked = true;

  // Update duration field visibility based on restored mode
  updateDurationFieldVisibility();
```

### 3.4 Update Search Handler to Pass Mode

**FIND THIS CODE** (in `handleFindAvailability` function):
```javascript
function handleFindAvailability(event) {
  event.preventDefault();

  var startDateTime = document.getElementById('startDateTime').value;
  var endDateTime = document.getElementById('endDateTime').value;
  var minDuration = parseInt(document.getElementById('minDuration').value);
```

**ADD THIS CODE** (right after minDuration declaration):
```javascript
  var searchMode = document.querySelector('input[name="searchMode"]:checked').value;
```

**FIND THIS CODE** (server call at end of function):
```javascript
  google.script.run
    .withSuccessHandler(function(response) {
      // ... success handler ...
    })
    .withFailureHandler(function(error) {
      // ... failure handler ...
    })
    .findAvailability(startDateTime, endDateTime, minDuration);
```

**REPLACE WITH**:
```javascript
  google.script.run
    .withSuccessHandler(function(response) {
      console.log('Server response:', response);
      showLoading(false);
      if (response.success) {
        console.log('Displaying results for', response.slots.length, 'slots');
        displayResults(response, minDuration, searchMode);  // Pass searchMode
      } else {
        console.error('Server returned error:', response.error);
        showError(response.error);
      }
    })
    .withFailureHandler(function(error) {
      console.error('Server call failed:', error);
      showLoading(false);
      showError('Server error: ' + error.message);
    })
    .findAvailability(startDateTime, endDateTime, minDuration, searchMode);  // Pass searchMode
```

### 3.5 Update Results Display to Show Mode

**FIND THIS CODE** (in `displayResults` function signature):
```javascript
function displayResults(response, minDuration) {
```

**REPLACE WITH**:
```javascript
function displayResults(response, minDuration, searchMode) {
```

**FIND THIS CODE** (metadata HTML generation in displayResults):
```javascript
var durationText = minDuration && minDuration > 15 ? '<br>Minimum duration: ' + minDuration + ' minutes' : '';
var metadataHtml = '<p><strong>Search Results</strong></p>' +
  '<p class="text-muted" style="font-size: 0.875rem;">' +
  'Date range: ' + formatDate(new Date(metadata.dateRange.start)) + ' - ' + formatDate(new Date(metadata.dateRange.end)) + '<br>' +
  'Working days: ' + metadata.workingDaysCount + '<br>' +
  'Available slots: ' + metadata.totalSlotsFound +
  durationText +
  '</p>';
```

**REPLACE WITH**:
```javascript
// Build mode description text
var modeText = '';
if (searchMode === 'contiguous') {
  modeText = '<br>Mode: Contiguous availability blocks';
} else {
  modeText = '<br>Mode: Duration-based slots' + (minDuration > 15 ? ' (' + minDuration + ' min)' : '');
}

var metadataHtml = '<p><strong>Search Results</strong></p>' +
  '<p class="text-muted" style="font-size: 0.875rem;">' +
  'Date range: ' + formatDate(new Date(metadata.dateRange.start)) + ' - ' + formatDate(new Date(metadata.dateRange.end)) + modeText + '<br>' +
  'Working days: ' + metadata.workingDaysCount + '<br>' +
  'Available slots: ' + metadata.totalSlotsFound +
  '</p>';
```

**Implementation Notes**:
- Mode text integrated into existing metadata display
- Conditional phrasing avoids redundancy
- Reuses existing muted text styling (no new CSS needed)

**Testing Checkpoint**: Check HTML file for syntax errors in Apps Script editor

---

## Step 4: Testing Checklist

**Estimated Time**: 45 minutes

### 4.1 Mode Selection Testing

- [ ] Page loads with "Duration-based slots" selected by default
- [ ] Clicking "Contiguous blocks" hides the duration input field
- [ ] Clicking "Duration-based slots" shows the duration input field
- [ ] Mode selection persists after page reload (use F5 to test)
- [ ] Duration field shows/hides correctly on page load based on cached mode

### 4.2 Duration Mode Testing (Regression)

- [ ] Selecting duration mode + 30 min shows 30-minute slots (existing behavior)
- [ ] All existing edge cases still work (all-day events, weekends, overlapping events)
- [ ] Results display shows "Mode: Duration-based slots (30 min)"
- [ ] Checkbox selection and clipboard copy still work

### 4.3 Contiguous Mode Testing

- [ ] Selecting contiguous mode + running search shows contiguous blocks
- [ ] Day with meeting 10:00-14:00 shows two blocks: 09:00-10:00 and 14:00-17:30
- [ ] Completely free day shows one block: 09:00-17:30
- [ ] Day with back-to-back meetings shows only edge availability (if any)
- [ ] All-day event blocks entire working day (no slots shown for that day)
- [ ] Weekend days excluded from results
- [ ] Results display shows "Mode: Contiguous availability blocks"

### 4.4 Edge Case Testing

- [ ] Date range with only weekends shows "No working days in selected range" error
- [ ] Invalid date range (start > end) shows appropriate error
- [ ] Date range > 14 days shows "Date range must be 14 days or less" error
- [ ] Switching modes mid-session works correctly (clear results, allow re-search)

### 4.5 UI/UX Testing

- [ ] Radio buttons have large click targets (mobile-friendly)
- [ ] Mode descriptions are clear and readable
- [ ] Mode indicator in results is immediately visible
- [ ] No visual regressions (layout, spacing, colors unchanged)
- [ ] Typography consistent with existing design (no new fonts or sizes)

---

## Step 5: Deployment

**Estimated Time**: 15 minutes

### 5.1 Via Apps Script Editor

1. Open Apps Script editor for the project
2. Verify all changes saved (AvailabilityService.gs, Code.gs, Availability.html)
3. Click "Deploy" → "Test deployments"
4. Test in Google Sites iframe
5. When ready: "Deploy" → "Manage deployments" → "New deployment"
6. Select version, add description: "Add contiguous availability blocks mode"
7. Deploy

### 5.2 Via clasp CLI (Optional)

```bash
# Push local changes to Apps Script
clasp push

# Deploy new version
clasp deploy --description "Add contiguous availability blocks mode"
```

### 5.3 Verification

- [ ] Test deployment in Google Sites iframe
- [ ] Verify both modes work in production environment
- [ ] Check browser console for errors
- [ ] Test on mobile device (responsive layout)

---

## Rollback Plan

If issues are discovered post-deployment:

1. **Quick Fix**: Revert Availability.html to pre-select "duration" mode by default
2. **Full Rollback**: Deploy previous version via Apps Script "Manage deployments"
3. **Investigation**: Use Apps Script "Executions" log to diagnose server-side errors

**Safe Rollback**: Because `searchMode` parameter defaults to "duration", existing functionality remains intact even if new code has bugs in contiguous mode.

---

## Performance Considerations

**Expected Performance** (based on research):
- Contiguous mode: <5 seconds for 7-day range (same as duration mode)
- No additional Calendar API calls (reuses same event fetch)
- Slightly faster than duration mode (fewer slots returned, less rendering)

**Optimization Opportunities** (if needed):
- Cache calendar events between mode switches
- Debounce mode selection changes
- Lazy render results (virtual scrolling for large result sets)

---

## Troubleshooting

### Issue: Duration field doesn't hide when switching to contiguous mode

**Solution**: Check that `updateDurationFieldVisibility()` is called in `handleModeChange()`

### Issue: Mode doesn't persist after page reload

**Solution**: Verify session storage save/restore in `handleModeChange()` and `initializeAvailabilityScreen()`

### Issue: Server returns error "calculateContiguousAvailability is not defined"

**Solution**: Ensure AvailabilityService.gs was saved and deployed with the new function

### Issue: Results show "undefined" for mode text

**Solution**: Verify `metadata.searchMode` is returned from server in Code.gs

---

## File Changes Summary

| File | Lines Changed | Change Type |
|------|---------------|-------------|
| `src/services/AvailabilityService.gs` | +65 | Add calculateContiguousAvailability() |
| `src/Code.gs` | ~15 | Modify findAvailability() for mode parameter |
| `src/ui/Availability.html` | +80 | Add mode UI, handlers, display logic |
| **Total** | ~160 lines | Extension, no breaking changes |

---

## Success Criteria Verification

After implementation, verify against spec success criteria:

- [ ] **SC-001**: Mode switching works within 2 clicks from results (P1)
- [ ] **SC-002**: Contiguous search returns results in <5 seconds for 7-day range (P1)
- [ ] **SC-003**: 100% accuracy verified with known calendar states (P1)
- [ ] **SC-004**: Mode selection screen is clear (user testing or self-assessment) (P1)
- [ ] **SC-005**: Users can see full availability blocks without duration filtering (P1)
- [ ] **SC-006**: Reduces time evaluating schedule flexibility (qualitative assessment) (P2)

---

## Next Steps

After successful implementation and testing:

1. Update CLAUDE.md with new feature information (run update-agent-context script)
2. Create user documentation (optional)
3. Monitor usage and gather feedback
4. Consider implementing P2 user story (mode switching from results)

**Estimated Total Time**: 3-4 hours (implementation + testing + deployment)
