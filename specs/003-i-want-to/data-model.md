# Data Model: Copy Available Slots to Clipboard

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Research**: [research.md](./research.md)
**Created**: 2025-01-12
**Status**: Complete ✅

## Overview

This document defines all data structures for the clipboard copy feature, including selection state storage, slot identification, and clipboard content formatting.

---

## 1. Selection State

### SelectionState Object

**Storage Location**: Session Storage (key: `availability_selectedSlots`)

**Structure**:
```typescript
{
  [slotId: string]: boolean
}
```

**Example**:
```json
{
  "2025-01-15_09:00 AM": true,
  "2025-01-15_02:00 PM": true,
  "2025-01-16_11:00 AM": true
}
```

**Properties**:
- **Key**: Slot identifier string (format: `${date}_${formattedStart}`)
- **Value**: Boolean `true` (selected). Unselected slots are removed from object (not stored as `false`)

**Rationale**:
- Object map provides O(1) lookup performance
- Only storing `true` values minimizes storage size
- Omitting `false` values simplifies deselectAll operation (empty object)

**Size Estimation**:
- Average slot ID length: 22 characters ("2025-01-15_09:00 AM")
- JSON overhead per entry: ~5 characters (`"key":true,`)
- 50 slots ≈ 1,350 bytes (well under 5MB session storage limit)

---

## 2. Slot Identifier

### SlotId String

**Format**: `${date}_${formattedStart}`

**Components**:
- `date`: ISO 8601 date string (YYYY-MM-DD)
- `formattedStart`: 12-hour time format with AM/PM

**Examples**:
- `"2025-01-15_09:00 AM"`
- `"2025-01-15_02:00 PM"`
- `"2025-01-16_11:30 AM"`

**Generation Function**:
```javascript
/**
 * Generate unique identifier for a slot
 * @param {Object} slot - Slot object from server
 * @returns {string} Unique slot identifier
 */
function getSlotId(slot) {
  return slot.date + '_' + slot.formattedStart;
}
```

**Properties**:
- **Deterministic**: Same slot always produces same ID
- **Unique**: Date + start time combination is unique within availability results
- **Human-readable**: Easy to debug in session storage inspector
- **Persistent**: Survives page refresh (server provides same data format)

**Collision Prevention**:
- Time slots cannot overlap on the same date (enforced by availability search logic)
- Different dates ensure uniqueness across days

---

## 3. Slot Data Object (Existing)

### TimeSlot Object

**Source**: Server response from `findAvailability()` function

**Structure**:
```typescript
{
  date: string,              // ISO 8601 date (YYYY-MM-DD)
  formattedStart: string,    // 12-hour time with AM/PM (e.g., "09:00 AM")
  formattedEnd: string,      // 12-hour time with AM/PM (e.g., "10:00 AM")
  formattedDuration: string, // Duration string (e.g., "60 min")
  durationMinutes: number    // Duration in minutes (e.g., 60)
}
```

**Example**:
```json
{
  "date": "2025-01-15",
  "formattedStart": "09:00 AM",
  "formattedEnd": "10:00 AM",
  "formattedDuration": "60 min",
  "durationMinutes": 60
}
```

**Notes**:
- This is the **existing** data structure from Availability.html (no changes required)
- Server-side formatting already provides all needed fields
- `formattedDuration` already includes " min" suffix

---

## 4. Clipboard Content

### ClipboardText String

**Format**: Plain text with newline-separated dates

**Structure**:
```
DayOfWeek, Month Day: Time1 - Time1 (Duration1), Time2 - Time2 (Duration2)
DayOfWeek, Month Day: Time3 - Time3 (Duration3)
```

**Example**:
```
Monday, Jan 15: 9:00 AM - 10:00 AM (60 min), 2:00 PM - 3:00 PM (60 min)
Tuesday, Jan 16: 11:00 AM - 12:00 PM (60 min)
Wednesday, Jan 17: 9:00 AM - 10:00 AM (60 min), 3:00 PM - 4:00 PM (60 min)
```

**Formatting Rules**:
1. **Date Header**: `DayOfWeek, Month Day`
   - Day of week: Full name (e.g., "Monday")
   - Month: Abbreviated 3-letter (e.g., "Jan")
   - Day: Numeric without leading zero (e.g., "15")
2. **Time Slots**: `StartTime - EndTime (Duration)`
   - Times: 12-hour format with AM/PM (e.g., "9:00 AM")
   - Duration: Minutes with " min" suffix (e.g., "60 min")
3. **Separators**:
   - Multiple slots on same date: `, ` (comma + space)
   - Different dates: `\n` (newline character)
4. **Sorting**:
   - Dates: Chronological order
   - Times within date: Chronological order

**Character Encoding**: UTF-8

**Newline Convention**: `\n` (LF) - cross-platform compatible

---

## 5. Grouped Slots Structure

### GroupedSlots Object

**Purpose**: Intermediate data structure for organizing slots by date before formatting

**Structure**:
```typescript
{
  [dateString: string]: TimeSlot[]
}
```

**Example**:
```json
{
  "2025-01-15": [
    {
      "date": "2025-01-15",
      "formattedStart": "09:00 AM",
      "formattedEnd": "10:00 AM",
      "formattedDuration": "60 min",
      "durationMinutes": 60
    },
    {
      "date": "2025-01-15",
      "formattedStart": "02:00 PM",
      "formattedEnd": "03:00 PM",
      "formattedDuration": "60 min",
      "durationMinutes": 60
    }
  ],
  "2025-01-16": [
    {
      "date": "2025-01-16",
      "formattedStart": "11:00 AM",
      "formattedEnd": "12:00 PM",
      "formattedDuration": "60 min",
      "durationMinutes": 60
    }
  ]
}
```

**Usage**: Created by `formatSlotsForClipboard()` function to group and sort slots before text generation

---

## 6. UI State

### UI Control States

**Selection Controls**:
```typescript
{
  selectedCount: number,        // Number of selected slots
  allSelected: boolean,         // True if all slots are selected
  toggleButtonText: string      // "Select All" or "Deselect All"
}
```

**Copy Button State**:
```typescript
{
  disabled: boolean,            // True if no slots selected
  visible: boolean              // True if results are displayed
}
```

**Message State**:
```typescript
{
  text: string,                 // Message content
  type: "success" | "error",    // Message type
  visible: boolean,             // True if message shown
  autoDismiss: number           // Milliseconds until auto-hide (3000 for success)
}
```

---

## 7. Fallback Modal Structure

### FallbackModal HTML Structure

**DOM Structure**:
```html
<div id="clipboardFallbackModal" style="position: fixed; ...">
  <div class="card" style="max-width: 500px; ...">
    <h3>Copy to Clipboard</h3>
    <p class="text-muted">Please select the text below and copy it manually (Ctrl+C or Cmd+C):</p>
    <textarea readonly style="width: 100%; height: 150px; ...">
      <!-- Formatted clipboard text here -->
    </textarea>
    <button class="button" onclick="...">Close</button>
  </div>
</div>
```

**Modal State**:
```typescript
{
  visible: boolean,             // True if modal is shown
  text: string,                 // Text to display in textarea
  textSelected: boolean         // True if textarea text is selected
}
```

---

## 8. Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ SERVER (Google Apps Script)                                     │
│ findAvailability() returns Array<TimeSlot>                      │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ CLIENT: displayResults()                                         │
│ - Receives slots from server                                    │
│ - Groups by date                                                │
│ - Renders checkboxes with slot IDs                              │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ USER INTERACTION: Checkbox Click                                │
│ handleSlotToggle(checkbox)                                       │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ SESSION STORAGE: SelectionManager                               │
│ - toggle(slotId) → updates SelectionState object                │
│ - save() → sessionStorage.setItem('availability_selectedSlots') │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ UI UPDATE: Visual Feedback                                      │
│ - Add/remove 'selected' class                                   │
│ - Update selected count display                                 │
│ - Enable/disable copy button                                    │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ USER INTERACTION: Copy Button Click                             │
│ handleCopySelected()                                             │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ DATA RETRIEVAL                                                   │
│ - getSelected() → Array<slotId>                                 │
│ - getSlotDataByIds() → Array<TimeSlot>                          │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ FORMATTING                                                       │
│ formatSlotsForClipboard(slots)                                   │
│ - Group by date → GroupedSlots                                  │
│ - Sort dates and times                                          │
│ - Format to ClipboardText string                                │
└────────────────────┬────────────────────────────────────────────┘
                     │
                     v
┌─────────────────────────────────────────────────────────────────┐
│ CLIPBOARD OPERATION                                              │
│ copyToClipboard(text, onSuccess, onError)                        │
└────────────┬──────────────────────┬─────────────────────────────┘
             │                      │
             │ SUCCESS              │ ERROR
             v                      v
┌────────────────────┐  ┌─────────────────────────────────────────┐
│ SUCCESS MESSAGE    │  │ FALLBACK MODAL                          │
│ 3-second display   │  │ showFallbackModal(text)                 │
│                    │  │ - Display textarea with text            │
│                    │  │ - Auto-select text                      │
│                    │  │ - User manually copies                  │
└────────────────────┘  └─────────────────────────────────────────┘
```

---

## 9. Storage Limits and Constraints

### Session Storage

**Limits**:
- **Capacity**: 5-10 MB per origin (browser-dependent)
- **Scope**: Current browser tab/window only
- **Lifetime**: Cleared when tab/window closes
- **Access**: JavaScript only (same-origin)

**Our Usage**:
- **Estimated Size**: 1.35 KB for 50 slots
- **Usage Percentage**: <0.03% of minimum capacity
- **Safety Margin**: 3,700x headroom

**Constraint Handling**:
- No special handling needed due to minimal usage
- If storage quota exceeded (edge case), SelectionManager gracefully fails with empty state

### Clipboard API

**Limits**:
- **Text Length**: No practical limit (tested up to 1 MB)
- **Format**: Plain text only (no rich text/HTML in this implementation)

**Our Usage**:
- **Estimated Size**: ~100 bytes per slot × 50 = 5 KB typical
- **Safety**: Well under any browser limit

---

## 10. Data Validation Rules

### SlotId Validation

**Format Rules**:
1. Must contain exactly one underscore separator
2. Date portion must be valid ISO 8601 date (YYYY-MM-DD)
3. Time portion must be valid 12-hour format with AM/PM

**Validation Function** (optional, for defensive programming):
```javascript
/**
 * Validate slot ID format
 * @param {string} slotId - Slot identifier to validate
 * @returns {boolean} True if valid
 */
function isValidSlotId(slotId) {
  if (typeof slotId !== 'string') return false;

  var parts = slotId.split('_');
  if (parts.length !== 2) return false;

  var date = parts[0];
  var time = parts[1];

  // Basic date format check (YYYY-MM-DD)
  var dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(date)) return false;

  // Basic time format check (HH:MM AM/PM)
  var timeRegex = /^\d{2}:\d{2} (AM|PM)$/;
  if (!timeRegex.test(time)) return false;

  return true;
}
```

**Note**: Validation is **optional** since slot IDs are generated internally (not user input). Include only if defensive programming is desired.

### SelectionState Validation

**Rules**:
1. Must be a plain object (not array, not null)
2. All values must be boolean `true` (no `false` values stored)
3. All keys must be valid slot IDs

**Validation** (on load from session storage):
```javascript
/**
 * Validate and sanitize selection state
 * @param {*} state - State loaded from session storage
 * @returns {Object} Valid selection state object
 */
function validateSelectionState(state) {
  if (typeof state !== 'object' || state === null || Array.isArray(state)) {
    return {};
  }

  var cleaned = {};
  for (var key in state) {
    if (state[key] === true && isValidSlotId(key)) {
      cleaned[key] = true;
    }
  }

  return cleaned;
}
```

**Note**: Currently not implemented in SelectionManager (trusts session storage). Add if corruption issues arise.

---

## 11. Data Transformation Examples

### Example 1: Single Date with Multiple Slots

**Input (SelectionState)**:
```json
{
  "2025-01-15_09:00 AM": true,
  "2025-01-15_02:00 PM": true
}
```

**Slot Data**:
```json
[
  {
    "date": "2025-01-15",
    "formattedStart": "09:00 AM",
    "formattedEnd": "10:00 AM",
    "formattedDuration": "60 min",
    "durationMinutes": 60
  },
  {
    "date": "2025-01-15",
    "formattedStart": "02:00 PM",
    "formattedEnd": "03:00 PM",
    "formattedDuration": "60 min",
    "durationMinutes": 60
  }
]
```

**Output (ClipboardText)**:
```
Monday, Jan 15: 9:00 AM - 10:00 AM (60 min), 2:00 PM - 3:00 PM (60 min)
```

---

### Example 2: Multiple Dates

**Input (SelectionState)**:
```json
{
  "2025-01-15_09:00 AM": true,
  "2025-01-16_11:00 AM": true,
  "2025-01-17_03:00 PM": true
}
```

**Slot Data**:
```json
[
  {
    "date": "2025-01-15",
    "formattedStart": "09:00 AM",
    "formattedEnd": "10:00 AM",
    "formattedDuration": "60 min",
    "durationMinutes": 60
  },
  {
    "date": "2025-01-16",
    "formattedStart": "11:00 AM",
    "formattedEnd": "12:00 PM",
    "formattedDuration": "60 min",
    "durationMinutes": 60
  },
  {
    "date": "2025-01-17",
    "formattedStart": "03:00 PM",
    "formattedEnd": "04:00 PM",
    "formattedDuration": "60 min",
    "durationMinutes": 60
  }
]
```

**Output (ClipboardText)**:
```
Monday, Jan 15: 9:00 AM - 10:00 AM (60 min)
Tuesday, Jan 16: 11:00 AM - 12:00 PM (60 min)
Wednesday, Jan 17: 3:00 PM - 4:00 PM (60 min)
```

---

### Example 3: Unsorted Selection

**Input (SelectionState)** - Unordered:
```json
{
  "2025-01-17_09:00 AM": true,
  "2025-01-15_02:00 PM": true,
  "2025-01-16_11:00 AM": true,
  "2025-01-15_09:00 AM": true
}
```

**Output (ClipboardText)** - Sorted chronologically:
```
Monday, Jan 15: 9:00 AM - 10:00 AM (60 min), 2:00 PM - 3:00 PM (60 min)
Tuesday, Jan 16: 11:00 AM - 12:00 PM (60 min)
Wednesday, Jan 17: 9:00 AM - 10:00 AM (60 min)
```

**Note**: `formatSlotsForClipboard()` always sorts by date and time, regardless of selection order.

---

## Summary

All data structures defined with:
- **Clear formats** for slot IDs, selection state, and clipboard content
- **Validation rules** for data integrity (optional defensive programming)
- **Transformation examples** showing input → output flows
- **Storage constraints** documented with safety margins
- **Performance characteristics** (O(1) lookups, minimal memory usage)

**Next**: Document contracts and API patterns in `contracts/clipboard-api.md`
