# Tasks: Optimized Meeting Slot Distribution

**Input**: Design documents from `/specs/007-when-scheduling-meetings/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/SchedulingService.md, quickstart.md

**Tests**: Not requested in specification - manual testing via Google Apps Script UI only

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/` at repository root (Google Apps Script structure)
- All tasks modify existing file: `src/services/SchedulingService.gs`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify prerequisites and prepare development environment

- [X] T001 Verify Feature 006 (one-to-one meeting scheduler) is fully implemented and functional
- [X] T002 Verify Google Apps Script development environment is ready (clasp CLI or web editor access)
- [X] T003 Create backup of current `src/services/SchedulingService.gs` before modifications
- [X] T004 Review research.md to understand interval stride distribution algorithm
- [X] T005 Review contracts/SchedulingService.md to understand function contract changes

**Checkpoint**: ✅ Prerequisites verified - ready to begin implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: Since this is a pure algorithmic enhancement to a single existing file with no new infrastructure, there are NO foundational/blocking tasks. All three user stories can be implemented directly and tested independently using the existing Feature 006 infrastructure.

**Checkpoint**: Foundation ready (already exists from Feature 006) - user story implementation can begin

---

## Phase 3: User Story 1 & 2 Combined - Slot Conflict Prevention + Smart Recurrence (Priority: P1) 🎯 MVP

**Goal**: Implement interval stride distribution algorithm to prevent slot conflicts and ensure smart recurrence calculation

**Why Combined**: US1 and US2 are both implemented by the same code change to `assignPeopleToPeriods()`. The interval stride algorithm inherently prevents slot conflicts (US1) while respecting the smart recurrence calculation (US2). They cannot be implemented independently.

**Independent Test**: Configure 10 people with 2 weekly slots and minimum recurrence of 4 weeks. Verify:
- Recurrence interval = 5 weeks (US2: smart calculation)
- No week has both slots occupied by different meetings (US1: conflict prevention)
- Distribution shows meetings in weeks 0, 0, 2, 2, 4, 4, 6, 6, 8, 8

### Implementation for User Stories 1 & 2

- [X] T006 [US1+US2] Modify `assignPeopleToPeriods()` function in `src/services/SchedulingService.gs` (lines 63-90):
  - Replace round-robin algorithm with interval stride distribution
  - Add `slotsPerWeek` calculation: `var slotsPerWeek = periods.length`
  - Add `spacing` calculation: `var spacing = Math.floor(recurrenceWeeks / slotsPerWeek)`
  - Calculate `weekOffset` for each person: `var weekOffset = Math.floor(i / slotsPerWeek) * spacing`
  - Calculate `slotIndex` for slot assignment: `var slotIndex = i % slotsPerWeek`
  - Add `weekOffset` field to assignment object
  - Update JSDoc comment to document new algorithm and weekOffset field

**Verification for US1+US2**:
- Manual Test 1 (US2 - Smart Recurrence): Configure 10 people, 2 slots, min recurrence 4 → verify interval = 5 weeks
- Manual Test 2 (US1 - Conflict Prevention): Verify no week has duplicate slots in calendar
- Acceptance Scenario US1.1: 10 people, 2 slots → no week has both slots with different meetings
- Acceptance Scenario US2.1: Verify formula max(4, ceil(10/2)) = 5 weeks

**Checkpoint**: ✅ Interval stride algorithm implemented - slot conflicts prevented and smart recurrence working

---

## Phase 4: User Story 3 - Even Distribution of Meetings (Priority: P2)

**Goal**: Apply week offsets to calendar event creation to achieve even distribution across recurrence cycle

**Why After US1+US2**: The `weekOffset` field is calculated in Phase 3 but not yet applied to calendar events. US3 adds the calendar integration to use those week offsets.

**Independent Test**: Configure 4 people with 2 weekly slots and 4-week recurrence. Verify meetings appear in weeks 0, 0, 2, 2 (evenly distributed), not weeks 0, 0, 0, 0 (clustered).

### Implementation for User Story 3

- [X] T007 [US3] Add `weekOffset` parameter to `calculateNextOccurrence()` function in `src/services/SchedulingService.gs` (line 142):
  - Update function signature: `function calculateNextOccurrence(weekday, startTimeMinutes, durationMinutes, weekOffset)`
  - Add week offset application after initial date calculation (after line 164):
    ```javascript
    // NEW: Apply week offset
    startDate.setDate(startDate.getDate() + (weekOffset * 7));
    ```
  - Update JSDoc comment (lines 136-141) to document new `weekOffset` parameter

- [X] T008 [US3] Pass `weekOffset` in `executeScheduling()` function in `src/services/SchedulingService.gs` (line 197):
  - Update function call from:
    `var occurrence = calculateNextOccurrence(assignment.weekday, startTimeMinutes, durationMinutes);`
  - To:
    `var occurrence = calculateNextOccurrence(assignment.weekday, startTimeMinutes, durationMinutes, assignment.weekOffset);`

**Verification for US3**:
- Manual Test 1 (Basic Even Distribution): 4 people, 2 slots, 4-week recurrence → verify meetings in weeks 0, 0, 2, 2
- Manual Test 2 (Single Slot): 6 people, 1 slot → verify each person in different week (0, 6, 12, 18, 24, 30)
- Acceptance Scenario US3.1: 2 people, 2 slots, 4-week interval → week 1 slot 1 and week 3 slot 1
- Acceptance Scenario US3.2: 4 people, 2 slots, 4-week interval → weeks 1, 1, 3, 3

**Checkpoint**: ✅ All three user stories complete - even distribution working with week offsets applied to calendar

---

## Phase 5: Polish & Cross-Cutting Concerns

**Purpose**: Validation, testing, and finalization

- [ ] T009 Manual Test 3 (Regeneration): ⚠️ REQUIRES MANUAL TESTING - Verify regenerate all meetings works with new algorithm
  - Start with 4 people from Manual Test 1
  - Add 2 more people (total 6)
  - Click "Regenerate All Meetings"
  - Verify old meetings deleted and 6 new meetings created with correct distribution

- [ ] T010 Manual Test 4 (Non-Integer Spacing): ⚠️ REQUIRES MANUAL TESTING - Test edge case handling
  - Configure 7 people, 2 weekly slots, min recurrence 3
  - Verify recurrence interval = 4 weeks
  - Verify spacing = floor(4/2) = 2
  - Verify distribution: 2 meetings in weeks 0, 2, 4, and 1 meeting in week 6

- [ ] T011 Regression Testing: ⚠️ REQUIRES MANUAL TESTING - Verify all existing Feature 006 functionality still works
  - Create new meetings (first time) works
  - View meetings shows correct list
  - Delete individual meeting works
  - Regenerate all meetings works
  - Meeting duration settings respected
  - Minimum recurrence interval settings respected

- [ ] T012 Edge Case Validation: ⚠️ REQUIRES MANUAL TESTING - Test boundary conditions
  - Minimum recurrence = 1 week (same-week recurrence)
  - Very long recurrence (100 people with 1 slot → 100-week interval)
  - Empty people list → verify appropriate error message
  - Empty slots list → verify appropriate error message

- [ ] T013 Performance Validation: ⚠️ REQUIRES MANUAL TESTING - Verify meeting generation completes within 5 seconds for up to 100 people

- [X] T014 Deploy to Google Apps Script using clasp push or web editor

- [X] T015 Update CLAUDE.md with Feature 007 implementation status and recent changes

- [X] T016 Create git commit with descriptive message documenting the interval stride distribution enhancement

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: N/A - no blocking prerequisites (Feature 006 provides all infrastructure)
- **User Stories 1+2 (Phase 3)**: Depends on Setup completion
- **User Story 3 (Phase 4)**: Depends on Phase 3 completion (needs weekOffset field from assignPeopleToPeriods)
- **Polish (Phase 5)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1+2 (P1)**: Can start after Setup (Phase 1) - Implements core algorithm
- **User Story 3 (P2)**: MUST wait for US1+US2 completion - Uses weekOffset from Phase 3

**Why US1+US2 Cannot Be Separated**:
- Both are delivered by the same function modification (`assignPeopleToPeriods`)
- The interval stride algorithm that prevents conflicts (US1) inherently uses the smart recurrence calculation (US2)
- Cannot implement conflict prevention without the recurrence interval
- Cannot test one without the other

### Within Each User Story

- **Phase 3 (US1+US2)**: Single task (T006) - modifies one function
- **Phase 4 (US3)**: Sequential tasks:
  1. T007: Add weekOffset parameter to calculateNextOccurrence
  2. T008: Pass weekOffset in executeScheduling (depends on T007)

### Parallel Opportunities

**Limited parallelization due to single-file modifications**:
- Phase 1 setup tasks (T001-T005) can be done in parallel
- Phase 3 has only one task (T006) - no parallelization
- Phase 4 tasks (T007, T008) must be sequential (same file, dependent changes)
- Phase 5 testing tasks (T009-T013) can be done in parallel

**Cross-User-Story Parallelization**: None possible
- US3 depends on US1+US2 completion
- All changes are to the same file (`SchedulingService.gs`)

---

## Parallel Example: Setup Phase

```bash
# Launch all setup tasks together:
Task: "Verify Feature 006 is implemented"
Task: "Verify development environment ready"
Task: "Create backup of SchedulingService.gs"
Task: "Review research.md"
Task: "Review contracts/SchedulingService.md"
```

---

## Parallel Example: Testing Phase

```bash
# Launch all manual tests together (different test scenarios):
Task: "Manual Test 3 (Regeneration)"
Task: "Manual Test 4 (Non-Integer Spacing)"
Task: "Regression Testing"
Task: "Edge Case Validation"
Task: "Performance Validation"
```

---

## Implementation Strategy

### MVP First (User Stories 1+2 Only)

1. Complete Phase 1: Setup
2. Skip Phase 2: Foundational (not needed)
3. Complete Phase 3: User Stories 1+2 (T006)
4. **STOP and VALIDATE**: Test US1+US2 independently
   - Verify conflict prevention
   - Verify smart recurrence calculation
5. Deploy/demo if ready

**Deliverable**: Meetings are conflict-free and recurrence is calculated correctly, but distribution may be clustered in early weeks

### Full Feature (All User Stories)

1. Complete Phase 1: Setup
2. Complete Phase 3: User Stories 1+2 (T006)
3. Complete Phase 4: User Story 3 (T007, T008)
4. **VALIDATE**: Test all three stories together
   - Verify conflict prevention (US1)
   - Verify smart recurrence (US2)
   - Verify even distribution (US3)
5. Complete Phase 5: Polish & Testing
6. Deploy final version

**Deliverable**: Full feature with conflict prevention, smart recurrence, AND even distribution

### Recommended Strategy

**Option A: MVP First (Safer)**
- Implement US1+US2 only (Phase 3)
- Test and validate thoroughly
- Deploy to production
- Gather user feedback
- Then add US3 (Phase 4) in next release

**Option B: Full Feature (Faster)**
- Implement all phases sequentially
- Test comprehensively at the end
- Deploy once with all stories

**Recommendation**: Option B (Full Feature) because:
- Total estimated time is only 2-3 hours (per quickstart.md)
- Only modifying one file with three small changes
- Low risk of regression
- Feature is more valuable with even distribution

---

## Task Summary

**Total Tasks**: 16
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 0 tasks (no blocking prerequisites)
- Phase 3 (US1+US2): 1 task
- Phase 4 (US3): 2 tasks
- Phase 5 (Polish): 8 tasks

**Tasks per User Story**:
- User Story 1 + 2 (Conflict Prevention + Smart Recurrence): 1 task (T006)
- User Story 3 (Even Distribution): 2 tasks (T007, T008)
- Cross-cutting: 13 tasks (setup + testing + deployment)

**Parallel Opportunities**: 10 tasks can run in parallel
- Setup Phase: 5 tasks (T001-T005)
- Testing Phase: 5 tasks (T009-T013)

**Critical Path**: Sequential through core implementation
1. Setup (T001-T005)
2. Core Algorithm (T006) - US1+US2
3. Calendar Integration (T007-T008) - US3
4. Testing & Deployment (T009-T016)

**Estimated Total Time**: 2.5-3 hours (per quickstart.md)
- Setup: 15 minutes
- US1+US2 Implementation: 30 minutes
- US3 Implementation: 40 minutes (30 min + 10 min)
- Testing: 90 minutes (60 min manual + 30 min regression)
- Deployment: 15 minutes

---

## Notes

- All tasks modify the same file (`src/services/SchedulingService.gs`) - limited parallelization
- US1 and US2 cannot be separated - both delivered by interval stride algorithm
- US3 depends on US1+US2 - must be implemented sequentially
- No new files created - pure algorithmic enhancement
- No data model changes - existing Feature 006 infrastructure used
- No UI changes - testing via existing OneToOne.html interface
- Manual testing only - no automated test suite requested
- Regression testing critical to ensure Feature 006 still works
- Each checkpoint represents a testable increment
- Commit after each phase for easy rollback if needed
