# skCalUtils Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-01-12

## Active Technologies
- Google Apps Script (JavaScript ES5+ compatible, V8 runtime) + Google Calendar API (CalendarApp), Google Sheets API (SpreadsheetApp), HTML Service for UI (002-i-want-to, 003-i-want-to)
- Browser Clipboard API (navigator.clipboard) for client-side clipboard operations (003-i-want-to)
- Session Storage for browser-level state persistence (002-i-want-to, 003-i-want-to)
- Google Sheets (existing "Calendar Utilities Config" spreadsheet) (002-i-want-to)

## Project Structure
```
src/
├── ui/
│   ├── Availability.html          # Main availability search UI (002, 003)
│   ├── Styles.html                # Shared styles
│   └── Menu.html                  # Main menu navigation
├── services/
│   └── AvailabilityService.gs     # Server-side availability logic
├── models/
│   └── TimeSlot.gs                # Time slot data model
└── Code.gs                         # Main Apps Script entry point

specs/
├── 002-i-want-to/                 # Availability search feature (IMPLEMENTED)
└── 003-i-want-to/                 # Clipboard copy feature (PLANNING COMPLETE)
    ├── spec.md                    # Feature specification
    ├── plan.md                    # Implementation plan
    ├── research.md                # Phase 0 research findings
    ├── data-model.md              # Data structures
    ├── quickstart.md              # Implementation guide
    ├── contracts/
    │   └── clipboard-api.md       # Clipboard API contracts
    └── checklists/
        └── requirements.md        # Spec validation checklist
```

## Commands
No build system - Google Apps Script deployed via clasp CLI

## Code Style
- **JavaScript**: ES5+ compatible (for Google Apps Script V8 runtime)
- Use `var` for variable declarations (not `let`/`const`)
- Use `function` declarations (not arrow functions in global scope)
- Use `.forEach()`, `.map()`, `.filter()` for array operations
- Comments: JSDoc style for functions

## Recent Changes
- 003-i-want-to: Planning complete - clipboard copy feature with checkbox selection, session storage, and fallback modal (2025-01-12)
- 002-i-want-to: Implemented availability search with datetime fields, business day defaults, and session storage persistence (2025-01-12)
- 001-build-an-embedded: Initial Google Apps Script web application setup

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
