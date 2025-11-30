# Quickstart: Implementing Clear All People and Meetings

**Feature**: 008-clear-all-add
**Date**: 2025-01-30
**Estimated Time**: 1-2 hours

## Prerequisites

- Feature 006 (One-to-One Scheduler) must be fully implemented and functional
- Access to `src/services/PeopleService.gs` for editing
- Access to `src/ui/OneToOne.html` for UI modification
- Google Apps Script development environment (clasp CLI or Apps Script web editor)

## Implementation Steps

### Step 1: Add clearAllPeople() Function to PeopleService.gs

**File**: `src/services/PeopleService.gs`
**Location**: Add after existing functions (after `listPeople()`)

**Action**: Add the new batch deletion function

```javascript
/**
 * Clear all people from the one-to-one group
 * Deletes all people and their associated calendar events in a single batch operation
 * Preserves configuration settings (OneToOneConfig and OneToOneSlots)
 * @returns {Object} {success: boolean, deletedPeople: number, deletedEvents: number, failedEvents: number, failedPeople: Array, message: string}
 */
function clearAllPeople() {
  try {
    log('clearAllPeople started');

    // Get all people
    var peopleResponse = listPeople();
    if (!peopleResponse.success) {
      return {
        success: false,
        deletedPeople: 0,
        deletedEvents: 0,
        failedEvents: 0,
        failedPeople: [],
        error: 'Failed to load people',
        errorType: 'system'
      };
    }

    var people = peopleResponse.people;

    // Handle empty state
    if (people.length === 0) {
      log('clearAllPeople: no people to delete');
      return {
        success: true,
        deletedPeople: 0,
        deletedEvents: 0,
        failedEvents: 0,
        failedPeople: [],
        message: 'No people to delete - the group is already empty'
      };
    }

    log('clearAllPeople: deleting ' + people.length + ' people');

    // Initialize counters
    var deletedPeople = 0;
    var deletedEvents = 0;
    var failedEvents = 0;
    var failedPeople = [];

    // Get calendar configuration
    var config = getConfig();
    var calendar = null;
    if (config.selectedCalendarId) {
      calendar = CalendarApp.getCalendarById(config.selectedCalendarId);
    }

    // Get spreadsheet and people sheet for deletion
    var spreadsheet = getOrCreateConfigSheet();
    var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');

    if (!peopleSheet) {
      return {
        success: false,
        deletedPeople: 0,
        deletedEvents: 0,
        failedEvents: 0,
        failedPeople: [],
        error: 'OneToOnePeople sheet not found',
        errorType: 'system'
      };
    }

    // Iterate through people in reverse order (to avoid row index shifting issues)
    var allData = batchRead(peopleSheet);
    for (var i = allData.length - 1; i >= 1; i--) {
      var person = rowToPerson(allData[i]);

      // Attempt calendar event deletion if exists
      if (person.calendarEventId && person.calendarEventId.trim().length > 0 && calendar) {
        try {
          var eventSeries = calendar.getEventSeriesById(person.calendarEventId);
          if (eventSeries) {
            eventSeries.deleteEventSeries();
            deletedEvents++;
            log('Deleted calendar event for person', { personId: person.personId, personName: person.name });
          }
        } catch (calError) {
          failedEvents++;
          failedPeople.push({
            personId: person.personId,
            personName: person.name,
            calendarEventId: person.calendarEventId,
            error: calError.message
          });
          warn('Failed to delete calendar event during clear all', { personId: person.personId, error: calError.message });
        }
      }

      // Delete person row from sheet (i+1 because sheet rows are 1-indexed)
      var rowIndex = i + 1;
      peopleSheet.deleteRow(rowIndex);
      deletedPeople++;
    }

    // Construct success message
    var message;
    if (failedEvents === 0) {
      message = 'Cleared all people and meetings: deleted ' + deletedPeople + ' people and ' +
                deletedEvents + ' recurring meetings';
    } else {
      message = 'Cleared all people: deleted ' + deletedPeople + ' people, ' +
                deletedEvents + ' meetings deleted successfully, ' +
                failedEvents + ' meeting deletions failed';
    }

    log('clearAllPeople completed', {
      deletedPeople: deletedPeople,
      deletedEvents: deletedEvents,
      failedEvents: failedEvents
    });

    return {
      success: true,
      deletedPeople: deletedPeople,
      deletedEvents: deletedEvents,
      failedEvents: failedEvents,
      failedPeople: failedPeople,
      message: message
    };

  } catch (e) {
    error('clearAllPeople failed', e);
    return {
      success: false,
      deletedPeople: 0,
      deletedEvents: 0,
      failedEvents: 0,
      failedPeople: [],
      error: e.message || 'Failed to clear all people',
      errorType: 'system'
    };
  }
}
```

**Key Implementation Notes**:
- Iterates in reverse order (from last row to first) to avoid row index shifting issues when deleting
- Reuses existing `rowToPerson()` helper function
- Tolerates calendar deletion failures (continues processing)
- Logs all operations for debugging

---

### Step 2: Add "Clear All" Button to OneToOne.html UI

**File**: `src/ui/OneToOne.html`
**Location**: In the People tab section, before the "Add Person Form"

**Action**: Add the "Clear All" button after the tab title

Find this section (around line 212):

```html
<div id="tab-people" class="tab-content active">
  <div class="card">
    <h2>People in One-to-One Group</h2>

    <!-- Add Person Form -->
    <form id="addPersonForm" onsubmit="handleAddPerson(event)">
```

Add the button BEFORE the "Add Person Form" section:

```html
<div id="tab-people" class="tab-content active">
  <div class="card">
    <h2>People in One-to-One Group</h2>

    <!-- Clear All Button -->
    <div class="form-actions mb-3" style="justify-content: flex-start;">
      <button
        type="button"
        class="button"
        onclick="handleClearAllClick()"
        style="background-color: #f5f5f5; color: #333; border: 1px solid #ddd;">
        Clear All People & Meetings
      </button>
    </div>

    <!-- Add Person Form -->
    <form id="addPersonForm" onsubmit="handleAddPerson(event)">
```

**CSS Note**: Button uses existing neutral color scheme (matches "Regenerate All Meetings" button style).

---

### Step 3: Add JavaScript Handler Function to OneToOne.html

**File**: `src/ui/OneToOne.html`
**Location**: In the `<script>` section, add after the existing delete handler functions (around line 766)

**Action**: Add the Clear All click handler

```javascript
/**
 * Handle clear all people button click
 */
function handleClearAllClick() {
  console.log('handleClearAllClick called');

  // Confirmation dialog with strong warning (User Story 3)
  if (!confirm('⚠️ CLEAR ALL PEOPLE AND MEETINGS?\n\n' +
               'This will PERMANENTLY DELETE:\n' +
               '• ALL people in your one-to-one group\n' +
               '• ALL recurring calendar events\n\n' +
               'Your settings will be preserved:\n' +
               '✓ Meeting duration and recurrence interval\n' +
               '✓ Time slot configurations\n\n' +
               'THIS ACTION CANNOT BE UNDONE.\n\n' +
               'Continue?')) {
    console.log('User cancelled clear all');
    return;
  }

  console.log('Starting clear all operation...');

  // Show working indicator (User Story 2)
  showLoading();
  showSuccess('⏳ Clearing all people and meetings... This may take a moment.');

  google.script.run
    .withSuccessHandler(function(response) {
      console.log('clearAllPeople response:', response);
      hideLoading();

      if (!response) {
        console.error('Null response from clearAllPeople');
        showError('No response from server. Check browser console for details.');
        return;
      }

      if (response.success) {
        // Display success message
        if (response.deletedPeople === 0) {
          showSuccess(response.message);
        } else if (response.failedEvents > 0) {
          // Partial success - show warning
          showSuccess(response.message);

          // Display failed calendar deletions details
          if (response.failedPeople && response.failedPeople.length > 0) {
            var failureDetails = '\n\nCalendar deletion failures:\n';
            for (var i = 0; i < response.failedPeople.length; i++) {
              failureDetails += '• ' + response.failedPeople[i].personName + ': ' +
                                response.failedPeople[i].error + '\n';
            }
            console.warn('Calendar deletion failures:', response.failedPeople);
          }
        } else {
          // Complete success
          showSuccess(response.message);
        }

        // Refresh people list to show empty state
        loadPeopleList();

        // Also refresh meetings list if user is on that tab
        var activeTab = getActiveTab();
        if (activeTab === 'meetings') {
          loadMeetingsList();
        }
      } else {
        console.error('clearAllPeople failed:', response.error, response.errorType);
        showError(response.error || 'Failed to clear all people');
      }
    })
    .withFailureHandler(function(error) {
      console.error('clearAllPeople error:', error);
      hideLoading();
      showError('Failed to clear all people: ' + error.message);
    })
    .clearAllPeople();
}
```

**Key Implementation Notes**:
- Confirmation dialog explicitly lists what will be deleted and what will be preserved
- Working indicator shows immediately after confirmation
- Success message varies based on outcome (empty state, partial failure, complete success)
- Refreshes people list after completion to show empty state
- Also refreshes meetings list if user is viewing that tab

---

## Testing Checklist

### Manual Testing

**Test 1: Standard Clear All (5 people with meetings)**

1. Add 5 people to the One-to-One group
2. Create meetings for all 5 people
3. Click "Clear All People & Meetings" button
4. Confirm the action in dialog
5. **Expected Result**:
   - Working indicator appears
   - Success message: "Cleared all people and meetings: deleted 5 people and 5 recurring meetings"
   - People list shows empty state
   - Meetings list (if visible) shows empty state
   - Settings tab unchanged (verify duration, interval, time slots)

**Verification**:
- Check OneToOnePeople sheet: 0 data rows (only header)
- Check Google Calendar: 0 recurring events
- Check OneToOneConfig sheet: Settings unchanged
- Check OneToOneSlots sheet: Time slots unchanged

---

**Test 2: Mixed State (Some with meetings, some without)**

1. Add 5 people
2. Create meetings for only 3 people (leave 2 without meetings)
3. Click "Clear All People & Meetings"
4. Confirm
5. **Expected Result**:
   - Success message: "Cleared all people and meetings: deleted 5 people and 3 recurring meetings"
   - All 5 people removed

---

**Test 3: Empty State**

1. Ensure no people exist in the group
2. Click "Clear All People & Meetings"
3. Confirm
4. **Expected Result**:
   - Success message: "No people to delete - the group is already empty"
   - No errors

---

**Test 4: Partial Failure (Simulated)**

To simulate calendar deletion failures:
1. Add 3 people with meetings
2. Manually delete 1 calendar event directly in Google Calendar (but don't remove person from sheet)
3. Click "Clear All People & Meetings"
4. Confirm
5. **Expected Result**:
   - Success message mentions failed deletions
   - All 3 people still removed from sheet
   - Console shows calendar deletion failure details

---

**Test 5: Confirmation Dialog Cancellation**

1. Add some people
2. Click "Clear All People & Meetings"
3. Click "Cancel" in confirmation dialog
4. **Expected Result**:
   - No deletions performed
   - People list unchanged

---

**Test 6: Settings Preservation**

1. Configure settings: duration = 45 minutes, interval = 6 weeks
2. Add 3 time slots
3. Add 10 people with meetings
4. Click "Clear All People & Meetings" and confirm
5. **Expected Result**:
   - All people and meetings cleared
   - Settings tab: duration = 45 minutes, interval = 6 weeks (unchanged)
   - Settings tab: 3 time slots remain (unchanged)

---

### Regression Testing

**Verify Existing Features Still Work**:
- [ ] Add person works
- [ ] Edit person works
- [ ] Delete individual person works
- [ ] Create meetings works
- [ ] Regenerate all meetings works
- [ ] View meetings shows correct list
- [ ] Settings modification works
- [ ] Time slot add/edit/delete works

---

## Deployment

### Using clasp CLI

```bash
# Ensure you're in project root
cd /c/Users/andre/Repos/speckit/skCalUtils

# Push changes to Google Apps Script
clasp push

# Test in Google Apps Script web editor
clasp open
```

### Using Apps Script Web Editor

1. Open Apps Script project in browser
2. Navigate to `src/services/PeopleService.gs`
3. Add the `clearAllPeople()` function at the end of the file
4. Navigate to `src/ui/OneToOne.html`
5. Add the "Clear All" button and handler function
6. Click "Save" (Ctrl+S)
7. Test using the web app UI

---

## Rollback Plan

If issues occur, revert the changes:

1. **Revert PeopleService.gs**: Remove `clearAllPeople()` function
2. **Revert OneToOne.html**: Remove "Clear All" button and `handleClearAllClick()` function

**Git Rollback**:
```bash
# If changes are committed but not pushed
git reset --hard HEAD~1

# If changes are pushed
git revert <commit-hash>
clasp push
```

---

## Troubleshooting

### Issue: "No response from server" error

**Symptom**: UI shows "No response from server" after clicking Clear All

**Diagnosis**:
1. Check browser console for JavaScript errors
2. Verify `clearAllPeople()` function exists in PeopleService.gs
3. Check Google Apps Script execution logs

**Fix**: Ensure function is saved and deployed via clasp push

---

### Issue: Some people not deleted

**Symptom**: After Clear All, some people still appear in the list

**Diagnosis**:
1. Check if row deletion logic is working (iterate in reverse order)
2. Check for JavaScript errors in server-side logs

**Fix**: Verify reverse iteration logic: `for (var i = allData.length - 1; i >= 1; i--)`

---

### Issue: Calendar events not deleted

**Symptom**: People deleted but calendar events remain

**Diagnosis**:
1. Check if calendar configuration is valid (selectedCalendarId)
2. Verify user has permission to delete calendar events
3. Check for calendar API errors in logs

**Fix**: Ensure `config.selectedCalendarId` is set and user has calendar access

---

### Issue: Settings accidentally modified

**Symptom**: Settings or time slots changed after Clear All

**Diagnosis**:
1. Review `clearAllPeople()` function code
2. Verify only OneToOnePeople sheet is accessed

**Fix**: This should NOT happen - function only accesses OneToOnePeople sheet. If it does occur, restore settings from backup and investigate code bug.

---

## Validation Criteria

**Feature is successfully implemented when**:
- ✅ "Clear All" button visible in People tab
- ✅ Confirmation dialog appears with clear warning before deletion
- ✅ Working indicator shows during operation
- ✅ All people deleted from OneToOnePeople sheet
- ✅ All calendar events deleted (or failures reported)
- ✅ Settings preserved (duration, interval, time slots unchanged)
- ✅ Empty state message shown if no people exist
- ✅ Success message shows deletion counts
- ✅ Partial failures handled gracefully with detailed reporting

---

## Next Steps

After successful implementation and testing:

1. Run `/speckit.tasks` to generate implementation task breakdown
2. Create pull request with changes
3. Update CLAUDE.md with new feature documentation
4. Mark feature 008 as IMPLEMENTED in project tracking

---

## Reference Files

- **Specification**: `specs/008-clear-all-add/spec.md`
- **API Contract**: `specs/008-clear-all-add/contracts/PeopleService.md`
- **Data Model**: `specs/008-clear-all-add/data-model.md`
- **Research**: `specs/008-clear-all-add/research.md`
- **Implementation Files**:
  - `src/services/PeopleService.gs` (add `clearAllPeople()`)
  - `src/ui/OneToOne.html` (add button and handler)

---

## Estimated Time Breakdown

- Step 1 (add clearAllPeople function): 30 minutes
- Step 2 (add UI button): 10 minutes
- Step 3 (add handler function): 20 minutes
- Manual testing (all 6 tests): 30 minutes
- Regression testing: 20 minutes
- **Total**: 1.5-2 hours

---

## Success Criteria

Feature is complete when:
1. All three implementation steps deployed
2. All 6 manual tests pass
3. All regression tests pass
4. No console errors in Apps Script execution log
5. People and calendar events deleted successfully
6. Settings preservation verified
7. Success criteria from spec.md met (SC-001 through SC-009)
