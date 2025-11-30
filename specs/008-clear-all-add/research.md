# Research: Clear All People and Meetings

**Feature**: 008-clear-all-add
**Date**: 2025-01-30
**Phase**: 0 (Research & Design Decisions)

## Overview

This feature extends the existing One-to-One Scheduler (Feature 006) with a bulk deletion capability. Since all core technologies, patterns, and infrastructure already exist from Feature 006, this research focuses on design decisions for the batch deletion implementation and user feedback patterns.

## Research Areas

### 1. Batch Deletion Pattern for Google Sheets

**Question**: What's the most efficient way to delete all rows from a Google Sheets tab while preserving the header?

**Research Findings**:

**Option A: Delete rows one-by-one**
- Use `peopleSheet.deleteRow(rowIndex)` in a loop
- Pros: Uses existing pattern from Feature 006
- Cons: Inefficient for large datasets (100 API calls for 100 people)

**Option B: Clear range then preserve header**
- Use `peopleSheet.getRange(2, 1, lastRow-1, numCols).clearContent()`
- Pros: Single API call, very fast
- Cons: Leaves empty rows in sheet structure

**Option C: Delete entire sheet and recreate**
- Delete OneToOnePeople sheet, then recreate with header
- Pros: Clean sheet structure
- Cons: Complex, risks sheet schema inconsistency

**Decision**: **Option A (Delete rows one-by-one)**

**Rationale**:
- Consistency with existing `deletePerson()` implementation from Feature 006
- Properly removes rows from sheet structure (no ghost rows)
- Performance acceptable for target scale (100 people in ~10 seconds)
- Reuses existing deletion logic including calendar event cleanup
- Simplifies error handling (can report which specific deletions failed)

**Alternatives Considered**:
- Option B rejected: Empty rows create confusion in manual sheet inspection
- Option C rejected: Unnecessary complexity and risk of schema drift

---

### 2. Calendar Event Deletion Strategy

**Question**: Should calendar events be deleted in batch or individually?

**Research Findings**:

**Option A: Batch delete using calendar search + deleteEventSeries**
- Search for all events with title pattern, delete in batch
- Pros: Potentially faster
- Cons: Fragile (relies on title pattern matching), risky if title format changes

**Option B: Individual deletion per person**
- For each person, delete their specific calendar event by ID
- Pros: Precise, uses stored calendarEventId, matches existing pattern
- Cons: Multiple API calls (but within acceptable performance budget)

**Decision**: **Option B (Individual deletion per person)**

**Rationale**:
- Reuses existing calendar deletion logic from `deletePerson()` (Feature 006)
- Uses stored `calendarEventId` for precise deletion (no pattern matching risk)
- Allows per-person failure tracking and reporting
- Consistent with existing architecture
- Performance acceptable (100 calendar API calls in ~10 seconds well within Google Apps Script quotas)

**Alternatives Considered**:
- Option A rejected: Fragile pattern matching, doesn't leverage stored event IDs

---

### 3. User Feedback During Batch Operation

**Question**: What's the best way to show progress during a potentially long-running operation?

**Research Findings**:

**Option A: Simple working indicator (spinner + message)**
- Show loading spinner with static message "Clearing all people and meetings..."
- Pros: Simple to implement, matches existing patterns in app
- Cons: No granular progress information

**Option B: Progress bar with percentage**
- Show progress bar updating as each person is deleted
- Pros: Users see exact progress
- Cons: Requires additional complexity, incremental UI updates from server

**Option C: Real-time status updates**
- Stream deletion status for each person ("Deleting Alice...", "Deleting Bob...")
- Pros: Maximum visibility
- Cons: Complex to implement in Google Apps Script (no SSE/WebSocket), may be overwhelming

**Decision**: **Option A (Simple working indicator)**

**Rationale**:
- Matches existing patterns in Feature 006 (Create Meetings, Regenerate All)
- Spec explicitly states "simple working indicator is sufficient" (Out of Scope section)
- 10-second operation doesn't warrant complex progress tracking
- Consistent with existing UI feedback patterns
- Users already familiar with this pattern from regenerate operation

**Alternatives Considered**:
- Option B rejected: Over-engineering for 10-second operation
- Option C rejected: Not feasible with Google Apps Script architecture

---

### 4. Empty State Handling

**Question**: How should the system behave when "Clear All" is clicked but no people exist?

**Research Findings**:

**Option A: Disable button when empty**
- Check people count on load, disable button if zero
- Pros: Prevents unnecessary action
- Cons: Requires state tracking, button state may be stale

**Option B: Show info message when clicked**
- Allow click, display "No people to delete" message
- Pros: Simple, always accurate, matches FR-014 requirement
- Cons: Extra click for user (but rare scenario)

**Decision**: **Option B (Show info message when clicked)**

**Rationale**:
- Matches FR-014: "If no people exist when 'Clear All' is clicked, system MUST inform user that there is nothing to delete"
- Simpler implementation (no state management)
- Always accurate (no stale UI state)
- Consistent with existing error/info message patterns
- Empty state is rare scenario (not worth optimization)

**Alternatives Considered**:
- Option A rejected: Added complexity for minimal benefit

---

### 5. Settings Preservation Approach

**Question**: How to ensure OneToOneConfig and OneToOneSlots are not affected?

**Research Findings**:

**Option A: Explicit exclusion logic**
- Add checks to skip these sheets in deletion logic
- Pros: Explicit protection
- Cons: Unnecessary - we're only touching OneToOnePeople

**Option B: Scope deletion to OneToOnePeople only**
- Only interact with OneToOnePeople sheet
- Pros: Clean separation of concerns, impossible to accidentally delete settings
- Cons: None

**Decision**: **Option B (Scope deletion to OneToOnePeople only)**

**Rationale**:
- Clear All operation only needs access to OneToOnePeople sheet
- Settings sheets are never referenced in the function
- Impossible to accidentally delete what you don't touch
- Follows principle of least privilege
- No additional code needed for protection

**Alternatives Considered**:
- Option A rejected: Over-engineering, defensive programming against non-existent risk

---

## Technology Stack Confirmation

All technologies already in use from Feature 006:

- **Google Apps Script** (JavaScript ES5+, V8 runtime)
- **Google Calendar API** (CalendarApp service)
- **Google Sheets API** (SpreadsheetApp service)
- **HTML Service** for UI rendering
- **Session Storage** for UI state persistence (if needed)

**No new dependencies required.**

---

## Performance Validation

**Target**: Complete deletion of 100 people with meetings within 10 seconds

**Estimated Performance**:
- Delete person from sheet: ~50ms per row
- Delete calendar event: ~50ms per event
- Total per person: ~100ms
- 100 people: ~10 seconds (within target)

**Quota Validation**:
- Google Apps Script execution time limit: 6 minutes (360 seconds) ✓
- Calendar API quota: 1,000,000 requests/day ✓
- Spreadsheet API quota: Unlimited for G Suite ✓

**Conclusion**: Performance goals achievable within platform constraints.

---

## Best Practices Applied

### Error Handling
- Continue deletion even if some calendar events fail (FR-012)
- Report specific failures to user in success message
- Distinguish between calendar deletion failures and sheet deletion

### User Experience
- Confirmation dialog with clear warning (User Story 3)
- Working indicator throughout operation (User Story 2)
- Disable UI during deletion to prevent concurrent operations (FR-008)
- Success message with deletion counts (FR-011)

### Code Reuse
- Leverage existing `deletePerson()` logic from Feature 006
- Use existing batch read utilities (batchRead)
- Follow existing error message patterns
- Maintain consistency with regenerateAllMeetings() pattern

---

## Implementation Approach

**Summary**: This feature will be implemented as a new server-side function `clearAllPeople()` in `PeopleService.gs` that:

1. Reads all people using existing `listPeople()` function
2. Iterates through each person
3. For each person, reuses deletion logic from `deletePerson()`:
   - Delete calendar event if exists (with error tolerance)
   - Delete row from OneToOnePeople sheet
4. Collects success/failure counts
5. Returns summary to UI

The UI will add:
- "Clear All" button in People tab (styled consistently)
- Confirmation dialog handler with warning message
- Working indicator activation during server call
- Success/failure message display

**Complexity Assessment**: Low complexity - straightforward iteration pattern reusing existing functions.

---

## Open Questions

None. All design decisions resolved.

---

## Next Steps

Proceed to Phase 1:
- Generate data-model.md (document unchanged entities)
- Generate contracts/PeopleService.md (define clearAllPeople() API contract)
- Generate quickstart.md (implementation guide)
