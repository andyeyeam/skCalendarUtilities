# Tasks: Contiguous Availability Blocks

**Input**: Design documents from `/specs/005-add-a-new/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/availability-api.md, quickstart.md

**Tests**: Not explicitly requested in feature specification - manual testing checklist provided in quickstart.md

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

This is a Google Apps Script project with the following structure:
```
src/
├── services/
│   └── AvailabilityService.gs    # Server-side availability logic
├── ui/
│   └── Availability.html          # Client-side UI and interaction
└── Code.gs                        # Main Apps Script entry point with server handlers
```

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: No new infrastructure needed - feature extends existing availability finder

**Status**: ✅ All infrastructure already exists from feature 002-i-want-to (Availability Finder)

- **Existing**: AvailabilityService.gs with `calculateAvailability()`, `generateWorkingDayIntervals()`, `markIntervalsAsBusy()`, `intervalsToTimeSlots()`
- **Existing**: Availability.html with search form, results display, session storage management
- **Existing**: Code.gs with `findAvailability()` server handler
- **Existing**: TimeSlot model for representing time slots

**No setup tasks required** - proceed directly to User Story implementation

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**Status**: ✅ All foundational components already exist

This feature is an **extension** of the existing Find Availability feature (002-i-want-to), which provides:
- Working hours configuration (09:00-17:30)
- Calendar event fetching and processing
- Interval-based availability calculation
- Session storage patterns for UI state
- Time slot formatting and display
- Error handling and validation

**No foundational tasks required** - all user stories can proceed immediately

---

## Phase 3: User Story 1 - Choose Search Mode (Priority: P1) 🎯 MVP Component

**Goal**: Enable users to select between "Duration-based slots" and "Contiguous blocks" search modes before running an availability search

**Independent Test**: Launch availability finder, verify mode selection UI is visible with both radio button options, select each mode and verify duration field shows/hides appropriately, reload page and verify mode selection persists from session storage

### Implementation for User Story 1

- [x] T001 [US1] Add mode selection radio buttons UI in `src/ui/Availability.html` (before startDateTime field in search form, ~15 lines HTML)

- [x] T002 [US1] Implement `handleModeChange()` function in `src/ui/Availability.html` to save selected mode to session storage and update duration field visibility (~10 lines JavaScript)

- [x] T003 [US1] Implement `updateDurationFieldVisibility()` function in `src/ui/Availability.html` to show/hide duration input based on selected mode (~15 lines JavaScript)

- [x] T004 [US1] Update `initializeAvailabilityScreen()` function in `src/ui/Availability.html` to restore mode from session storage on page load (~8 lines JavaScript - add after existing cached variable restoration)

**Checkpoint**: Mode selection UI should be functional with persistence across page reloads. Duration field should hide when "Contiguous blocks" is selected and show when "Duration-based slots" is selected.

---

## Phase 4: User Story 2 - View Contiguous Availability Blocks (Priority: P1) 🎯 MVP Core

**Goal**: Display all contiguous free time blocks within a date range without filtering by minimum duration, showing complete uninterrupted availability from event-to-event

**Independent Test**: Select "Contiguous blocks" mode, choose date range with some calendar events, click "Find Availability", verify results show complete time blocks (e.g., if meeting from 10:00-14:00, should show two blocks: 09:00-10:00 and 14:00-17:30, not filtered by duration)

**Dependencies**: Requires User Story 1 (mode selection) to be complete

### Implementation for User Story 2

- [x] T005 [US2] Create `calculateContiguousAvailability()` function in `src/services/AvailabilityService.gs` that reuses existing helper functions (`generateWorkingDayIntervals`, `markIntervalsAsBusy`, `intervalsToTimeSlots`) but returns all contiguous blocks without duration filtering (~65 lines JavaScript)

- [x] T006 [US2] Update `findAvailability()` server handler in `src/Code.gs` to accept optional `searchMode` parameter (default: "duration") and conditionally call `calculateContiguousAvailability()` or `calculateAvailability()` based on mode (~20 lines JavaScript modification)

- [x] T007 [US2] Update `findAvailability()` server handler in `src/Code.gs` to include `searchMode` in returned metadata object for client-side display (~3 lines JavaScript)

- [x] T008 [US2] Update `handleFindAvailability()` function in `src/ui/Availability.html` to read selected mode from radio buttons and pass as fourth parameter to server function (~5 lines JavaScript)

- [x] T009 [US2] Update `displayResults()` function signature in `src/ui/Availability.html` to accept `searchMode` parameter (~1 line JavaScript)

- [x] T010 [US2] Update metadata HTML generation in `displayResults()` function in `src/ui/Availability.html` to display active search mode with conditional text formatting (~10 lines JavaScript)

**Checkpoint**: Contiguous blocks mode should be fully functional. Selecting "Contiguous blocks" mode and running a search should display all free time blocks without duration filtering. Results should clearly indicate "Mode: Contiguous availability blocks" in metadata.

---

## Phase 5: User Story 3 - Compare Search Results Across Modes (Priority: P2)

**Goal**: Allow users to easily switch between duration-based and contiguous search views for the same date range to compare different perspectives of their availability

**Independent Test**: Run a search in one mode, note the results, switch to the other mode using the mode selection radio buttons, run search again with same date range, verify different results format (duration-based shows multiple slots of specified duration, contiguous shows complete blocks)

**Dependencies**: Requires User Story 1 (mode selection) and User Story 2 (contiguous calculation) to be complete

**Note**: The basic mode switching capability is already implemented by User Stories 1 and 2. This story focuses on UX enhancements for mode comparison.

### Implementation for User Story 3

- [x] T011 [US3] Add visual emphasis to mode indicator in results metadata in `src/ui/Availability.html` - use bold or subtle background highlight to make active mode immediately obvious (~5 lines CSS/HTML modification)

- [x] T012 [US3] Ensure search form remains visible after displaying results (if currently hidden) OR add "New Search" / "Modify Search" button that reveals search form, allowing easy mode switching without page reload (~10 lines JavaScript in `src/ui/Availability.html`)

- [x] T013 [US3] Add session storage save for all search parameters in `saveSearchSettings()` function to ensure date range persists when switching modes, enabling true comparison (~3 lines JavaScript in `src/ui/Availability.html` - verify existing implementation includes mode)

**Checkpoint**: Users should be able to easily compare results across modes. The active mode should be visually obvious in results display. Switching modes and re-running search with same date range should be a smooth experience requiring minimal clicks.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories and overall feature quality

- [x] T014 [P] Verify all session storage keys follow naming convention (`availability_searchMode`, `availability_startDateTime`, etc.) in `src/ui/Availability.html`

- [x] T015 [P] Add error handling for invalid `searchMode` values (default to "duration") in `src/Code.gs` findAvailability handler

- [x] T016 [P] Add logging statements for contiguous mode calculation in `src/services/AvailabilityService.gs` using existing `log()` helper function for debugging

- [x] T017 [P] Verify backward compatibility - test that existing clients (if any) calling `findAvailability()` without `searchMode` parameter still work correctly

- [x] T018 Run manual testing checklist from `specs/005-add-a-new/quickstart.md` covering all test scenarios (mode selection, duration mode regression, contiguous mode, edge cases, UI/UX)

- [x] T019 Code cleanup: Remove any debug comments, ensure consistent formatting, verify JSDoc comments for new functions in `src/services/AvailabilityService.gs`

- [x] T020 Update CLAUDE.md context file with "IMPLEMENTED" status for feature 005-add-a-new (run `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude` or manual update)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: ✅ Complete (no tasks - existing infrastructure)
- **Foundational (Phase 2)**: ✅ Complete (no tasks - existing infrastructure)
- **User Story 1 (Phase 3)**: Can start immediately - No dependencies
- **User Story 2 (Phase 4)**: Depends on User Story 1 completion (needs mode selection UI)
- **User Story 3 (Phase 5)**: Depends on User Story 1 and 2 completion (needs both mode UI and contiguous calculation)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

```
User Story 1 (P1): Mode Selection
    ↓ (BLOCKS)
User Story 2 (P1): Contiguous Calculation
    ↓ (BOTH REQUIRED)
User Story 3 (P2): Mode Comparison UX
```

- **User Story 1 (P1)**: FOUNDATIONAL for this feature - Must complete first
  - Blocks US2 (needs mode selection UI to trigger contiguous mode)
  - Blocks US3 (needs mode switching mechanism)

- **User Story 2 (P1)**: CORE FUNCTIONALITY - Must complete before US3
  - Requires US1 (mode selection must exist to select contiguous mode)
  - Blocks US3 (needs contiguous calculation to work before comparison UX)

- **User Story 3 (P2)**: ENHANCEMENT - Can be implemented last
  - Requires US1 and US2 (needs both mode selection and calculation to compare)
  - Independent of other features - can be deferred if needed

### Within Each User Story

**User Story 1 (Mode Selection)**:
1. T001: Add UI elements (radio buttons)
2. T002: Add mode change handler (depends on T001 - needs radio buttons to exist)
3. T003: Add visibility toggle function (depends on T001 - needs duration field reference)
4. T004: Add page load restoration (depends on T002, T003 - needs handlers to exist)

**User Story 2 (Contiguous Calculation)**:
1. T005, T006, T007: Server-side changes (can run in parallel - different concerns)
   - T005: New calculation function (independent)
   - T006: Handler routing logic (independent)
   - T007: Metadata enhancement (independent)
2. T008, T009, T010: Client-side changes (sequential - modify same file)
   - T008: Pass mode parameter (first)
   - T009: Update function signature (second)
   - T010: Display mode in results (third)

**User Story 3 (Mode Comparison)**:
- T011, T012, T013: All modify same file (Availability.html) but different sections - can be done sequentially or by section

### Parallel Opportunities

**Limited parallelization** due to Google Apps Script single-file constraints:

- **Phase 3 (US1)**: All tasks modify `Availability.html` - SEQUENTIAL
- **Phase 4 (US2)**:
  - T005, T006, T007 can run in parallel (different files: AvailabilityService.gs, Code.gs)
  - T008, T009, T010 must be SEQUENTIAL (same file: Availability.html)
- **Phase 5 (US3)**: All tasks modify `Availability.html` - SEQUENTIAL
- **Phase 6 (Polish)**:
  - T014, T015, T016, T017 can run in parallel (different files or independent checks)
  - T018, T019, T020 should be SEQUENTIAL (test → cleanup → document)

**Realistic Parallel Execution**:
```bash
# After US1 complete, in US2:
Parallel group 1:
  - T005: Add calculateContiguousAvailability() in AvailabilityService.gs
  - T006: Update findAvailability() in Code.gs
  - T007: Add searchMode to metadata in Code.gs

# Then sequential for client-side:
  - T008 → T009 → T010 (same file modifications)

# In Phase 6 (Polish):
Parallel group 2:
  - T014: Verify session storage naming
  - T015: Add error handling
  - T016: Add logging statements
  - T017: Test backward compatibility
```

---

## Parallel Example: User Story 2 (Server-Side Tasks)

```bash
# Launch server-side implementation tasks together:
Task: "Create calculateContiguousAvailability() in src/services/AvailabilityService.gs"
Task: "Update findAvailability() routing in src/Code.gs"
Task: "Add searchMode to metadata in src/Code.gs"

# These can be done simultaneously by different developers or in parallel tool invocations
# because they modify different files and have no dependencies on each other
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2 Only)

**Recommended Approach**: Implement P1 stories first to deliver core value

1. ✅ Setup complete (existing infrastructure)
2. ✅ Foundational complete (existing infrastructure)
3. **Phase 3**: Complete User Story 1 (Mode Selection) - Tasks T001-T004
   - **STOP and VALIDATE**: Test mode selection UI, verify persistence
4. **Phase 4**: Complete User Story 2 (Contiguous Calculation) - Tasks T005-T010
   - **STOP and VALIDATE**: Test contiguous mode end-to-end with real calendar data
5. **MVP READY**: At this point, core feature is functional
   - Users can select contiguous mode
   - Contiguous availability blocks are calculated and displayed
   - Mode indicator shows active mode in results
6. **Optional**: Add User Story 3 (Comparison UX) - Tasks T011-T013
7. **Finalize**: Complete Phase 6 (Polish) - Tasks T014-T020

**Total Implementation Time**: ~3-4 hours (per quickstart.md estimate)
- User Story 1: ~45 minutes (UI + session storage)
- User Story 2: ~1.5 hours (server + client integration)
- User Story 3: ~30 minutes (UX enhancements)
- Polish & Testing: ~45 minutes (validation + cleanup)

### Incremental Delivery

1. **Foundation** → ✅ Already exists (feature 002)
2. **US1 (Mode Selection)** → Test independently → Can deploy (mode UI works, doesn't affect existing duration mode)
3. **US2 (Contiguous Calc)** → Test independently → Deploy/Demo (MVP - both modes functional!)
4. **US3 (Comparison UX)** → Test independently → Deploy/Demo (Enhanced UX)
5. Each story adds value without breaking previous stories

### Sequential Implementation (Single Developer)

**Recommended Order**:
1. T001 → T002 → T003 → T004 (User Story 1: Mode Selection UI)
   - Checkpoint: Mode selection works and persists
2. T005, T006, T007 (User Story 2: Server-side, can do together)
3. T008 → T009 → T010 (User Story 2: Client-side integration)
   - Checkpoint: Contiguous mode fully functional
4. T011 → T012 → T013 (User Story 3: Comparison enhancements)
   - Checkpoint: Mode comparison UX complete
5. T014-T020 (Polish: Validation and cleanup)

### Parallel Team Strategy

With 2-3 developers (limited by single-file editing in Apps Script editor):

**Option 1: Sequential handoff**
- Developer A: Completes US1 (T001-T004)
- Developer B: Starts US2 server-side (T005-T007) once US1 complete
- Developer A: Continues US2 client-side (T008-T010) after US1 complete
- Developer C: US3 (T011-T013) once US2 complete

**Option 2: Branch per story**
- Branch 1: US1 implementation
- Branch 2: US2 server-side (can start in parallel with branch 1)
- Merge Branch 1 → then merge Branch 2
- Branch 3: US3 + Polish

---

## Notes

- **[P] limitations**: Google Apps Script files must be edited sequentially in the editor, limiting true parallelization. [P] markers indicate tasks that *could* be done in parallel with separate files or by different team members working on local copies via clasp.

- **[Story] labels**: Map each task to its user story for traceability
  - US1: Mode selection UI and persistence
  - US2: Contiguous availability calculation and display
  - US3: Mode comparison UX enhancements

- **No automated tests**: Manual testing checklist in quickstart.md (25 scenarios covering mode selection, duration regression, contiguous mode, edge cases, UI/UX)

- **Backward compatibility**: Critical requirement - `searchMode` parameter defaults to "duration" to preserve existing behavior

- **Session storage pattern**: Follow existing convention (`availability_*` prefix) for all new storage keys

- **Commit strategy**:
  - Commit after T004 (US1 complete)
  - Commit after T010 (US2 complete)
  - Commit after T013 (US3 complete)
  - Commit after T020 (Polish complete)

- **Validation checkpoints**: After each user story phase, run independent test from that story's description before proceeding

- **Avoid**:
  - Breaking existing duration-based mode (regression testing required)
  - Adding new colors or fonts (violates constitution)
  - Creating new data models (reuse TimeSlot)
  - Skipping session storage persistence (required per spec FR-013)

---

## Task Count Summary

- **Total Tasks**: 20
- **User Story 1 (P1)**: 4 tasks (T001-T004)
- **User Story 2 (P1)**: 6 tasks (T005-T010)
- **User Story 3 (P2)**: 3 tasks (T011-T013)
- **Polish & Validation**: 7 tasks (T014-T020)

**Parallel Opportunities**: 7 tasks marked [P] (T014-T017 in Polish phase, T005-T007 in US2 server-side)

**MVP Scope**: User Stories 1 + 2 (10 tasks) deliver core contiguous availability blocks feature
