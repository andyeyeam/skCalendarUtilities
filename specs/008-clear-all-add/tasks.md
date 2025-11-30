# Tasks: Clear All People and Meetings

**Input**: Design documents from `/specs/008-clear-all-add/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/PeopleService.md, quickstart.md

**Tests**: Not requested in specification - manual testing via Google Apps Script UI only

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/` at repository root (Google Apps Script structure)
- All tasks modify existing files from Feature 006 infrastructure

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify prerequisites and prepare development environment

- [X] T001 Verify Feature 006 (one-to-one meeting scheduler) is fully implemented and functional
- [X] T002 Verify Google Apps Script development environment is ready (clasp CLI or web editor access)
- [X] T003 Review quickstart.md to understand the three implementation steps
- [X] T004 Review contracts/PeopleService.md to understand clearAllPeople() API contract
- [X] T005 Create backup of current `src/services/PeopleService.gs` and `src/ui/OneToOne.html` before modifications

**Checkpoint**: ✅ Prerequisites verified - ready to begin implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: Since this feature extends existing Feature 006 infrastructure with no new dependencies, there are NO foundational/blocking tasks. All three user stories can be implemented directly using the existing PeopleService and OneToOne.html.

**Checkpoint**: Foundation ready (already exists from Feature 006) - user story implementation can begin

---

## Phase 3: User Stories 1, 2, & 3 Combined - Complete Clear All Feature (Priority: P1) 🎯 MVP

**Goal**: Implement the complete "Clear All" functionality with bulk deletion, confirmation dialog, and working indicator

**Why Combined**: All three user stories are tightly coupled and must work together:
- US1 (Bulk Deletion): The core clearAllPeople() server function
- US2 (Progress Feedback): The working indicator in the UI handler
- US3 (Safety Confirmation): The confirmation dialog in the UI handler

These cannot be meaningfully separated - the UI handler (US2+US3) calls the server function (US1). Implementing just one without the others would not deliver a testable, valuable increment.

**Independent Test**: Add 5 people with meetings, click "Clear All" button, see confirmation dialog (US3), confirm action, see working indicator (US2), verify all people and meetings deleted (US1), verify settings preserved.

### Implementation for User Stories 1, 2, & 3

**Server-Side Implementation (User Story 1 - Bulk Deletion)**

- [X] T006 [US1] Add `clearAllPeople()` function to `src/services/PeopleService.gs`:
  - Add function after existing `listPeople()` function
  - Implement logic per quickstart.md Step 1 (130 lines)
  - Use `listPeople()` to get all people
  - Handle empty state (return success with zero counts)
  - Iterate through people in reverse order (avoid index shifting)
  - For each person: attempt calendar deletion, then delete sheet row
  - Track counts: deletedPeople, deletedEvents, failedEvents
  - Collect failedPeople array with error details
  - Return response object per API contract
  - Add JSDoc comment documenting function signature

**UI Implementation (User Stories 2 & 3 - Feedback & Confirmation)**

- [X] T007 [US2+US3] Add "Clear All" button to `src/ui/OneToOne.html`:
  - Add button in People tab before "Add Person Form" (per quickstart.md Step 2)
  - Use existing neutral button styling (background: #f5f5f5, color: #333, border: #ddd)
  - Add onclick handler: `onclick="handleClearAllClick()"`
  - Button text: "Clear All People & Meetings"

- [X] T008 [US2+US3] Add `handleClearAllClick()` function to `src/ui/OneToOne.html`:
  - Add function in `<script>` section after existing delete handlers (per quickstart.md Step 3)
  - **US3 - Confirmation**: Show confirmation dialog with:
    - Strong warning: "⚠️ CLEAR ALL PEOPLE AND MEETINGS?"
    - List what will be deleted: all people, all recurring calendar events
    - List what will be preserved: settings, time slots
    - Explicit "THIS ACTION CANNOT BE UNDONE" warning
    - If user cancels, return early (no server call)
  - **US2 - Working Indicator**: After confirmation:
    - Call `showLoading()` to display spinner
    - Call `showSuccess('⏳ Clearing all people and meetings... This may take a moment.')`
  - **US1 - Server Call**: Call `google.script.run.clearAllPeople()`
  - **US2 - Success Handler**:
    - Call `hideLoading()`
    - Display appropriate success message based on response:
      - Empty state: Show response.message
      - Partial failure: Show response.message + log failedPeople details
      - Complete success: Show response.message
    - Call `loadPeopleList()` to refresh UI and show empty state
    - If meetings tab active, call `loadMeetingsList()` to refresh
  - **US2 - Error Handler**:
    - Call `hideLoading()`
    - Display error message

**Verification for US1+US2+US3**:
- Manual Test 1: 5 people with meetings → confirm deletion → verify working indicator → verify all deleted
- Manual Test 2: Empty state → click Clear All → verify info message
- Manual Test 3: Cancel confirmation → verify no deletions
- Acceptance Scenario US1.1: Verify settings preserved after deletion
- Acceptance Scenario US2.1: Working indicator visible throughout operation
- Acceptance Scenario US3.1: Confirmation dialog clearly explains consequences

**Checkpoint**: ✅ All three user stories complete - Clear All feature fully functional

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Validation, testing, deployment, and documentation

- [ ] T009 Manual Test 1 (Standard Deletion): ⚠️ REQUIRES MANUAL TESTING
  - Add 5 people with scheduled meetings
  - Click "Clear All People & Meetings"
  - Verify confirmation dialog appears with clear warning
  - Click "Confirm"
  - Verify working indicator appears immediately
  - Verify success message: "Cleared all people and meetings: deleted 5 people and 5 recurring meetings"
  - Verify OneToOnePeople sheet has 0 data rows (only header)
  - Verify Google Calendar has 0 recurring events for those people
  - Verify OneToOneConfig settings unchanged (duration, interval)
  - Verify OneToOneSlots time slots unchanged

- [ ] T010 Manual Test 2 (Mixed State): ⚠️ REQUIRES MANUAL TESTING
  - Add 5 people total
  - Create meetings for only 3 people (leave 2 without meetings)
  - Click "Clear All" and confirm
  - Verify success message mentions: "deleted 5 people and 3 recurring meetings"
  - Verify all 5 people removed from sheet

- [ ] T011 Manual Test 3 (Empty State): ⚠️ REQUIRES MANUAL TESTING
  - Ensure no people exist in system
  - Click "Clear All" button
  - Verify confirmation dialog still appears
  - Click "Confirm"
  - Verify success message: "No people to delete - the group is already empty"
  - Verify no errors in console

- [ ] T012 Manual Test 4 (Partial Failure Simulation): ⚠️ REQUIRES MANUAL TESTING
  - Add 3 people with meetings
  - Manually delete 1 calendar event directly in Google Calendar (leave person in sheet)
  - Click "Clear All" and confirm
  - Verify all 3 people still removed from sheet
  - Verify success message mentions failed deletions
  - Verify browser console shows failedPeople details

- [ ] T013 Manual Test 5 (Confirmation Cancellation): ⚠️ REQUIRES MANUAL TESTING
  - Add some people
  - Click "Clear All"
  - Click "Cancel" in confirmation dialog
  - Verify no deletions performed
  - Verify people list unchanged

- [ ] T014 Manual Test 6 (Settings Preservation): ⚠️ REQUIRES MANUAL TESTING
  - Configure settings: duration = 45 minutes, interval = 6 weeks
  - Add 3 time slots
  - Add 10 people with meetings
  - Click "Clear All" and confirm
  - Verify all people and meetings cleared
  - Verify Settings tab: duration = 45, interval = 6 (UNCHANGED)
  - Verify Settings tab: 3 time slots remain (UNCHANGED)

- [ ] T015 Regression Testing: ⚠️ REQUIRES MANUAL TESTING
  - Verify all existing Feature 006 functionality still works:
    - Add person works
    - Edit person works
    - Delete individual person works
    - Create meetings works
    - Regenerate all meetings works
    - View meetings shows correct list
    - Settings modification works
    - Time slot add/edit/delete works

- [ ] T016 Edge Case Validation: ⚠️ REQUIRES MANUAL TESTING
  - Test empty state handling (no people)
  - Test mixed state (some with meetings, some without)
  - Test large dataset (50+ people) - verify completion within 10 seconds
  - Verify no console errors in browser or Apps Script logs

- [ ] T017 Deploy to Google Apps Script using clasp push or web editor

- [ ] T018 Update CLAUDE.md with Feature 008 implementation status and recent changes:
  - Add to Recent Changes section
  - Document new clearAllPeople() function in PeopleService
  - Note UI enhancement in OneToOne.html (Clear All button)

- [ ] T019 Create git commit with descriptive message documenting the Clear All feature

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: N/A - no blocking prerequisites (Feature 006 provides all infrastructure)
- **User Stories 1+2+3 (Phase 3)**: Depends on Setup completion
- **Polish (Phase 4)**: Depends on Phase 3 completion (all user stories implemented)

### User Story Dependencies

**All user stories (US1, US2, US3) must be implemented together** because:
- US2 and US3 are part of the same UI handler function (`handleClearAllClick()`)
- US1 (server function) is called by US2+US3 (UI handler)
- None of the user stories can be tested independently - they form a single cohesive feature
- Implementing just the server function (US1) without UI would not be testable
- Implementing just the UI (US2+US3) without server function would not work

**Why US1, US2, US3 Cannot Be Separated**:
- Single UI function contains both confirmation (US3) and working indicator (US2)
- Server function (US1) is invoked by the UI handler
- No intermediate testable state exists
- All three deliver together as MVP

### Within Combined User Story Phase

**Phase 3 Tasks (T006-T008)**: Can be done in parallel
- T006: Server-side function (PeopleService.gs)
- T007: UI button (OneToOne.html)
- T008: UI handler (OneToOne.html)

Note: T007 and T008 modify the same file, but different sections:
- T007: HTML markup section
- T008: JavaScript section
- Can be done by same developer sequentially or different developers with merge

### Parallel Opportunities

**Limited parallelization due to small number of modified files**:
- Phase 1 setup tasks (T001-T005) can be done in parallel
- Phase 3 tasks (T006-T008) can be done in parallel:
  - T006: Different file (PeopleService.gs)
  - T007, T008: Same file (OneToOne.html) but different sections
- Phase 4 testing tasks (T009-T016) can be done in parallel

**No cross-user-story parallelization**: All user stories are combined in single phase

---

## Parallel Example: Implementation Phase

```bash
# Launch all implementation tasks together:
Task: "Add clearAllPeople() function to PeopleService.gs"
Task: "Add Clear All button to OneToOne.html"
Task: "Add handleClearAllClick() handler to OneToOne.html"
```

---

## Parallel Example: Testing Phase

```bash
# Launch all manual tests together (different test scenarios):
Task: "Manual Test 1 (Standard Deletion)"
Task: "Manual Test 2 (Mixed State)"
Task: "Manual Test 3 (Empty State)"
Task: "Manual Test 4 (Partial Failure)"
Task: "Manual Test 5 (Confirmation Cancellation)"
Task: "Manual Test 6 (Settings Preservation)"
Task: "Regression Testing"
Task: "Edge Case Validation"
```

---

## Implementation Strategy

### MVP First (All User Stories Together)

Since all three user stories must be implemented together, the MVP **IS** the complete feature:

1. Complete Phase 1: Setup
2. Skip Phase 2: Foundational (not needed)
3. Complete Phase 3: User Stories 1+2+3 (T006-T008)
4. **STOP and VALIDATE**: Test all three stories together
   - Verify confirmation dialog (US3)
   - Verify working indicator (US2)
   - Verify bulk deletion (US1)
   - Verify settings preservation
5. Complete Phase 4: Testing & Polish
6. Deploy final version

**Deliverable**: Complete "Clear All" feature with confirmation, feedback, and bulk deletion

### Incremental Testing Approach

Since implementation is atomic (all user stories together), testing is also atomic:
1. Implement T006-T008 together
2. Test all three user stories together (T009-T016)
3. Deploy

**No incremental delivery possible** - this is a single, cohesive feature that must work as a unit.

---

## Task Summary

**Total Tasks**: 19
- Phase 1 (Setup): 5 tasks
- Phase 2 (Foundational): 0 tasks (no blocking prerequisites)
- Phase 3 (US1+US2+US3 Combined): 3 tasks
- Phase 4 (Polish): 11 tasks

**Tasks per User Story**:
- User Story 1 (Bulk Deletion): 1 task (T006) - server function
- User Story 2 (Progress Feedback): 1 task (T008) - UI handler with working indicator
- User Story 3 (Safety Confirmation): 1 task (T008) - UI handler with confirmation dialog
- Shared: 1 task (T007) - UI button for all stories
- Cross-cutting: 16 tasks (setup + testing + deployment)

**Parallel Opportunities**: 11 tasks can run in parallel
- Setup Phase: 5 tasks (T001-T005)
- Implementation Phase: 3 tasks (T006-T008)
- Testing Phase: 8 tasks (T009-T016)

**Critical Path**: Sequential through core implementation
1. Setup (T001-T005)
2. Implementation (T006-T008) - all three user stories together
3. Testing & Deployment (T009-T019)

**Estimated Total Time**: 1.5-2 hours (per quickstart.md)
- Setup: 15 minutes
- Implementation: 60 minutes (30 min server + 10 min button + 20 min handler)
- Testing: 30 minutes (6 manual tests)
- Deployment: 15 minutes

---

## Notes

- All tasks modify existing files from Feature 006 (PeopleService.gs, OneToOne.html) - no new files created
- User Stories 1, 2, and 3 cannot be separated - they form a single cohesive feature
- No new data models or entities required
- No automated tests - all testing is manual via Google Apps Script UI
- Regression testing is critical to ensure Feature 006 still works
- Each checkpoint represents the completion of a testable increment
- Settings preservation is guaranteed by scope (Clear All never accesses settings sheets)
- Commit after each phase for easy rollback if needed
