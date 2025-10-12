# Implementation Plan: Calendar Utilities Application

**Branch**: `001-build-an-embedded` | **Date**: 2025-10-11 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-build-an-embedded/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Build an embedded Google Apps Script web application that provides calendar management utilities accessible through a menu interface within Google Sites. Core functionality includes bulk operations (delete, color/category change, move calendar), analytics with table-based reporting, and cleanup tools with duplicate detection. The application uses Google Sheets for data persistence and implements one-time OAuth authorization with persistent permissions. Architecture emphasizes simple deployment, minimal authorization friction, and modern minimalist design principles.

## Technical Context

**Language/Version**: Google Apps Script (JavaScript ES6+ with Apps Script APIs)
**Primary Dependencies**: Google Calendar API (CalendarApp), Google Sheets API (SpreadsheetApp), Google Sites (HTML Service for web app)
**Storage**: Google Sheets (programmatic schema management, batch operations)
**Testing**: Manual testing with Apps Script Logger, optional clasp + Jest for unit tests
**Target Platform**: Web app deployed as Apps Script project, embedded in Google Sites iframe
**Project Type**: Single web application (Apps Script hosted)
**Performance Goals**: Menu load <3s, bulk ops on 50+ events <30s, analytics on 100+ events <10s, first-run setup <10s
**Constraints**: Apps Script quotas (20,000 Calendar API calls/day, 6 min execution time), OAuth scope authorization persistence, iframe compatibility
**Scale/Scope**: Single-user or small team usage (Google Workspace account), 4 main utilities (menu, bulk ops, analytics, cleanup)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Google Workspace Integration ✅

- **Compliant**: Application built as Google Apps Script
- **Compliant**: Integrates with Calendar API via CalendarApp service
- **Compliant**: Embeds in Google Sites via HTML Service web app
- **Compliant**: Uses Apps Script native services (no external hosting)
- **Authorization Design**: Implements simple one-time OAuth with persistent permissions (user requirement)

### II. Modern Minimalist Design ✅

- **Compliant**: UI follows disciplined whitespace and clean layout principles
- **Compliant**: Purposeful elements only (menu, utilities, navigation)
- **Compliant**: Progressive disclosure (full-screen utility display, hide menu when utility active)

### III. Sheet-Based Data Persistence ✅

- **Compliant**: Google Sheet created automatically on first run
- **Compliant**: Sheet manages user preferences, calendar selection, configuration
- **Compliant**: Batch operations for efficient data access
- **Compliant**: Human-readable schema for transparency

### IV. Typography Excellence ✅

- **Compliant**: Uses system font stack or Roboto (Google Fonts integration in HTML Service)
- **Compliant**: Clear heading hierarchy (h1 for utility titles, h2 for sections, h3 for subsections)
- **Compliant**: 16px base font size, 1.5 line-height for body text
- **Compliant**: Consistent spacing scale (0.5rem, 1rem, 2rem)

### V. Disciplined Color Palette ✅

- **Compliant**: 3-color palette (white #FFFFFF, dark gray #333333, Google blue #4285f4 accent)
- **Compliant**: Accent color for CTAs, active states, links
- **Compliant**: WCAG AA contrast compliance (4.5:1 minimum)
- **Compliant**: 4-8px border-radius on buttons, cards, inputs

### Technical Constraints ✅

- **Platform Requirements**: All met (Apps Script, CalendarApp, SpreadsheetApp, HTML Service)
- **UI/UX Requirements**: Responsive iframe support, keyboard navigation, semantic HTML
- **Performance Goals**: Aligned with success criteria (SC-001 through SC-008)

**Gate Status**: ✅ PASSED - No violations

## Project Structure

### Documentation (this feature)

```
specs/001-build-an-embedded/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── api-spec.md      # Apps Script function signatures and HTML Service endpoints
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```
src/
├── Code.gs              # Main entry point, menu handlers, doGet() for web app
├── ui/
│   ├── Menu.html        # Main menu interface
│   ├── BulkOps.html     # Bulk operations utility
│   ├── Analytics.html   # Analytics utility
│   ├── Cleanup.html     # Cleanup utility
│   └── Styles.html      # Shared CSS (typography, colors, layout)
├── services/
│   ├── CalendarService.gs      # Calendar API operations (batch fetch, update, delete)
│   ├── SheetService.gs         # Data persistence (config, preferences)
│   ├── BulkOpsService.gs       # Bulk operation logic (queue, progress tracking)
│   ├── AnalyticsService.gs     # Analytics computation (time allocation, patterns)
│   └── CleanupService.gs       # Duplicate detection, cleanup logic
├── models/
│   ├── Event.gs         # Calendar event data model
│   ├── Config.gs        # User configuration model
│   └── OperationQueue.gs # Bulk operation queue model
└── utils/
    ├── AuthUtils.gs     # OAuth scope management (persistent authorization)
    ├── SheetUtils.gs    # Sheet schema management, batch I/O
    └── Logger.gs        # Logging utilities

tests/
└── manual/
    └── TestPlan.md      # Manual test scenarios (no automated testing initially)
```

**Structure Decision**: Single Google Apps Script project structure optimized for Apps Script IDE and clasp deployment. HTML files for UI components use Apps Script's HTML Service templating. Server-side logic in .gs files organized by service layer (calendar operations, data persistence, business logic). Models provide data structures. Utils handle cross-cutting concerns (auth, sheet management, logging). No backend/frontend split needed as Apps Script handles both server and client rendering.

## Complexity Tracking

*No violations - table not needed*
