# Research: Optimized Meeting Slot Distribution

**Feature**: 007-when-scheduling-meetings
**Date**: 2025-01-30
**Phase**: 0 (Outline & Research)

## Research Questions

### 1. Interval Stride Distribution Algorithm

**Question**: How should the interval stride distribution algorithm work to achieve even spacing of meetings across the recurrence cycle?

**Decision**: Use a two-dimensional assignment algorithm that groups people by week offset

**Rationale**:
- The formula `spacing = recurrence_interval / weekly_slots` determines how many week offsets exist in the cycle
- Example: 4-week recurrence with 2 slots/week → spacing = 2, so week offsets are [0, 2]
- People are assigned in groups of `weekly_slots` to each week offset
- Within each week offset, people are assigned to different time slots (no slot reuse)

**Algorithm Pseudocode**:
```javascript
function assignPeopleWithIntervalStride(people, periods, recurrenceWeeks) {
  var slotsPerWeek = periods.length;
  var spacing = Math.floor(recurrenceWeeks / slotsPerWeek);
  var assignments = [];

  for (var i = 0; i < people.length; i++) {
    var weekOffset = Math.floor(i / slotsPerWeek) * spacing;
    var slotIndex = i % slotsPerWeek;
    var period = periods[slotIndex];

    assignments.push({
      person: people[i],
      weekday: period.weekday,
      start Time: period.startTime,
      endTime: period.endTime,
      weekOffset: weekOffset,
      recurrenceWeeks: recurrenceWeeks
    });
  }

  return assignments;
}
```

**Alternatives Considered**:
1. **Round-robin (current implementation)**: Rejected because it doesn't guarantee even distribution - can cluster meetings in early weeks
2. **Random distribution**: Rejected because it's non-deterministic and may still create clusters
3. **Greedy spacing maximization**: Rejected as overly complex for diminishing returns

**Implementation Impact**: Requires modifying `assignPeopleToPeriods()` function in `SchedulingService.gs` (lines 69-90)

---

### 2. Week Offset Tracking and Calendar Event Creation

**Question**: How should the week offset be incorporated into calendar event creation to schedule meetings at the correct starting week?

**Decision**: Modify `calculateNextOccurrence()` to accept a `weekOffset` parameter and add that many weeks to the calculated start date

**Rationale**:
- Current implementation always schedules first occurrence in the next available week for that weekday
- With interval stride, we need to offset the start date by `weekOffset` weeks
- This ensures Person 3 (week offset 2) starts 2 weeks later than Person 1 (week offset 0)

**Modified Function Signature**:
```javascript
function calculateNextOccurrence(weekday, startTimeMinutes, durationMinutes, weekOffset) {
  // ... existing logic to find next occurrence of weekday ...

  // Add week offset
  startDate.setDate(startDate.getDate() + (weekOffset * 7));

  // ... rest of function ...
}
```

**Alternatives Considered**:
1. **Store week offset in person record**: Rejected because it violates "no data model changes" constraint
2. **Calculate week offset dynamically in createOneToOneMeeting()**: Rejected because it couples scheduling logic with calendar creation

**Implementation Impact**: Requires modifying:
- `calculateNextOccurrence()` (lines 142-179)
- `executeScheduling()` to pass weekOffset from assignment (lines 188-232)

---

###3. Slot Conflict Prevention Within Same Week

**Question**: Does the current `expandSlotsIntoPeriods()` implementation already prevent slot conflicts, or do we need additional logic?

**Decision**: Current implementation is sufficient - no changes needed

**Rationale**:
- `expandSlotsIntoPeriods()` creates a flat array of periods, where each period represents a unique (weekday, startTime, endTime) combination
- The interval stride algorithm assigns people to period indices (0, 1, 2, ..., slotsPerWeek-1)
- Within each week offset, people use different period indices → no slot reuse
- Across different week offsets, same period indices can be reused (this is desired behavior)

**Example**:
```
Periods: [Mon 10am, Wed 2pm]  (slotsPerWeek = 2)
Recurrence: 4 weeks
Spacing: 4/2 = 2

Person 1: period[0] = Mon 10am, weekOffset 0
Person 2: period[1] = Wed 2pm, weekOffset 0
Person 3: period[0] = Mon 10am, weekOffset 2
Person 4: period[1] = Wed 2pm, weekOffset 2

Week 0: Mon 10am (Person 1), Wed 2pm (Person 2) ✅ No conflict
Week 2: Mon 10am (Person 3), Wed 2pm (Person 4) ✅ No conflict
```

**Alternatives Considered**:
1. **Add explicit conflict checking**: Rejected as unnecessary - algorithm mathematically prevents conflicts
2. **Track used slots per week**: Rejected as adding complexity without benefit

**Implementation Impact**: None - existing logic is correct

---

### 4. Edge Case: Non-Integer Spacing

**Question**: How should the algorithm handle cases where `recurrence_interval / weekly_slots` is not an integer?

**Decision**: Use floor division to calculate spacing, which may result in uneven distribution for the last group

**Rationale**:
- Using `Math.floor()` ensures week offsets are always integers
- Example: 5-week recurrence, 2 slots/week → spacing = floor(5/2) = 2
  - Week offsets: 0, 2, 4 (3 week offsets for 6 slots)
  - This fills 6 slots but only 5 weeks exist, so last week offset (4) is valid
- The recurrence interval formula `max(min_recurrence, ceil(people_count / weekly_slots))` ensures sufficient capacity even with floor division

**Example Calculation**:
```
People: 6, Slots/week: 2, Min recurrence: 3
Recurrence: max(3, ceil(6/2)) = max(3, 3) = 3 weeks
Spacing: floor(3/2) = 1 week
Week offsets: 0, 1, 2 (6 slots distributed as 2-2-2) ✅ Perfect distribution

People: 7, Slots/week: 2, Min recurrence: 3
Recurrence: max(3, ceil(7/2)) = max(3, 4) = 4 weeks
Spacing: floor(4/2) = 2 weeks
Week offsets: 0, 2, 4, 6 (8 slots available, only 7 people) ✅ Sufficient capacity
```

**Alternatives Considered**:
1. **Ceiling division**: Rejected because it could create week offsets beyond recurrence interval
2. **Dynamic spacing per group**: Rejected as overly complex

**Implementation Impact**: Use `Math.floor(recurrenceWeeks / slotsPerWeek)` in assignment algorithm

---

### 5. Regeneration Behavior Consistency

**Question**: Does the existing `regenerateAllMeetings()` function properly implement the "delete all then recreate" pattern specified in the clarifications?

**Decision**: Yes, current implementation is correct - no changes needed

**Rationale**:
- Lines 639-671 delete all existing meetings by iterating through people and calling `deleteEventSeries()`
- Lines 676-747 recreate meetings using the same logic as `createAllMeetings()`
- The delete phase clears `calendarEventId` from person records
- The create phase generates fresh assignments and updates person records with new event IDs

**Verification** (from SchedulingService.gs):
- Line 647: `eventSeries.deleteEventSeries()` - deletes calendar event
- Line 666: `peopleSheet.getRange(rowIndex, 3).setValue('')` - clears DB reference
- Line 722: `assignPeopleToPeriods(people, periods, recurrenceWeeks)` - fresh assignment
- Line 741: `peopleSheet.getRange(rowIndex, 3).setValue(result.eventId)` - updates DB

**Alternatives Considered**:
None - implementation already matches specification

**Implementation Impact**: None - existing regeneration logic is correct and will automatically use the new interval stride algorithm once `assignPeopleToPeriods()` is updated

---

## Best Practices

### Google Apps Script Performance

**Research**: Best practices for Google Apps Script performance optimization

**Findings**:
1. **Batch Operations**: Current implementation already uses `batchRead()` for sheet access ✅
2. **Minimize API Calls**: Calendar event creation is batched within the loop - acceptable for up to 100 people
3. **Execution Time Limits**: 6-minute limit for Apps Script - 100 people × 2 seconds/event = 200 seconds < 360 seconds ✅
4. **Avoid Array Mutation**: Use `.push()` instead of reassignment for array building ✅ (already implemented)

**Application**: No changes needed - current performance patterns are optimal for this scale

### JavaScript ES5 Compatibility

**Research**: Compatibility constraints for Google Apps Script V8 runtime

**Findings**:
- Must use `var` instead of `let`/`const` ✅
- Must use `function` declarations instead of arrow functions at global scope ✅
- Can use array methods like `.map()`, `.filter()`, `.forEach()` ✅
- Must use `Math.floor()` instead of integer division (`~~` or `|0`) for clarity ✅

**Application**: All research pseudocode follows ES5 conventions

---

## Implementation Checklist

Based on research findings:

- [ ] Modify `assignPeopleToPeriods()` to implement interval stride algorithm
- [ ] Add `weekOffset` parameter to `calculateNextOccurrence()`
- [ ] Update `executeScheduling()` to pass `weekOffset` from assignment to `calculateNextOccurrence()`
- [ ] Add unit test cases for:
  - [ ] Even people count (4 people, 2 slots, 4-week recurrence)
  - [ ] Odd people count (5 people, 2 slots, 4-week recurrence)
  - [ ] Single slot (6 people, 1 slot, 4-week min recurrence → 6-week actual)
  - [ ] Non-integer spacing (7 people, 2 slots, 4-week recurrence)
- [ ] Verify no regressions in existing createAllMeetings() and regenerateAllMeetings() flows
- [ ] Manual testing with real calendar to verify week offset calculations

---

## Summary

**All research questions resolved** - No NEEDS CLARIFICATION items remain.

**Key Decisions**:
1. Interval stride algorithm with floor division for spacing calculation
2. Week offset parameter added to calculateNextOccurrence()
3. No data model or UI changes required
4. Existing regeneration and slot expansion logic is correct

**Ready for Phase 1** (Design & Contracts)
