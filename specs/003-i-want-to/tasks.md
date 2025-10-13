# Tasks: Copy Available Slots to Clipboard

**Input**: Design documents from `/specs/003-i-want-to/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/clipboard-api.md, quickstart.md

**Tests**: Manual testing only (no automated tests requested in feature specification)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different sections, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions
- **Single project**: `src/ui/` at repository root (Google Apps Script structure)
- All modifications are client-side in `src/ui/Availability.html`
- No server-side changes required (pure client-side feature)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Prepare Availability.html for clipboard functionality

**No setup tasks required** - all modifications happen in existing file `src/ui/Availability.html`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T001 [Foundation] Add CSS styles for checkbox selection UI in `src/ui/Availability.html` (after line 8, in `<head>` section) - includes slot-item, slot-label, slot-checkbox, button-secondary styles
- [X] T002 [Foundation] Add SelectionManager module in `src/ui/Availability.html` (after line 76, top of `<script>` section) - handles session storage operations: load(), save(), toggle(), isSelected(), selectAll(), deselectAll(), getSelected(), clear()
- [X] T003 [Foundation] Add getSlotId() helper function in `src/ui/Availability.html` (after SelectionManager) - generates unique slot identifier from date and formattedStart
- [X] T004 [Foundation] Add global allAvailableSlots state variable in `src/ui/Availability.html` (near line 78, after selectedCalendar) - stores slot data for clipboard operations
- [X] T005 [Foundation] Modify displayResults() function in `src/ui/Availability.html` (line 308) - add line to store response.slots in allAvailableSlots global variable
- [X] T006 [Foundation] Add getSlotDataByIds() helper function in `src/ui/Availability.html` (after getSlotId) - filters allAvailableSlots by slot IDs using getSlotId()
- [X] T007 [Foundation] Modify navigateToMenu() function in `src/ui/Availability.html` (line 378) - add SelectionManager.clear() call before navigation to clear selection state

**Checkpoint**: Foundation ready - all helper functions and state management in place. User story implementation can now begin.

---

## Phase 3: User Story 1 - Select and Copy Individual Slots (Priority: P1) 🎯 MVP

**Goal**: Users can select specific time slots using checkboxes and copy them to clipboard in professional format

**Independent Test**: Search for availability, select multiple time slots using checkboxes, click "Copy Selected" button, paste result into text editor or email client. Text should be well-formatted: "Monday, Jan 15: 9:00 AM - 10:00 AM (60 min), 2:00 PM - 3:00 PM (60 min)"

### Manual Testing for User Story 1 (as per spec requirements)

**Basic Selection Tests**:
- Load Availability page, search for availability
- Click individual checkboxes → Slots should highlight with background color #f5f5f5
- Selected count should update (e.g., "3 selected")
- Copy button should be disabled when no selection, enabled when slots selected

**Copy Selected Tests**:
- Select multiple slots across different dates
- Click "Copy Selected" → Success message shows for 3 seconds
- Paste into email/Notepad → Format preserved: "DayOfWeek, Month Day: Time - Time (Duration)"
- Dates separated by newlines, slots on same date separated by commas
- No selection → Click "Copy Selected" → Error message "Please select at least one slot to copy"

### Implementation for User Story 1

- [X] T008 [US1] Add selection controls UI card in `src/ui/Availability.html` (after resultsMetadata div, before resultsSlots div, line 58) - includes toggleSelectAll button, selectedCount span, copySelected button
- [X] T009 [US1] Modify slot rendering in displayResults() function in `src/ui/Availability.html` (line 344-350) - replace static slot divs with checkbox-enabled slot-item divs, add data-slot-id attributes, restore selection state from SelectionManager
- [X] T010 [US1] Add updateSelectedCount() and updateCopyButton() calls in `src/ui/Availability.html` displayResults() function (after line 358) - update UI controls after rendering slots
- [X] T011 [P] [US1] Add handleSlotToggle() event handler function in `src/ui/Availability.html` (after helper functions) - handles checkbox change, calls SelectionManager.toggle(), updates visual state, calls updateSelectedCount() and updateCopyButton()
- [X] T012 [P] [US1] Add updateSelectedCount() UI helper function in `src/ui/Availability.html` (after event handlers) - updates selected count display and toggleSelectAll button text
- [X] T013 [P] [US1] Add updateCopyButton() UI helper function in `src/ui/Availability.html` (after updateSelectedCount) - enables/disables copy button based on selection
- [X] T014 [US1] Modify existing showMessage() function in `src/ui/Availability.html` (line 406) - update to support different durations: 3 seconds for success/info, 5 seconds for error
- [X] T015 [US1] Add formatSlotsForClipboard() function in `src/ui/Availability.html` (after UI helpers) - groups slots by date, sorts chronologically, formats as "DayOfWeek, Month Day: Time - Time (Duration)" with newline separators
- [X] T016 [US1] Add copyToClipboard() function in `src/ui/Availability.html` (before formatSlotsForClipboard) - attempts navigator.clipboard.writeText(), calls onSuccess or onError callback with fallback
- [X] T017 [US1] Add showFallbackModal() function in `src/ui/Availability.html` (after formatSlotsForClipboard) - creates overlay modal with textarea, auto-selects text, handles close button and backdrop click
- [X] T018 [US1] Add handleCopySelected() event handler function in `src/ui/Availability.html` (after handleSlotToggle) - validates selection, gets slot data, formats text, calls copyToClipboard() with success/error callbacks

**Checkpoint**: At this point, User Story 1 should be fully functional - users can select individual slots and copy them to clipboard with fallback support. Test independently using manual testing checklist above.

---

## Phase 4: User Story 2 - Copy All Available Slots (Priority: P2)

**Goal**: Users can quickly copy all available slots without manually selecting each one

**Independent Test**: Search for availability, click "Copy All" button (without selecting individual slots), paste result into text editor. All slots should be copied in the same professional format with chronological organization.

**Note**: User Story 2 implementation is deferred. The current specification includes this as P2 priority, but the foundational implementation from User Story 1 provides sufficient value for MVP. To implement US2, the following would be needed:

### Deferred Implementation for User Story 2

- [ ] T019 [US2] Add "Copy All" button to selection controls UI in `src/ui/Availability.html` (in selectionControls card) - positioned next to or below "Copy Selected" button
- [ ] T020 [US2] Add handleCopyAll() event handler function in `src/ui/Availability.html` (after handleCopySelected) - gets all available slots from allAvailableSlots, formats using formatSlotsForClipboard(), calls copyToClipboard()
- [ ] T021 [US2] Wire up onclick handler for "Copy All" button in `src/ui/Availability.html` - calls handleCopyAll()

**Checkpoint**: User Story 2 complete - users can copy all slots with one click. Test independently: click "Copy All" without selection, verify all slots copied chronologically.

---

## Phase 5: User Story 3 - Customizable Format Templates (Priority: P3)

**Goal**: Users can choose between different formatting styles (formal, casual, bulleted list, calendar-style) to match communication context

**Independent Test**: Select slots, choose format option from dropdown (e.g., "Formal", "Casual", "Bulleted List"), copy, verify clipboard content matches selected style

**Note**: User Story 3 implementation is out of scope for MVP. The spec marks this as P3 priority and notes "This can be added later based on user feedback." Current default professional format meets 80% of user needs (per assumptions in spec.md).

### Deferred Implementation for User Story 3

- [ ] T022 [US3] Design format templates: formal, casual, bulleted list, calendar-style in data-model or separate templates file
- [ ] T023 [US3] Add format dropdown selector UI in `src/ui/Availability.html` (in selectionControls card above Copy Selected button)
- [ ] T024 [US3] Add formatTemplates object in `src/ui/Availability.html` (after formatSlotsForClipboard) - contains formatter functions for each template style
- [ ] T025 [US3] Modify formatSlotsForClipboard() in `src/ui/Availability.html` - accept optional template parameter, delegate to appropriate formatter from formatTemplates
- [ ] T026 [US3] Modify handleCopySelected() in `src/ui/Availability.html` - read selected format from dropdown, pass to formatSlotsForClipboard()
- [ ] T027 [US3] Add format preview display in `src/ui/Availability.html` - shows example of selected format when dropdown changes
- [ ] T028 [US3] Persist format selection in session storage using SelectionManager pattern

**Checkpoint**: User Story 3 complete - users can choose format templates. Test independently: select each format option, copy, verify format matches expectation.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories or overall code quality

- [ ] T029 [P] Add JSDoc comments for all new functions in `src/ui/Availability.html` - ensure all functions have param and return types documented (if not already present)
- [ ] T030 [P] Performance validation using browser DevTools in `src/ui/Availability.html` - verify: slot rendering <200ms, toggle <50ms, select all <100ms, format 50 slots <100ms, clipboard write <50ms
- [ ] T031 Browser compatibility testing - test in Chrome 63+, Firefox 53+, Safari 13.1+, Edge 79+ (Windows and macOS) - verify clipboard API works or fallback modal appears
- [ ] T032 Cross-platform clipboard format testing - paste into Outlook, Gmail, Notepad, TextEdit, Slack, Teams - verify format preserved with proper newlines
- [ ] T033 Run complete manual testing checklist from quickstart.md - verify all acceptance scenarios from spec.md
- [ ] T034 [P] Code style review in `src/ui/Availability.html` - verify ES5 syntax (var, function declarations), no let/const, no arrow functions in global scope, consistent indentation
- [ ] T035 Update CLAUDE.md if needed - ensure feature 003 status reflects "IMPLEMENTED" when complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No setup needed - skipped
- **Foundational (Phase 2)**: No dependencies - BLOCKS all user stories until complete
- **User Stories (Phase 3-5)**: All depend on Foundational phase completion
  - User Story 1 (P1): Can start after Foundational - No dependencies on other stories
  - User Story 2 (P2): Depends on Foundational + User Story 1 (reuses formatSlotsForClipboard and copyToClipboard)
  - User Story 3 (P3): Depends on Foundational + User Story 1 (extends formatSlotsForClipboard)
- **Polish (Phase 6)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1 - MVP)**: Can start after Foundational (Phase 2) - No dependencies on other stories - **IMPLEMENT FIRST**
- **User Story 2 (P2 - Deferred)**: Requires User Story 1 complete (reuses clipboard functions) - independently testable once implemented
- **User Story 3 (P3 - Deferred)**: Requires User Story 1 complete (extends formatting) - independently testable once implemented

### Within Each User Story

**User Story 1 internal dependencies**:
1. T008 (UI controls) can start immediately after Phase 2
2. T009 (slot rendering) can start immediately after Phase 2 (modifies different section)
3. T010 (update calls) depends on T009 (adds to same function)
4. T011-T013 [P] event handlers and UI helpers can all run in parallel (different functions)
5. T014 (modify showMessage) independent
6. T015-T017 [P] clipboard functions can run in parallel (different functions)
7. T018 (handleCopySelected) depends on T015-T017 (calls these functions)

### Parallel Opportunities

**Within Phase 2 (Foundational)**:
- T001 (CSS) and T002 (SelectionManager) can run in parallel (different sections of file)
- T003-T006 must run sequentially (dependencies within script section)

**Within User Story 1 (Phase 3)**:
- T008 (UI controls) and T009 (rendering) can run in parallel
- T011-T013 can run in parallel (all different functions)
- T015-T017 can run in parallel (all different functions)

**Within Phase 6 (Polish)**:
- T029 (comments), T030 (performance), T034 (code style) can all run in parallel

---

## Parallel Example: Foundational Phase

```bash
# Launch CSS and SelectionManager together:
Task T001: "Add CSS styles in src/ui/Availability.html (head section)"
Task T002: "Add SelectionManager module in src/ui/Availability.html (script section)"

# Then sequential helper functions:
Task T003: "Add getSlotId() helper"
Task T004: "Add allAvailableSlots variable"
Task T005: "Modify displayResults()"
Task T006: "Add getSlotDataByIds() helper"
Task T007: "Modify navigateToMenu()"
```

## Parallel Example: User Story 1 Core Functions

```bash
# Launch all independent clipboard functions together:
Task T011: "Add handleSlotToggle() event handler"
Task T012: "Add updateSelectedCount() UI helper"
Task T013: "Add updateCopyButton() UI helper"

# Then clipboard operations in parallel:
Task T015: "Add formatSlotsForClipboard() function"
Task T016: "Add copyToClipboard() function"
Task T017: "Add showFallbackModal() function"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - **RECOMMENDED**

1. Complete Phase 2: Foundational (T001-T007) - **CRITICAL - blocks all stories**
2. Complete Phase 3: User Story 1 (T008-T018)
3. **STOP and VALIDATE**: Test User Story 1 independently using manual testing checklist
4. Complete Phase 6: Polish (T029-T035)
5. Deploy/demo MVP

**Estimated Time**: 2-3 hours for complete MVP (per quickstart.md)

**Deliverable**: Users can select slots with checkboxes and copy to clipboard with professional formatting. Includes fallback modal for clipboard API failures. Selection state persists across page refresh.

### Incremental Delivery (if desired)

1. Complete Foundational → Foundation ready (T001-T007)
2. Add User Story 1 → Test independently → Deploy/Demo MVP (T008-T018)
3. Add User Story 2 → Test independently → Deploy/Demo (T019-T021) *(optional enhancement)*
4. Add User Story 3 → Test independently → Deploy/Demo (T022-T028) *(optional enhancement)*
5. Polish across all implemented stories (T029-T035)

### Single Developer Strategy (RECOMMENDED for this feature)

This feature is designed for single-developer implementation in one `src/ui/Availability.html` file:

1. Work through Phase 2 (Foundational) sequentially (T001-T007)
   - These are quick tasks (5-20 minutes each per quickstart.md)
2. Work through Phase 3 (User Story 1) in logical groups:
   - UI changes first (T008-T010)
   - Core functions next (T011-T017, some parallelizable if comfortable)
   - Wire up final handler (T018)
3. Test thoroughly with manual checklist
4. Polish (T029-T035)

**Total Estimated Time**: 2-3 hours for complete MVP

---

## Notes

- **All tasks modify single file**: `src/ui/Availability.html` (pure client-side feature)
- **No server changes**: Existing `findAvailability()` provides all needed data
- **[P] tasks**: Different sections/functions in same file, can work in parallel if careful with merge
- **[Story] label**: Maps task to specific user story for traceability
- **MVP = User Story 1 only**: Delivers core value (select + copy individual slots)
- **US2 and US3 deferred**: Can be added later based on user feedback
- **Manual testing required**: No automated tests requested in spec - use quickstart.md checklist
- **Session storage**: Selection persists across page refresh, clears on browser close
- **Clipboard fallback**: Modal ensures 100% success rate even if Clipboard API fails
- **Performance targets**: <1 second for 50 slots (SC-004), validated in T030
- **Constitution compliant**: All 5 principles validated in plan.md Phase 1 re-check

**Success Criteria Mapping**:
- SC-001 (select/copy in <10s): Addressed by T008-T018 (streamlined UI)
- SC-002 (no reformatting needed): Addressed by T015 (formatSlotsForClipboard)
- SC-003 (90% success rate): Addressed by T016-T017 (clipboard + fallback)
- SC-004 (<1s for 50 slots): Validated by T030 (performance testing)
- SC-005 (readable/professional): Addressed by T015 + T032 (format + cross-platform testing)

---

## Quick Reference: File Locations

**All changes in**: `src/ui/Availability.html`

**Sections modified**:
- `<head>` (line ~8): Add CSS styles (T001)
- `<body>` (line ~58): Add selection controls UI (T008)
- `<script>` top (line ~76): Add SelectionManager, helpers, state (T002-T006)
- `<script>` middle (existing functions): Modify displayResults, navigateToMenu, showMessage (T005, T007, T009, T010, T014)
- `<script>` end (new functions): Add event handlers, UI helpers, clipboard functions (T011-T013, T015-T018)

**No changes needed**:
- `src/ui/Menu.html` (already has session storage for calendar selection)
- `src/ui/Styles.html` (using inline styles instead)
- `src/services/AvailabilityService.gs` (existing slot data sufficient)
- `src/models/TimeSlot.gs` (existing model sufficient)
- `src/Code.gs` (no new server functions needed)
