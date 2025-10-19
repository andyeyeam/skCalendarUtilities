# Implementation Plan: Contiguous Availability Blocks

**Branch**: `005-add-a-new` | **Date**: 2025-01-19 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/005-add-a-new/spec.md`

## Summary

Add a mode selection to the Find Availability feature allowing users to choose between the existing duration-based search (showing slots of specified duration) and a new contiguous blocks search (showing all uninterrupted free time regardless of duration). The contiguous mode displays complete availability blocks from calendar event to calendar event, enabling users to see their full schedule flexibility and make informed decisions about how to use their free time.

**Technical Approach**: Extend the existing AvailabilityService to support both search modes by adding a mode parameter that determines whether to apply duration filtering. The UI will add a mode selection screen at the beginning of the availability finder flow, conditionally show/hide the duration input field based on mode, and clearly indicate the active mode in results display.

## Technical Context

**Language/Version**: JavaScript ES5+ (Google Apps Script V8 runtime)
**Primary Dependencies**: Google Apps Script (CalendarApp, SpreadsheetApp, HTML Service), Browser Clipboard API, Session Storage
**Storage**: Google Sheets for configuration (existing "Calendar Utilities Config" spreadsheet), Session Storage for UI state persistence
**Testing**: Manual testing via Google Apps Script web app deployment
**Target Platform**: Web app embedded in Google Sites (iframe), desktop and mobile browsers
**Project Type**: Single web application (Apps Script)
**Performance Goals**: Search results in <5 seconds for 7-day range, mode switching within 2 clicks
**Constraints**: <2 second UI interaction response time, 15-minute slot granularity, 14-day maximum date range
**Scale/Scope**: Single user calendar access, 14-day search window, typical use case of 10-50 events per week

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Google Workspace Integration (Principle I)
✅ **PASS** - Feature operates entirely within Google Apps Script, uses CalendarApp for calendar access, no external hosting required. Extension of existing availability finder maintains platform constraints.

### Modern Minimalist Design (Principle II)
✅ **PASS** - Mode selection adds one new decision point at start of flow (progressive disclosure). Results display reuses existing card-based layout. No decorative elements added. Clear visual hierarchy maintained with mode indicator.

### Sheet-Based Data Persistence (Principle III)
✅ **PASS** - No new persistent data requirements. Mode selection is session-state only (SessionStorage). Existing sheet-based config remains unchanged.

### Typography Excellence (Principle IV)
✅ **PASS** - Reuses existing typography system (Inter/Roboto font stack, consistent spacing, clear hierarchy). Mode selection buttons follow existing button styles. Results header clearly differentiated.

### Disciplined Color Palette (Principle V)
✅ **PASS** - No new colors introduced. Mode selection uses existing neutral/accent color scheme. Active mode indicator uses existing accent color for consistency.

### Performance Goals
✅ **PASS** - Contiguous blocks calculation reuses existing interval generation and event overlap logic. No additional Calendar API calls required. Expected performance: <5 seconds for 7-day range (same as duration-based).

### Code Organization
✅ **PASS** - Extends existing AvailabilityService with mode parameter. UI changes isolated to Availability.html. Separation of concerns maintained (server-side logic vs client-side rendering).

**Constitution Check Result**: ✅ ALL GATES PASSED - No violations, proceed to Phase 0

## Project Structure

### Documentation (this feature)

```
specs/005-add-a-new/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── availability-api.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── models/
│   └── TimeSlot.gs              # Existing model (no changes)
├── services/
│   └── AvailabilityService.gs   # MODIFY: Add mode parameter support
├── ui/
│   ├── Availability.html        # MODIFY: Add mode selection UI
│   └── Styles.html              # Existing shared styles (no changes)
└── Code.gs                      # MODIFY: Update server-side handlers

tests/ (manual)
└── Manual test scenarios defined in quickstart.md
```

**Structure Decision**: Single project structure (Google Apps Script). Changes limited to existing AvailabilityService (server-side logic) and Availability.html (client-side UI). No new files required - feature implemented as extension of existing availability finder components.

## Complexity Tracking

*No Constitution Check violations - this section is empty.*

## Phase 0: Research & Technical Decisions

**Objective**: Resolve technical unknowns and establish implementation patterns

### Research Tasks

1. **Mode Selection UI Pattern**
   - Question: How should mode selection be presented in the flow?
   - Research: Review existing UI patterns in Availability.html, evaluate options (radio buttons, dropdown, button group)
   - Decision criteria: Minimalist design, clear visual distinction, mobile-friendly

2. **AvailabilityService Extension Strategy**
   - Question: How to extend calculateAvailability() to support both modes without breaking existing functionality?
   - Research: Review current calculateAvailability() implementation, identify where duration filtering occurs
   - Decision criteria: Backward compatibility, code reusability, maintainability

3. **Session Storage Schema for Mode**
   - Question: What session storage structure should store mode selection?
   - Research: Review existing session storage usage in Availability.html
   - Decision criteria: Consistency with existing patterns, restoration on page reload

4. **Results Display Differentiation**
   - Question: How to clearly indicate which mode is active in results display?
   - Research: Existing metadata display patterns, minimalist indicator options
   - Decision criteria: Unobtrusive, immediately clear, consistent with design principles

**Output**: research.md documenting decisions for each question above

## Phase 1: Design & Contracts

**Prerequisites**: research.md complete

### Data Model

**Objective**: Define data structures for mode selection and contiguous blocks

1. **SearchMode Enumeration**
   - Values: "duration" | "contiguous"
   - Storage: Session storage, server-side parameter

2. **ContiguousBlock Extension**
   - Extends existing TimeSlot model
   - No new fields required (start time, end time, duration already present)

3. **AvailabilitySearchRequest**
   - Existing fields: startDate, endDate, minDuration
   - New field: searchMode (string: "duration" | "contiguous")

**Output**: data-model.md with complete entity definitions

### API Contracts

**Objective**: Define client-server interface for mode-aware availability search

1. **findAvailability() Server Function**
   - Input: startDateTime (string), endDateTime (string), minDuration (number), searchMode (string)
   - Output: { success: boolean, slots: TimeSlot[], events: CalendarEvent[], metadata: Metadata, error?: string }
   - Behavior: If searchMode === "contiguous", ignore minDuration for filtering (still use for slot generation granularity)

2. **Session Storage Contract**
   - Keys: availability_searchMode, availability_startDateTime, availability_endDateTime, availability_minDuration
   - Values: All strings, mode defaults to "duration" if not set

**Output**: contracts/availability-api.md with OpenAPI-style documentation

### Implementation Guide

**Objective**: Provide step-by-step implementation reference

1. **Server-Side Changes** (AvailabilityService.gs, Code.gs)
   - Modify calculateAvailability() to accept searchMode parameter
   - Conditional duration filtering based on mode
   - Update server handler to accept and pass mode parameter

2. **Client-Side Changes** (Availability.html)
   - Add mode selection UI (radio buttons or button group)
   - Show/hide duration input based on mode
   - Save/restore mode from session storage
   - Display active mode in results metadata

3. **Testing Checklist**
   - Mode selection persists across page reloads
   - Duration-based mode produces existing behavior
   - Contiguous mode shows all blocks regardless of duration
   - Mode indicator clearly visible in results
   - Edge cases: weekends, all-day events, back-to-back meetings

**Output**: quickstart.md with implementation steps and testing checklist

### Agent Context Update

**Objective**: Update CLAUDE.md with new feature information

Run agent context update script to add:
- Mode selection UI pattern to "Recent Changes"
- Contiguous availability blocks feature to active feature list
- SearchMode concept to data models

**Command**: `.specify/scripts/powershell/update-agent-context.ps1 -AgentType claude`

**Output**: Updated CLAUDE.md file

## Phase 2: Task Generation

**NOT EXECUTED BY THIS COMMAND**

Phase 2 (task generation) is handled by the `/speckit.tasks` command, which will:
1. Read this plan.md and spec.md
2. Generate dependency-ordered tasks.md
3. Create executable implementation tasks

Run `/speckit.tasks` after this plan is approved to proceed to implementation.
