# Tasks: Calendar Event Display on Find Availability Screen

**Input**: Design documents from `/specs/004-i-would-like/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/server-functions.md, quickstart.md

**Tests**: Manual testing only (no automated tests requested in feature specification)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/` at repository root (Google Apps Script structure)
- Server-side: `src/models/`, `src/services/`, `src/Code.gs`
- Client-side: `src/ui/Availability.html`
- All paths are absolute from repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create new data models and service files needed by all user stories

- [X] T001 [P] [Setup] Create CalendarEvent model in `src/models/CalendarEvent.gs` - define createCalendarEvent(rawEvent) function that returns formatted CalendarEvent object with fields: title, startTime, endTime, isAllDay, date, formattedStart, formattedEnd, formattedDuration, displayTitle
- [X] T002 [P] [Setup] Create CalendarEventService in `src/services/CalendarEventService.gs` - create empty service file with JSDoc header, ready for implementation

**Checkpoint**: Empty model and service files created - ready for foundational implementation.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Server-Side Foundational Tasks

- [X] T003 [Foundation] Implement createCalendarEvent() model function in `src/models/CalendarEvent.gs` - extract event properties from raw Google CalendarEvent, format date as YYYY-MM-DD using Utilities.formatDate(), format times using formatTime12Hour(), calculate duration in minutes, truncate title if >40 chars, return CalendarEvent object (per data-model.md)
- [X] T004 [Foundation] Implement fetchAndFormatEvents() service function in `src/services/CalendarEventService.gs` - call calendar.getEvents(startDate, endDate), map raw events to CalendarEvent model using createCalendarEvent(), sort by date then start time, wrap in try-catch with error logging, throw user-friendly error on failure (per contracts/server-functions.md)
- [X] T005 [Foundation] Enhance findAvailability() function in `src/Code.gs` - after existing availability calculation, add event fetching logic: wrap fetchAndFormatEvents() call in try-catch block for graceful degradation, store events array or empty array on error, set eventsError message on failure, enhance response object to include events array, eventsError field (optional), and metadata.totalEventsFound (per contracts/server-functions.md)

### Client-Side Foundational Tasks

- [X] T006 [Foundation] Add global allCalendarEvents state variable in `src/ui/Availability.html` (near line 78, after selectedCalendar) - stores event data for display: var allCalendarEvents = []
- [X] T007 [Foundation] Modify displayResults() function in `src/ui/Availability.html` (line 308) - add line to store response.events in allCalendarEvents global variable, add check for response.eventsError and call showMessage() with warning if present

**Checkpoint**: Foundation ready - server can fetch events and return enhanced response, client can store event data. User story implementation can now begin.

---

## Phase 3: User Story 1 - View Scheduled Events While Finding Availability (Priority: P1) 🎯 MVP

**Goal**: Users can see both available time slots and scheduled calendar events for the same date range, providing complete schedule context

**Independent Test**: Enter date range (e.g., Jan 15-19, 9AM-5PM), click "Find Availability", verify results show both (a) available slots with checkboxes and (b) calendar events for those dates with times and titles. Delivers immediate value by providing schedule visibility.

### Manual Testing for User Story 1 (as per spec requirements)

**Basic Event Display Tests**:
- Search Jan 15-19, 9AM-5PM → Both available slots and calendar events display
- View a specific date (e.g., Jan 16) → All events for that day visible with times and titles
- Multiple events on one day → All displayed chronologically
- Day with no events → Show "No events scheduled" or omit Scheduled section
- All-day event → Display "All Day - [Event Title]"

**Visual Distinction Tests**:
- Day with both slots and events → Available and Scheduled sections clearly separated
- Scan multiple days → Can immediately identify available vs busy times
- Event time displays → Format matches slots (e.g., "10:00 AM - 10:30 AM")

**Error Handling Tests**:
- Revoke calendar permission → Availability shows, warning banner appears: "Calendar events unavailable. Showing availability only."
- Invalid date range → Error message, no slots or events displayed

### Implementation for User Story 1

- [X] T008 [US1] Add groupEventsByDate() helper function in `src/ui/Availability.html` (after displayResults function) - accepts events array, returns object with date keys and event arrays, similar to existing slot grouping pattern
- [X] T009 [US1] Add renderScheduledSection() helper function in `src/ui/Availability.html` (after groupEventsByDate) - accepts events array for single date, returns HTML string for "Scheduled" section with event list items showing time range and title, handles empty state (no events), apply compact styling per user requirements
- [X] T010 [US1] Modify date card rendering in displayResults() function in `src/ui/Availability.html` (line 344-358) - after rendering Available section for each date, call groupEventsByDate() to get eventsByDate object, check if date has events, if yes call renderScheduledSection() and append HTML to card, ensure visual separation between Available and Scheduled sections
- [X] T011 [P] [US1] Add CSS styles for Scheduled section in `src/ui/Availability.html` (in <head> section after line 8) - styles for .section-header, .event-item, .event-time, .event-title, .event-item background/borders for visual distinction, maintain compact layout per user requirement (per quickstart.md styling example)
- [X] T012 [P] [US1] Add warning banner styles for events error in `src/ui/Availability.html` (in <head> section) - style for .warning-banner: yellow/amber background, sufficient contrast (WCAG AA), padding, border-radius, positioned above results

**Checkpoint**: User Story 1 complete - users see both available slots and calendar events in same view, visually distinguished, with graceful error handling. Test independently using manual testing checklist above.

---

## Phase 4: User Story 2 - Distinguish Between Available and Busy Times (Priority: P2)

**Goal**: Clear visual distinction between available time slots and busy times so users can quickly scan and make decisions

**Independent Test**: View any day with both events and availability, verify events are visually distinct from available slots through styling (section headers, backgrounds, layout). Users can quickly scan and identify which blocks are available vs busy.

**Note**: User Story 2 builds on User Story 1's foundation by enhancing visual distinction. Most visual work done in US1 (T011), but this story focuses on polish and refinement.

### Implementation for User Story 2

- [X] T013 [US2] Enhance visual distinction in renderScheduledSection() in `src/ui/Availability.html` - ensure event items have subtle background (#fafafa per quickstart.md), confirm time/title hierarchy is clear (event-time 14px #666, event-title 16px #333), add subtle border or spacing to separate from Available section
- [X] T014 [US2] Add visual scanning improvements to date card layout in `src/ui/Availability.html` - ensure "Available" and "Scheduled" section headers use distinct styling (uppercase, letter-spacing, 0.875rem per quickstart.md), verify whitespace between sections is sufficient (0.75rem margin-top per quickstart.md)
- [X] T015 [US2] Validate contrast ratios in CSS in `src/ui/Availability.html` - verify all event text meets WCAG AA 4.5:1 minimum (event-title #333 on white, event-time #666 on white or #fafafa), verify section headers #666 meet 4.5:1 ratio

**Checkpoint**: User Story 2 complete - visual distinction is clear and effective. Test independently: quickly scan days with mixed content, verify immediate identification of available vs busy.

---

## Phase 5: User Story 3 - See Event Details for Better Context (Priority: P3)

**Goal**: Users see key details (title, time, duration) about each calendar event to understand commitments when selecting availability

**Independent Test**: Create calendar event titled "Team Standup" at 10:00 AM for 30 min, search availability, verify event displays as "10:00 AM - 10:30 AM" with "Team Standup" title clearly visible. Test long titles (50+ chars) to verify truncation.

**Note**: User Story 3 is mostly complete through US1 implementation (event details already displayed). These tasks focus on edge case handling and detail polish.

### Implementation for User Story 3

- [X] T016 [US3] Enhance title truncation in createCalendarEvent() in `src/models/CalendarEvent.gs` - verify displayTitle truncation logic handles edge cases: exactly 40 chars (no ellipsis), 41+ chars (truncate to 37 + "..."), empty title (use "Untitled Event"), test with Unicode/emoji characters
- [X] T017 [US3] Add duration display enhancement in renderScheduledSection() in `src/ui/Availability.html` - verify duration is shown in time range format (e.g., "10:00 AM - 10:30 AM" implies 30 min), consider adding explicit duration label for clarity: "(30 min)" appended to time range if helpful per user feedback
- [X] T018 [US3] Handle event time edge cases in createCalendarEvent() in `src/models/CalendarEvent.gs` - events extending beyond search range: show full time per spec FR-007 (e.g., event 4-6PM, search ends 5PM, display "4:00 PM - 6:00 PM"), multi-day events: show on first day only with "(multi-day)" suffix in displayTitle per data-model.md edge cases

**Checkpoint**: User Story 3 complete - event details are comprehensive and handle all edge cases. Test independently: create events with long titles, all-day events, events extending beyond range, verify proper display.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories or overall code quality

- [X] T019 [P] Add JSDoc comments for all new functions in `src/models/CalendarEvent.gs` and `src/services/CalendarEventService.gs` - ensure all functions have @param, @returns, @throws documentation per project code style (ES5+, JSDoc style) - VALIDATED: All functions have JSDoc comments
- [X] T020 [P] Add JSDoc comments for client-side event functions in `src/ui/Availability.html` - document groupEventsByDate(), renderScheduledSection() with param/return types - VALIDATED: Functions have JSDoc comments
- [ ] T021 [P] Performance validation using browser DevTools in `src/ui/Availability.html` - verify: event rendering with 10 events/day <1s, total search response time (slots + events) <2s per spec SC-002, event grouping and rendering adds <200ms to displayResults - MANUAL TEST REQUIRED
- [ ] T022 Browser compatibility testing - test in Chrome 63+, Firefox 53+, Safari 13.1+, Edge 79+ (Windows and macOS) - verify event display renders correctly, no JavaScript errors, graceful degradation message appears if events fail - MANUAL TEST REQUIRED
- [ ] T023 Mobile responsiveness testing in Google Sites iframe - test in 375px viewport (iPhone), verify event display remains readable, section headers wrap properly, event titles truncate without breaking layout, compact style maintained - MANUAL TEST REQUIRED
- [ ] T024 Run complete manual testing checklist from quickstart.md - verify all acceptance scenarios from spec.md for US1, US2, US3, test all edge cases from data-model.md (no events, all-day events, long titles, events beyond range, multi-day events, 10+ events per day) - MANUAL TEST REQUIRED
- [X] T025 [P] Code style review in all modified files - verify ES5 syntax (var not let/const, function declarations not arrows), no global scope pollution, consistent indentation, comments follow JSDoc style - VALIDATED: All code uses ES5 syntax correctly
- [X] T026 Constitution compliance validation - verify typography excellence (16px event title, 14px time per quickstart.md), disciplined color palette (neutrals only #333, #666, #fafafa per quickstart.md), modern minimalist design (compact layout per user requirement), WCAG AA contrast ratios - VALIDATED: Compliant
- [X] T027 Update CLAUDE.md - add feature 004 status "IMPLEMENTED", add technologies: Google Calendar API (CalendarApp), update Recent Changes section with completion date

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - create empty files
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) - BLOCKS all user stories until complete
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories - **IMPLEMENT FIRST**
  - User Story 2 (P2): Depends on User Story 1 (enhances visual styling from US1)
  - User Story 3 (P3): Depends on User Story 1 (polishes event details from US1)
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - MVP)**: Can start after Foundational (Phase 2) - No dependencies on other stories - **IMPLEMENT FIRST**
- **User Story 2 (P2)**: Requires User Story 1 complete (enhances US1 visual styling) - independently testable once implemented
- **User Story 3 (P3)**: Requires User Story 1 complete (polishes US1 event details) - independently testable once implemented

### Within Each User Story

**User Story 1 internal dependencies**:
1. T008 (groupEventsByDate) can start immediately after Phase 2
2. T009 (renderScheduledSection) depends on T008 (uses grouped data)
3. T010 (modify displayResults) depends on T008 and T009 (calls both functions)
4. T011 [P] CSS styles can run in parallel with T008-T010 (different section of file)
5. T012 [P] warning banner styles can run in parallel with T008-T011 (independent CSS)

**User Story 2 internal dependencies**:
1. All tasks (T013-T015) can run sequentially, enhancing existing US1 styling

**User Story 3 internal dependencies**:
1. T016 (title truncation) independent, modifies model
2. T017 (duration display) independent, modifies UI rendering
3. T018 (time edge cases) independent, modifies model

### Parallel Opportunities

**Within Phase 1 (Setup)**:
- T001 (CalendarEvent model) and T002 (CalendarEventService) can run in parallel (different files)

**Within Phase 2 (Foundational)**:
- T003-T005 must run sequentially (server-side dependencies)
- T006-T007 must run sequentially (client-side dependencies)
- But T003-T005 and T006-T007 can run in parallel (server vs client)

**Within User Story 1 (Phase 3)**:
- T008-T010 must run sequentially (function call dependencies)
- T011 (event CSS) can run in parallel with T008-T010
- T012 (warning CSS) can run in parallel with T008-T011

**Within Phase 6 (Polish)**:
- T019 (server JSDoc), T020 (client JSDoc), T021 (performance), T025 (code style) can all run in parallel
- T022 (browser testing), T023 (mobile testing), T024 (manual testing) should run sequentially after code is complete

---

## Parallel Example: Setup Phase

```bash
# Launch model and service file creation together:
Task T001: "Create CalendarEvent model in src/models/CalendarEvent.gs"
Task T002: "Create CalendarEventService in src/services/CalendarEventService.gs"
```

## Parallel Example: Foundational Phase

```bash
# Server-side and client-side foundational work in parallel:
# Server track:
Task T003: "Implement createCalendarEvent() in CalendarEvent.gs"
Task T004: "Implement fetchAndFormatEvents() in CalendarEventService.gs"
Task T005: "Enhance findAvailability() in Code.gs"

# Client track (can run in parallel with server track):
Task T006: "Add allCalendarEvents variable in Availability.html"
Task T007: "Modify displayResults() in Availability.html"
```

## Parallel Example: User Story 1 Core Functions

```bash
# Launch CSS and core functions in parallel:
Task T011: "Add CSS styles for Scheduled section in Availability.html"
Task T012: "Add warning banner styles in Availability.html"

# While CSS is being added, work on JavaScript (different section):
Task T008: "Add groupEventsByDate() function"
Task T009: "Add renderScheduledSection() function"
Task T010: "Modify date card rendering in displayResults()"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - **RECOMMENDED**

1. Complete Phase 1: Setup (T001-T002) - **Quick setup: ~10 minutes**
2. Complete Phase 2: Foundational (T003-T007) - **CRITICAL - blocks all stories: ~1 hour**
3. Complete Phase 3: User Story 1 (T008-T012) - **Core value: ~1 hour**
4. **STOP and VALIDATE**: Test User Story 1 independently using manual testing checklist
5. Complete Phase 6: Polish (T019-T027) - **Quality assurance: ~30 minutes**
6. Deploy/demo MVP

**Estimated Time**: 3-4 hours for complete MVP (per quickstart.md)

**Deliverable**: Users can see both available time slots and calendar events for a date range in a compact, readable format. Events display with title, time, and duration. Visual distinction between available and busy times. Graceful degradation if events fail to load.

### Incremental Delivery (if desired)

1. Complete Setup (Phase 1) → Empty files ready (T001-T002)
2. Complete Foundational (Phase 2) → Foundation ready (T003-T007)
3. Add User Story 1 → Test independently → Deploy/Demo MVP (T008-T012)
4. Add User Story 2 → Test independently → Deploy/Demo (T013-T015) *(visual polish)*
5. Add User Story 3 → Test independently → Deploy/Demo (T016-T018) *(edge case handling)*
6. Polish across all implemented stories (T019-T027)

### Single Developer Strategy (RECOMMENDED for this feature)

This feature is designed for single-developer implementation across multiple files:

1. **Phase 1 (Setup)**: Create empty model and service files (T001-T002) - 10 minutes
2. **Phase 2 (Foundational)**:
   - Work through server-side tasks sequentially (T003-T005) - 45 minutes
   - Work through client-side tasks sequentially (T006-T007) - 15 minutes
   - Test server response in Apps Script debugger
3. **Phase 3 (User Story 1)**:
   - Add client-side rendering functions (T008-T010) - 45 minutes
   - Add CSS styling in parallel or after (T011-T012) - 15 minutes
   - Test in browser with real calendar data
4. **Test thoroughly with manual checklist**
5. **Phase 6 (Polish)**: Documentation, performance, code style (T019-T027) - 30 minutes

**Total Estimated Time**: 3-4 hours for complete MVP

---

## Notes

- **Server-side changes**: `src/models/CalendarEvent.gs` (NEW), `src/services/CalendarEventService.gs` (NEW), `src/Code.gs` (MODIFY)
- **Client-side changes**: `src/ui/Availability.html` (MODIFY - add event rendering)
- **No changes needed**: `src/ui/Menu.html`, `src/ui/Styles.html`, `src/models/TimeSlot.gs`, `src/services/AvailabilityService.gs`
- **[P] tasks**: Different files or independent sections, can work in parallel
- **[Story] label**: Maps task to specific user story for traceability
- **MVP = User Story 1**: Delivers core value (view events alongside slots)
- **US2 and US3 build on US1**: Enhance visual distinction and detail handling
- **Manual testing required**: No automated tests requested in spec - use quickstart.md checklist
- **Graceful degradation**: Events can fail without breaking availability search (per spec FR-009)
- **Performance targets**: Events display within 2 seconds of search completing (per spec SC-002)
- **Constitution compliant**: Typography excellence (16px min), disciplined color palette (neutrals only), modern minimalist design (compact layout per user requirement)

**Success Criteria Mapping**:
- SC-001 (view both slots and events): Addressed by T008-T010 (event rendering in same view)
- SC-002 (events display within 2s): Addressed by T003-T005 (fetch in same server call), validated by T021
- SC-003 (distinguish at a glance <1s): Addressed by T011, T013-T015 (visual distinction)
- SC-004 (readable with 10 events/day): Addressed by T009, T011 (compact styling), validated by T024
- SC-005 (graceful degradation): Addressed by T005, T007 (error handling with warning banner)

---

## Quick Reference: File Locations

**New files created**:
- `src/models/CalendarEvent.gs` (T001)
- `src/services/CalendarEventService.gs` (T002)

**Existing files modified**:
- `src/Code.gs` - Enhance findAvailability() function (T005)
- `src/ui/Availability.html` - Add event rendering, CSS styles (T006-T012)

**Sections modified in Availability.html**:
- `<head>` (line ~8): Add CSS styles for events and warning banner (T011-T012)
- `<script>` top (line ~78): Add allCalendarEvents variable (T006)
- `<script>` middle (existing functions): Modify displayResults() (T007, T010)
- `<script>` end (new functions): Add groupEventsByDate(), renderScheduledSection() (T008-T009)

**No changes needed**:
- `src/ui/Menu.html`
- `src/ui/Styles.html`
- `src/models/TimeSlot.gs`
- `src/services/AvailabilityService.gs`
