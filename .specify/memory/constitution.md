<!--
  SYNC IMPACT REPORT
  Version change: [INITIAL] → 1.0.0

  This is the initial constitution for the skCalUtils project.

  Added sections:
  - Core Principles (5 principles covering platform, design, data, typography, color)
  - Technical Constraints
  - Quality Standards
  - Governance

  Templates reviewed:
  ✅ .specify/templates/plan-template.md - Constitution Check section ready
  ✅ .specify/templates/spec-template.md - Requirements alignment confirmed
  ✅ .specify/templates/tasks-template.md - Task categorization compatible
  ✅ .claude/commands/*.md - Command files reviewed, no agent-specific references found

  Follow-up TODOs: None
-->

# skCalUtils Constitution

## Core Principles

### I. Google Workspace Integration

This project MUST be built as a Google Apps Script application that:
- Integrates with Google Calendar API
- Embeds seamlessly into Google Sites pages
- Operates within Google Workspace security and permissions model
- Uses Apps Script native services (no external hosting required)

**Rationale**: The platform constraint ensures the application is accessible within the
Google Workspace ecosystem, simplifies deployment, and leverages existing authentication.

### II. Modern Minimalist Design

All user interfaces MUST adhere to modern minimalism principles:
- Disciplined use of whitespace to create visual breathing room
- Clean, uncluttered layouts with clear visual hierarchy
- Purposeful design elements (every element must serve a function)
- Avoid decorative elements that do not enhance usability
- Progressive disclosure: show only what users need, when they need it

**Rationale**: Modern minimalism reduces cognitive load, improves usability, and creates
a professional appearance that scales across different screen sizes and contexts.

### III. Sheet-Based Data Persistence

Data persistence MUST be implemented using Google Sheets:
- Spreadsheet created automatically on first application run
- Sheet acts as structured database for configuration and application data
- App manages sheet schema (columns, validation, formatting) programmatically
- Data access must be efficient (batch operations preferred over row-by-row)
- Sheet must be human-readable for transparency and manual intervention if needed

**Rationale**: Google Sheets provides accessible, auditable data storage within the
Workspace ecosystem, requires no external database setup, and allows users to inspect
or manually modify data if necessary.

### IV. Typography Excellence

Typography MUST create clear hierarchy and excellent readability:
- Use modern, legible sans-serif fonts: Inter, Roboto, or system font stacks
- NEVER use overly decorative or script fonts in UI
- Headings (h1, h2, h3, etc.) MUST be clearly differentiated using:
  - Size (consistent type scale, e.g., 1.25x progression)
  - Weight (400 for body, 600 for subheadings, 700+ for main headings)
  - Color (subtle variation to guide hierarchy)
- Body text MUST be optimized for reading:
  - Minimum 16px base font size
  - Line height 1.5-1.6 for body copy
  - Optimal line length: 50-75 characters
- Maintain consistent spacing between elements (e.g., 0.5rem, 1rem, 2rem scale)

**Rationale**: Typography is the foundation of usable interfaces. Clear hierarchy guides
users through content, while excellent readability reduces eye strain and improves
comprehension.

### V. Disciplined Color Palette

Color usage MUST be constrained to maximize impact and maintain consistency:
- Maximum 3 main colors in the palette:
  - 1-2 neutrals (white, light gray #F5F5F5, dark gray #333333)
  - 1 distinct primary/accent color for CTAs, highlights, and branding
- Neutrals provide background, text, and surface colors
- Accent color used sparingly for:
  - Call-to-action buttons
  - Important highlights and active states
  - Links and interactive elements
- Maintain sufficient contrast for accessibility (WCAG AA minimum: 4.5:1 for text)
- Use tints and shades of main colors rather than introducing new hues

**Rationale**: A constrained palette creates visual cohesion, makes the interface easier
to scan, and ensures accent colors have maximum impact when used. This also simplifies
maintenance and ensures consistency across all UI components.

## Technical Constraints

### Platform Requirements

- **Runtime**: Google Apps Script (JavaScript ES5+ compatible)
- **Calendar Integration**: Google Calendar API (via CalendarApp service)
- **Data Storage**: Google Sheets API (via SpreadsheetApp service)
- **Deployment Target**: Web app embedded in Google Sites via iframe or Apps Script web app
- **Authentication**: Google Workspace OAuth (handled by Apps Script platform)

### UI/UX Requirements

- **Visual Style**: Modern minimalist with clean geometry
- **UI Elements**: Slight border-radius (4-8px) on buttons, cards, input fields
- **Responsive**: Must function in Google Sites iframe across desktop and mobile
- **Accessibility**: Keyboard navigation support, semantic HTML, ARIA labels where needed

### Performance Goals

- **Sheet Operations**: Batch read/write operations where possible (avoid row-by-row loops)
- **Calendar Queries**: Minimize API calls by caching data when appropriate
- **Initial Load**: First run setup (sheet creation) should complete within 10 seconds
- **Typical Interactions**: UI interactions should respond within 1-2 seconds

## Quality Standards

### Code Organization

- **Separation of Concerns**: Separate data access, business logic, and UI rendering
- **Reusable Functions**: Extract common operations into utility functions
- **Configuration Management**: Store configurable values in spreadsheet, not hardcoded
- **Error Handling**: Graceful degradation with user-friendly error messages

### Documentation

- **Code Comments**: Explain "why" not "what" (except for complex algorithms)
- **Function Headers**: Document parameters, return values, and side effects
- **Setup Instructions**: Clear quickstart guide for users deploying the app
- **Sheet Schema**: Document expected columns, data types, and validation rules

### Testing Expectations

- **Manual Testing**: Test all user-facing features before each release
- **Edge Cases**: Verify behavior with empty data, invalid inputs, API failures
- **Cross-Device**: Test in Google Sites on desktop and mobile viewports
- **Permission Testing**: Verify OAuth permissions are correctly requested

## Governance

### Amendment Procedure

- Constitution changes require documented rationale and impact assessment
- All amendments must be versioned using semantic versioning (MAJOR.MINOR.PATCH)
- Changes must be propagated to dependent templates (plan, spec, tasks, checklists)
- Breaking changes (MAJOR version bumps) require explicit justification

### Compliance Review

- All feature specifications MUST verify alignment with Core Principles
- Implementation plans MUST include Constitution Check section
- Code reviews MUST verify adherence to typography, color, and design principles
- Deviations from principles require explicit justification and approval

### Version History

This constitution supersedes all previous project guidelines and practices. When
conflicts arise between this constitution and other documentation, the constitution
takes precedence.

**Version**: 1.0.0 | **Ratified**: 2025-10-11 | **Last Amended**: 2025-10-11
