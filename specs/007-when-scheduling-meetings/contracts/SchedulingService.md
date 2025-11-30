# API Contract: SchedulingService

**Feature**: 007-when-scheduling-meetings
**Date**: 2025-01-30
**File**: `src/services/SchedulingService.gs`

## Overview

This contract defines the modified and new functions in `SchedulingService.gs` for Feature 007.

**Scope**: Only the functions that change behavior or are newly added are documented here. Unchanged functions retain their existing contracts from Feature 006.

---

## Modified Functions

### `assignPeopleToPeriods()`

**Purpose**: Assign people to meeting periods using **interval stride distribution** (replaces round-robin)

**Signature**:
```javascript
function assignPeopleToPeriods(people, periods, recurrenceWeeks)
```

**Parameters**:
- `people` (Array<Person>): List of people to schedule
  - Required, non-empty array
  - Each element must be a valid Person object with `{personId, name, calendarEventId}`
- `periods` (Array<Period>): List of available meeting periods
  - Required, non-empty array
  - Each element must be `{weekday, startTime, endTime}`
- `recurrenceWeeks` (number): Recurrence interval in weeks
  - Required, positive integer
  - Must be ≥ 1

**Returns**: `Array<Assignment>`
```javascript
[
  {
    person: Person,         // Person object reference
    weekday: string,        // e.g., "Monday"
    startTime: string,      // e.g., "10:00"
    endTime: string,        // e.g., "10:30"
    weekOffset: number,     // Week offset (0-indexed) within recurrence cycle
    recurrenceWeeks: number // Same as input parameter
  },
  ...
]
```

**Algorithm** (NEW):
1. Calculate `slotsPerWeek = periods.length`
2. Calculate `spacing = Math.floor(recurrenceWeeks / slotsPerWeek)`
3. For each person at index `i`:
   - `weekOffset = Math.floor(i / slotsPerWeek) * spacing`
   - `slotIndex = i % slotsPerWeek`
   - Assign person to `periods[slotIndex]` with calculated `weekOffset`

**Example**:
```javascript
// Input
people = [Alice, Bob, Carol, Dave]  // 4 people
periods = [{weekday:"Mon", start:"10:00", end:"10:30"},
           {weekday:"Wed", start:"14:00", end:"14:30"}]  // 2 periods
recurrenceWeeks = 4

// Calculation
slotsPerWeek = 2
spacing = floor(4/2) = 2

// Output
[
  {person:Alice, weekday:"Mon", start:"10:00", end:"10:30", weekOffset:0, recurrenceWeeks:4},
  {person:Bob,   weekday:"Wed", start:"14:00", end:"14:30", weekOffset:0, recurrenceWeeks:4},
  {person:Carol, weekday:"Mon", start:"10:00", end:"10:30", weekOffset:2, recurrenceWeeks:4},
  {person:Dave,  weekday:"Wed", start:"14:00", end:"14:30", weekOffset:2, recurrenceWeeks:4}
]
```

**Behavior Changes from Feature 006**:
- **Old**: Round-robin assignment (periodIndex = i % periods.length)
- **New**: Interval stride assignment with grouped week offsets
- **Impact**: Meetings distributed evenly across recurrence cycle instead of clustered

**Preconditions**:
- `people.length > 0`
- `periods.length > 0`
- `recurrenceWeeks >= 1`

**Postconditions**:
- Returns array with length equal to `people.length`
- Each person assigned exactly once
- Week offsets are multiples of `spacing`
- No slot reused within same week offset

---

### `calculateNextOccurrence()`

**Purpose**: Calculate the start/end date-time for the next occurrence of a meeting, adjusted by week offset

**Signature** (MODIFIED):
```javascript
function calculateNextOccurrence(weekday, startTimeMinutes, durationMinutes, weekOffset)
```

**Parameters**:
- `weekday` (string): Day of week (e.g., "Monday", "Tuesday")
  - Required, must be valid weekday name
- `startTimeMinutes` (number): Start time in minutes since midnight (0-1439)
  - Required, 0 ≤ value ≤ 1439
- `durationMinutes` (number): Meeting duration in minutes
  - Required, positive integer
- `weekOffset` (number): **NEW PARAMETER** - Number of weeks to offset the start date
  - Required, non-negative integer (≥ 0)
  - Default behavior if 0: schedule for next occurrence of weekday

**Returns**: `Object`
```javascript
{
  startDateTime: Date,  // JavaScript Date object for meeting start
  endDateTime: Date     // JavaScript Date object for meeting end
}
```

**Algorithm Changes**:
```javascript
// Existing logic (unchanged)
var daysUntil = (targetDay - currentDay + 7) % 7;
if (daysUntil === 0) { daysUntil = 7; }
var startDate = new Date(today);
startDate.setDate(today.getDate() + daysUntil);

// NEW: Add week offset
startDate.setDate(startDate.getDate() + (weekOffset * 7));

// Existing logic (unchanged)
startDate.setHours(...);
// ... rest of function
```

**Example**:
```javascript
// Input
weekday = "Monday"
startTimeMinutes = 600  // 10:00 AM
durationMinutes = 30
weekOffset = 2

// Behavior
// If today is Friday Jan 26, 2025:
// - Next Monday = Jan 29 (3 days)
// - Add 2 weeks = Feb 12
// Output: {startDateTime: Feb 12 10:00, endDateTime: Feb 12 10:30}
```

**Behavior Changes from Feature 006**:
- **Old**: Always schedule for next available occurrence of weekday
- **New**: Schedule for next occurrence + weekOffset weeks
- **Backward Compatibility**: Calling with `weekOffset=0` produces identical behavior to Feature 006

**Preconditions**:
- `weekday` in ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
- `0 <= startTimeMinutes <= 1439`
- `durationMinutes > 0`
- `weekOffset >= 0`

**Postconditions**:
- `endDateTime = startDateTime + durationMinutes`
- `startDateTime` is on specified `weekday`
- `startDateTime >= today + weekOffset weeks`

---

### `executeScheduling()`

**Purpose**: Execute scheduling by creating calendar events for all assignments

**Signature** (unchanged):
```javascript
function executeScheduling(calendar, assignments, durationMinutes)
```

**Parameters**:
- `calendar` (Calendar): Google Calendar object
- `assignments` (Array<Assignment>): Assignments from `assignPeopleToPeriods()`
- `durationMinutes` (number): Meeting duration in minutes

**Returns**: `Array<Object>` (unchanged)

**Behavior Changes**:
- **Modified**: Now passes `assignment.weekOffset` to `calculateNextOccurrence()`
- **Line Change**: Line 197 changes from:
  ```javascript
  // OLD
  var occurrence = calculateNextOccurrence(assignment.weekday, startTimeMinutes, durationMinutes);
  ```
  to:
  ```javascript
  // NEW
  var occurrence = calculateNextOccurrence(assignment.weekday, startTimeMinutes, durationMinutes, assignment.weekOffset);
  ```

**Preconditions**:
- `calendar` is valid Calendar object
- `assignments` array contains valid Assignment objects with `weekOffset` field
- `durationMinutes > 0`

**Postconditions** (unchanged):
- Returns array with success/failure for each person
- Calendar events created with correct recurrence patterns
- Now includes correct week offset in start date

---

## Unchanged Functions

The following functions retain their Feature 006 contracts with no modifications:

### `calculateRecurrenceInterval()`
- **Status**: Unchanged
- **Contract**: Returns `max(minInterval, Math.ceil(peopleCount / slotsPerWeek))`

### `expandSlotsIntoPeriods()`
- **Status**: Unchanged
- **Contract**: Expands time slots into individual meeting periods

### `createOneToOneMeeting()`
- **Status**: Unchanged
- **Contract**: Creates recurring calendar event with specified interval

### `createAllMeetings()`
- **Status**: Unchanged
- **Behavior**: Automatically uses new `assignPeopleToPeriods()` algorithm
- **Impact**: Meetings now distributed with interval stride instead of round-robin

### `viewMeetings()`
- **Status**: Unchanged
- **Contract**: Returns list of scheduled meetings

### `deleteMeeting()`
- **Status**: Unchanged
- **Contract**: Deletes meeting for specific person

### `regenerateAllMeetings()`
- **Status**: Unchanged
- **Behavior**: Automatically uses new `assignPeopleToPeriods()` algorithm
- **Impact**: Regenerated meetings now use interval stride distribution

---

## Testing Contract

### Unit Test Cases

**Test 1: Even Distribution with Integer Spacing**
```javascript
Input:
  people = 4
  periods = 2 (Mon 10am, Wed 2pm)
  recurrenceWeeks = 4

Expected Output:
  spacing = 2
  assignments[0]: Alice, Mon 10am, weekOffset=0
  assignments[1]: Bob, Wed 2pm, weekOffset=0
  assignments[2]: Carol, Mon 10am, weekOffset=2
  assignments[3]: Dave, Wed 2pm, weekOffset=2

Verification:
  ✓ No slot reused in week 0 (Mon and Wed)
  ✓ No slot reused in week 2 (Mon and Wed)
  ✓ Even spacing between groups (0, 2)
```

**Test 2: Non-Integer Spacing (Floor Division)**
```javascript
Input:
  people = 6
  periods = 2
  recurrenceWeeks = 5

Expected Output:
  spacing = floor(5/2) = 2
  assignments[0-1]: weekOffset=0
  assignments[2-3]: weekOffset=2
  assignments[4-5]: weekOffset=4

Verification:
  ✓ All week offsets < recurrenceWeeks (0,2,4 < 5)
  ✓ Even spacing maintained
```

**Test 3: Single Slot (Maximum Recurrence)**
```javascript
Input:
  people = 6
  periods = 1 (Mon 10am)
  recurrenceWeeks = 6 (auto-calculated)

Expected Output:
  spacing = floor(6/1) = 6
  assignments[0]: weekOffset=0
  assignments[1]: weekOffset=6
  ... (each person in different week)

Verification:
  ✓ Each person has unique week offset
  ✓ No slot conflicts possible (only 1 slot)
```

**Test 4: Week Offset Calendar Creation**
```javascript
Input to calculateNextOccurrence:
  weekday = "Monday"
  startTimeMinutes = 600 (10:00)
  durationMinutes = 30
  weekOffset = 2
  today = Friday Jan 26, 2025

Expected Output:
  startDateTime = Monday Feb 12, 2025 10:00 AM
  endDateTime = Monday Feb 12, 2025 10:30 AM

Verification:
  ✓ Start date is 2 weeks after next Monday
  ✓ Duration is 30 minutes
```

---

## Error Handling

**No new error cases introduced** - all existing validation remains:
- Empty people array → caught by `createAllMeetings()`
- Empty periods array → caught by `createAllMeetings()`
- Invalid weekday → caught by `calculateNextOccurrence()`
- Negative weekOffset → undefined behavior (precondition violation)

**Recommendation**: Add validation in `executeScheduling()`:
```javascript
if (assignment.weekOffset < 0) {
  throw new Error('Invalid weekOffset: must be >= 0');
}
```

---

## Backward Compatibility

**Breaking Changes**: None

**Compatibility Notes**:
- Existing calls to `calculateNextOccurrence()` with 3 parameters will fail (new parameter required)
- However, `calculateNextOccurrence()` is **internal function** (not exported/called by UI)
- Only called by `executeScheduling()`, which is modified to pass `weekOffset`
- Public API (`createAllMeetings()`, `regenerateAllMeetings()`) signatures unchanged

**Migration Path**: None required - internal refactoring only

---

## Performance Contract

**Complexity**:
- `assignPeopleToPeriods()`: O(n) where n = number of people (unchanged)
- `calculateNextOccurrence()`: O(1) (unchanged - simple date math)
- `executeScheduling()`: O(n) where n = number of people (unchanged)

**Execution Time** (estimated for 100 people):
- Assignment calculation: < 10ms
- Calendar event creation: ~200-300s (2-3s per event, API rate limited)
- Total: Within 6-minute Google Apps Script limit ✅

---

## Summary

**Modified Functions**: 3
1. `assignPeopleToPeriods()` - New interval stride algorithm
2. `calculateNextOccurrence()` - Added weekOffset parameter
3. `executeScheduling()` - Pass weekOffset to calculateNextOccurrence()

**Unchanged Functions**: 7 (retain Feature 006 contracts)

**Breaking Changes**: None (internal refactoring only)

**Ready for Implementation** ✅
