# Quickstart: Implementing Optimized Meeting Slot Distribution

**Feature**: 007-when-scheduling-meetings
**Date**: 2025-01-30
**Estimated Time**: 2-3 hours

## Prerequisites

- Feature 006 (one-to-one meeting scheduler) must be fully implemented and functional
- Access to `src/services/SchedulingService.gs` for editing
- Google Apps Script development environment (clasp CLI or Apps Script web editor)
- Test Google Calendar for verification

## Implementation Steps

### Step 1: Modify `assignPeopleToPeriods()` Function

**File**: `src/services/SchedulingService.gs`
**Lines**: 63-90 (replace entire function)

**Action**: Replace the round-robin algorithm with interval stride distribution

**Original Code** (lines 69-90):
```javascript
function assignPeopleToPeriods(people, periods, recurrenceWeeks) {
  var assignments = [];
  var periodIndex = 0;

  for (var i = 0; i < people.length; i++) {
    var person = people[i];
    var period = periods[periodIndex];

    assignments.push({
      person: person,
      weekday: period.weekday,
      startTime: period.startTime,
      endTime: period.endTime,
      recurrenceWeeks: recurrenceWeeks
    });

    // Move to next period (round-robin)
    periodIndex = (periodIndex + 1) % periods.length;
  }

  return assignments;
}
```

**New Code**:
```javascript
/**
 * Assign people to meeting periods using interval stride distribution
 * Ensures even spacing across recurrence cycle and prevents slot conflicts within same week
 * @param {Array<Object>} people - Array of Person objects
 * @param {Array<Object>} periods - Array of period objects
 * @param {number} recurrenceWeeks - Recurrence interval in weeks
 * @returns {Array<Object>} Array of assignments {person, period, weekOffset}
 */
function assignPeopleToPeriods(people, periods, recurrenceWeeks) {
  var assignments = [];
  var slotsPerWeek = periods.length;

  // Calculate spacing between week offsets
  var spacing = Math.floor(recurrenceWeeks / slotsPerWeek);

  for (var i = 0; i < people.length; i++) {
    var person = people[i];

    // Calculate week offset for even distribution
    var weekOffset = Math.floor(i / slotsPerWeek) * spacing;

    // Assign to slot within the week
    var slotIndex = i % slotsPerWeek;
    var period = periods[slotIndex];

    assignments.push({
      person: person,
      weekday: period.weekday,
      startTime: period.startTime,
      endTime: period.endTime,
      weekOffset: weekOffset,          // NEW: Week offset within recurrence cycle
      recurrenceWeeks: recurrenceWeeks
    });
  }

  return assignments;
}
```

**Changes**:
- Added `slotsPerWeek` calculation
- Added `spacing` calculation using floor division
- Replaced `periodIndex` with `weekOffset` and `slotIndex` calculations
- Added `weekOffset` field to assignment object

---

### Step 2: Add `weekOffset` Parameter to `calculateNextOccurrence()`

**File**: `src/services/SchedulingService.gs`
**Lines**: 136-179 (modify function signature and logic)

**Action**: Add `weekOffset` parameter and apply offset to calculated start date

**Original Function Signature** (line 142):
```javascript
function calculateNextOccurrence(weekday, startTimeMinutes, durationMinutes) {
```

**New Function Signature**:
```javascript
function calculateNextOccurrence(weekday, startTimeMinutes, durationMinutes, weekOffset) {
```

**Original Code Block** (lines 154-169):
```javascript
// Calculate days until next occurrence
var daysUntil = (targetDay - currentDay + 7) % 7;
if (daysUntil === 0) {
  daysUntil = 7; // If it's today, schedule for next week
}

// Create start date/time
var startDate = new Date(today);
startDate.setDate(today.getDate() + daysUntil);
startDate.setHours(Math.floor(startTimeMinutes / 60));
startDate.setMinutes(startTimeMinutes % 60);
startDate.setSeconds(0);
startDate.setMilliseconds(0);

// Create end date/time
var endDate = new Date(startDate);
endDate.setMinutes(endDate.getMinutes() + durationMinutes);
```

**New Code Block**:
```javascript
// Calculate days until next occurrence
var daysUntil = (targetDay - currentDay + 7) % 7;
if (daysUntil === 0) {
  daysUntil = 7; // If it's today, schedule for next week
}

// Create start date/time
var startDate = new Date(today);
startDate.setDate(today.getDate() + daysUntil);

// NEW: Apply week offset
startDate.setDate(startDate.setDate() + (weekOffset * 7));

startDate.setHours(Math.floor(startTimeMinutes / 60));
startDate.setMinutes(startTimeMinutes % 60);
startDate.setSeconds(0);
startDate.setMilliseconds(0);

// Create end date/time
var endDate = new Date(startDate);
endDate.setMinutes(endDate.getMinutes() + durationMinutes);
```

**Changes**:
- Added `weekOffset` parameter to function signature (line 142)
- Added week offset calculation after initial date calculation (insert after line 164)
- Updated JSDoc comment to document new parameter (lines 136-141)

**Updated JSDoc** (lines 136-141):
```javascript
/**
 * Calculate next occurrence date for a given weekday with week offset
 * @param {string} weekday - Day of week (Monday, Tuesday, etc.)
 * @param {number} startTimeMinutes - Start time in minutes since midnight
 * @param {number} durationMinutes - Meeting duration in minutes
 * @param {number} weekOffset - Number of weeks to offset the start date
 * @returns {Object} {startDateTime: Date, endDateTime: Date}
 */
```

---

### Step 3: Pass `weekOffset` in `executeScheduling()`

**File**: `src/services/SchedulingService.gs`
**Lines**: 188-232 (modify line 197)

**Action**: Pass `assignment.weekOffset` to `calculateNextOccurrence()` call

**Original Code** (line 197):
```javascript
var occurrence = calculateNextOccurrence(assignment.weekday, startTimeMinutes, durationMinutes);
```

**New Code** (line 197):
```javascript
var occurrence = calculateNextOccurrence(assignment.weekday, startTimeMinutes, durationMinutes, assignment.weekOffset);
```

**Changes**:
- Added fourth parameter `assignment.weekOffset` to function call

---

## Testing Checklist

### Manual Testing

**Test 1: Basic Even Distribution**
1. Configure 4 people in OneToOnePeople sheet
2. Configure 2 weekly slots (e.g., Monday 10am, Wednesday 2pm) in OneToOneSlots sheet
3. Set minRecurrenceIntervalWeeks = 4 in OneToOneConfig sheet
4. Click "Schedule All Meetings" in UI
5. **Expected Result**:
   - 2 meetings created in week 1 (Monday and Wednesday)
   - 2 meetings created in week 3 (Monday and Wednesday)
   - Recurrence interval = 4 weeks
6. **Verify in Google Calendar**:
   - Check that Person 1's meeting is Monday of current week
   - Check that Person 3's meeting is Monday of week 3 (2 weeks from now)

**Test 2: Single Slot (High Recurrence)**
1. Configure 6 people
2. Configure 1 weekly slot (e.g., Tuesday 3pm)
3. Set minRecurrenceIntervalWeeks = 4
4. Click "Schedule All Meetings"
5. **Expected Result**:
   - Recurrence interval = 6 weeks (auto-calculated: max(4, ceil(6/1)))
   - Each person's meeting starts in different week (weeks 0, 6, 12, 18, 24, 30)
6. **Verify in Calendar**:
   - Person 1: Tuesday of week 1
   - Person 2: Tuesday of week 7
   - Person 3: Tuesday of week 13

**Test 3: Regeneration**
1. With existing meetings from Test 1
2. Add 2 more people (total 6)
3. Click "Regenerate All Meetings"
4. **Expected Result**:
   - All old meetings deleted
   - 6 new meetings created
   - New recurrence interval = 4 weeks (max(4, ceil(6/2)) = max(4, 3))
   - Distribution: 3 meetings in week 0, 3 meetings in week 2

**Test 4: Non-Integer Spacing**
1. Configure 7 people
2. Configure 2 weekly slots
3. Set minRecurrenceIntervalWeeks = 3
4. Click "Schedule All Meetings"
5. **Expected Result**:
   - Recurrence interval = 4 weeks (max(3, ceil(7/2)) = max(3, 4))
   - Spacing = floor(4/2) = 2
   - Distribution: 2 meetings in week 0, 2 in week 2, 2 in week 4, 1 in week 6

### Regression Testing

**Verify Existing Features Still Work**:
- [ ] Create new meetings (first time) works
- [ ] View meetings shows correct list
- [ ] Delete individual meeting works
- [ ] Regenerate all meetings works
- [ ] Meeting duration settings respected
- [ ] Minimum recurrence interval settings respected

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
2. Navigate to `src/services/SchedulingService.gs`
3. Apply the three code changes documented above
4. Click "Save" (Ctrl+S)
5. Test using the web app UI

---

## Rollback Plan

If issues occur, revert the three changes:

1. **Revert `assignPeopleToPeriods()`**: Restore round-robin logic (remove `weekOffset` calculation)
2. **Revert `calculateNextOccurrence()`**: Remove `weekOffset` parameter and offset calculation
3. **Revert `executeScheduling()`**: Remove fourth parameter from function call

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

### Issue: Meetings not evenly distributed

**Symptom**: All meetings appear in the same week

**Diagnosis**:
1. Check `assignPeopleToPeriods()` - verify `spacing` calculation is correct
2. Log `weekOffset` values in console
3. Verify `calculateNextOccurrence()` is adding offset correctly

**Fix**: Ensure line "startDate.setDate(startDate.getDate() + (weekOffset * 7))" is present

---

### Issue: Meetings start too far in the future

**Symptom**: First person's meeting is several weeks away

**Diagnosis**:
1. Check if `weekOffset` is being applied twice
2. Verify Person 1 (index 0) has `weekOffset = 0`

**Fix**: Ensure `weekOffset` formula is `Math.floor(i / slotsPerWeek) * spacing`, not `Math.ceil()`

---

### Issue: Duplicate meetings in same slot/week

**Symptom**: Two people have meetings at the same time in the same week

**Diagnosis**:
1. Check that `slotIndex = i % slotsPerWeek` is correctly cycling through periods
2. Verify `periods` array is populated correctly

**Fix**: Ensure `expandSlotsIntoPeriods()` is returning correct period array

---

## Validation Criteria

**Feature is successfully implemented when**:
- ✅ `assignPeopleToPeriods()` includes `weekOffset` field in assignments
- ✅ `calculateNextOccurrence()` accepts and applies `weekOffset` parameter
- ✅ `executeScheduling()` passes `weekOffset` to `calculateNextOccurrence()`
- ✅ Test 1 (4 people, 2 slots, 4-week recurrence) shows meetings in weeks 0 and 2
- ✅ Test 2 (6 people, 1 slot) shows 6-week recurrence with each person in different week
- ✅ Test 3 (regeneration) successfully deletes and recreates with new distribution
- ✅ All existing Feature 006 functionality works without regression

---

## Next Steps

After successful implementation and testing:

1. Run `/speckit.tasks` to generate implementation task breakdown
2. Create pull request with changes
3. Update CLAUDE.md with new feature documentation
4. Mark feature 007 as IMPLEMENTED in project tracking

---

## Reference Files

- **Specification**: `specs/007-when-scheduling-meetings/spec.md`
- **API Contract**: `specs/007-when-scheduling-meetings/contracts/SchedulingService.md`
- **Data Model**: `specs/007-when-scheduling-meetings/data-model.md`
- **Research**: `specs/007-when-scheduling-meetings/research.md`
- **Implementation File**: `src/services/SchedulingService.gs`

---

## Estimated Time Breakdown

- Step 1 (modify assignPeopleToPeriods): 30 minutes
- Step 2 (add weekOffset parameter): 30 minutes
- Step 3 (pass weekOffset in executeScheduling): 10 minutes
- Manual testing (all 4 tests): 60 minutes
- Regression testing: 30 minutes
- **Total**: 2.5-3 hours

---

## Success Criteria

Feature is complete when:
1. All three code changes deployed
2. All 4 manual tests pass
3. All regression tests pass
4. No console errors in Apps Script execution log
5. Calendar events created with correct week offsets
6. Meeting distribution matches spec.md requirements (SC-003: standard deviation within 1.0)
