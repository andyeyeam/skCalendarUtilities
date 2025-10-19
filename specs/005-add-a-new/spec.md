# Feature Specification: Contiguous Availability Blocks

**Feature Branch**: `005-add-a-new`
**Created**: 2025-01-19
**Status**: Draft
**Input**: User description: "Add a new feature to the Find Availability that allows me to see what contiguous blocks of availabilty I have rather than based on defined durations. For example, if I have one meeting from 10am to 2pm then it would show me as having two availability slots: 09:00 to 10:00 and and 2pm to 5:30pm. This feature should be additional to the current duration based feature. I should be prompted with the question as to whether I want a search based on a duration slots or a search based on full availabilty."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Choose Search Mode (Priority: P1)

As a calendar user, I want to choose between duration-based and contiguous availability search modes so I can get the view that best matches my scheduling needs.

**Why this priority**: This is the foundational interaction that enables users to access the new contiguous availability feature. Without this mode selection, users cannot access the new functionality.

**Independent Test**: Can be fully tested by launching the availability finder and verifying that users are presented with a clear choice between "Duration-based" and "Contiguous blocks" search modes before proceeding.

**Acceptance Scenarios**:

1. **Given** I click the "Find Availability" button from the main menu, **When** the availability finder loads, **Then** I am presented with two options: "Duration-based slots" and "Contiguous availability blocks"
2. **Given** I am on the mode selection screen, **When** I select "Contiguous availability blocks", **Then** the system proceeds to the date range input without asking for duration
3. **Given** I am on the mode selection screen, **When** I select "Duration-based slots", **Then** the system proceeds to the existing duration-based search flow
4. **Given** I am viewing availability results, **When** I navigate back to search again, **Then** I am again presented with the mode selection screen

---

### User Story 2 - View Contiguous Availability Blocks (Priority: P1)

As a calendar user, I want to see all my contiguous free time blocks without specifying a duration so I can understand my full availability and decide how to use those blocks.

**Why this priority**: This is the core value proposition of the feature - seeing complete availability blocks rather than filtered duration-based slots. It delivers immediate value by showing users their full schedule flexibility.

**Independent Test**: Can be fully tested by selecting "Contiguous availability blocks" mode, specifying a date range, and verifying that all free time blocks are displayed with their complete duration from start to end.

**Acceptance Scenarios**:

1. **Given** I have selected "Contiguous availability blocks" mode and specified a date range, **When** I click "Find Availability", **Then** the system displays all contiguous free time blocks during working hours (09:00-17:30) excluding weekends
2. **Given** I have a completely free day, **When** I search for contiguous availability on that date, **Then** the system shows one block from 09:00 to 17:30 (8 hours 30 minutes)
3. **Given** I have a meeting from 10:00-14:00, **When** I search for contiguous availability on that day, **Then** the system shows two blocks: 09:00-10:00 (1 hour) and 14:00-17:30 (3 hours 30 minutes)
4. **Given** I have multiple meetings with gaps throughout the day, **When** I search for contiguous availability, **Then** each gap between meetings is shown as a separate availability block with its full duration
5. **Given** I specify a date range spanning multiple days, **When** I click "Find Availability", **Then** the system shows all contiguous blocks grouped by date

---

### User Story 3 - Compare Search Results Across Modes (Priority: P2)

As a calendar user, I want to easily switch between duration-based and contiguous search views so I can compare different perspectives of my availability.

**Why this priority**: Enhances the user experience by allowing flexible exploration of availability. Users may want to see both views to make informed scheduling decisions.

**Independent Test**: Can be tested by running a search in one mode, switching modes, and verifying that the system allows re-running the search with the same date range in the alternate mode.

**Acceptance Scenarios**:

1. **Given** I have viewed contiguous availability results, **When** I click a "Switch to duration-based" option, **Then** the system allows me to specify a duration and re-run the search for the same date range
2. **Given** I have viewed duration-based results, **When** I click a "Switch to contiguous blocks" option, **Then** the system re-runs the search showing all contiguous blocks for the same date range
3. **Given** I switch between modes, **When** the results are displayed, **Then** each view clearly indicates which mode is active

---

### Edge Cases

- What happens when there are no contiguous blocks available (entire working day is booked)? → System displays message "No availability found in selected range"
- What happens when all available blocks are shorter than 15 minutes? → System excludes these per existing FR-018 and shows "No availability found" if none remain
- What happens when a user has back-to-back meetings with no gaps? → System shows availability only at start/end of working day (if any)
- What happens when an event starts before 09:00 and ends at 09:00 exactly? → Block starts at 09:00 (no impact on availability)
- What happens when an event ends at 17:30 exactly? → Block ends at the event start time (no availability after)
- What happens when the date range contains only weekends? → System displays existing error message "No working days in selected range"
- What happens when a user selects the same mode twice in a row? → System allows it without error

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST present users with a mode selection screen offering "Duration-based slots" and "Contiguous availability blocks" options when accessing the availability finder
- **FR-002**: System MUST allow users to select the "Contiguous availability blocks" mode
- **FR-003**: System MUST skip the duration input field when "Contiguous availability blocks" mode is selected
- **FR-004**: System MUST calculate contiguous availability blocks by identifying all gaps between calendar events within working hours (09:00-17:30)
- **FR-005**: System MUST display each contiguous availability block with its start time, end time, and total duration
- **FR-006**: System MUST preserve all existing duration-based search functionality when that mode is selected
- **FR-007**: System MUST exclude contiguous blocks shorter than 15 minutes from results (per existing FR-018)
- **FR-008**: System MUST group contiguous availability blocks by date, with blocks sorted chronologically within each day
- **FR-009**: System MUST display contiguous blocks using the same time format as duration-based search (12-hour with AM/PM)
- **FR-010**: System MUST apply the same working hours (09:00-17:30) and weekend exclusion rules to contiguous blocks as duration-based search
- **FR-011**: System MUST handle all edge cases (all-day events, overlapping events, events extending beyond working hours) consistently with existing functionality
- **FR-012**: System MUST clearly indicate which search mode (duration-based or contiguous) is currently active in the results display
- **FR-013**: System MUST allow users to return to the mode selection screen from search results
- **FR-014**: System MUST apply the same 7-day maximum date range limit to contiguous blocks search as duration-based search
- **FR-015**: System MUST maintain existing error handling and validation for invalid date ranges when in contiguous blocks mode

### Key Entities

- **SearchMode**: Represents the user's selected search type (duration-based or contiguous blocks)
- **ContiguousBlock**: Represents a continuous period of free time with start time, end time, total duration, and date (extends TimeSlot concept)
- **AvailabilitySearch**: Extended to include the selected search mode in addition to date range and optional duration

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can switch between duration-based and contiguous availability views within 2 clicks from search results
- **SC-002**: Contiguous blocks search returns results in under 5 seconds for a 7-day range
- **SC-003**: System correctly identifies all contiguous availability blocks with 100% accuracy when tested against known calendar states
- **SC-004**: 90% of users can understand the difference between the two search modes from the mode selection screen
- **SC-005**: Feature provides users with visibility into their full availability blocks, enabling better scheduling decisions without manual calendar inspection
- **SC-006**: Contiguous blocks view reduces time spent evaluating schedule flexibility by at least 40% compared to manually reviewing calendar

## Assumptions

- Working hours remain 09:00-17:30 as defined in the existing availability finder
- Weekend exclusion (Saturday/Sunday) applies to both search modes
- The same calendar event data source is used for both search modes
- Time slot granularity (15 minutes) and minimum slot display rules apply to both modes
- Users understand the concept of "contiguous" as "continuous/uninterrupted" time blocks
- The mode selection screen appears before date range input to streamline the user flow
- Users may want to compare results from both modes for the same date range
