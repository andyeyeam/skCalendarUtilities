# Implementation Plan: Optimized Meeting Slot Distribution

**Branch**: `007-when-scheduling-meetings` | **Date**: 2025-01-30 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/007-when-scheduling-meetings/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature optimizes the existing one-to-one meeting scheduler (feature 006) by implementing:
1. **Slot conflict prevention**: Ensure no weekly time slot is reused within the same calendar week
2. **Smart recurrence calculation**: Automatically adjust recurrence interval using the formula `max(minimum_recurrence, ⌈people_count / weekly_slots⌉)` to accommodate all people
3. **Even distribution algorithm**: Distribute meetings across weeks using interval stride spacing (spacing = recurrence_interval / weekly_slots) to balance calendar load

**Technical Approach**: Modify the existing `SchedulingService.gs` file to replace the current round-robin assignment algorithm (line 69-90) with a new interval stride distribution algorithm that groups people by week offsets and prevents slot reuse within the same week.

## Technical Context

**Language/Version**: JavaScript ES5+ (Google Apps Script V8 runtime)
**Primary Dependencies**: Google Apps Script APIs (CalendarApp, SpreadsheetApp, HTML Service)
**Storage**: Google Sheets (existing "Calendar Utilities Config" spreadsheet with OneToOnePeople, OneToOneConfig, OneToOneSlots tabs)
**Testing**: Manual testing via Google Apps Script web app UI
**Target Platform**: Google Apps Script web app embedded in Google Sites
**Project Type**: Single project (Google Apps Script enhancement)
**Performance Goals**: Meeting generation completes within 5 seconds for up to 100 people
**Constraints**: Must work within Google Apps Script execution time limits (6 minutes max), maintain compatibility with existing feature 006 data model
**Scale/Scope**: Support 1-100 people with 1-10 weekly slots, algorithm must handle up to 100-week recurrence intervals

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### Core Principle I: Google Workspace Integration ✅
- **Status**: PASS
- **Verification**: Feature enhances existing Google Apps Script application, uses CalendarApp API for calendar operations, operates within Google Workspace security model
- **No Changes Required**: This is a pure algorithmic enhancement to existing services

### Core Principle II: Modern Minimalist Design ✅
- **Status**: PASS
- **Verification**: No UI changes required (feature out of scope per spec.md line 131)
- **No Changes Required**: Algorithm changes are backend-only

### Core Principle III: Sheet-Based Data Persistence ✅
- **Status**: PASS
- **Verification**: Uses existing OneToOnePeople, OneToOneConfig, OneToOneSlots sheets; no schema changes required (feature out of scope per spec.md line 131)
- **No Changes Required**: Reads existing data structures

### Core Principle IV: Typography Excellence ✅
- **Status**: N/A
- **Verification**: No typography changes (no UI modifications)

### Core Principle V: Disciplined Color Palette ✅
- **Status**: N/A
- **Verification**: No color changes (no UI modifications)

### Technical Constraints: Platform Requirements ✅
- **Status**: PASS
- **Runtime**: JavaScript ES5+ compatible ✅
- **Calendar Integration**: CalendarApp service ✅
- **Data Storage**: SpreadsheetApp service ✅
- **Deployment**: Existing web app ✅
- **Authentication**: Google Workspace OAuth (no changes) ✅

### Technical Constraints: Performance Goals ✅
- **Status**: PASS
- **Sheet Operations**: Existing batch operations maintained ✅
- **Calendar Queries**: Delete-and-recreate pattern already implemented in regenerateAllMeetings() ✅
- **Typical Interactions**: Algorithm optimization improves distribution quality without performance regression ✅

### Constitution Compliance Summary
✅ **ALL GATES PASS** - No constitutional violations. Feature is purely algorithmic enhancement to existing SchedulingService with no UI, data model, or architecture changes.

## Project Structure

### Documentation (this feature)

```
specs/007-when-scheduling-meetings/
├── spec.md              # Feature specification
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── SchedulingService.md  # API contract for modified functions
├── checklists/          # Quality validation checklists
│   └── requirements.md  # Specification quality checklist
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── services/
│   └── SchedulingService.gs     # ⚠️ MODIFIED - New interval stride distribution algorithm
├── models/
│   ├── Person.gs                # Unchanged (read-only)
│   ├── MeetingSlot.gs           # Unchanged (read-only)
│   └── ScheduledMeeting.gs      # Unchanged (read-only)
├── utils/
│   ├── DateUtils.gs             # Unchanged (used by SchedulingService)
│   └── ValidationUtils.gs       # Unchanged (used by SchedulingService)
└── ui/
    └── OneToOne.html            # Unchanged (no UI modifications)
```

**Structure Decision**: This is a **single project** Google Apps Script application. The feature modifies only `SchedulingService.gs` (specifically the `assignPeopleToPeriods` function and potentially adds a new helper function for interval stride calculation). No new files are created, no data model changes, no UI changes.

**Files Affected**:
- **Modified**: `src/services/SchedulingService.gs` (lines 63-90 and potentially new helper function)
- **Read-Only**: All other files remain unchanged

## Complexity Tracking

*No constitutional violations detected - this section is not applicable.*
