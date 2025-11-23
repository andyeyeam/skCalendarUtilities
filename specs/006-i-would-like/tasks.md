# Tasks: One-to-One Meeting Scheduler

**Feature**: 006-i-would-like
**Branch**: 006-i-would-like
**Input**: Design documents from `/specs/006-i-would-like/`
**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/server-functions.md ✅

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and sheet structure setup

- [x] T001 Initialize three new Google Sheets tabs via SheetService.gs: OneToOnePeople, OneToOneConfig, OneToOneSlots
- [x] T002 Verify sheet initialization with default config values (meetingDurationMinutes: 30, minRecurrenceIntervalWeeks: 1, meetingTitlePrefix: "1:1 -")
- [x] T003 Update src/Code.gs to add 'OneToOne' to validUtilities array

**Checkpoint**: Sheets infrastructure ready - all tabs exist with proper headers

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core models and utilities that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Create Person model in src/models/Person.gs (createPerson, validatePersonData, personToRow, rowToPerson)
- [x] T005 [P] Create MeetingSlot model in src/models/MeetingSlot.gs (createMeetingSlot, validateSlotData, parseTime, minutesToTime, slotToRow, rowToSlot)
- [x] T006 [P] Create ScheduledMeeting model in src/models/ScheduledMeeting.gs (createScheduledMeeting, formatTime12Hour, formatRecurrence)
- [x] T007 [P] Create ValidationUtils helper in src/utils/ValidationUtils.gs (isValidEmail, validation error formatting)
- [x] T008 Create base OneToOne.html UI structure with tab navigation (People, Settings, Meetings tabs)
- [x] T009 Implement session storage utilities for oneToOne_activeTab, oneToOne_scrollPosition state persistence in OneToOne.html

**Checkpoint**: Foundation ready - models and UI shell exist, user story implementation can begin in parallel

---

## Phase 3: User Story 1 - Manage People in One-to-One Group (Priority: P1) 🎯 MVP

**Goal**: Enable managers to add, edit, remove, and view people in their one-to-one meeting group

**Independent Test**: Add several people to the group, edit their details, view the complete list, and remove people. Verify persistence across page refresh.

### Implementation for User Story 1

- [x] T010 [P] [US1] Create PeopleService.gs with addPerson(name, email) function - writes to OneToOnePeople sheet
- [x] T011 [P] [US1] Create editPerson(personId, name, email) function in PeopleService.gs - updates row in OneToOnePeople
- [x] T012 [P] [US1] Create deletePerson(personId) function in PeopleService.gs - deletes row and returns calendarEventId
- [x] T013 [P] [US1] Create listPeople() function in PeopleService.gs - reads all people from OneToOnePeople sheet
- [x] T014 [US1] Expose PeopleService functions in src/Code.gs (addPerson, editPerson, deletePerson, listPeople)
- [x] T015 [US1] Implement People tab UI in OneToOne.html: list view with add person form
- [x] T016 [US1] Implement people list rendering with edit/delete buttons in OneToOne.html
- [x] T017 [US1] Add client-side validation for person name and email in OneToOne.html
- [x] T018 [US1] Implement add person flow: form submission → server call → success/error handling → list refresh
- [x] T019 [US1] Implement edit person flow: inline edit → server call → success/error handling → list update
- [x] T020 [US1] Implement delete person flow: confirmation dialog → server call → success message → list refresh
- [x] T021 [US1] Add empty state message for people list ("No people in your group yet. Add your first person to get started.")
- [x] T022 [US1] Implement scroll position restoration using session storage in people list

**Checkpoint**: User Story 1 complete - can manage people, list persists across sessions, independently testable

---

## Phase 4: User Story 2 - Configure Meeting Slots and Recurrence Rules (Priority: P1) 🎯 MVP

**Goal**: Allow managers to define when one-to-one meetings can be scheduled (weekdays, times) and set minimum recurrence interval and meeting duration

**Independent Test**: Set available meeting slots (e.g., "Tuesdays 2-5pm, Thursdays 9am-12pm"), specify meeting duration (e.g., 30 minutes), and set minimum recurrence interval (e.g., every 2 weeks). Verify validation and persistence.

### Implementation for User Story 2

- [x] T023 [P] [US2] Create OneToOneConfigService.gs with getOneToOneConfig() function - reads from OneToOneConfig sheet
- [x] T024 [P] [US2] Create updateOneToOneConfig(config) function in OneToOneConfigService.gs - validates and writes config
- [x] T025 [P] [US2] Create MeetingSlotService.gs with addMeetingSlot(weekday, startTime, endTime) function
- [x] T026 [P] [US2] Create editMeetingSlot(slotId, weekday, startTime, endTime) function in MeetingSlotService.gs
- [x] T027 [P] [US2] Create deleteMeetingSlot(slotId) function in MeetingSlotService.gs
- [x] T028 [P] [US2] Create listMeetingSlots() function in MeetingSlotService.gs
- [x] T029 [US2] Expose configuration and slot functions in src/Code.gs
- [x] T030 [US2] Implement Settings tab UI in OneToOne.html: config form (duration, min interval, title prefix)
- [x] T031 [US2] Implement slots management UI in Settings tab: list of slots with add/edit/delete
- [x] T032 [US2] Add client-side validation for config values (duration 15-240, interval 1-52, prefix non-empty)
- [x] T033 [US2] Add client-side validation for slot data (valid weekday, HH:MM format, end > start)
- [x] T034 [US2] Implement cross-validation: slot duration must be >= meeting duration
- [x] T035 [US2] Implement config form load on tab open: getOneToOneConfig() → populate form
- [x] T036 [US2] Implement config form save: updateOneToOneConfig() → success/error handling
- [x] T037 [US2] Implement add slot flow: form → addMeetingSlot() → refresh slots list
- [x] T038 [US2] Implement edit slot flow: inline edit → editMeetingSlot() → refresh slots list
- [x] T039 [US2] Implement delete slot flow: confirmation → deleteMeetingSlot() → refresh slots list
- [x] T040 [US2] Add empty state for slots list ("No time slots configured. Add your first slot to get started.")
- [x] T041 [US2] Implement session storage for config form draft (oneToOne_configFormState)

**Checkpoint**: User Story 2 complete - can configure meeting parameters and slots, independently testable

---

## Phase 5: User Story 3 - Create and View Scheduled Meetings (Priority: P1) 🎯 MVP

**Goal**: Automatically create recurring calendar events for each person according to configured rules and display the meeting schedule

**Independent Test**: Add 3 people, configure slots and rules, click "Create Meetings", verify each person gets a recurring calendar event with correct timing, duration, and recurrence interval. View meetings in UI.

### Implementation for User Story 3

- [x] T042 [P] [US3] Create SchedulingService.gs with calculateRecurrenceInterval(peopleCount, slotsPerWeek, minInterval) function
- [x] T043 [P] [US3] Create expandSlotsIntoPeriods(slots, durationMinutes) function in SchedulingService.gs
- [x] T044 [P] [US3] Create assignPeopleToPeriods(people, periods, recurrenceWeeks) function - implements round-robin algorithm
- [x] T045 [US3] Create createOneToOneMeeting(calendar, personName, weekday, startDateTime, endDateTime, intervalWeeks) helper function
- [x] T046 [US3] Create calculateNextOccurrence(weekday, startTimeMinutes, durationMinutes) helper function
- [x] T047 [US3] Create executeScheduling(calendar, assignments, titlePrefix) function - creates CalendarEventSeries for each person
- [x] T048 [US3] Create createAllMeetings() orchestration function - validates prerequisites, calls scheduling algorithm, updates OneToOnePeople sheet
- [x] T049 [P] [US3] Create viewMeetings() function in SchedulingService.gs - reads people with calendarEventId, fetches event metadata
- [x] T050 [US3] Expose createAllMeetings() and viewMeetings() in src/Code.gs
- [x] T051 [US3] Implement Meetings tab UI in OneToOne.html: "Create Meetings" button and meetings list display
- [x] T052 [US3] Implement pre-scheduling validation UI: check people exist, slots exist, duration fits
- [x] T053 [US3] Display calculated recurrence interval to user before creating meetings (FR-033)
- [x] T054 [US3] Implement create meetings flow: button click → createAllMeetings() → display results with success/partial failure handling
- [x] T055 [US3] Implement meetings list rendering: person name, weekday, time, recurrence pattern
- [x] T056 [US3] Format meeting times for display (convert 24-hour to 12-hour AM/PM format)
- [x] T057 [US3] Add empty state for meetings list ("No meetings scheduled yet. Create meetings to get started.")
- [x] T058 [US3] Display scheduling metadata: total people, success count, failure count, recurrence interval
- [x] T059 [US3] Implement error handling for Calendar API failures with user-friendly messages
- [x] T060 [US3] Update Menu.html to add "One-to-One Scheduler" button (fifth utility)

**Checkpoint**: User Story 3 complete - can automatically create and view recurring meetings, MVP fully functional

---

## Phase 6: User Story 4 - Update and Delete Meetings (Priority: P2)

**Goal**: Enable managers to update existing meeting schedules or delete meetings when people leave the team

**Independent Test**: Modify a person's meeting time/day, verify calendar event updates. Remove a person, verify calendar event is deleted.

### Implementation for User Story 4

- [ ] T061 [P] [US4] Create deleteMeeting(personId) function in SchedulingService.gs - deletes CalendarEventSeries, clears calendarEventId
- [ ] T062 [P] [US4] Create updateMeetingRecurrence(eventId, newIntervalWeeks) helper function in SchedulingService.gs
- [ ] T063 [P] [US4] Create updateMeetingDuration(eventId, newDurationMinutes) helper function in SchedulingService.gs
- [ ] T064 [US4] Expose deleteMeeting() in src/Code.gs
- [ ] T065 [US4] Add delete button to each meeting in meetings list UI
- [ ] T066 [US4] Implement delete meeting flow: confirmation dialog → deleteMeeting() → success message → refresh list
- [ ] T067 [US4] Update deletePerson() to handle calendar event deletion when person is removed (integrate with US1)
- [ ] T068 [US4] Add warning to delete person confirmation: "This will delete [Name]'s recurring meeting"
- [ ] T069 [US4] Test cascade delete: removing person removes their calendar event

**Checkpoint**: User Story 4 complete - can update and delete individual meetings

---

## Phase 7: User Story 5 - Reschedule Meetings After Configuration Changes (Priority: P3)

**Goal**: Provide ability to regenerate all meeting schedules when configuration significantly changes

**Independent Test**: Create meetings for 5 people, add 5 more people, click "Regenerate All Meetings", verify system redistributes all 10 people optimally.

### Implementation for User Story 5

- [ ] T070 [US5] Create regenerateAllMeetings() function in SchedulingService.gs - deletes all existing meetings, calls createAllMeetings()
- [ ] T071 [US5] Expose regenerateAllMeetings() in src/Code.gs
- [ ] T072 [US5] Add "Regenerate All Meetings" button to Meetings tab UI
- [ ] T073 [US5] Implement regenerate confirmation dialog with warning: "This will delete and recreate ALL meetings. Continue?"
- [ ] T074 [US5] Implement regenerate flow: confirmation → regenerateAllMeetings() → display deletion/creation summary → refresh list
- [ ] T075 [US5] Display regeneration summary: X meetings deleted, Y meetings created, new recurrence interval
- [ ] T076 [US5] Test regeneration with increased people count (5 → 15 people, verify recurrence interval adjustment)

**Checkpoint**: User Story 5 complete - full regeneration capability available

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T077 [P] Add loading indicators for all async server calls (google.script.run)
- [ ] T078 [P] Implement consistent error message display pattern across all tabs
- [ ] T079 [P] Implement consistent success message display pattern across all tabs
- [ ] T080 [P] Add ARIA labels for accessibility on all interactive elements
- [ ] T081 Code review: ensure all functions follow Google Apps Script ES5+ patterns (var, function, no arrow functions)
- [ ] T082 Code review: ensure all validation follows patterns in ValidationUtils.gs
- [ ] T083 Test calendar event title format compliance: all events use configured prefix + person name
- [ ] T084 Test session storage persistence: verify state survives page refresh
- [ ] T085 Test performance: verify 20 people scheduling completes in <10 seconds
- [ ] T086 Test error handling: verify graceful degradation for Calendar API failures
- [ ] T087 [P] Update CLAUDE.md with OneToOne.html, new models, new services
- [ ] T088 Validate against quickstart.md: ensure all implementation steps are followed
- [ ] T089 Manual testing on Google Sites iframe: desktop viewport
- [ ] T090 Manual testing on Google Sites iframe: mobile viewport

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - User stories can proceed in parallel (if staffed) or sequentially by priority (P1 → P2 → P3)
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - People Management**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 2 (P1) - Configuration**: Can start after Foundational (Phase 2) - No dependencies on other stories
- **User Story 3 (P1) - Create Meetings**: Depends on US1 (needs people) and US2 (needs config/slots) - Core scheduling feature
- **User Story 4 (P2) - Update/Delete Meetings**: Depends on US3 (needs meetings to exist)
- **User Story 5 (P3) - Regenerate Meetings**: Depends on US3 (reuses scheduling logic)

### Within Each User Story

**User Story 1** (People Management):
- T010-T013 (service functions) can run in parallel [P]
- T014 exposes functions (depends on T010-T013)
- T015-T022 (UI implementation) depends on T014

**User Story 2** (Configuration):
- T023-T024 (config service) can run in parallel [P]
- T025-T028 (slot service) can run in parallel [P]
- T029 exposes functions (depends on T023-T028)
- T030-T041 (UI implementation) depends on T029

**User Story 3** (Create Meetings):
- T042-T044 (scheduling algorithm) can run in parallel [P]
- T045-T047 depends on T042-T044
- T048-T049 can run in parallel [P]
- T050 exposes functions (depends on T048-T049)
- T051-T060 (UI implementation) depends on T050

**User Story 4** (Update/Delete):
- T061-T063 can run in parallel [P]
- T064 exposes functions (depends on T061-T063)
- T065-T069 (UI implementation) depends on T064

**User Story 5** (Regenerate):
- T070 implements regeneration (reuses US3 scheduling)
- T071 exposes function (depends on T070)
- T072-T076 (UI implementation) depends on T071

**Polish Phase**:
- T077-T080 (UI enhancements) can run in parallel [P]
- T087 (documentation) can run in parallel [P]

### Parallel Opportunities

**Setup Phase**:
- All Setup tasks can run sequentially (small phase)

**Foundational Phase**:
- T004-T007 (models and utils) can ALL run in parallel [P]
- T008-T009 (UI shell) runs after models exist

**After Foundational Complete**:
- User Story 1 and User Story 2 can run in PARALLEL (no interdependencies)
- User Story 3 starts after US1 and US2 are both complete
- User Story 4 starts after US3 complete
- User Story 5 starts after US3 complete

---

## Parallel Example: Foundational Phase

```bash
# Launch all models together:
Task: "Create Person model in src/models/Person.gs"
Task: "Create MeetingSlot model in src/models/MeetingSlot.gs"
Task: "Create ScheduledMeeting model in src/models/ScheduledMeeting.gs"
Task: "Create ValidationUtils helper in src/utils/ValidationUtils.gs"
```

## Parallel Example: User Stories 1 & 2

```bash
# Once Foundational is complete, launch both:
Task: "Implement User Story 1 (People Management) - T010 through T022"
Task: "Implement User Story 2 (Configuration) - T023 through T041"
```

---

## Implementation Strategy

### MVP First (User Stories 1, 2, 3 Only)

1. Complete Phase 1: Setup (T001-T003)
2. Complete Phase 2: Foundational (T004-T009) - CRITICAL - blocks all stories
3. Complete Phase 3: User Story 1 - People Management (T010-T022)
4. Complete Phase 4: User Story 2 - Configuration (T023-T041)
5. Complete Phase 5: User Story 3 - Create Meetings (T042-T060)
6. **STOP and VALIDATE**: Test MVP independently - can add people, configure slots, create meetings
7. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (people management works!)
3. Add User Story 2 → Test independently → Deploy/Demo (configuration works!)
4. Add User Story 3 → Test independently → Deploy/Demo (MVP complete - scheduling works!)
5. Add User Story 4 → Test independently → Deploy/Demo (enhanced management)
6. Add User Story 5 → Test independently → Deploy/Demo (full regeneration capability)
7. Polish phase → Final testing → Production deployment

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - **Developer A**: User Story 1 (People Management)
   - **Developer B**: User Story 2 (Configuration)
3. When US1 and US2 complete:
   - **Developer A**: User Story 3 (Create Meetings)
4. When US3 completes:
   - **Developer A**: User Story 4 (Update/Delete)
   - **Developer B**: User Story 5 (Regenerate)
5. Team joins for Polish phase

---

## Task Count Summary

- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 6 tasks (blocks all user stories)
- **Phase 3 (US1 - People Management)**: 13 tasks
- **Phase 4 (US2 - Configuration)**: 19 tasks
- **Phase 5 (US3 - Create Meetings)**: 19 tasks
- **Phase 6 (US4 - Update/Delete)**: 9 tasks
- **Phase 7 (US5 - Regenerate)**: 7 tasks
- **Phase 8 (Polish)**: 14 tasks

**Total Tasks**: 90 tasks

**MVP Tasks** (P1 only): 3 (Setup) + 6 (Foundational) + 13 (US1) + 19 (US2) + 19 (US3) = **60 tasks**

**Parallel Opportunities Identified**:
- 4 tasks in Foundational phase can run in parallel
- US1 and US2 can run in parallel (32 tasks total)
- Multiple service functions within each story can run in parallel
- Polish tasks (4 UI enhancements, 1 documentation) can run in parallel

**Suggested MVP Scope**: User Stories 1, 2, 3 (Priority P1) - provides complete core functionality for adding people, configuring slots, and automatically creating recurring meetings

---

## Notes

- [P] tasks = different files, no dependencies, can run in parallel
- [Story] label maps task to specific user story for traceability (US1, US2, US3, US4, US5)
- Each user story is independently testable via the "Independent Test" criteria listed in each phase
- Google Apps Script ES5+ conventions: use `var`, `function` declarations, no arrow functions, no `let`/`const`
- All Calendar API calls wrapped in try-catch with graceful error handling
- All sheet operations use batch read/write for performance
- Session storage uses `oneToOne_` prefix to avoid collisions with other features
- Commit after completing each user story phase for clean rollback points
- Stop at any checkpoint to validate story independently before proceeding
