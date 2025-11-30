# Data Model: Clear All People and Meetings

**Feature**: 008-clear-all-add
**Date**: 2025-01-30
**Phase**: 1 (Design & Contracts)

## Overview

This feature does **NOT introduce new data models** or modify existing Google Sheets schema. It operates entirely within the existing data structures defined in Feature 006 (One-to-One Scheduler).

The Clear All operation affects only the **quantity** of data (deleting all rows), not the **structure** or **schema** of any entities.

## Existing Data Models (Operated On)

### Person (from src/models/Person.gs)

Represents an individual scheduled for one-to-one meetings.

**Fields**:
- `personId` (string): Unique identifier (ULID format)
- `name` (string): Full name of the person
- `calendarEventId` (string): Google Calendar event series ID (empty if no meeting scheduled)

**Storage**: Google Sheets tab `OneToOnePeople`
**Columns**: [personId, name, calendarEventId]

**Feature 008 Impact**:
- **Read**: All person records read to get calendar event IDs
- **Delete**: ALL person rows deleted from sheet (except header)
- **No schema changes**

---

### Calendar Event (Google Calendar API entity)

Represents recurring Google Calendar event series for one-to-one meetings.

**Fields** (Google Calendar API object):
- `id` (string): Event series ID (stored in Person.calendarEventId)
- `title` (string): Event title (format: "<Name> + Andy Cheetham 1:1")
- `recurrence` (string[]): Recurrence rules (RRULE format)
- `startDateTime` (DateTime): Start date/time of first occurrence
- `endDateTime` (DateTime): End date/time of first occurrence

**Storage**: Google Calendar (via CalendarApp API)

**Feature 008 Impact**:
- **Read**: Event series fetched by ID to verify existence
- **Delete**: ALL event series deleted via `deleteEventSeries()` API
- **No schema changes**

---

## Preserved Data Models (NOT Modified)

These entities are explicitly preserved by Feature 008:

### MeetingSlot (from src/models/MeetingSlot.gs)

Represents a weekly time slot available for one-to-one meetings.

**Fields**:
- `slotId` (string): Unique identifier (ULID format)
- `weekday` (string): Day of week (Monday, Tuesday, ..., Sunday)
- `startTime` (string): Start time in HH:MM format
- `endTime` (string): End time in HH:MM format

**Storage**: Google Sheets tab `OneToOneSlots`

**Feature 008 Impact**: **NONE** - Sheet not accessed, all rows preserved

---

### OneToOneConfig (from src/services/OneToOneConfigService.gs)

Configuration settings for the one-to-one meeting scheduler.

**Fields**:
- `meetingDurationMinutes` (number): Duration of each meeting in minutes
- `minRecurrenceIntervalWeeks` (number): Minimum weeks between recurring meetings

**Storage**: Google Sheets tab `OneToOneConfig`

**Feature 008 Impact**: **NONE** - Sheet not accessed, all settings preserved

---

## State Transitions

### Person Lifecycle (Batch Deletion)

```
┌─────────────────────┐
│  Person Exists      │ OneToOnePeople sheet has N rows (N > 0)
│  with/without       │ Each may have calendarEventId populated or empty
│  Meeting            │
└──────────┬──────────┘
           │
           │ User clicks "Clear All" + confirms
           ▼
┌─────────────────────┐
│  Deletion Process   │ For each person (iteration):
│  In Progress        │ 1. Delete calendar event (if exists)
│                     │ 2. Delete row from sheet
└──────────┬──────────┘
           │
           │ All people processed
           ▼
┌─────────────────────┐
│  Empty State        │ OneToOnePeople sheet has 0 data rows
│                     │ Only header row remains
│                     │ All calendar events deleted
└─────────────────────┘
```

**Key State Properties**:
- **Atomic per person**: Each person deletion is independent (failure doesn't stop process)
- **Idempotent**: Running Clear All on empty sheet shows info message, no error
- **No rollback**: Deletion is permanent, no undo mechanism

---

### Calendar Event Lifecycle (Batch Deletion)

```
┌─────────────────────┐
│  Event Exists       │ Recurring calendar event in Google Calendar
│  in Calendar        │ person.calendarEventId = "event_abc123"
└──────────┬──────────┘
           │
           │ Clear All triggered for this person
           ▼
┌─────────────────────┐
│  Deletion Attempt   │ calendar.getEventSeriesById(calendarEventId)
│                     │ eventSeries.deleteEventSeries()
└──────────┬──────────┘
           │
           ├─ Success ─────────────┐
           │                       ▼
           │              ┌─────────────────────┐
           │              │  Event Deleted      │ Event removed from calendar
           │              │  Successfully       │ No traces remain
           │              └─────────────────────┘
           │
           └─ Failure (API error) ─┐
                                   ▼
                          ┌─────────────────────┐
                          │  Event Remains      │ Calendar event still exists
                          │  (Logged as Failure)│ Person row still deleted
                          │                     │ Failure reported to user
                          └─────────────────────┘
```

**Failure Tolerance**: Calendar deletion failure does NOT prevent person deletion from sheet (FR-012).

---

## Validation Rules (Unchanged)

All validation rules from Feature 006 remain unchanged. Clear All operation does not create or modify data, only deletes existing valid data.

### Pre-Deletion Validation
- **None required**: No data validation needed before deletion
- **Empty check**: If no people exist, inform user (don't fail)

### Post-Deletion Validation
- **Sheet state**: Verify only header row remains in OneToOnePeople
- **Settings preservation**: OneToOneConfig and OneToOneSlots unchanged
- **Calendar cleanup**: Report count of successfully deleted events vs failures

---

## Data Volume Impact

### Before Clear All
- **People**: 0-100 individuals in OneToOnePeople sheet
- **Calendar Events**: 0-100 recurring event series in Google Calendar
- **Settings**: 2 configuration values in OneToOneConfig
- **Slots**: 1-10 time slots in OneToOneSlots

### After Clear All
- **People**: 0 individuals (all deleted)
- **Calendar Events**: 0 recurring event series (all deleted or failures reported)
- **Settings**: 2 configuration values (UNCHANGED)
- **Slots**: 1-10 time slots (UNCHANGED)

### Performance Characteristics
- **Deletion time**: ~100ms per person (sheet + calendar)
- **Target capacity**: 100 people in ≤10 seconds
- **API calls**: N sheet deletions + N calendar deletions (N = people count)
- **Memory**: Minimal (processes one person at a time)

---

## Entities and Relationships

```
┌─────────────────┐
│  Person         │
│  (OneToOnePeople│
│   sheet)        │ DELETED: All rows (except header)
└────────┬────────┘
         │
         │ 1:1 (optional)
         │
         ▼
┌─────────────────┐
│  Calendar Event │
│  (Google Cal)   │ DELETED: All event series
└─────────────────┘


┌─────────────────┐
│  MeetingSlot    │
│  (OneToOneSlots │
│   sheet)        │ PRESERVED: No changes
└─────────────────┘


┌─────────────────┐
│  OneToOneConfig │
│  (config sheet) │ PRESERVED: No changes
└─────────────────┘
```

**Deletion Scope**: Only Person entities and their associated Calendar Events are affected.

**Preservation Scope**: MeetingSlot and OneToOneConfig entities are completely untouched.

---

## Summary

**No data model changes required** for Feature 008.

**Key Points**:
1. No new entities introduced
2. No schema modifications to existing sheets
3. Operation is purely destructive (deletion only)
4. Settings and time slots explicitly preserved
5. Each person deletion is independent (partial failure tolerated)
6. Empty state is valid and testable

**Data Integrity**:
- Sheet header preserved (schema intact)
- Settings sheets never accessed (impossible to corrupt)
- Calendar event orphans prevented (all events deleted or tracked as failures)
- No data validation needed (deleting always-valid existing data)

**Ready for API Contract Definition** (contracts/PeopleService.md)
