# skCalUtils Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-01-12

## Active Technologies
- Google Apps Script (JavaScript ES5+ compatible, V8 runtime) + Google Calendar API (CalendarApp), Google Sheets API (SpreadsheetApp), HTML Service for UI (002-i-want-to, 003-i-want-to, 004-i-would-like)
- Browser Clipboard API (navigator.clipboard) for client-side clipboard operations (003-i-want-to)
- Session Storage for browser-level state persistence (002-i-want-to, 003-i-want-to, 004-i-would-like)
- Google Sheets (existing "Calendar Utilities Config" spreadsheet) for configuration (002-i-want-to, 004-i-would-like)
- JavaScript ES5+ (Google Apps Script V8 runtime) + Google Apps Script (CalendarApp, SpreadsheetApp, HTML Service), Browser Clipboard API, Session Storage (005-add-a-new)
- Google Sheets for configuration (existing "Calendar Utilities Config" spreadsheet), Session Storage for UI state persistence (005-add-a-new)
- Google Apps Script (JavaScript ES5+ compatible, V8 runtime) + Google Calendar API (CalendarApp), Google Sheets API (SpreadsheetApp), HTML Service for UI, Session Storage for UI state (006-i-would-like)
- Google Sheets (existing "Calendar Utilities Config" spreadsheet with 3 new tabs: OneToOnePeople, OneToOneConfig, OneToOneSlots) (006-i-would-like)
- JavaScript ES5+ (Google Apps Script V8 runtime) + Google Apps Script APIs (CalendarApp, SpreadsheetApp, HTML Service) (007-when-scheduling-meetings)
- Google Sheets (existing "Calendar Utilities Config" spreadsheet with OneToOnePeople, OneToOneConfig, OneToOneSlots tabs) (007-when-scheduling-meetings)
- JavaScript ES5+ compatible (Google Apps Script V8 runtime) + Google Apps Script services (CalendarApp, SpreadsheetApp), HTML Service for UI (008-clear-all-add)
- Google Sheets (existing "Calendar Utilities Config" spreadsheet, OneToOnePeople tab) (008-clear-all-add)

## Project Structure
```
src/
├── ui/
│   ├── Availability.html          # Main availability search UI (002, 003, 004, 005)
│   ├── OneToOne.html              # One-to-one meeting scheduler UI (006)
│   ├── Styles.html                # Shared styles
│   ├── Menu.html                  # Main menu navigation
│   ├── Analytics.html             # Analytics UI placeholder
│   ├── BulkOps.html               # Bulk operations UI placeholder
│   └── Cleanup.html               # Cleanup UI placeholder
├── services/
│   ├── AvailabilityService.gs     # Server-side availability logic (002, 005)
│   ├── CalendarEventService.gs    # Calendar event fetching (004)
│   ├── PeopleService.gs           # People management CRUD (006)
│   ├── MeetingSlotService.gs      # Meeting slot configuration (006)
│   ├── OneToOneConfigService.gs   # One-to-one config management (006)
│   └── SchedulingService.gs       # Meeting scheduling logic (006)
├── models/
│   ├── TimeSlot.gs                # Time slot data model (002)
│   ├── CalendarEvent.gs           # Calendar event data model (004)
│   ├── Person.gs                  # Person data model (006)
│   ├── MeetingSlot.gs             # Meeting slot data model with time parsing (006)
│   └── ScheduledMeeting.gs        # Scheduled meeting data model (006)
├── utils/
│   └── ValidationUtils.gs         # Input validation helpers (006)
└── Code.gs                         # Main Apps Script entry point

specs/
├── 001-build-an-embedded/         # Initial project setup
├── 002-i-want-to/                 # Availability search feature (IMPLEMENTED)
├── 003-i-want-to/                 # Clipboard copy feature (PLANNED)
├── 004-i-would-like/              # Calendar event display (IMPLEMENTED)
├── 005-add-a-new/                 # Contiguous availability blocks (IMPLEMENTED)
└── 006-i-would-like/              # One-to-one meeting scheduler (IMPLEMENTED)
    ├── spec.md                    # Feature specification
    ├── plan.md                    # Implementation plan
    ├── research.md                # Technical research
    ├── data-model.md              # Data structures
    ├── quickstart.md              # Implementation guide
    ├── contracts/                 # API specifications
    └── checklists/                # Validation checklists
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
- 008-clear-all-add: IMPLEMENTED - Clear All feature for bulk deletion of all people and meetings with confirmation dialog, working indicator, and settings preservation (2025-01-30)
  - Modified service: PeopleService.gs (added clearAllPeople() function)
  - Modified UI: OneToOne.html (added Clear All button and handler)
  - Features: Batch deletion, confirmation dialog with warnings, working indicator during operation, partial failure handling
  - Settings preservation: OneToOneConfig and OneToOneSlots never modified
  - Performance: Supports up to 100 people deletion within 10 seconds
- 007-when-scheduling-meetings: IMPLEMENTED - Optimized meeting slot distribution with interval stride algorithm for conflict prevention, smart recurrence calculation, and even distribution across weeks (2025-01-30)
  - Modified service: SchedulingService.gs (3 functions)
  - Algorithm change: Replaced round-robin with interval stride distribution
  - New field: weekOffset in assignment objects for even calendar distribution
  - Formula: spacing = floor(recurrence_interval / weekly_slots)
  - Zero conflicts guaranteed, meetings spread evenly across recurrence cycle
- 006-i-would-like: IMPLEMENTED - One-to-one meeting scheduler with automated recurring event creation, intelligent interval calculation, people/slot management, meeting deletion, and regeneration capabilities (2025-01-29)
  - New models: Person, MeetingSlot, ScheduledMeeting
  - New services: PeopleService, MeetingSlotService, OneToOneConfigService, SchedulingService
  - New UI: OneToOne.html with tabbed interface (People, Settings, Meetings)
  - New utils: ValidationUtils for input validation
  - Google Sheets tabs: OneToOnePeople, OneToOneConfig, OneToOneSlots
  - Bug fix: Time parsing for Date objects from Google Sheets (normalizeTimeValue function)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
