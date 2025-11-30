# Feature Specification: Optimized Meeting Slot Distribution

**Feature Branch**: `007-when-scheduling-meetings`
**Created**: 2025-01-30
**Status**: Draft
**Input**: User description: "When scheduling meetings do not use the same slot for more than one meeting. The recurring interval needs to be the greater of the minimum recurrence or the number of people divided by the available weekly slots. For example if the minimum recurrence 4 and there are 10 people and 2 weekly slots, the recurring interval will be 5 weeks because 10 divided by 2 is greater than 4. When creating the meeting events spread them as evenly as possible over the weeks. For example, if the minimum recurrence is 4 and there are 2 people and there are 2 available slots, you need to schedule one meeting in slot 1 of week 1 then another meeting in the third week."

## Clarifications

### Session 2025-01-30

- Q: When the number of people exceeds available capacity (e.g., 20 people with 2 slots and 4-week minimum recurrence), what should happen? → A: Automatically increase the recurrence interval to accommodate all people without conflicts. The formula max(minimum_recurrence, ⌈people_count / weekly_slots⌉) ensures everyone gets a recurring meeting. For example, 6 people with 1 weekly slot requires recurrence interval of 6 weeks.
- Q: When meetings are regenerated (e.g., after adding/removing people or changing slots), how should the system handle existing calendar events? → A: Delete all existing one-to-one meeting events from the calendar and recreate them using the new distribution algorithm.
- Q: For even distribution across weeks, when you have more people than slots per week, how should meetings be distributed? → A: Distribute using interval stride where spacing = recurrence_interval / slots_per_week. Example: 4 people, 2 weekly slots, 4-week recurrence yields Person 1 at week 0, Person 2 at week 0, Person 3 at week 2, Person 4 at week 2 (2-week spacing).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Prevent Slot Conflicts Within Same Week (Priority: P1)

As a meeting scheduler, I need the system to ensure that each weekly time slot is only used once per week, so that I don't have scheduling conflicts or double-bookings in my calendar.

**Why this priority**: This is the foundational requirement that prevents calendar conflicts. Without this, the scheduler could create overlapping meetings in the same time slot, making the feature unusable.

**Independent Test**: Can be fully tested by creating meetings for multiple people with overlapping slots and verifying that no week contains the same slot used twice, delivering immediate conflict prevention.

**Acceptance Scenarios**:

1. **Given** 10 people configured and 2 weekly slots (Monday 10am, Wednesday 2pm), **When** meetings are scheduled, **Then** no week should have both slots occupied by different meetings
2. **Given** 5 people configured and 3 weekly slots, **When** meetings are generated, **Then** each week uses at most 3 different slots with no duplicates
3. **Given** existing meetings already scheduled in week 1 slot 1, **When** new meetings are generated, **Then** week 1 should not reuse slot 1 for any new meeting

---

### User Story 2 - Smart Recurrence Interval Calculation (Priority: P1)

As a meeting scheduler, I need the system to calculate the optimal recurrence interval based on the number of people and available slots, so that all meetings can fit within the available time slots without conflicts.

**Why this priority**: This is critical for ensuring the scheduler can mathematically accommodate all people within the configured slots. Without proper interval calculation, the system might run out of slots or create conflicts.

**Independent Test**: Can be fully tested by configuring various combinations of people count, slot count, and minimum recurrence, then verifying the calculated interval matches the formula: max(minimum_recurrence, ceil(people_count / weekly_slots)).

**Acceptance Scenarios**:

1. **Given** 10 people, 2 weekly slots, and minimum recurrence of 4 weeks, **When** recurrence interval is calculated, **Then** it should be 5 weeks (10/2 = 5, which is greater than 4)
2. **Given** 6 people, 3 weekly slots, and minimum recurrence of 4 weeks, **When** recurrence interval is calculated, **Then** it should be 4 weeks (6/3 = 2, which is less than 4, so use minimum)
3. **Given** 8 people, 2 weekly slots, and minimum recurrence of 2 weeks, **When** recurrence interval is calculated, **Then** it should be 4 weeks (8/2 = 4, which is greater than 2)

---

### User Story 3 - Even Distribution of Meetings Across Weeks (Priority: P2)

As a meeting scheduler, I need meetings to be spread evenly across the recurrence cycle rather than clustered in early weeks, so that my calendar load is balanced throughout the period.

**Why this priority**: This improves the user experience by preventing calendar clustering, but the system would still function correctly without perfect distribution. It's a quality-of-life enhancement.

**Independent Test**: Can be fully tested by generating meetings for a specific configuration and verifying that meetings are distributed with roughly equal spacing between them (e.g., 2 people with 4-week minimum recurrence should place meetings in week 1 and week 3, not week 1 and week 2).

**Acceptance Scenarios**:

1. **Given** 2 people, 2 weekly slots, and 4-week recurrence interval, **When** meetings are scheduled, **Then** one meeting should be in week 1 slot 1, and another in week 3 slot 1 (spread evenly)
2. **Given** 4 people, 2 weekly slots, and 4-week recurrence interval, **When** meetings are scheduled, **Then** meetings should appear in weeks 1, 1, 3, 3 (two meetings spaced apart, then two more meetings spaced apart)
3. **Given** 6 people, 3 weekly slots, and 4-week recurrence interval, **When** meetings are scheduled, **Then** meetings should be distributed across weeks 1, 1, 1, 3, 3, 3 (not all in consecutive weeks)

---

### Edge Cases

- What happens when minimum recurrence is set to 1 week (same-week recurrence)?
- How does the system handle partial weeks at the start of scheduling (e.g., starting on Wednesday with Monday/Wednesday slots)?
- What happens if all configured slots fall in the past when scheduling meetings?
- How does the system behave when people count greatly exceeds weekly slots (e.g., 100 people with 1 slot resulting in 100-week recurrence interval)?
- What happens if a user manually modifies or deletes a one-to-one meeting event in their calendar between regenerations?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST ensure no weekly time slot is used more than once within the same calendar week
- **FR-002**: System MUST calculate recurrence interval as the maximum of (minimum configured recurrence, ceiling of people count divided by weekly slots count), which automatically ensures sufficient capacity for all configured people
- **FR-003**: System MUST distribute meetings evenly across the recurrence cycle using interval stride spacing, where spacing equals recurrence_interval divided by weekly_slots count
- **FR-004**: System MUST assign each person to a unique combination of (week offset, slot) within the recurrence pattern
- **FR-005**: System MUST apply the slot distribution algorithm to both new meeting creation and meeting regeneration scenarios
- **FR-006**: System MUST delete all existing one-to-one meeting calendar events before regenerating meetings to ensure clean state
- **FR-007**: System MUST preserve the existing meeting slot configuration and people list when applying the new scheduling algorithm

### Key Entities

- **Recurrence Interval**: The number of weeks between recurring instances of the same meeting, calculated as max(minimum_recurrence, ⌈people_count / weekly_slots⌉)
- **Week Offset**: The week number (0-indexed) within the recurrence cycle where a specific person's meeting should occur
- **Slot Assignment**: The pairing of a person with a specific (week offset, time slot) combination ensuring no week offset has duplicate slots
- **Scheduling Capacity**: The total number of unique meeting slots available within one recurrence cycle, calculated as weekly_slots × recurrence_interval

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Zero scheduling conflicts occur when meetings are generated for any configuration (formula guarantees sufficient capacity)
- **SC-002**: Recurrence interval calculation matches the formula max(minimum_recurrence, ⌈people_count / weekly_slots⌉) in 100% of test cases
- **SC-003**: Meeting distribution variance across weeks is minimized (standard deviation of meetings per week is within 1.0 for any configuration)
- **SC-004**: All configured people receive a scheduled meeting with no one excluded (100% coverage)
- **SC-005**: Existing one-to-one meeting functionality continues to work without regression (all feature 006 test cases still pass)

## Assumptions

1. **Existing System**: This feature enhances the existing one-to-one meeting scheduler implemented in feature 006
2. **Slot Configuration**: Weekly slots are already configured in the OneToOneSlots sheet with day and time
3. **People Management**: People are already configured in the OneToOnePeople sheet
4. **Minimum Recurrence**: The minimum recurrence interval is already configured in OneToOneConfig sheet
5. **Distribution Algorithm**: "Even distribution" uses interval stride spacing calculated as recurrence_interval / weekly_slots, grouping weekly_slots number of people at each stride offset (e.g., 4 people, 2 slots, 4-week interval: 2 people at week 0, 2 people at week 2)
6. **Week Definition**: A week is defined by calendar week boundaries (Sunday-Saturday or Monday-Sunday based on calendar configuration)
7. **Automatic Capacity**: The recurrence interval formula automatically adjusts to accommodate all people, eliminating the possibility of over-capacity scenarios

## Dependencies

- **Feature 006**: One-to-one meeting scheduler must be implemented and functional
- **Google Sheets Data**: OneToOnePeople, OneToOneConfig, and OneToOneSlots sheets must contain valid data
- **Calendar Access**: User's Google Calendar must be accessible for meeting creation

## Scope

### In Scope

- Slot conflict prevention within the same week
- Smart recurrence interval calculation that automatically accommodates all people
- Even distribution of meetings across recurrence cycle
- Application to both new scheduling and regeneration

### Out of Scope

- Changes to the UI for configuring slots or people
- Changes to the data model (no new sheets or columns)
- Manual override capabilities for the automatic recurrence calculation
- Historical meeting data migration or rescheduling
- Optimization for specific user preferences (e.g., "prefer Mondays")
- Warnings or limits on very long recurrence intervals (e.g., 100+ weeks)
