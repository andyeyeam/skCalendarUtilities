# Feature Specification: Copy Available Slots to Clipboard

**Feature Branch**: `003-i-want-to`
**Created**: 2025-01-12
**Status**: Draft
**Input**: User description: "I want to be able to select some of the available slots and copy them to the clipboard so I can then include them in message I will send. The summarised availability should be well styled and professional."

## Clarifications

### Session 2025-01-12

- Q: What should be the specific format structure for the copied availability text? → A: Plain text list format: "Monday, Jan 15: 9:00 AM - 10:00 AM (60 min), 2:00 PM - 3:00 PM (60 min)"
- Q: What should happen when clipboard permissions are denied? → A: Show error message with fallback: display formatted text in a modal/textarea that users can manually select and copy
- Q: How should slots from different dates be separated in the copied text? → A: Each date on a new line: "Monday, Jan 15: 9:00 AM - 10:00 AM (60 min)\nTuesday, Jan 16: 2:00 PM - 3:00 PM (60 min)"
- Q: How long should the success message remain visible after copying? → A: 3 seconds
- Q: Should slot selection persist across browser sessions or only within the current session? → A: Persist in session storage (survives page refresh, cleared when browser closed)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Select and Copy Individual Slots (Priority: P1) 🎯 MVP

Users need to select specific time slots from their availability results and copy them to the clipboard in a professional format that can be pasted directly into emails, messages, or scheduling tools.

**Why this priority**: This is the core functionality that delivers immediate value - enabling users to quickly share their availability with others in a polished, professional format without manual retyping.

**Independent Test**: Can be tested by searching for availability, selecting multiple time slots using checkboxes, clicking a "Copy Selected" button, and pasting the result into any text editor or email client. The pasted text should be well-formatted and ready to share.

**Acceptance Scenarios**:

1. **Given** the user has searched for availability and results are displayed, **When** the user clicks checkboxes next to desired time slots and clicks "Copy Selected", **Then** the selected slots are copied to the clipboard in a professional format
2. **Given** multiple slots are selected across different dates, **When** the user copies them, **Then** the clipboard contains slots grouped by date with clear time ranges and day names
3. **Given** no slots are selected, **When** the user clicks "Copy Selected", **Then** the system displays a message prompting them to select at least one slot
4. **Given** slots are copied to clipboard, **When** the user pastes into an email or message, **Then** the format is preserved and looks professional with proper spacing and organization

---

### User Story 2 - Copy All Available Slots (Priority: P2)

Users want a quick way to share all their available time slots without manually selecting each one, useful when showing comprehensive availability to a group or when scheduling flexibility is high.

**Why this priority**: This is a convenient shortcut for common use cases where users want to share their complete availability, saving time when many slots are available.

**Independent Test**: Can be tested by searching for availability and clicking a "Copy All" button without selecting individual slots. The entire availability list should be copied in the same professional format.

**Acceptance Scenarios**:

1. **Given** the user has availability results displayed, **When** the user clicks "Copy All", **Then** all available slots are copied to clipboard in professional format
2. **Given** availability spans multiple days, **When** "Copy All" is used, **Then** slots are organized chronologically with clear date headers

---

### User Story 3 - Customizable Format Templates (Priority: P3)

Users want to choose between different formatting styles for their copied availability (e.g., formal business style, casual style, list format, or calendar-style) to match the context of their communication.

**Why this priority**: While valuable for power users and specific contexts, the default professional format covers most use cases. This can be added later based on user feedback.

**Independent Test**: Can be tested by selecting slots, choosing a format option from a dropdown (e.g., "Formal", "Casual", "Bulleted List"), copying, and verifying the clipboard content matches the selected style.

**Acceptance Scenarios**:

1. **Given** the user has selected slots, **When** they choose a format template and copy, **Then** the clipboard content follows the selected style
2. **Given** different format templates available, **When** the user switches between them, **Then** they can preview how the copied text will look

---

### Edge Cases

- What happens when the clipboard API is not available (older browsers or restricted permissions)? System displays formatted text in a modal/textarea for manual copying.
- How does the system handle very long availability lists (e.g., 50+ slots)? System copies all selected slots; performance target is <1 second for up to 50 slots (SC-004).
- What if the user changes their selection after copying but before pasting? Selection state is maintained independently; previous clipboard content remains until next copy operation.
- How should the system handle slots that span midnight or cross into the next day? Slots are displayed with their actual date and time; no special midnight handling needed as slots are constrained to working hours (09:00-17:30).
- What if the user's browser blocks clipboard access due to security settings? System shows error message and fallback modal/textarea for manual copy.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide checkboxes or selection mechanism for each available time slot displayed in results
- **FR-002**: System MUST display a "Copy Selected" button that becomes enabled when one or more slots are selected
- **FR-003**: System MUST provide a "Copy All" button to copy all displayed slots without individual selection
- **FR-004**: System MUST format copied slots with date headers (including day of week), time ranges, and duration information
- **FR-005**: System MUST organize copied slots chronologically by date and time
- **FR-006**: System MUST use the Clipboard API to copy formatted text to the system clipboard
- **FR-007**: System MUST display visual feedback (e.g., success message, button state change) when slots are successfully copied, with the message visible for 3 seconds before auto-dismissing
- **FR-008**: System MUST handle clipboard permission errors gracefully by displaying an error message and showing the formatted text in a modal or textarea that users can manually select and copy
- **FR-009**: System MUST preserve slot selection state in session storage, surviving page refreshes and navigation within the same browser session, but clearing when the browser is closed
- **FR-010**: System MUST provide a "Select All" / "Deselect All" toggle for quick selection management
- **FR-011**: Copied text MUST be formatted as plain text list with format: "DayOfWeek, Month Day: StartTime - EndTime (Duration), ..." with multiple slots on the same date separated by commas, and different dates separated by newlines (e.g., "Monday, Jan 15: 9:00 AM - 10:00 AM (60 min), 2:00 PM - 3:00 PM (60 min)\nTuesday, Jan 16: 11:00 AM - 12:00 PM (60 min)")
- **FR-012**: System MUST include a visual indicator (e.g., highlighting, check icon) for selected slots

### Key Entities

- **SelectedSlot**: Represents a time slot that has been selected by the user for copying, containing date, start time, end time, duration, and selection state
- **ClipboardContent**: The formatted text representation of selected slots, organized by date with professional styling, ready for pasting into external applications

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can select and copy availability slots in under 10 seconds
- **SC-002**: Copied text requires no manual reformatting when pasted into email or messaging applications
- **SC-003**: 90% of users successfully copy their availability on first attempt without errors
- **SC-004**: Clipboard operation completes within 1 second for up to 50 selected slots
- **SC-005**: Formatted availability text is readable and professional when pasted into any standard text editor or email client

## Assumptions *(optional)*

- Users are accessing the application from modern browsers that support the Clipboard API (Chrome 63+, Firefox 53+, Safari 13.1+, Edge 79+)
- Clipboard permissions are granted or can be requested by the application
- Users will primarily share availability via email, instant messaging, or scheduling tools
- The default professional format will meet 80% of user needs without customization
- Users expect text-based formatting (not rich HTML or images) that works across platforms

## Out of Scope *(optional)*

- Integration with specific calendar applications (Google Calendar, Outlook, etc.)
- Generating .ics calendar files or calendar invitations
- Real-time collaboration or sharing availability directly with other users
- Saving formatted availability as a file (PDF, Word document, etc.)
- Custom branding or logo inclusion in copied text
- Automated scheduling or booking based on shared availability
