# Implementation Plan: Availability Finder

**Branch**: `002-i-want-to` | **Date**: 2025-01-11 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-i-want-to/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature adds an availability finder utility that helps users identify free time slots in their calendar within a specified date range. Users will access this via a new button on the main menu, which navigates to a dedicated screen displaying all available slots during working hours (09:00-17:30) on weekdays, with support for filtering by minimum duration and handling various edge cases like all-day events and overlapping appointments.

## Technical Context

**Language/Version**: Google Apps Script (JavaScript ES5+ compatible, V8 runtime)
**Primary Dependencies**: Google Calendar API (CalendarApp), Google Sheets API (SpreadsheetApp), HTML Service for UI
**Storage**: Google Sheets (existing "Calendar Utilities Config" spreadsheet)
**Testing**: Manual testing in Google Sites iframe (desktop and mobile viewports)
**Target Platform**: Google Apps Script Web App embedded in Google Sites via iframe
**Project Type**: Web application (server-side JavaScript with HTML UI)
**Performance Goals**:
- Calendar availability search completes in <5 seconds for 7-day range
- UI navigation responds within 1-2 seconds
- Initial availability screen load within 2 seconds

**Constraints**:
- Maximum 7-day date range (enforced per FR-016)
- 15-minute time granularity for slot display (FR-017)
- Working hours fixed at 09:00-17:30 (FR-003)
- Must work within Google Apps Script execution time limits (6 minutes max)
- Calendar API rate limits (standard Google Workspace quotas)

**Scale/Scope**:
- Single-user per session (personal calendar utilities)
- Expected date range: 1-7 days
- Expected calendar density: 0-20 events per day
- 3 new server-side functions (availability calculation)
- 1 new UI screen (availability display)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Google Workspace Integration ✅
- **Status**: PASS
- **Compliance**: Feature uses Google Calendar API via CalendarApp, embeds in Google Sites, uses existing Apps Script infrastructure
- **Notes**: No new platform dependencies introduced; fully within Google Workspace ecosystem

### II. Modern Minimalist Design ✅
- **Status**: PASS
- **Compliance**: UI will follow existing Styles.html patterns (clean layouts, whitespace, clear hierarchy)
- **Notes**: Availability screen will use card-based layout with date grouping and clear time slot display

### III. Sheet-Based Data Persistence ✅
- **Status**: PASS
- **Compliance**: No persistent data required for this feature beyond existing calendar selection in Config sheet
- **Notes**: Availability results are transient (calculated on-demand, not stored)

### IV. Typography Excellence ✅
- **Status**: PASS
- **Compliance**: Will use existing typography from Styles.html (16px base, 1.5 line-height, system fonts, clear heading hierarchy)
- **Notes**: Time slots will be displayed with consistent font weight/size for readability

### V. Disciplined Color Palette ✅
- **Status**: PASS
- **Compliance**: Will use existing 3-color palette (#FFFFFF, #333333, #4285f4) from constitution
- **Notes**: No new colors required; slots will use neutral backgrounds with blue accents for interactive elements

**Overall Assessment**: ✅ ALL GATES PASSED - No constitution violations. Feature aligns with all core principles.

---

### Post-Design Re-Evaluation

After completing Phase 0 (research.md) and Phase 1 (data-model.md, contracts/, quickstart.md), the design has been validated against constitution principles:

#### I. Google Workspace Integration ✅ CONFIRMED
- **Design Reality**: All components use native Google Apps Script APIs (CalendarApp, SpreadsheetApp, HtmlService)
- **No External Dependencies**: Pure JavaScript implementation, no npm packages or external libraries
- **Platform Integration**: Seamlessly integrates with existing Feature 001 menu system
- **Verdict**: PASS - Fully compliant, no deviations from principle

#### II. Modern Minimalist Design ✅ CONFIRMED
- **Design Reality**: Availability.html follows existing card-based layout from Menu.html
- **Visual Hierarchy**: Clear form → results structure with date-grouped cards
- **Whitespace**: Consistent spacing using existing CSS classes (mb-2, mb-3, padding utilities)
- **Progressive Disclosure**: Results only shown after search, loading states handled gracefully
- **Verdict**: PASS - Design maintains minimalist aesthetic, no decorative elements

#### III. Sheet-Based Data Persistence ✅ CONFIRMED
- **Design Reality**: No new persistent data required for availability calculations
- **Transient Data**: All results calculated on-demand and displayed in UI only
- **Existing Config Usage**: Leverages existing `selectedCalendarId` from Config sheet
- **Verdict**: PASS - Principle satisfied; no violations of data persistence model

#### IV. Typography Excellence ✅ CONFIRMED
- **Design Reality**: Uses existing Styles.html typography (16px base, 1.5 line-height, system fonts)
- **Hierarchy Implementation**:
  - H1: "Find Availability" (main heading)
  - H3: Date headers (1.125rem, font-weight 600)
  - Body: Time slot details (16px, font-weight 600 for times, 400 for durations)
- **Readability**: Consistent spacing between slots, clear visual separation with subtle borders
- **Verdict**: PASS - Typography follows established patterns exactly

#### V. Disciplined Color Palette ✅ CONFIRMED
- **Design Reality**: Uses only 3 colors from constitution:
  - White (#FFFFFF): Card backgrounds, form inputs
  - Dark gray (#333333): Text, headings
  - Blue (#4285f4): Primary button, accent elements
- **No New Colors**: All UI elements reuse existing color scheme
- **Contrast**: Maintained WCAG AA compliance (existing Styles.html already compliant)
- **Verdict**: PASS - No color palette violations, strict adherence to 3-color constraint

**Final Assessment**: ✅ ALL CONSTITUTION GATES REMAIN PASSED POST-DESIGN

The detailed design (research, data model, contracts, quickstart) confirms initial assessment. No constitution principles were compromised during technical planning. Implementation can proceed without requiring any exceptions or amendments to project constitution.

## Project Structure

### Documentation (this feature)

```
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── Code.gs                    # Main entry point - ADD findAvailability button to loadUtility validation
├── models/
│   ├── Config.gs              # Existing - No changes needed
│   ├── Event.gs               # Existing - No changes needed
│   └── TimeSlot.gs            # NEW - Availability time slot model
├── services/
│   ├── SheetService.gs        # Existing - No changes needed
│   ├── AvailabilityService.gs # NEW - Core availability calculation logic
│   └── CalendarService.gs     # NEW - Calendar event retrieval and filtering
├── utils/
│   ├── Logger.gs              # Existing - No changes needed
│   ├── AuthUtils.gs           # Existing - No changes needed
│   ├── SheetUtils.gs          # Existing - No changes needed
│   └── DateUtils.gs           # NEW - Date/time manipulation utilities
└── ui/
    ├── Styles.html            # Existing - No changes needed
    ├── Menu.html              # MODIFY - Add "Find Availability" button
    ├── BulkOps.html           # Existing - No changes needed
    ├── Analytics.html         # Existing - No changes needed
    ├── Cleanup.html           # Existing - No changes needed
    └── Availability.html      # NEW - Availability finder UI
```

**Structure Decision**: This is a Google Apps Script web application using the existing single-project structure. The feature integrates into the existing menu system and follows the established pattern of separate utility screens. New files required:
- **TimeSlot.gs**: Data model for free time slots
- **AvailabilityService.gs**: Business logic for calculating free time
- **CalendarService.gs**: Abstraction layer for calendar operations
- **DateUtils.gs**: Date/time utilities for working hours, rounding, formatting
- **Availability.html**: Full-screen UI for displaying results

Files to modify:
- **Menu.html**: Add fourth utility button for "Find Availability"
- **Code.gs**: Add 'Availability' to validUtilities array and expose server functions

## Complexity Tracking

*Fill ONLY if Constitution Check has violations that must be justified*

**No violations to track.** All constitution gates passed without requiring exceptions.
