# Feature Specification: One-to-One Meeting Scheduler

**Feature Branch**: `006-i-would-like`
**Created**: 2025-01-26
**Status**: Draft
**Input**: User description: "I would like a new option on the main menu that lets me create, read, update and delete a set of one to one meetings for individuals listed in a predefined group of people. Each individual will get their own meeting Each meeting will have a predefined duration and will recurr indefinitely. There will be predefined calendar slots specified by weekday when meetings can be scheduled. The recurring frequency will be determined by the longer of either a) a specified minimum recurring interval or b) the shortest possible interval possible given the number of people and the number of available slots. The calendar event will have a title format that makes it possible to detect that it was created by this application. The application will allow the user to add, edit, delete and list people in the group. It will ensure all individuals have meetings created. It will allow meetings to be listed and viewed."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage People in One-to-One Group (Priority: P1) 🎯 MVP

As a manager, I want to add, edit, remove, and view people in my one-to-one meeting group so I can maintain an up-to-date list of direct reports or team members who need regular check-ins.

**Why this priority**: Without the ability to manage the group of people, no meetings can be scheduled. This is the foundational capability that enables all other features.

**Independent Test**: Can be fully tested by adding several people to the group, editing their details, viewing the complete list, and removing people. Delivers immediate value by creating a persistent roster of individuals requiring regular meetings.

**Acceptance Scenarios**:

1. **Given** I have no people in my one-to-one group, **When** I navigate to the One-to-One Scheduler from the main menu, **Then** I see an empty list and an option to add my first person
2. **Given** I'm viewing the empty group, **When** I add a person with their name and email, **Then** the person appears in my list and is saved for future sessions
3. **Given** I have 5 people in my group, **When** I view the list, **Then** I see all 5 people with their details displayed clearly
4. **Given** I have a person in my group, **When** I edit their name or email, **Then** the changes are saved and reflected in the list
5. **Given** I have a person in my group, **When** I remove them, **Then** they disappear from the list and any associated meetings are handled appropriately

---

### User Story 2 - Configure Meeting Slots and Recurrence Rules (Priority: P1) 🎯 MVP

As a manager, I want to define when one-to-one meetings can be scheduled (which weekdays and times) and set the minimum recurrence interval and meeting duration so the system knows the constraints for scheduling.

**Why this priority**: Without configuration, the system cannot determine when and how often to schedule meetings. This is essential infrastructure for the scheduling algorithm.

**Independent Test**: Can be tested by setting available meeting slots (e.g., "Tuesdays 2-5pm, Thursdays 9am-12pm"), specifying meeting duration (e.g., 30 minutes), and setting minimum recurrence interval (e.g., every 2 weeks). System should validate and save these settings.

**Acceptance Scenarios**:

1. **Given** I'm configuring the scheduler for the first time, **When** I specify available weekday slots (e.g., Monday 9-11am, Wednesday 2-4pm), **Then** the system saves these as the only times meetings can be scheduled
2. **Given** I'm in the configuration screen, **When** I set the meeting duration to 30 minutes, **Then** all scheduled meetings will be exactly 30 minutes long
3. **Given** I'm configuring recurrence, **When** I set minimum interval to 2 weeks, **Then** the system ensures no one has meetings closer together than 2 weeks apart
4. **Given** I have 10 people and limited slots, **When** the system calculates recurrence, **Then** it automatically extends the interval beyond my minimum if necessary to fit everyone
5. **Given** I update my available slots, **When** I save changes, **Then** existing meetings are not immediately affected but future scheduling uses the new rules

---

### User Story 3 - Create and View Scheduled Meetings (Priority: P1) 🎯 MVP

As a manager, I want the system to automatically create recurring calendar events for each person in my group according to the configured rules so I have all my one-to-ones scheduled without manual effort.

**Why this priority**: This is the core automation value - automatically scheduling all meetings based on the rules. Without this, the feature doesn't deliver its primary benefit.

**Independent Test**: Can be tested by adding 3 people to the group, configuring slots and rules, clicking "Create Meetings", and verifying that each person gets their own recurring calendar event with correct timing, duration, and recurrence interval.

**Acceptance Scenarios**:

1. **Given** I have 3 people in my group and configured slots, **When** I click "Create Meetings", **Then** the system creates 3 recurring calendar events, one per person, distributed across available slots
2. **Given** meetings are created, **When** I view my calendar, **Then** each event has a title format like "1:1 - [Person Name]" that is recognizable and searchable
3. **Given** I have 5 people and slots on Tuesday/Thursday, **When** meetings are created, **Then** each person is assigned to a specific day and time slot that doesn't conflict with others
4. **Given** I have more people than can fit in weekly slots, **When** the system calculates scheduling, **Then** it automatically uses a longer recurrence interval (e.g., every 2 weeks instead of weekly)
5. **Given** meetings already exist, **When** I view the meetings list in the app, **Then** I see all scheduled meetings with person name, day/time, and recurrence pattern

---

### User Story 4 - Update and Delete Meetings (Priority: P2)

As a manager, I want to update existing meeting schedules or delete all meetings for a person when they leave the team so I can adapt to changing circumstances.

**Why this priority**: Necessary for long-term maintenance but not required for initial setup and first use. Can be added after core scheduling works.

**Independent Test**: Can be tested by modifying a person's meeting time/day, updating recurrence for all their future meetings, or removing a person and verifying all their calendar events are deleted.

**Acceptance Scenarios**:

1. **Given** a person has recurring meetings created, **When** I change their assigned day/time slot, **Then** all future occurrences of their meeting are updated to the new slot
2. **Given** I remove a person from my group, **When** I confirm deletion, **Then** all of their recurring calendar events are removed from my calendar
3. **Given** I change the global meeting duration from 30 to 45 minutes, **When** I apply changes, **Then** all existing meetings are updated to the new duration
4. **Given** meetings exist with a 2-week recurrence, **When** I change minimum interval to 1 week and recalculate, **Then** meetings are updated to the new recurrence pattern

---

### User Story 5 - Reschedule Meetings After Configuration Changes (Priority: P3)

As a manager, I want the ability to regenerate all meeting schedules when I significantly change my available slots or add many new people so the scheduling can be optimized again.

**Why this priority**: Edge case for major reorganizations. Most users will configure once and make minor tweaks, making this a nice-to-have rather than essential.

**Independent Test**: Can be tested by creating meetings for 5 people, then adding 5 more people, clicking "Regenerate All Meetings", and verifying the system redistributes all 10 people optimally across slots.

**Acceptance Scenarios**:

1. **Given** I have existing meetings and change available slots dramatically, **When** I choose "Regenerate All Meetings", **Then** the system deletes old meetings and creates new optimally-distributed meetings
2. **Given** I go from 5 to 15 people in my group, **When** I regenerate, **Then** the system recalculates the recurrence interval to fit everyone
3. **Given** I'm about to regenerate, **When** I see the confirmation dialog, **Then** it clearly warns me that existing meetings will be deleted and recreated

---

### Edge Cases

- What happens when I add a person but haven't created meetings yet? → Person appears in list, meetings can be created later
- What happens when I remove a person who has upcoming meetings? → All their recurring calendar events are deleted
- What happens if I configure only 1 time slot but have 10 people? → System automatically extends recurrence interval (e.g., every 10 weeks) to fit everyone without conflicts
- What happens if I set meeting duration to 60 minutes but my slot is only 30 minutes? → System shows validation error preventing save
- What happens if I configure slots on Saturday/Sunday? → System allows it (user may have non-standard work week)
- What happens if two people have the same name? → System allows it, distinguishes by email or ID
- What happens when the calendar API fails during meeting creation? → System shows error message with details, allows retry
- What happens if I try to delete a person who doesn't exist? → System shows error message
- What happens if meeting duration is changed after meetings exist? → Only new meetings use the new duration; existing meetings keep their original duration unless manually regenerated
- What happens when I have exactly enough slots for weekly meetings but want biweekly minimum? → System respects the longer minimum interval (biweekly)
- What happens when available slots conflict with already-booked personal events? → System allows double-booking; user is responsible for defining conflict-free available slots

## Requirements *(mandatory)*

### Functional Requirements

**People Management**:
- **FR-001**: System MUST provide a new menu option labeled "One-to-One Scheduler" or similar on the main menu
- **FR-002**: System MUST allow users to add people to the one-to-one group with name and email address
- **FR-003**: System MUST allow users to view a list of all people in the one-to-one group
- **FR-004**: System MUST allow users to edit person details (name, email)
- **FR-005**: System MUST allow users to remove people from the one-to-one group
- **FR-006**: System MUST persist the list of people in the group across sessions

**Configuration**:
- **FR-007**: System MUST allow users to define available meeting time slots by specifying weekday and time ranges (e.g., "Tuesday 14:00-17:00")
- **FR-008**: System MUST allow users to specify a fixed meeting duration in minutes
- **FR-009**: System MUST allow users to specify a minimum recurrence interval (e.g., 1 week, 2 weeks)
- **FR-010**: System MUST validate that meeting duration does not exceed any single available time slot
- **FR-011**: System MUST persist configuration settings across sessions

**Meeting Scheduling**:
- **FR-012**: System MUST create one recurring calendar event for each person in the group
- **FR-013**: System MUST distribute meetings across available time slots without scheduling multiple meetings in the same slot
- **FR-014**: System MUST set recurrence interval to the longer of: (a) user-specified minimum interval, or (b) the calculated interval needed to fit all people into available slots
- **FR-015**: System MUST format calendar event titles with an identifiable prefix or pattern (e.g., "1:1 - [Person Name]" or "[App Name] 1:1: [Person Name]")
- **FR-016**: System MUST create recurring events that repeat indefinitely (no end date)
- **FR-017**: System MUST ensure each person is assigned exactly one recurring meeting slot
- **FR-018**: System MUST prevent creating meetings if no people exist in the group
- **FR-019**: System MUST prevent creating meetings if no available slots are configured

**Meeting Management**:
- **FR-020**: System MUST display a list of all scheduled meetings showing person name, day, time, and recurrence pattern
- **FR-021**: System MUST allow users to view details of any scheduled meeting
- **FR-022**: System MUST delete all calendar events for a person when they are removed from the group
- **FR-023**: System MUST provide a way to delete all meetings and recreate them with updated configuration

**Calendar Integration**:
- **FR-024**: System MUST create events in the user's selected Google Calendar
- **FR-025**: System MUST handle calendar API errors gracefully with user-friendly error messages
- **FR-026**: System MUST be able to identify and manage only meetings created by this application using the title format

**Scheduling Algorithm**:
- **FR-027**: System MUST calculate the minimum recurrence interval as: total_people / total_slots_per_interval, rounded up to the next valid interval
- **FR-028**: System MUST distribute people evenly across available weekday slots when possible
- **FR-029**: System MUST handle the case where available slots span multiple days of the week

**User Interface**:
- **FR-030**: System MUST provide a way to navigate back to the main menu from the One-to-One Scheduler
- **FR-031**: System MUST show confirmation dialogs before destructive actions (delete person, delete all meetings)
- **FR-032**: System MUST display success messages after meetings are created or updated
- **FR-033**: System MUST display the calculated recurrence interval to the user before creating meetings

### Key Entities

- **Person**: Represents an individual in the one-to-one group with attributes: name, email, unique identifier
- **MeetingSlot**: Represents an available time window with attributes: weekday (Monday-Sunday), start time, end time
- **ScheduleConfiguration**: Represents the global settings with attributes: meeting duration (minutes), minimum recurrence interval (weeks), list of available MeetingSlots
- **ScheduledMeeting**: Represents a created calendar meeting with attributes: person reference, assigned slot, recurrence pattern, calendar event ID
- **RecurrencePattern**: Represents how often a meeting repeats with attributes: interval value (e.g., 2), interval unit (e.g., weeks)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can add a person to the group and create their first recurring meeting in under 3 minutes from the main menu
- **SC-002**: System accurately calculates and creates non-conflicting meeting schedules for groups of up to 20 people within 10 seconds
- **SC-003**: 100% of created calendar events follow the specified title format and can be identified by the application
- **SC-004**: Users can view the complete meeting schedule and understand who meets when within 2 clicks
- **SC-005**: System correctly determines recurrence interval: if 5 people and 5 weekly slots exist, interval = 1 week; if 10 people and 5 weekly slots, interval = 2 weeks
- **SC-006**: Removing a person from the group successfully deletes all their calendar events within 5 seconds
- **SC-007**: Feature reduces time spent manually scheduling recurring one-to-ones by at least 80% compared to manual calendar entry
- **SC-008**: 90% of users can configure the system and create their first set of meetings without external help or documentation

## Assumptions

- **Default meeting duration**: 30 minutes (common standard for one-to-one meetings)
- **Default minimum recurrence interval**: 1 week (most managers meet with direct reports weekly or biweekly)
- **Recurrence interval units**: Weeks (not days or months) as this is the most common pattern for one-to-ones
- **Time slot granularity**: Meetings can start at any time within available slots, rounded to 15-minute boundaries
- **Calendar event visibility**: Events are created as normal calendar events visible to the user and can be shared/invited as needed
- **Work week definition**: Monday-Friday is typical, but system allows Saturday/Sunday if user configures them
- **Conflict detection**: System does NOT check for conflicts with other calendar events; user is responsible for defining non-conflicting available slots
- **Person uniqueness**: People are identified by email address as unique key
- **Meeting updates**: When configuration changes (duration, recurrence interval), only newly created meetings use the new settings; existing meetings retain their original configuration unless user manually regenerates all meetings
- **Title format**: Default format is "1:1 - [Person Name]" which is human-readable and identifiable
- **Calendar selection**: Meetings are created in the currently selected calendar (same as other features in the application)

