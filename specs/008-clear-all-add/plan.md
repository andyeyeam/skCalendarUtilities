# Implementation Plan: Clear All People and Meetings

**Branch**: `008-clear-all-add` | **Date**: 2025-01-30 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/008-clear-all-add/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add a "Clear All" feature to the One-to-One Scheduler that removes all people and their associated calendar events in a single bulk operation. The feature provides clear visual feedback during execution, requires explicit user confirmation before proceeding, and preserves all configuration settings (meeting duration, recurrence interval, time slots). This addresses the need for quick system resets when starting new scheduling periods or correcting mistakes affecting multiple people.

**Technical Approach**: Extend existing PeopleService with a batch deletion function that iterates through all people, deletes their calendar events via Google Calendar API, and removes them from the OneToOnePeople sheet. The UI will add a "Clear All" button to the People tab with confirmation dialog and working indicator during processing.

## Technical Context

**Language/Version**: JavaScript ES5+ compatible (Google Apps Script V8 runtime)
**Primary Dependencies**: Google Apps Script services (CalendarApp, SpreadsheetApp), HTML Service for UI
**Storage**: Google Sheets (existing "Calendar Utilities Config" spreadsheet, OneToOnePeople tab)
**Testing**: Manual testing via Google Apps Script UI (no automated test framework)
**Target Platform**: Google Apps Script web app embedded in Google Sites
**Project Type**: Single project (Google Apps Script application)
**Performance Goals**: Complete deletion of 100 people with meetings within 10 seconds
**Constraints**: Must preserve OneToOneConfig and OneToOneSlots sheets; working indicator must be visible throughout operation; disabled UI during deletion
**Scale/Scope**: Support up to 100 people; single server-side function call; UI enhancement in existing OneToOne.html

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Google Workspace Integration ✅

**Status**: PASS

- Feature uses Google Apps Script as platform ✓
- Integrates with Google Calendar API (CalendarApp) to delete recurring events ✓
- Operates within existing OneToOne.html embedded UI ✓
- Uses Apps Script native services (SpreadsheetApp for sheet deletion) ✓
- No external hosting required ✓

### II. Modern Minimalist Design ✅

**Status**: PASS

- "Clear All" button follows existing UI patterns in People tab ✓
- Confirmation dialog uses clean, uncluttered layout with clear warning message ✓
- Working indicator (loading spinner + message) serves functional purpose ✓
- Progressive disclosure: confirmation shown only when needed ✓
- No decorative elements added ✓

### III. Sheet-Based Data Persistence ✅

**Status**: PASS

- Uses existing Google Sheets for data storage (OneToOnePeople tab) ✓
- Batch deletion operation removes all rows efficiently ✓
- Preserves OneToOneConfig and OneToOneSlots sheets as required ✓
- Sheet remains human-readable (empty state after Clear All) ✓
- Uses existing batch read/write utilities ✓

### IV. Typography Excellence ✅

**Status**: PASS

- Confirmation dialog text maintains existing typography hierarchy ✓
- Success/error messages use established font sizes and weights ✓
- No new typographic elements introduced ✓
- Working indicator message uses consistent body text styling ✓

### V. Disciplined Color Palette ✅

**Status**: PASS

- "Clear All" button uses existing neutral colors (background: #f5f5f5, color: #333, border: #ddd) ✓
- Confirmation dialog follows existing color scheme ✓
- Warning state uses existing red accent (#d32f2f) for delete confirmation ✓
- No new colors introduced ✓
- Maintains sufficient contrast for accessibility ✓

**Overall Assessment**: All five core principles satisfied. No constitution violations.

## Project Structure

### Documentation (this feature)

```
specs/008-clear-all-add/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── PeopleService.md # Updated API contract for clearAllPeople()
├── checklists/          # Quality validation
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── models/              # Existing models (Person, MeetingSlot, etc.)
│   ├── Person.gs
│   └── [other models]
├── services/
│   ├── PeopleService.gs # MODIFIED: Add clearAllPeople() function
│   └── [other services]
├── ui/
│   ├── OneToOne.html    # MODIFIED: Add "Clear All" button and handler
│   └── [other UI files]
└── utils/               # Existing utilities (unchanged)

tests/                   # Manual testing only (no automated tests)
```

**Structure Decision**: This is a single Google Apps Script project following the established `src/` structure. The feature modifies two existing files (PeopleService.gs and OneToOne.html) and does not introduce new models, services, or UI files. All changes are additive to the existing Feature 006 (One-to-One Scheduler) infrastructure.

## Complexity Tracking

*No constitution violations - section not applicable*

This feature maintains full compliance with all five core principles and introduces no additional complexity beyond the existing codebase architecture.
