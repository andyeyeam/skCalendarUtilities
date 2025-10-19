# Research & Technical Decisions: Contiguous Availability Blocks

**Feature**: 005-add-a-new
**Date**: 2025-01-19
**Status**: Complete

## Overview

This document captures research findings and technical decisions for implementing contiguous availability blocks mode in the Find Availability feature. Each section addresses a specific technical question and documents the chosen approach with rationale.

## 1. Mode Selection UI Pattern

### Question
How should mode selection be presented in the availability finder flow?

### Research Findings

**Current UI Structure** (from Availability.html analysis):
- Search form uses card-based layout with form-group elements
- Input fields are stacked vertically with labels
- Existing patterns: datetime-local inputs, number inputs with validation hints
- Mobile-responsive design with consistent spacing

**Evaluated Options**:

1. **Radio Buttons (Recommended)**
   - Pros: Standard HTML form control, accessible, mutually exclusive selection clear, screen reader friendly
   - Cons: Slightly more verbose markup than buttons
   - Markup: `<input type="radio" name="searchMode" value="duration">` with `<label>` elements

2. **Button Group (Two-State Toggle)**
   - Pros: Visually compact, modern appearance, clear active state
   - Cons: Requires custom JavaScript for state management, less accessible by default
   - Implementation: Two buttons with active/inactive styling

3. **Dropdown/Select**
   - Pros: Compact, familiar pattern
   - Cons: Requires extra click to reveal options, hides choice until activated (violates progressive disclosure)
   - Not recommended for binary choice

### Decision

**Use Radio Buttons** with minimalist styling

**Rationale**:
- Follows HTML semantic standards (accessibility)
- Mutually exclusive selection is immediately visible (progressive disclosure)
- Consistent with existing form controls in Availability.html
- Mobile-friendly (large touch targets)
- Minimal JavaScript required (native form behavior)

**Implementation Details**:
```html
<div class="form-group">
  <label>Search Mode:</label>
  <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
      <input type="radio" name="searchMode" value="duration" checked onchange="handleModeChange()">
      <span><strong>Duration-based slots</strong> - Find slots of specific duration</span>
    </label>
    <label style="display: flex; align-items: center; gap: 0.5rem; cursor: pointer;">
      <input type="radio" name="searchMode" value="contiguous" onchange="handleModeChange()">
      <span><strong>Contiguous blocks</strong> - Show all uninterrupted free time</span>
    </label>
  </div>
</div>
```

**Styling Approach**:
- Reuse existing form-group spacing and typography
- Radio button labels use flex layout for alignment
- Descriptions in normal weight, mode names in bold for hierarchy
- No new colors required (neutral palette)

---

## 2. AvailabilityService Extension Strategy

### Question
How to extend calculateAvailability() to support both modes without breaking existing functionality?

### Research Findings

**Current calculateAvailability() Implementation** (from AvailabilityService.gs:243):
```javascript
function calculateAvailability(events, startDate, endDate, durationMinutes) {
  durationMinutes = durationMinutes || 15;
  // Generates intervals of durationMinutes size
  // Checks each interval for conflicts
  // Returns only intervals that fit durationMinutes
}
```

**Key Observations**:
1. Duration-based logic is embedded in interval generation (line 311): `var numIntervals = Math.floor(totalWorkingMinutes / durationMinutes);`
2. Entire function assumes discrete intervals of specified duration
3. No concept of "contiguous blocks" - would need different algorithm

**Alternative Approaches**:

1. **Separate Function (calculateContiguousAvailability)**
   - Pros: Clean separation, no risk of breaking existing behavior
   - Cons: Code duplication for event fetching, validation, date iteration
   - Estimated LOC: ~150 lines duplicated

2. **Mode Parameter with Conditional Logic**
   - Pros: Shares validation, event fetching, date iteration logic
   - Cons: Function becomes more complex, mode parameter passed through call chain
   - Estimated LOC: +30 lines, refactor existing 100 lines

3. **Extract Common Logic, Separate Calculation**
   - Pros: Best separation of concerns, reusable validation/event fetching
   - Cons: Requires refactoring existing code into helper functions
   - Estimated LOC: +50 lines helper functions, +80 lines contiguous calculator

### Decision

**Use Separate Function: calculateContiguousAvailability()**

**Rationale**:
- Minimizes risk to existing duration-based feature (004-i-would-like is IMPLEMENTED and working)
- Contiguous blocks require fundamentally different algorithm (intervals-to-timeslots pattern from lines 107-151)
- Clearer code intent - each function has single responsibility
- Easier testing - each mode tested independently
- Code reuse achieved by calling shared helper functions: `generateWorkingDayIntervals()`, `markIntervalsAsBusy()`, `intervalsToTimeSlots()`

**Implementation Pattern**:
```javascript
// NEW FUNCTION
function calculateContiguousAvailability(events, startDate, endDate) {
  var availableSlots = [];
  var days = getDaysBetween(startDate, endDate);

  days.forEach(function(day) {
    if (!isWorkingDay(day)) return;

    // Reuse existing helpers
    var intervals = generateWorkingDayIntervals(day);
    var dayEvents = filterEventsToDay(events, day);
    markIntervalsAsBusy(intervals, dayEvents);

    // Convert to time slots (no duration filtering)
    var daySlots = intervalsToTimeSlots(intervals);
    availableSlots = availableSlots.concat(daySlots);
  });

  return availableSlots;
}
```

**Helper Functions to Extract** (already exist, lines 32-151):
- `generateWorkingDayIntervals(date)` - Line 32 (ALREADY EXISTS)
- `markIntervalsAsBusy(intervals, events)` - Line 60 (ALREADY EXISTS)
- `intervalsToTimeSlots(intervals)` - Line 107 (ALREADY EXISTS)

**Server Handler Update** (Code.gs):
```javascript
function findAvailability(startDateTime, endDateTime, minDuration, searchMode) {
  // ... validation ...

  var slots;
  if (searchMode === 'contiguous') {
    slots = calculateContiguousAvailability(events, startDate, endDate);
  } else {
    // Default to duration-based (backward compatible)
    slots = calculateAvailability(events, startDate, endDate, minDuration);
  }

  // ... return response ...
}
```

---

## 3. Session Storage Schema for Mode

### Question
What session storage structure should store mode selection and integrate with existing patterns?

### Research Findings

**Current Session Storage Usage** (from Availability.html:634-667):
```javascript
// Existing keys:
sessionStorage.setItem('availability_startDateTime', startValue);
sessionStorage.setItem('availability_endDateTime', endValue);
sessionStorage.setItem('availability_minDuration', '30');
```

**Pattern Observations**:
- Prefix: `availability_*`
- Values: Stored as strings
- Restoration: On page load (initializeAvailabilityScreen)
- Default behavior: Falls back to computed defaults if not set

### Decision

**Add `availability_searchMode` key following existing pattern**

**Schema**:
```javascript
{
  "availability_searchMode": "duration" | "contiguous",  // NEW
  "availability_startDateTime": "YYYY-MM-DDTHH:mm",      // EXISTING
  "availability_endDateTime": "YYYY-MM-DDTHH:mm",        // EXISTING
  "availability_minDuration": "30"                       // EXISTING
}
```

**Default Value**: `"duration"` (backward compatible - existing behavior)

**Rationale**:
- Consistent with existing key naming convention
- String value matches radio button values exactly (no conversion needed)
- Falls back to "duration" if key missing (graceful degradation)
- Persists across page reloads within same session (as per FR-013)

**Implementation**:
```javascript
// Save on mode change
function handleModeChange() {
  var selectedMode = document.querySelector('input[name="searchMode"]:checked').value;
  sessionStorage.setItem('availability_searchMode', selectedMode);
  updateDurationFieldVisibility();
}

// Restore on page load (in initializeAvailabilityScreen)
var cachedMode = sessionStorage.getItem('availability_searchMode') || 'duration';
document.querySelector('input[name="searchMode"][value="' + cachedMode + '"]').checked = true;
updateDurationFieldVisibility();
```

---

## 4. Results Display Differentiation

### Question
How to clearly indicate which search mode is active in results display?

### Research Findings

**Current Results Metadata** (Availability.html:862-869):
```javascript
var metadataHtml = '<p><strong>Search Results</strong></p>' +
  '<p class="text-muted" style="font-size: 0.875rem;">' +
  'Date range: ...<br>' +
  'Working days: ...<br>' +
  'Available slots: ...<br>' +
  durationText +  // Conditionally shows "Minimum duration: X minutes"
  '</p>';
```

**Current Structure**:
- Card-based layout with metadata above results
- "Search Results" heading in bold
- Metadata items in smaller, muted text
- Duration shown only if > 15 minutes

**Evaluated Options**:

1. **Add Mode Line to Metadata**
   - Example: "Search mode: Contiguous blocks" or "Search mode: Duration-based (30 min)"
   - Pros: Consistent with existing metadata structure, clear and explicit
   - Cons: Adds visual clutter for information user already selected

2. **Modify Heading**
   - Example: "Search Results - Contiguous Blocks" or "Search Results - Duration-Based"
   - Pros: Prominent, minimal space, clear hierarchy
   - Cons: Heading becomes longer, may wrap on mobile

3. **Subtle Indicator Badge**
   - Example: Small colored badge next to heading
   - Pros: Visually compact, modern appearance
   - Cons: Requires new color, violates disciplined color palette principle

### Decision

**Add mode description to metadata section with conditional phrasing**

**Implementation**:
```javascript
// Build mode description text
var modeText = '';
if (searchMode === 'contiguous') {
  modeText = '<br>Mode: Contiguous availability blocks';
} else {
  modeText = '<br>Mode: Duration-based slots' + (minDuration > 15 ? ' (' + minDuration + ' min)' : '');
}

var metadataHtml = '<p><strong>Search Results</strong></p>' +
  '<p class="text-muted" style="font-size: 0.875rem;">' +
  'Date range: ' + formatDate(new Date(metadata.dateRange.start)) + ' - ' + formatDate(new Date(metadata.dateRange.end)) + modeText + '<br>' +
  'Working days: ' + metadata.workingDaysCount + '<br>' +
  'Available slots: ' + metadata.totalSlotsFound +
  '</p>';
```

**Rationale**:
- Integrates seamlessly with existing metadata structure
- Uses existing muted text style (no new colors or typography)
- Conditional phrasing reduces redundancy ("30 min" not repeated if already shown as mode)
- Immediately visible when viewing results (meets SC-004: 90% user understanding)
- Mobile-friendly (text wraps naturally)

**Alternative for User Story 3 (P2: Compare modes)**:
- Add button group below metadata: `[Switch to Duration-based] [Switch to Contiguous blocks]`
- Active mode button disabled and styled with neutral background
- Clicking inactive button clears results, updates mode, shows search form
- Implementation deferred to tasks.md (Priority P2)

---

## Summary of Technical Decisions

| Decision Area | Chosen Approach | Key Rationale |
|---------------|-----------------|---------------|
| Mode Selection UI | Radio buttons with descriptive labels | Accessibility, progressive disclosure, standard HTML semantics |
| Service Extension | Separate calculateContiguousAvailability() function | Minimizes risk to existing feature, clearer separation of concerns |
| Session Storage | Add `availability_searchMode` key (default: "duration") | Consistent with existing pattern, backward compatible |
| Results Display | Add mode text to metadata section | Integrates with existing layout, no new visual elements |

## Implementation Readiness

✅ All technical unknowns resolved
✅ Decisions align with constitution principles (minimalism, typography, color discipline)
✅ Backward compatibility maintained for existing duration-based feature
✅ No new dependencies or external libraries required

**Status**: Ready to proceed to Phase 1 (Data Model & Contracts)
