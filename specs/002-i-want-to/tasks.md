# Implementation Tasks: Availability Finder

**Feature**: 002-i-want-to (Availability Finder)
**Branch**: `002-i-want-to`
**Date**: 2025-01-11

## Overview

This document provides a complete task breakdown for implementing the Availability Finder feature, organized by user story to enable incremental delivery and independent testing.

**Implementation Strategy**: MVP-first approach focusing on User Story 1 (P1), followed by incremental enhancement with US2 (P2) and US3 (P3).

---

## Phase 1: Setup & Foundation

**Goal**: Establish shared infrastructure required by all user stories.

**Tasks**:

### T001: Create DateUtils.gs utility file [P] ✅
**Story**: Foundation
**File**: `src/utils/DateUtils.gs`
**Description**: Create utility functions for date/time operations needed across all stories.
**Status**: COMPLETE
**Implementation**:
- Create `isWorkingDay(date)` - returns true for Mon-Fri, false for Sat-Sun
- Create `countWorkingDays(startDate, endDate)` - counts working days in range
- Create `getDaysBetween(startDate, endDate)` - returns array of dates
- Create `formatTime12Hour(date)` - formats as "9:00 AM" or "2:30 PM"
- Create `formatDuration(minutes)` - formats as "1 hour 30 minutes"
- Create `roundToQuarterHour(date)` - rounds to nearest 15-min boundary
- Create `clipToWorkingHours(startTime, endTime, date)` - clips to 09:00-17:30
**Acceptance**: All utility functions work correctly with test cases from quickstart.md
**Reference**: quickstart.md Phase 0, contracts/service-layer.md

### T002: Create TimeSlot.gs model file [P] ✅
**Story**: Foundation
**File**: `src/models/TimeSlot.gs`
**Description**: Create data model for representing available time slots.
**Status**: COMPLETE
**Implementation**:
- Create `createTimeSlot(date, startTime, endTime)` factory function
  - Calculate `durationMinutes` from startTime/endTime
  - Populate formatted fields using DateUtils functions
  - Return TimeSlot object per data-model.md spec
- Create `validateTimeSlot(slot)` validation function
  - Check duration ≥ 15 minutes (FR-018)
  - Check startTime < endTime
  - Check times within working hours (09:00-17:30)
  - Check date is working day
  - Return boolean
**Acceptance**: TimeSlot objects can be created and validated correctly
**Reference**: data-model.md section 1, quickstart.md Phase 1

### T003: Create CalendarService.gs service file [P] ✅
**Story**: Foundation
**File**: `src/services/CalendarService.gs`
**Description**: Create abstraction layer for Google Calendar API operations.
**Status**: COMPLETE
**Implementation**:
- Create `getCalendarEvents(calendarId, startDate, endDate)` function
  - Use `CalendarApp.getCalendarById(calendarId).getEvents(startDate, endDate)`
  - Convert to CalendarEvent objects using existing `createEventFromGCal()`
  - Handle errors: calendar not found, access denied
  - Log event count with Logger
  - Return array of CalendarEvent objects
- Create `getCalendarById(calendarId)` function
  - Retrieve calendar metadata
  - Return `{ id, name, isPrimary, color }` object
  - Handle calendar not found
**Acceptance**: Can retrieve events from selected calendar and handle errors gracefully
**Reference**: contracts/service-layer.md CalendarService, quickstart.md Phase 2

---

## Phase 2: User Story 1 (P1) - Find Available Time Slots 🎯 MVP

**Goal**: Implement core availability search functionality.

**Independent Test Criteria**:
- Can select date range and click "Find Availability"
- System displays all available time slots during working hours (09:00-17:30)
- Weekends excluded from results
- Slots grouped by date and sorted chronologically
- Edge cases handled: all-day events, events outside working hours, overlapping events

**User Story**: As a calendar user, I want to quickly find all my available time slots within a date range so I can schedule new meetings or understand when I'm free.

**Requirements**: FR-001 through FR-010, FR-012 through FR-020 (core requirements)

**Tasks**:

### T004: Create AvailabilityService.gs - Constants & Intervals [US1] ✅
**Story**: US1 (P1)
**File**: `src/services/AvailabilityService.gs`
**Description**: Create core availability calculation service with constants and interval generation.
**Status**: COMPLETE
**Implementation**:
- Define `WORKING_HOURS` constant object:
  ```javascript
  {
    START_HOUR: 9,
    START_MINUTE: 0,
    END_HOUR: 17,
    END_MINUTE: 30,
    TOTAL_MINUTES: 510,
    INTERVAL_MINUTES: 15,
    INTERVALS_PER_DAY: 34
  }
  ```
- Define `ERROR_MESSAGES` constant object with all validation messages
- Create `generateWorkingDayIntervals(date)` function
  - Generate 34 intervals from 09:00 to 17:30 in 15-minute increments
  - Each interval: `{ startTime: Date, endTime: Date, isBusy: false }`
  - Return array of TimeInterval objects
**Acceptance**: Can generate 34 intervals for any working day
**Reference**: contracts/service-layer.md AvailabilityService, quickstart.md Phase 3.1

### T005: Implement markIntervalsAsBusy function [US1] ✅
**Story**: US1 (P1)
**File**: `src/services/AvailabilityService.gs`
**Description**: Add logic to mark intervals as busy based on calendar events.
**Status**: COMPLETE
**Implementation**:
- Create `markIntervalsAsBusy(intervals, events)` function
- For each event:
  - If all-day event (FR-014): mark all 34 intervals as busy
  - Otherwise: clip event to working hours using `clipToWorkingHours()` (FR-012)
  - Mark overlapping intervals as busy (FR-015)
- Modify `intervals` array in place (no return value)
- Handle edge cases: events starting before 09:00, events ending after 17:30
**Acceptance**: Intervals correctly marked for all-day events, clipped events, and overlapping events
**Reference**: quickstart.md Phase 3.2

### T006: Implement intervalsToTimeSlots function [US1] ✅
**Story**: US1 (P1)
**File**: `src/services/AvailabilityService.gs`
**Description**: Merge free intervals into continuous time slots.
**Status**: COMPLETE
**Implementation**:
- Create `intervalsToTimeSlots(intervals)` function
- Iterate through intervals, merge consecutive free intervals
- When encountering busy interval or end of day, finalize current slot
- Use `createTimeSlot()` to create TimeSlot objects with formatted fields
- Filter out slots < 15 minutes (FR-018)
- Return array of TimeSlot objects
**Acceptance**: Free intervals correctly merged into slots, slots < 15min excluded
**Reference**: quickstart.md Phase 3.3

### T007: Implement validateAvailabilityRequest function [US1] ✅
**Story**: US1 (P1)
**File**: `src/services/AvailabilityService.gs`
**Description**: Validate availability search requests.
**Status**: COMPLETE
**Implementation**:
- Create `validateAvailabilityRequest(startDate, endDate, calendarId)` function
- Check start date ≤ end date (FR-010)
- Check date range ≤ 7 days (FR-016)
- Check range contains ≥ 1 working day using `countWorkingDays()` (FR-020)
- Check calendar ID is non-empty and accessible
- Return `{ valid: true }` or `{ valid: false, error: "message", errorType: "validation" }`
**Acceptance**: All validation rules enforced, appropriate error messages returned
**Reference**: quickstart.md Phase 3.4, contracts/service-layer.md

### T008: Implement calculateAvailability function [US1] ✅
**Story**: US1 (P1)
**File**: `src/services/AvailabilityService.gs`
**Description**: Orchestrate availability calculation across date range.
**Status**: COMPLETE
**Implementation**:
- Create `calculateAvailability(events, startDate, endDate, minDurationMinutes)` function
- Get all days in range using `getDaysBetween()`
- Filter to working days using `isWorkingDay()` (FR-004)
- For each working day:
  - Generate intervals using `generateWorkingDayIntervals()`
  - Filter events to current day
  - Mark intervals busy using `markIntervalsAsBusy()`
  - Convert to slots using `intervalsToTimeSlots()`
- Flatten all slots into single array
- Filter by `minDurationMinutes` if provided
- Sort slots by date, then time (FR-007)
- Return array of TimeSlot objects
**Acceptance**: Correctly calculates availability across multiple days, handles all edge cases
**Reference**: quickstart.md Phase 3.5, contracts/service-layer.md

### T009: Add findAvailability server function to Code.gs [US1] ✅
**Story**: US1 (P1)
**File**: `src/Code.gs`
**Description**: Expose availability search to client via google.script.run.
**Status**: COMPLETE
**Implementation**:
- Update `validUtilities` array: add 'Availability' to the list
- Create `findAvailability(startDateStr, endDateStr, minDurationMinutes)` function
  - Parse ISO date strings to Date objects
  - Get selected calendar from config using `getConfig()`
  - Validate request using `validateAvailabilityRequest()`
  - If validation fails, return error response
  - Call `getCalendarEvents()` to retrieve events
  - Call `calculateAvailability()` to compute slots
  - Build AvailabilityResponse object with slots and metadata
  - Handle errors with try-catch, return structured error response
- Create `getSelectedCalendar()` helper function
  - Return current calendar info or error if none selected
**Acceptance**: Server functions callable from client, return correct response format
**Reference**: contracts/server-functions.md, quickstart.md Phase 4

### T010: Update Menu.html to add Availability button [US1] ✅
**Story**: US1 (P1)
**File**: `src/ui/Menu.html`
**Description**: Add "Find Availability" button to main menu.
**Status**: COMPLETE
**Implementation**:
- Add fourth button after Cleanup button (around line 46):
  ```html
  <button onclick="navigateToUtility('Availability')" id="availabilityBtn" disabled>
    <strong>Find Availability</strong>
    <div style="font-size: 0.875rem; font-weight: 400; margin-top: 0.25rem;">
      Find available time slots in your calendar for scheduling meetings
    </div>
  </button>
  ```
- Update `enableUtilityButtons()` function: add line to enable `availabilityBtn`
- Update `disableUtilityButtons()` function: add line to disable `availabilityBtn`
**Acceptance**: Button appears in menu, enables when calendar selected (FR-001)
**Reference**: quickstart.md Phase 5.1

### T011: Create Availability.html UI [US1] ✅
**Story**: US1 (P1)
**File**: `src/ui/Availability.html`
**Description**: Create full availability finder user interface.
**Status**: COMPLETE
**Implementation**:
- Create HTML structure:
  - Back button to menu (FR-013)
  - H1 heading "Find Availability"
  - Calendar info display
  - Search form card with:
    - Start date input (FR-002)
    - End date input (FR-002)
    - "Find Availability" button
  - Loading indicator
  - Results section (initially hidden)
  - Empty state for no results (FR-009)
  - Error message area
- Implement JavaScript functions:
  - `initializeAvailabilityScreen()` - load selected calendar, set default dates
  - `handleFindAvailability(event)` - form submission handler
    - Client-side validation (start ≤ end, range ≤ 7 days)
    - Call `findAvailability()` via google.script.run
  - `displayResults(response)` - render slots grouped by date (FR-007)
  - `groupSlotsByDate(slots)` - group slots into date buckets
  - `formatDate(date)` - format date headers
  - `showError(message)`, `showEmptyState()`, `showLoading(show)`
  - `navigateToMenu()` - return to menu via `window.top.location.reload()`
- Display format:
  - Date headers with date formatted (e.g., "Mon, Jan 15, 2025")
  - Slots with times in 12-hour format (FR-019): "9:00 AM - 10:30 AM"
  - Duration displayed: "(1 hour 30 minutes)" (FR-008)
  - Chronological sorting within each date (earliest first)
- Use existing Styles.html for consistent design
**Acceptance**: Complete UI flow from form to results display, all FRs satisfied
**Reference**: quickstart.md Phase 5.2, contracts/server-functions.md

---

**Checkpoint: User Story 1 Complete** ✅
- Test all acceptance scenarios from spec.md User Story 1
- Verify edge cases: all-day events, clipped events, overlapping events, weekend-only ranges
- Confirm performance: < 5 seconds for 7-day range (SC-001)
- Deploy and test in Google Sites iframe

---

## Phase 3: User Story 2 (P2) - Filter Availability by Duration

**Goal**: Add minimum duration filtering to enhance slot relevance.

**Independent Test Criteria**:
- Can set minimum duration filter (30 min, 1 hour, 2 hours)
- Only slots matching or exceeding minimum duration are displayed
- Filter applied client-side without server round-trip

**User Story**: As a calendar user, I want to filter available slots by minimum duration so I only see slots long enough for my intended meeting.

**Requirements**: FR-011 (optional minimum duration filter)

**Tasks**:

### T012: Add minimum duration dropdown to Availability.html [US2]
**Story**: US2 (P2)
**File**: `src/ui/Availability.html`
**Description**: Add optional minimum duration filter to search form.
**Implementation**:
- Add form group after end date input:
  ```html
  <div class="form-group">
    <label for="minDuration">Minimum Duration (optional):</label>
    <select id="minDuration">
      <option value="15">Any duration (15 min+)</option>
      <option value="30">30 minutes</option>
      <option value="60">1 hour</option>
      <option value="120">2 hours</option>
    </select>
  </div>
  ```
- Update `handleFindAvailability()` to read `minDuration` value
- Pass `minDuration` to `findAvailability()` server call
- Update `displayResults()` to show applied filter in metadata
**Acceptance**: Minimum duration filter works, slots filtered correctly (FR-011)
**Reference**: research.md section 6, spec.md US2

---

**Checkpoint: User Story 2 Complete** ✅
- Test all acceptance scenarios from spec.md User Story 2
- Verify filtering behavior: 1-hour filter, 2-hour filter with short gaps
- Confirm client-side filtering works without server call

---

## Phase 4: User Story 3 (P3) - Export Availability Results

**Goal**: Enable users to export and share availability results.

**Independent Test Criteria**:
- Can click "Export" button after viewing results
- System generates text summary organized by date
- Export handles empty results gracefully

**User Story**: As a calendar user, I want to export my availability results so I can share them with colleagues or save for reference.

**Requirements**: Export functionality (not explicitly in FRs, but in US3)

**Tasks**:

### T013: Add export functionality to Availability.html [US3]
**Story**: US3 (P3)
**File**: `src/ui/Availability.html`
**Description**: Add export button and generate text summary of results.
**Implementation**:
- Add "Export" button to results section (visible only when results exist)
- Create `exportResults(slots, metadata)` function:
  - Generate text summary organized by date
  - Format: Plain text with date headers and slot listings
  - Example format:
    ```
    Availability: Jan 15 - Jan 19, 2025
    Working days: 5
    Total slots: 12

    Mon, Jan 15, 2025:
    - 9:00 AM - 10:00 AM (1 hour)
    - 11:00 AM - 5:30 PM (6 hours 30 minutes)

    Tue, Jan 16, 2025:
    ...
    ```
- Copy to clipboard or display in modal/textarea for user to copy
- Handle empty results: show "No availability to export" message
**Acceptance**: Export produces readable text summary, all acceptance scenarios pass
**Reference**: spec.md US3

---

**Checkpoint: User Story 3 Complete** ✅
- Test all acceptance scenarios from spec.md User Story 3
- Verify export format is readable and organized
- Confirm empty results handled appropriately

---

## Phase 5: Polish & Integration

**Goal**: Final refinements, cross-cutting concerns, and deployment preparation.

**Tasks**:

### T014: Cross-device testing and responsive adjustments [Polish]
**Story**: Integration
**Files**: `src/ui/Availability.html`, `src/ui/Styles.html` (if needed)
**Description**: Test and adjust UI for mobile and desktop viewports.
**Implementation**:
- Test Availability.html in Google Sites iframe on desktop browser
- Test on mobile viewport (responsive mode or actual device)
- Adjust CSS if needed for form inputs, buttons, result cards
- Verify back button navigation works on all devices
- Confirm loading states visible and clear
**Acceptance**: UI works correctly on desktop and mobile viewports
**Reference**: quickstart.md Testing Checklist

### T015: Performance validation and optimization [Polish]
**Story**: Integration
**Files**: All service files
**Description**: Validate performance meets success criteria.
**Implementation**:
- Test with 7-day range, ~140 events (20 events/day)
- Measure execution time: should be < 5 seconds (SC-001)
- Test with empty calendar (optimization case)
- Add timing logs to `findAvailability()` function
- If performance issues: review interval generation, event filtering
**Acceptance**: Performance meets SC-001 (< 5 seconds for 7-day range)
**Reference**: spec.md Success Criteria

### T016: Error handling validation [Polish]
**Story**: Integration
**Files**: `src/services/AvailabilityService.gs`, `src/ui/Availability.html`
**Description**: Validate all error cases display appropriate messages.
**Implementation**:
- Test validation errors:
  - Start date after end date (FR-010)
  - Date range > 7 days (FR-016)
  - Weekend-only range (FR-020)
- Test API errors: remove calendar access, verify error handling
- Test edge cases: fully booked day, all-day events
- Verify error messages are user-friendly and actionable
- Confirm errors don't crash UI, can recover gracefully
**Acceptance**: All error scenarios handled with clear messages
**Reference**: quickstart.md Testing Checklist, spec.md Edge Cases

### T017: Final deployment and documentation [Polish]
**Story**: Integration
**Files**: None (deployment)
**Description**: Deploy updated web app and update deployment documentation.
**Implementation**:
- Run Apps Script deployment: Publish → Deploy as web app → Update
- Test deployed version in Google Sites iframe
- Verify all features work in production environment
- Update DEPLOY.md if needed with any new deployment notes
- Run complete end-to-end test: select calendar → navigate to availability → search → view results
**Acceptance**: Feature fully deployed and working in production
**Reference**: quickstart.md Deployment section

---

## Task Summary

**Total Tasks**: 17
- **Phase 1 (Setup & Foundation)**: 3 tasks (T001-T003)
- **Phase 2 (US1 - P1 MVP)**: 8 tasks (T004-T011)
- **Phase 3 (US2 - P2)**: 1 task (T012)
- **Phase 4 (US3 - P3)**: 1 task (T013)
- **Phase 5 (Polish)**: 4 tasks (T014-T017)

**Parallelization Opportunities**:
- Phase 1: All 3 tasks can run in parallel (different files)
- Phase 2: T004-T008 are sequential (same file), T009-T011 can run in parallel after T008 complete
- Phase 3-5: Sequential dependencies on previous phases

**Story Distribution**:
- **Foundation**: 3 tasks (DateUtils, TimeSlot model, CalendarService)
- **US1 (P1)**: 8 tasks (core availability search - MVP)
- **US2 (P2)**: 1 task (duration filtering)
- **US3 (P3)**: 1 task (export functionality)
- **Integration**: 4 tasks (testing, optimization, deployment)

---

## Dependencies

### Story Completion Order

```
Foundation (T001-T003)
    ↓
US1 - Find Available Time Slots (T004-T011) [MVP]
    ↓ [Can stop here for MVP release]
US2 - Filter by Duration (T012) [Enhancement]
    ↓ [Independent, can skip if not needed]
US3 - Export Results (T013) [Enhancement]
    ↓
Polish & Integration (T014-T017) [Final refinement]
```

### Task Dependencies

```
T001 [DateUtils] ─────┐
                       ├─→ T002 [TimeSlot] ─→ T004 [AvailabilityService start]
T003 [CalendarService]─┘                          ↓
                                                  T005 [markIntervalsBusy]
                                                   ↓
                                                  T006 [intervalsToTimeSlots]
                                                   ↓
                                                  T007 [validation]
                                                   ↓
                                                  T008 [calculateAvailability]
                                                   ↓
                    ┌──────────────────────────────┴──────────────┐
                    ↓                                              ↓
          T009 [Code.gs server functions]              T010 [Menu button]
                    ↓                                              ↓
                    └──────────────────┬───────────────────────────┘
                                       ↓
                              T011 [Availability.html UI]
                                       ↓
                              [US1 CHECKPOINT]
                                       ↓
                              T012 [Duration filter - US2]
                                       ↓
                              [US2 CHECKPOINT]
                                       ↓
                              T013 [Export - US3]
                                       ↓
                              [US3 CHECKPOINT]
                                       ↓
                          T014-T017 [Polish & Integration]
```

---

## Parallel Execution Strategy

### Phase 1 (Foundation) - All Parallel
```
Developer 1: T001 (DateUtils)
Developer 2: T002 (TimeSlot model)
Developer 3: T003 (CalendarService)
```

### Phase 2 (US1 - MVP) - Mixed
```
Sequential (same file):
  T004 → T005 → T006 → T007 → T008

Then Parallel (different files):
  Developer 1: T009 (Code.gs server functions)
  Developer 2: T010 (Menu.html button)
  Developer 3: T011 (Availability.html UI) - depends on T009 for API contract
```

### Phase 3-5 - Sequential
US2, US3, and Polish tasks are sequential enhancements building on previous work.

---

## MVP Scope Recommendation

**Minimum Viable Product**: Complete through **User Story 1 Checkpoint** (T001-T011)

This delivers:
- ✅ Core availability search (FR-001 through FR-010, FR-012 through FR-020)
- ✅ All edge case handling
- ✅ Full UI/UX for finding available time slots
- ✅ Independently testable and deployable

**Optional Enhancements** (can be added later):
- US2: Duration filtering (T012) - adds convenience but not critical
- US3: Export functionality (T013) - nice-to-have, users can manually copy
- Polish tasks (T014-T017) - should be done but can be quick validation

**Estimated Time**:
- MVP (T001-T011): 4-6 hours
- Full Feature (T001-T017): 6-8 hours

---

## Implementation Notes

1. **Tests**: No automated tests requested in spec. All validation is manual testing per acceptance scenarios.

2. **Incremental Delivery**: Each user story phase is independently testable:
   - After US1: Can deploy MVP and get user feedback
   - After US2: Enhancement adds filtering without breaking existing functionality
   - After US3: Export is additive feature

3. **Rollback Strategy**: If issues found in US2 or US3, can revert to previous checkpoint without breaking MVP.

4. **Constitution Compliance**: All tasks maintain compliance with project constitution (verified in plan.md post-design evaluation).
