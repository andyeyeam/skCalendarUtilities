# Tasks: Calendar Utilities Application

**Input**: Design documents from `/specs/001-build-an-embedded/`
**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Manual testing approach - no automated test tasks included

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions
- **Single Apps Script project**: `src/` at repository root
- All paths relative to repository root

---

## Phase 1: Setup (Project Initialization)

**Purpose**: Initialize Apps Script project structure and manifest

- [x] T001 Create src/ directory structure with subdirectories: ui/, services/, models/, utils/
- [x] T002 Create appsscript.json manifest with OAuth scopes (calendar, spreadsheets, external_request), V8 runtime, and webapp config
- [x] T003 [P] Create tests/manual/ directory for manual test scenarios

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 Create utils/Logger.gs with logging helper functions (log, info, warn, error methods)
- [x] T005 Create utils/AuthUtils.gs with OAuth scope management and authorization check functions
- [x] T006 Create utils/SheetUtils.gs with batch I/O operations (getValues, setValues wrappers) and schema initialization helpers
- [x] T007 Create models/Config.gs with UserConfiguration data structure and default values
- [x] T008 Create models/Event.gs with CalendarEvent data structure and validation methods
- [x] T009 Create services/SheetService.gs with config sheet initialization, getConfig(), updateConfig(), and named range management
- [x] T010 Create Code.gs main entry point with doGet() function, OAuth authorization check, config sheet initialization, and HtmlService setup with ALLOWALL X-Frame-Options

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Access Utility Menu (Priority: P1) 🎯 MVP

**Goal**: Users can access a menu interface, navigate to utilities (full-screen), and return to menu via back button

**Independent Test**: Embed app in Google Sites, verify menu loads with labeled options, click utility button to see full-screen display, verify back button returns to menu

### Implementation for User Story 1

- [x] T011 [P] [US1] Create ui/Styles.html with shared CSS implementing constitution design (typography: 16px base/1.5 line-height/system fonts, colors: #FFFFFF/#333333/#4285f4, spacing: 0.5rem/1rem/2rem, border-radius: 4-8px)
- [x] T012 [P] [US1] Create ui/Menu.html with main menu interface, utility buttons (Bulk Ops, Analytics, Cleanup), calendar selector dropdown, and navigation logic using google.script.run
- [x] T013 [US1] Add include() helper function to Code.gs for HTML template includes (used by Styles.html)
- [x] T014 [US1] Add loadUtility(utilityName) server function to Code.gs that validates utility name, loads corresponding HTML template, and returns rendered HTML
- [x] T015 [US1] Add loadMenu() server function to Code.gs that returns menu HTML for back navigation
- [x] T016 [US1] Add getAvailableCalendars() server function to Code.gs that fetches calendars from CalendarApp, filters to write-accessible calendars, and returns sorted list (primary first)
- [x] T017 [US1] Add selectCalendar(calendarId) server function to Code.gs that validates calendar access, updates config sheet, and returns success/error response
- [x] T018 [US1] Create placeholder UI files: ui/BulkOps.html, ui/Analytics.html, ui/Cleanup.html (each with back button and "Coming Soon" message)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Bulk Event Operations (Priority: P2)

**Goal**: Users can perform bulk operations (delete, change color, move calendar) on events matching criteria with progress tracking

**Independent Test**: Create test events, use bulk ops utility to select criteria, preview matching events, execute operation, verify targeted events updated and progress shown

### Implementation for User Story 2

- [ ] T019 [P] [US2] Create models/OperationQueue.gs with BulkOperationQueue data structure, queue management methods, and state transition logic (pending→processing→completed/failed)
- [ ] T020 [P] [US2] Create services/CalendarService.gs with batch event fetching (getEvents by date range), event matching by criteria (keyword/color/date), and bulk operation execution (delete/changeColor/moveCalendar) with rate limit handling
- [ ] T021 [US2] Create services/BulkOpsService.gs with operation queue processing, progress tracking, exponential backoff for rate limits, and queue entry management in sheet
- [ ] T022 [US2] Add getBulkOperationCriteria(criteria) function to Code.gs that validates criteria, fetches matching events, and returns preview with count/estimated time
- [ ] T023 [US2] Add executeBulkOperation(operationType, criteria, targetValue) function to Code.gs that validates parameters, creates queue entry, starts background processing, and returns operationId
- [ ] T024 [US2] Add getBulkOperationProgress(operationId) function to Code.gs that fetches queue status from sheet and returns progress object (status/eventsProcessed/percentComplete)
- [ ] T025 [US2] Update ui/BulkOps.html with criteria input form (date range picker, keyword search, color selector), operation type selector (delete/changeColor/moveCalendar), preview table, confirmation dialog, progress bar with polling logic, and results summary display

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Event Analytics and Insights (Priority: P3)

**Goal**: Users can view analytics showing time allocation and scheduling patterns in table format

**Independent Test**: Populate calendar with diverse events, run analytics for date range, verify metrics (total hours by category, busiest day, event counts) are accurate and displayed in tables

### Implementation for User Story 3

- [ ] T026 [US3] Create services/AnalyticsService.gs with computeAnalytics(events, dateRange) function that calculates: totalEvents, totalHours, categoryBreakdown (by color), dayBreakdown (by weekday), busiestDay, and averageEventDuration
- [ ] T027 [US3] Add generateAnalytics(dateRangeStart, dateRangeEnd) function to Code.gs that validates date range (≤365 days), fetches events from selected calendar, computes analytics, and returns report object
- [ ] T028 [US3] Update ui/Analytics.html with date range input form (start/end date pickers with defaultDateRange from config), analytics tables for category breakdown (category/count/hours/percentage), day breakdown (day/count), summary statistics (total events/hours, busiest day, average duration), and empty state message for no data

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently

---

## Phase 6: User Story 4 - Calendar Cleanup and Maintenance (Priority: P4)

**Goal**: Users can identify duplicate events (title + start time match) and selectively delete them

**Independent Test**: Create duplicate events (same title/start time), run cleanup utility, verify duplicates identified correctly, select which to keep/delete, verify only selected events deleted and summary shown

### Implementation for User Story 4

- [ ] T029 [US4] Create services/CleanupService.gs with findDuplicates(events) function that groups events by composite key "title|startTime", returns only groups with 2+ events, and formats as duplicate groups
- [ ] T030 [US4] Add findDuplicates(dateRangeStart, dateRangeEnd) function to Code.gs that fetches events from selected calendar, calls CleanupService to detect duplicates, and returns duplicate groups array
- [ ] T031 [US4] Add deleteDuplicates(duplicateGroups) function to Code.gs that validates keepEventId, deletes selected events using Calendar API, continues on error, and returns totalDeleted count with any errors
- [ ] T032 [US4] Update ui/Cleanup.html with date range input form, "Scan for Duplicates" button, duplicate groups display (showing all events in each group with radio buttons to select which to keep), checkboxes for events to delete, confirmation dialog with count of events to be deleted, delete action with summary of results (deleted count, any errors)

**Checkpoint**: All user stories should now be independently functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T033 [P] Add error logging integration: Update all service files to use Logger.gs for errors, implement logError(error, context) in Code.gs to log client-side errors
- [ ] T034 [P] Add responsive design improvements to ui/Styles.html for narrow iframe support (compact menu, responsive tables, mobile-friendly spacing)
- [ ] T035 [P] Add loading indicators: Create reusable spinner component in ui/Styles.html, add showLoading/hideLoading helpers to all utility HTML files
- [ ] T036 Add error handling UI: Create error display component in ui/Styles.html, add error display logic to all utility HTML files with user-friendly messages for common errors (quota exceeded, permission denied, network errors)
- [ ] T037 Create tests/manual/TestPlan.md with manual test scenarios for each user story covering acceptance criteria, edge cases, and OAuth authorization flow
- [ ] T038 Update Code.gs doGet() to handle first-run OAuth authorization gracefully with user-friendly messaging

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-6)**: All depend on Foundational phase completion
  - User stories can then proceed in parallel (if staffed)
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - No dependencies on other stories (uses shared services)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - No dependencies on other stories (uses shared services)
- **User Story 4 (P4)**: Can start after Foundational (Phase 2) - No dependencies on other stories (uses shared services)

### Within Each User Story

- Models before services (data structures needed by business logic)
- Services before Code.gs functions (business logic before API layer)
- Code.gs functions before UI updates (server functions before client calls)
- Story complete before moving to next priority

### Parallel Opportunities

- **Phase 1 (Setup)**: All tasks marked [P] can run in parallel
- **Phase 2 (Foundational)**: T004-T008 can run in parallel (different model/util files), T009-T010 sequential (T010 depends on T009)
- **Phase 3 (US1)**: T011, T012, T018 can run in parallel (different UI files)
- **Phase 4 (US2)**: T019, T020 can run in parallel (different files)
- **Phase 5 (US3)**: No parallel tasks (single service + single function + single UI)
- **Phase 6 (US4)**: No parallel tasks (single service + functions + single UI)
- **Phase 7 (Polish)**: T033, T034, T035 can run in parallel (different concerns)
- **Once Foundational completes**: US1, US2, US3, US4 can all be worked on in parallel by different team members

---

## Parallel Example: User Story 1

```bash
# Launch all parallel tasks for User Story 1 together:
Task: "Create ui/Styles.html with shared CSS"
Task: "Create ui/Menu.html with main menu interface"
Task: "Create placeholder UI files (BulkOps/Analytics/Cleanup)"

# Then sequential tasks:
Task: "Add include() helper to Code.gs"
Task: "Add loadUtility() to Code.gs"
# ... etc
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test User Story 1 independently
5. Deploy to Apps Script, embed in Google Sites, verify OAuth and menu functionality

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 → Test independently → Deploy/Demo
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 → Test independently → Deploy/Demo
6. Each story adds value without breaking previous stories

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: User Story 1 (T011-T018)
   - Developer B: User Story 2 (T019-T025)
   - Developer C: User Story 3 (T026-T028)
   - Developer D: User Story 4 (T029-T032)
3. Stories complete and integrate independently
4. Team reconvenes for Phase 7 polish

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Avoid: vague tasks, same file conflicts, cross-story dependencies that break independence
- Manual testing only - no automated test framework required for initial deployment
- Follow quickstart.md for deployment steps after implementation complete
