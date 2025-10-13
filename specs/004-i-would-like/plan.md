# Implementation Plan: Calendar Event Display on Find Availability Screen

**Branch**: `004-i-would-like` | **Date**: 2025-01-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-i-would-like/spec.md`
**User Instructions**: "The screen should be compact in style. The calendar events displayed should be easy to read."

## Summary

This feature enhances the Find Availability screen by displaying calendar events alongside available time slots, giving users complete schedule context. When users search for availability within a date range, the system will fetch and display all scheduled calendar events for those dates, visually distinguished from available slots, in a compact and readable format that adheres to modern minimalist design principles.

## Technical Context

**Language/Version**: JavaScript ES5+ (Google Apps Script V8 runtime)
**Primary Dependencies**: Google Calendar API (CalendarApp), HTML Service, Browser Clipboard API (navigator.clipboard), Session Storage
**Storage**: Google Sheets (SpreadsheetApp) for configuration; Session Storage for UI state persistence
**Testing**: Manual testing in Google Sites iframe (desktop and mobile)
**Target Platform**: Google Apps Script web app embedded in Google Sites
**Project Type**: Single web application (server-side .gs files + client-side HTML)
**Performance Goals**: Display events within 2 seconds of availability search completing; UI remains responsive with up to 10 events per day
**Constraints**: Compact UI layout per user requirements; must work within Google Sites iframe; WCAG AA contrast requirements; no external dependencies
**Scale/Scope**: Single calendar per user; typical date ranges 1-14 days; typical load 5-10 events per day

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Google Workspace Integration ✅

**Status**: PASS
**Compliance**: Feature uses Google Calendar API (CalendarApp) to fetch events from the same calendar being searched for availability. No external hosting required; all processing within Apps Script.

### II. Modern Minimalist Design ✅

**Status**: PASS - User instruction reinforces this principle
**Compliance**: User explicitly requested "compact" style with "easy to read" calendar events. This aligns with constitution's requirement for clean, uncluttered layouts and purposeful design elements. Implementation will use disciplined whitespace, clear visual hierarchy, and progressive disclosure (events shown only after search).

### III. Sheet-Based Data Persistence ✅

**Status**: PASS
**Compliance**: No new persistent data required for this feature. Uses existing Google Sheets configuration for calendar selection. Events are fetched dynamically per search (ephemeral data).

### IV. Typography Excellence ✅

**Status**: PASS - Critical for "easy to read" requirement
**Compliance**:
- Event titles, times, and durations must use consistent type hierarchy
- Minimum 16px base font size for event text
- Clear differentiation between event labels (title) and metadata (time/duration)
- Line height 1.5-1.6 for multi-line event titles
- User's "easy to read" requirement directly maps to typography excellence principle

### V. Disciplined Color Palette ✅

**Status**: PASS - Critical for visual distinction
**Compliance**:
- Use existing neutral colors (#F5F5F5, #333) for event backgrounds/text
- Distinguish events from available slots using subtle background tint or border (not new colors)
- Maintain WCAG AA contrast for all event text (4.5:1 minimum)
- No new accent colors introduced; use existing palette's neutrals with different weights/tints

### Platform Requirements ✅

**Status**: PASS
- Google Apps Script runtime: ✓ (using CalendarApp service)
- Calendar API integration: ✓ (fetch events via CalendarApp.getEvents())
- Embedded deployment: ✓ (existing Availability.html enhanced)
- No authentication changes needed: ✓ (uses same calendar already authorized)

### UI/UX Requirements ✅

**Status**: PASS
- Modern minimalist style: ✓ (per user instruction "compact")
- Slight border-radius: ✓ (existing card components have 4-8px radius)
- Responsive: ✓ (events displayed within existing responsive card layout)
- Accessibility: ✓ (semantic HTML for events; ARIA labels if needed)

### Performance Goals ✅

**Status**: PASS
- Calendar queries: Fetch events in same server call as availability calculation (no additional latency)
- UI interactions: Event rendering uses same client-side patterns as existing slot rendering (<1s)
- Spec requirement: 2 seconds to display events (well within performance goals)

### Gate Status: ALL CLEAR ✅

No violations detected. Proceed to Phase 0.

## Project Structure

### Documentation (this feature)

```
specs/004-i-would-like/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── server-functions.md  # Enhanced findAvailability function contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── ui/
│   ├── Availability.html          # MODIFY: Add event display section
│   ├── Styles.html                # MODIFY: Add event-specific styles (optional)
│   └── Menu.html                  # No changes
├── services/
│   ├── AvailabilityService.gs     # MODIFY: Fetch events in calculateAvailability
│   └── CalendarEventService.gs    # NEW: Event fetching and formatting logic
├── models/
│   ├── TimeSlot.gs                # No changes
│   └── CalendarEvent.gs           # NEW: Event data model
└── Code.gs                         # MODIFY: Wire up new event fetching

tests/
└── manual/
    └── 004-event-display-test-plan.md  # NEW: Manual test scenarios
```

**Structure Decision**: This feature extends the existing single-project structure. Core changes are:
1. **Server-side**: New `CalendarEventService.gs` for event fetching/formatting; modified `AvailabilityService.gs` to call event service
2. **Client-side**: Enhanced `Availability.html` to render events alongside slots using existing card/list patterns
3. **Data model**: New `CalendarEvent.gs` model similar to existing `TimeSlot.gs`

The structure maintains separation of concerns (service layer for fetching, UI layer for rendering) and reuses existing patterns (card layout, chronological grouping by date).

## Complexity Tracking

*No violations - section left empty per template guidance.*
