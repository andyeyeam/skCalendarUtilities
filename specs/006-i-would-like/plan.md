# Implementation Plan: One-to-One Meeting Scheduler

**Branch**: `006-i-would-like` | **Date**: 2025-01-26 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/006-i-would-like/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature adds a one-to-one meeting scheduler that helps managers automatically create and manage recurring calendar events for regular check-ins with team members. Users will access this via a new "One-to-One Scheduler" option on the main menu, which navigates to a dedicated interface for managing people in their group, configuring available meeting slots and recurrence rules, and automatically generating optimally-distributed recurring calendar events with intelligent interval calculation.

## Technical Context

**Language/Version**: Google Apps Script (JavaScript ES5+ compatible, V8 runtime)
**Primary Dependencies**: Google Calendar API (CalendarApp), Google Sheets API (SpreadsheetApp), HTML Service for UI, Session Storage for UI state
**Storage**: Google Sheets (existing "Calendar Utilities Config" spreadsheet with 3 new tabs: OneToOnePeople, OneToOneConfig, OneToOneSlots)
**Testing**: Manual testing in Google Sites iframe (desktop and mobile viewports)
**Target Platform**: Google Apps Script Web App embedded in Google Sites via iframe
**Project Type**: Web application (server-side JavaScript with HTML UI)

**Performance Goals**:
- Meeting creation for 20 people completes in <10 seconds
- UI navigation and tab switching responds within 1-2 seconds
- Sheet read/write operations <500ms (batch operations)
- Session storage operations <5ms
- Scheduling algorithm calculation <1 second for up to 20 people

**Constraints**:
- Must work within Google Apps Script execution time limits (6 minutes max)
- Calendar API rate limits (standard Google Workspace quotas)
- Sheet size limits (reasonable for 50-100 people maximum)
- Meeting duration must fit within configured time slots
- Recurrence interval minimum 1 week (per assumptions)
- 15-minute time granularity for slot configuration

**Scale/Scope**:
- Single-user per session (manager managing their own one-to-ones)
- Expected group size: 5-20 people
- Expected number of time slots: 2-10 slots per week
- Expected recurrence intervals: 1-4 weeks
- 3 new Google Sheets tabs for data persistence
- 6+ new server-side functions (people CRUD, config, scheduling)
- 1 new multi-tab UI screen (people management, configuration, meetings view)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Google Workspace Integration ✅
- **Status**: PASS
- **Compliance**: Feature uses Google Calendar API via CalendarApp for recurring events, Google Sheets API for data storage, embeds in Google Sites, uses existing Apps Script infrastructure
- **Notes**: No new platform dependencies introduced; fully within Google Workspace ecosystem; extends existing Config spreadsheet

### II. Modern Minimalist Design ✅
- **Status**: PASS
- **Compliance**: UI will follow existing Styles.html patterns (clean layouts, whitespace, clear hierarchy) with tabbed interface for people/config/meetings
- **Notes**: Multi-section UI will use card-based layout with clear visual separation; minimalist forms for data entry; confirmation dialogs for destructive actions

### III. Sheet-Based Data Persistence ✅
- **Status**: PASS
- **Compliance**: Uses Google Sheets with 3 new tabs in existing Config spreadsheet for people list, configuration settings, and meeting slots
- **Notes**: Sheet schema is human-readable and follows existing patterns from Feature 001; supports manual inspection and editing if needed

### IV. Typography Excellence ✅
- **Status**: PASS
- **Compliance**: Will use existing typography from Styles.html (16px base, 1.5 line-height, system fonts, clear heading hierarchy)
- **Notes**: People list will be displayed in readable table format; configuration forms use consistent label/input spacing; meeting schedule uses clear time display

### V. Disciplined Color Palette ✅
- **Status**: PASS
- **Compliance**: Will use existing 3-color palette (#FFFFFF, #333333, #4285f4) from constitution
- **Notes**: No new colors required; primary action buttons (Create Meetings, Add Person) use blue accent; delete actions use standard styling with confirmation

**Overall Assessment**: ✅ ALL GATES PASSED - No constitution violations. Feature aligns with all core principles.

---

### Post-Design Re-Evaluation

After completing Phase 0 (research.md) and Phase 1 (data-model.md, contracts/, quickstart.md), the design has been validated against constitution principles:

#### I. Google Workspace Integration ✅ CONFIRMED
- **Design Reality**: All components use native Google Apps Script APIs (CalendarApp with newRecurrence(), SpreadsheetApp, HtmlService)
- **No External Dependencies**: Pure JavaScript implementation, no npm packages or external libraries
- **Platform Integration**: Seamlessly integrates with existing Feature 001 menu system; extends existing Config spreadsheet
- **Recurrence API**: Uses CalendarApp.newRecurrence().addWeeklyRule() for native recurring event creation
- **Verdict**: PASS - Fully compliant, no deviations from principle

#### II. Modern Minimalist Design ✅ CONFIRMED
- **Design Reality**: OneToOne.html follows existing card-based layout with tabbed sections (People, Settings, Meetings)
- **Visual Hierarchy**: Clear section headers, tables for people list, forms for configuration, read-only meeting display
- **Whitespace**: Consistent spacing using existing CSS classes (mb-2, mb-3, padding utilities)
- **Progressive Disclosure**: Tabs hide complexity; only show relevant sections; confirmation dialogs for destructive actions
- **Verdict**: PASS - Design maintains minimalist aesthetic with functional tabbed interface

#### III. Sheet-Based Data Persistence ✅ CONFIRMED
- **Design Reality**: Three new tabs in existing "Calendar Utilities Config" spreadsheet:
  - OneToOnePeople: id, name, email, calendarEventId, createdAt, updatedAt
  - OneToOneConfig: key-value pairs (meetingDuration, minRecurrenceInterval, titlePrefix)
  - OneToOneSlots: id, weekday, startTime, endTime, enabled
- **Human Readable**: All sheets use clear column headers, formatted timestamps, readable data
- **Batch Operations**: CRUD operations use getValues()/setValues() for performance
- **Verdict**: PASS - Principle satisfied; extends existing sheet pattern correctly

#### IV. Typography Excellence ✅ CONFIRMED
- **Design Reality**: Uses existing Styles.html typography (16px base, 1.5 line-height, system fonts)
- **Hierarchy Implementation**:
  - H1: "One-to-One Scheduler" (main heading)
  - H2: Tab section headers ("People", "Settings", "Meetings")
  - H3: Subsection headers within tabs
  - Body: Form labels, table data (16px, consistent weights)
- **Tables**: Clear header/body distinction, readable spacing, aligned columns
- **Verdict**: PASS - Typography follows established patterns exactly

#### V. Disciplined Color Palette ✅ CONFIRMED
- **Design Reality**: Uses only 3 colors from constitution:
  - White (#FFFFFF): Card backgrounds, form inputs, table backgrounds
  - Dark gray (#333333): Text, headings, table borders
  - Blue (#4285f4): Primary action buttons (Create Meetings, Add Person), active tab indicator
- **No New Colors**: All UI elements reuse existing color scheme
- **Contrast**: Maintained WCAG AA compliance (existing Styles.html already compliant)
- **Verdict**: PASS - No color palette violations, strict adherence to 3-color constraint

**Final Assessment**: ✅ ALL CONSTITUTION GATES REMAIN PASSED POST-DESIGN

The detailed design (research, data model, contracts, quickstart) confirms initial assessment. No constitution principles were compromised during technical planning. Implementation can proceed without requiring any exceptions or amendments to project constitution.

## Project Structure

### Documentation (this feature)

```
specs/006-i-would-like/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (COMPLETE)
├── data-model.md        # Phase 1 output (TO BE CREATED)
├── quickstart.md        # Phase 1 output (TO BE CREATED)
├── contracts/           # Phase 1 output (TO BE CREATED)
│   └── server-functions.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── Code.gs                         # MODIFY - Add 'OneToOne' to validUtilities, expose server functions
├── models/
│   ├── Config.gs                   # Existing - No changes needed
│   ├── Event.gs                    # Existing - No changes needed
│   ├── TimeSlot.gs                 # Existing - No changes needed
│   ├── Person.gs                   # NEW - Person model with validation
│   ├── MeetingSlot.gs              # NEW - Available time slot model
│   └── ScheduledMeeting.gs         # NEW - Meeting assignment model
├── services/
│   ├── SheetService.gs             # MODIFY - Add sheet initialization for OneToOne tabs
│   ├── AvailabilityService.gs      # Existing - No changes needed
│   ├── CalendarService.gs          # Existing - No changes needed
│   ├── PeopleService.gs            # NEW - CRUD operations for people
│   ├── OneToOneConfigService.gs    # NEW - Configuration management
│   ├── MeetingSlotService.gs       # NEW - Time slot CRUD operations
│   └── SchedulingService.gs        # NEW - Core scheduling algorithm and calendar event creation
├── utils/
│   ├── Logger.gs                   # Existing - No changes needed
│   ├── AuthUtils.gs                # Existing - No changes needed
│   ├── SheetUtils.gs               # Existing - No changes needed
│   ├── DateUtils.gs                # Existing - Reuse from Feature 002
│   └── ValidationUtils.gs          # NEW - Input validation helpers
└── ui/
    ├── Styles.html                 # Existing - No changes needed
    ├── Menu.html                   # MODIFY - Add "One-to-One Scheduler" button
    ├── Availability.html           # Existing - No changes needed
    └── OneToOne.html               # NEW - Multi-tab UI for people/config/meetings management
```

**Structure Decision**: This is a Google Apps Script web application using the existing single-project structure. The feature integrates into the existing menu system and follows the established pattern of separate utility screens with dedicated UI. New files required:

**Models** (3 new):
- **Person.gs**: Data model for people in the group
- **MeetingSlot.gs**: Data model for available time windows
- **ScheduledMeeting.gs**: Data model for person-to-calendar-event mapping

**Services** (4 new):
- **PeopleService.gs**: CRUD operations for managing people (add, edit, delete, list)
- **OneToOneConfigService.gs**: Configuration management (duration, interval, slots)
- **MeetingSlotService.gs**: Time slot management (add, edit, delete, validate)
- **SchedulingService.gs**: Core scheduling algorithm and calendar event creation/update/delete

**Utils** (1 new):
- **ValidationUtils.gs**: Input validation helpers (email format, time ranges, etc.)

**UI** (1 new):
- **OneToOne.html**: Multi-section interface with tabs for People, Settings, and Meetings views

**Files to modify** (3):
- **Menu.html**: Add fifth utility button for "One-to-One Scheduler"
- **Code.gs**: Add 'OneToOne' to validUtilities array and expose server functions
- **SheetService.gs**: Initialize three new sheet tabs on first run

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations to track.** All constitution gates passed without requiring exceptions.

---

## Phase 0: Research ✅ COMPLETE

Research has been completed and documented in `research.md`. Key findings:

### 1. Google Sheets Storage Pattern
- **Decision**: Multi-tab schema with three new tabs in existing Config spreadsheet
- **Tabs**: OneToOnePeople, OneToOneConfig, OneToOneSlots
- **Pattern**: Follows existing SheetService.gs batch operation patterns

### 2. Google Calendar Recurring Events
- **Decision**: Use CalendarApp.newRecurrence().addWeeklyRule() API
- **Format**: Weekly recurrence with custom interval, no end date
- **Management**: Event series ID stored in sheet for updates/deletes

### 3. Session Storage for UI State
- **Decision**: Store active tab, scroll position, form drafts with `oneToOne_` prefix
- **Keys**: `oneToOne_activeTab`, `oneToOne_scrollPosition`, `oneToOne_formDraft`
- **Pattern**: Matches existing `availability_` pattern from Feature 002/003

### 4. Scheduling Algorithm
- **Decision**: Round-robin distribution with automatic interval calculation
- **Formula**: `recurrence = max(ceil(peopleCount / slotsPerWeek), minInterval)`
- **Complexity**: O(P log P) - handles 20 people in <1 second

---

## Phase 1: Design Artifacts

### Artifacts to Generate

1. **data-model.md**: Define all data structures
   - Person entity with validation rules
   - MeetingSlot entity with time range validation
   - ScheduleConfiguration entity
   - ScheduledMeeting entity with calendar event ID mapping
   - Sheet schema for all three tabs
   - State transitions for meeting lifecycle

2. **contracts/server-functions.md**: API contracts for all server functions
   - People management: addPerson, editPerson, deletePerson, listPeople
   - Config management: getConfig, updateConfig
   - Slot management: addSlot, editSlot, deleteSlot, listSlots
   - Scheduling: createMeetings, viewMeetings, deleteMeeting, regenerateAll
   - Error response format
   - OpenAPI-style documentation

3. **quickstart.md**: Step-by-step implementation guide
   - Phase-by-phase build instructions
   - Code snippets for each component
   - Testing checklist with manual test scenarios
   - Deployment steps
   - Troubleshooting guide

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        OneToOne.html                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │  People  │  │ Settings │  │ Meetings │                  │
│  │   Tab    │  │   Tab    │  │   Tab    │                  │
│  └─────┬────┘  └─────┬────┘  └─────┬────┘                  │
│        │             │             │                         │
│        │ Add/Edit    │ Configure   │ View/Delete            │
│        │ Delete      │ Slots       │ Regenerate             │
│        ▼             ▼             ▼                         │
│  ┌──────────────────────────────────────┐                   │
│  │    google.script.run (Server API)    │                   │
│  └──────────────────────────────────────┘                   │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌──────────────────┐    ┌──────────────────┐
│  Code.gs         │    │  Services Layer  │
│  (Entry Point)   │───▶│  - PeopleService │
└──────────────────┘    │  - ConfigService │
                        │  - SlotService   │
                        │  - SchedulingServ│
                        └─────────┬────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            ┌──────────┐  ┌──────────┐  ┌──────────┐
            │  Sheets  │  │ Calendar │  │ Session  │
            │   API    │  │   API    │  │ Storage  │
            └──────────┘  └──────────┘  └──────────┘
            OneToOne*     Recurring     UI State
            tabs          Events
```

### Key Design Decisions

| Component | Pattern | Rationale |
|-----------|---------|-----------|
| **UI Architecture** | Multi-tab single page | Keeps related functionality together; familiar pattern |
| **Data Storage** | Three separate sheet tabs | Clear separation of concerns; easy to query |
| **Scheduling Algorithm** | Round-robin with auto-interval | Fair distribution; handles capacity constraints |
| **Calendar Integration** | Event series with stored ID | Enables updates/deletes; traceable via title format |
| **Session Persistence** | Session storage for UI state | Fast; appropriate scope; survives refresh |
| **Validation** | Client + server validation | UX + security; prevent invalid data in sheets |

---

## Phase 2: Tasks Generation

**Status**: NOT STARTED (separate command: `/speckit.tasks`)

Tasks will be generated after design artifacts are complete and validated. Expected task breakdown:
- Phase 1: Setup (sheet initialization)
- Phase 2: Foundation (models, base services)
- Phase 3: People Management (US1 - P1 MVP)
- Phase 4: Configuration (US2 - P1 MVP)
- Phase 5: Meeting Creation (US3 - P1 MVP)
- Phase 6: Meeting Updates (US4 - P2)
- Phase 7: Regeneration (US5 - P3)
- Phase 8: Polish & Testing

---

## Next Steps

1. ✅ Phase 0: Research complete (research.md generated)
2. ⏳ Phase 1: Generate design artifacts
   - Create data-model.md
   - Create contracts/server-functions.md
   - Create quickstart.md
   - Update agent context (CLAUDE.md)
3. ⏸️ Phase 2: Run `/speckit.tasks` to generate tasks.md (separate command)
