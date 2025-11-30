# API Contract: PeopleService (Feature 008 Extension)

**Feature**: 008-clear-all-add
**Date**: 2025-01-30
**Phase**: 1 (Design & Contracts)

## Overview

This document defines the API contract for the new `clearAllPeople()` function added to `PeopleService.gs`. This function extends the existing PeopleService from Feature 006 with bulk deletion capability.

**Existing Functions** (from Feature 006, unchanged):
- `addPerson(name)` - Add a new person
- `editPerson(personId, name)` - Edit person details
- `deletePerson(personId)` - Delete single person and their meeting
- `listPeople()` - Get all people

**New Function** (Feature 008):
- `clearAllPeople()` - Delete all people and their meetings

---

## Function: clearAllPeople()

### Purpose

Deletes all people from the one-to-one group and all their associated recurring calendar events in a single batch operation. This provides a quick way to reset the entire scheduler while preserving configuration settings (meeting duration, recurrence interval, time slots).

### Signature

```javascript
function clearAllPeople()
```

**Parameters**: None

**Returns**: `Object`

### Return Value Structure

```javascript
{
  success: boolean,           // Overall operation success
  deletedPeople: number,      // Count of people deleted from sheet
  deletedEvents: number,      // Count of calendar events successfully deleted
  failedEvents: number,       // Count of calendar event deletions that failed
  failedPeople: Array<Object>, // Details of people whose calendar deletion failed
  message: string,            // Human-readable summary message
  errorType: string           // Error category if success=false
}
```

### Success Response Example

**Scenario**: 5 people deleted, all calendar events deleted successfully

```javascript
{
  success: true,
  deletedPeople: 5,
  deletedEvents: 5,
  failedEvents: 0,
  failedPeople: [],
  message: "Cleared all people and meetings: deleted 5 people and 5 recurring meetings"
}
```

### Partial Success Response Example

**Scenario**: 5 people deleted, 3 calendar events deleted, 2 calendar deletions failed

```javascript
{
  success: true,
  deletedPeople: 5,
  deletedEvents: 3,
  failedEvents: 2,
  failedPeople: [
    {
      personId: "01HMXYZ...",
      personName: "Alice Smith",
      calendarEventId: "event_abc123",
      error: "Event not found in calendar"
    },
    {
      personId: "01HMXYZ...",
      personName: "Bob Jones",
      calendarEventId: "event_def456",
      error: "Calendar API error: Rate limit exceeded"
    }
  ],
  message: "Cleared all people: deleted 5 people, 3 meetings deleted successfully, 2 meeting deletions failed"
}
```

### Empty State Response Example

**Scenario**: No people exist when Clear All is executed

```javascript
{
  success: true,
  deletedPeople: 0,
  deletedEvents: 0,
  failedEvents: 0,
  failedPeople: [],
  message: "No people to delete - the group is already empty"
}
```

### Error Response Example

**Scenario**: Critical error prevents operation (e.g., sheet not found)

```javascript
{
  success: false,
  deletedPeople: 0,
  deletedEvents: 0,
  failedEvents: 0,
  failedPeople: [],
  message: "OneToOnePeople sheet not found",
  errorType: "system"
}
```

---

## Behavior Specification

### Pre-Conditions

1. Google Apps Script execution context is valid
2. User has necessary permissions to access spreadsheet and calendar
3. OneToOnePeople sheet exists (created by Feature 006)

**No other pre-conditions**: Function works whether people exist or not.

### Process Flow

```
START clearAllPeople()
  │
  ├─► Load OneToOnePeople sheet
  │   ├─ Success → Continue
  │   └─ Failure → Return error (errorType: "system")
  │
  ├─► Call listPeople() to get all people
  │   ├─ Success with count > 0 → Continue
  │   ├─ Success with count = 0 → Return empty state response
  │   └─ Failure → Return error (errorType: "system")
  │
  ├─► Load calendar configuration
  │   ├─ Success → Continue
  │   └─ Failure → Return error (errorType: "system")
  │
  ├─► FOR EACH person in people array:
  │   │
  │   ├─► Attempt to delete calendar event (if calendarEventId exists)
  │   │   ├─ Success → Increment deletedEvents counter
  │   │   └─ Failure → Increment failedEvents counter, add to failedPeople array
  │   │
  │   ├─► Delete person row from OneToOnePeople sheet
  │   │   ├─ Success → Increment deletedPeople counter
  │   │   └─ Failure → Log error, continue to next person
  │   │
  │   └─► Continue to next person (don't stop on failures)
  │
  ├─► Construct success message
  │   ├─ All successful: "Cleared all people and meetings: deleted X people and Y recurring meetings"
  │   ├─ Some calendar failures: "Cleared all people: deleted X people, Y meetings deleted successfully, Z meeting deletions failed"
  │   └─ No people deleted: "No people to delete - the group is already empty"
  │
  └─► Return success response with counts and message
END
```

### Post-Conditions

**On Success (success=true)**:
1. OneToOnePeople sheet contains only header row (all data rows deleted)
2. All calendar events deleted OR failures reported in `failedPeople` array
3. OneToOneConfig sheet UNCHANGED (preserved)
4. OneToOneSlots sheet UNCHANGED (preserved)
5. `deletedPeople` count matches number of rows that existed before operation
6. `deletedEvents` + `failedEvents` = count of people who had calendar events

**On Failure (success=false)**:
1. System state may be partially modified (some people may have been deleted)
2. Error message explains what went wrong
3. User should retry or investigate based on errorType

### Error Handling

**Error Types**:

| errorType | Meaning | Example Scenario |
|-----------|---------|------------------|
| `system` | Infrastructure failure | Sheet not found, spreadsheet access denied |
| `calendar` | Calendar API failure | Calendar service unavailable |
| N/A (partial success) | Individual failures tolerated | Some calendar events fail to delete but operation continues |

**Partial Failure Strategy** (FR-012):
- Calendar event deletion failures do NOT prevent person deletion from sheet
- Each person deletion is independent
- Failed calendar deletions are logged in `failedPeople` array
- Operation returns `success: true` with failure details

**Critical Failure Strategy**:
- Sheet access failures → return `success: false` immediately
- Calendar service completely unavailable → return `success: false` immediately

---

## Dependencies

### Internal Dependencies (Existing Functions)

```javascript
// From PeopleService.gs (Feature 006)
function listPeople()  // Get all people to iterate

// From SheetUtils.gs (Existing)
function batchRead(sheet)  // Read all sheet data
function getOrCreateConfigSheet()  // Access spreadsheet

// From Config.gs (Existing)
function getConfig()  // Get calendar configuration
```

### External Dependencies (Google APIs)

```javascript
// Google Calendar API (CalendarApp)
CalendarApp.getCalendarById(calendarId)
calendar.getEventSeriesById(eventId)
eventSeries.deleteEventSeries()

// Google Sheets API (SpreadsheetApp)
spreadsheet.getSheetByName('OneToOnePeople')
sheet.deleteRow(rowIndex)
```

---

## Performance Characteristics

### Time Complexity
- **Best Case**: O(1) - No people exist (immediate return)
- **Average Case**: O(n) - n people × (sheet delete + calendar delete)
- **Worst Case**: O(n) - Same as average (no early termination)

Where n = number of people in system

### Space Complexity
- **Memory**: O(n) for people array + O(m) for failedPeople array
- **Storage**: Deletes n rows from sheet (reduces storage)

Where:
- n = total people count
- m = failed calendar deletions count (m ≤ n)

### Performance Targets
- **Target**: ≤10 seconds for 100 people (SC-002)
- **Estimated**: ~100ms per person = 10 seconds for 100 people ✓
- **API Quota Impact**: 100 calendar deletions + 100 sheet deletions (well within quotas)

---

## Security & Permissions

### Required Permissions
- **Calendar Access**: Delete events from user's selected calendar
- **Spreadsheet Access**: Delete rows from OneToOnePeople sheet

**Permission Scope**: Same as existing `deletePerson()` function (no new permissions needed)

### Authorization
- Runs in user's context (Google Apps Script OAuth)
- User must have edit access to calendar and spreadsheet
- No elevation of privileges required

### Data Safety
- OneToOneConfig and OneToOneSlots sheets are never accessed (impossible to modify)
- Deletion is permanent (no undo mechanism)
- Confirmation dialog required in UI before function is called (enforced at UI layer)

---

## Testing Scenarios

### Test Case 1: Standard Bulk Deletion

**Input**:
- 5 people exist with scheduled meetings

**Expected Behavior**:
1. All 5 people deleted from OneToOnePeople sheet
2. All 5 calendar events deleted successfully
3. Return: `success: true, deletedPeople: 5, deletedEvents: 5, failedEvents: 0`

**Verification**:
- OneToOnePeople sheet has 0 data rows
- Calendar has 0 events matching pattern
- Settings sheets unchanged

---

### Test Case 2: Mixed State (Some with Meetings, Some Without)

**Input**:
- 3 people with meetings (calendarEventId populated)
- 2 people without meetings (calendarEventId empty)

**Expected Behavior**:
1. All 5 people deleted from sheet
2. Only 3 calendar events deleted (2 people had none)
3. Return: `success: true, deletedPeople: 5, deletedEvents: 3, failedEvents: 0`

**Verification**:
- OneToOnePeople sheet has 0 data rows
- Calendar has 0 events for the 3 people who had meetings

---

### Test Case 3: Partial Calendar Deletion Failure

**Input**:
- 5 people with meetings
- 2 calendar events fail to delete (e.g., already deleted manually, API error)

**Expected Behavior**:
1. All 5 people deleted from sheet (deletion continues despite calendar failures)
2. 3 calendar events deleted successfully
3. 2 failures reported in failedPeople array
4. Return: `success: true, deletedPeople: 5, deletedEvents: 3, failedEvents: 2`

**Verification**:
- OneToOnePeople sheet has 0 data rows
- failedPeople array contains details of 2 failures

---

### Test Case 4: Empty State

**Input**:
- 0 people in system

**Expected Behavior**:
1. No deletions performed
2. Return: `success: true, deletedPeople: 0, deletedEvents: 0, failedEvents: 0`
3. Message: "No people to delete - the group is already empty"

**Verification**:
- OneToOnePeople sheet still has 0 data rows (unchanged)
- No errors thrown

---

### Test Case 5: System Failure (Sheet Not Found)

**Input**:
- OneToOnePeople sheet does not exist (corrupted state)

**Expected Behavior**:
1. No deletions performed
2. Return: `success: false, errorType: "system"`
3. Message: "OneToOnePeople sheet not found"

**Verification**:
- Function returns immediately without modifying data

---

### Test Case 6: Settings Preservation

**Input**:
- 10 people exist
- OneToOneConfig has duration=30, interval=4
- OneToOneSlots has 3 time slots

**Expected Behavior**:
1. All 10 people deleted
2. OneToOneConfig UNCHANGED (duration=30, interval=4)
3. OneToOneSlots UNCHANGED (3 slots remain)

**Verification**:
- Settings sheets have identical content before and after
- Only OneToOnePeople sheet modified

---

## Implementation Notes

### Reuse Strategy

The implementation should reuse existing deletion logic from `deletePerson()`:

```javascript
function clearAllPeople() {
  try {
    // Get all people
    var peopleResponse = listPeople();
    if (!peopleResponse.success) {
      return { success: false, error: 'Failed to load people', errorType: 'system' };
    }

    var people = peopleResponse.people;
    if (people.length === 0) {
      return {
        success: true,
        deletedPeople: 0,
        deletedEvents: 0,
        failedEvents: 0,
        failedPeople: [],
        message: 'No people to delete - the group is already empty'
      };
    }

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

    // Iterate and delete each person
    for (var i = 0; i < people.length; i++) {
      var person = people[i];

      // Attempt calendar event deletion if exists
      if (person.calendarEventId && person.calendarEventId.trim().length > 0 && calendar) {
        try {
          var eventSeries = calendar.getEventSeriesById(person.calendarEventId);
          if (eventSeries) {
            eventSeries.deleteEventSeries();
            deletedEvents++;
          }
        } catch (calError) {
          failedEvents++;
          failedPeople.push({
            personId: person.personId,
            personName: person.name,
            calendarEventId: person.calendarEventId,
            error: calError.message
          });
        }
      }

      // Delete person row from sheet (use existing deleteRow logic)
      // ... (reuse deletion from deletePerson function)
      deletedPeople++;
    }

    // Construct success message
    var message = constructClearAllMessage(deletedPeople, deletedEvents, failedEvents);

    return {
      success: true,
      deletedPeople: deletedPeople,
      deletedEvents: deletedEvents,
      failedEvents: failedEvents,
      failedPeople: failedPeople,
      message: message
    };

  } catch (e) {
    return {
      success: false,
      deletedPeople: 0,
      deletedEvents: 0,
      failedEvents: 0,
      failedPeople: [],
      message: e.message || 'Failed to clear all people',
      errorType: 'system'
    };
  }
}
```

### Message Construction Helper

```javascript
function constructClearAllMessage(deletedPeople, deletedEvents, failedEvents) {
  if (deletedPeople === 0) {
    return 'No people to delete - the group is already empty';
  }

  if (failedEvents === 0) {
    return 'Cleared all people and meetings: deleted ' + deletedPeople + ' people and ' +
           deletedEvents + ' recurring meetings';
  } else {
    return 'Cleared all people: deleted ' + deletedPeople + ' people, ' +
           deletedEvents + ' meetings deleted successfully, ' +
           failedEvents + ' meeting deletions failed';
  }
}
```

---

## Compatibility

### Backward Compatibility
- ✅ No changes to existing PeopleService functions
- ✅ No changes to existing data models or schema
- ✅ No changes to existing API contracts

### Forward Compatibility
- ✅ Function can be extended to support selective deletion filters (out of scope for Feature 008)
- ✅ Return value structure can be extended with additional metadata without breaking existing clients

---

## Summary

**Function**: `clearAllPeople()`
**Purpose**: Batch delete all people and their calendar events
**Complexity**: Low (iteration over existing single-deletion logic)
**Error Handling**: Tolerates partial failures, reports details
**Performance**: O(n) where n = people count, target ≤10s for 100 people
**Safety**: Preserves settings sheets, cannot corrupt configuration

**Ready for Implementation Guide** (quickstart.md)
