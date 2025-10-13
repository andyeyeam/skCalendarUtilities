# Contract: Clipboard API Integration

**Feature**: [spec.md](../spec.md) | **Plan**: [plan.md](../plan.md) | **Data Model**: [data-model.md](../data-model.md)
**Created**: 2025-01-12
**Status**: Complete ✅

## Overview

This contract defines the interface and behavior for clipboard copy operations in the availability feature, including success/error handling, fallback mechanisms, and user feedback patterns.

---

## 1. Browser Clipboard API

### API Signature

```javascript
navigator.clipboard.writeText(text: string): Promise<void>
```

**Parameters**:
- `text` (string): Plain text to write to system clipboard

**Returns**:
- `Promise<void>`: Resolves on success, rejects on error

**Browser Support**:
- Chrome 63+ (Dec 2017)
- Firefox 53+ (April 2017)
- Safari 13.1+ (March 2020)
- Edge 79+ (Jan 2020)

**Requirements**:
- **Secure Context**: Must be HTTPS or localhost
- **User Gesture**: Must be triggered by user interaction (e.g., button click)
- **Permissions**: Defaults to `self` (same-origin), no additional config needed

---

## 2. copyToClipboard() Function Contract

### Function Signature

```javascript
/**
 * Copy text to clipboard with automatic fallback for errors
 * @param {string} text - The text to copy to clipboard
 * @param {function} onSuccess - Success callback (no parameters)
 * @param {function(string)} onError - Error callback with text for fallback
 */
function copyToClipboard(text, onSuccess, onError)
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | Plain text to copy to clipboard |
| `onSuccess` | function | No | Callback invoked on successful copy (no parameters) |
| `onError` | function | No | Callback invoked on error, receives `text` parameter for fallback |

### Behavior

**Success Path**:
1. Check if `navigator.clipboard.writeText` is available
2. Call `navigator.clipboard.writeText(text)`
3. On promise resolution, invoke `onSuccess()` callback
4. User sees success message for 3 seconds

**Error Path**:
1. If clipboard API unavailable OR promise rejected:
2. Log error to console
3. Invoke `onError(text)` callback with original text
4. Fallback modal displays for manual copy

**Guarantee**: Either clipboard succeeds OR fallback modal is shown. No silent failures.

### Error Scenarios

| Scenario | Detection | Behavior |
|----------|-----------|----------|
| API not available | `!navigator.clipboard` | Immediate fallback (no API call) |
| Permission denied | Promise rejection | Fallback modal with error context |
| Browser policy block | Promise rejection | Fallback modal |
| Insecure context (HTTP) | Promise rejection | Fallback modal |
| Empty text | Parameter validation | Show error message (no copy attempt) |

### Example Usage

```javascript
var formattedText = "Monday, Jan 15: 9:00 AM - 10:00 AM (60 min)";

copyToClipboard(
  formattedText,
  function() {
    // Success callback
    showMessage('Copied to clipboard', 'success');
  },
  function(text) {
    // Error callback - show fallback
    showFallbackModal(text);
  }
);
```

---

## 3. showFallbackModal() Function Contract

### Function Signature

```javascript
/**
 * Show fallback modal for manual clipboard copy
 * @param {string} text - The text to display for manual copying
 */
function showFallbackModal(text)
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `text` | string | Yes | Text to display in textarea for manual copy |

### Behavior

**Modal Creation**:
1. Create fixed-position overlay (`z-index: 1000`)
2. Create modal content card with:
   - Title: "Copy to Clipboard"
   - Instructions: "Please select the text below and copy it manually (Ctrl+C or Cmd+C):"
   - Readonly textarea containing `text`
   - Close button
3. Append modal to document.body
4. Auto-select textarea text after 100ms delay
5. Focus textarea

**User Interactions**:
- **Close button**: Removes modal from DOM
- **Backdrop click**: Removes modal from DOM
- **Text selection**: User selects and copies (Ctrl+C / Cmd+C)

**Modal Lifecycle**:
1. Created on demand (not pre-rendered)
2. Removed from DOM when closed (not hidden)
3. Only one modal can exist at a time (ID: `clipboardFallbackModal`)

### DOM Structure

```html
<div id="clipboardFallbackModal" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000;">
  <div class="card" style="max-width: 500px; width: 90%;">
    <h3 style="margin-top: 0;">Copy to Clipboard</h3>
    <p class="text-muted">Please select the text below and copy it manually (Ctrl+C or Cmd+C):</p>
    <textarea readonly style="width: 100%; height: 150px; font-family: inherit; font-size: 0.875rem; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; resize: vertical;">
      <!-- Text content here -->
    </textarea>
    <button class="button" style="margin-top: 1rem;" onclick="...">Close</button>
  </div>
</div>
```

### Styling Requirements

- **Overlay**: Semi-transparent black backdrop (rgba(0,0,0,0.5))
- **Card**: Inherits existing `.card` class styles from Styles.html
- **Textarea**: Readonly, resizable vertically, matches typography
- **Button**: Inherits existing `.button` class styles

### Example Usage

```javascript
var textToCopy = "Monday, Jan 15: 9:00 AM - 10:00 AM (60 min)\nTuesday, Jan 16: 11:00 AM - 12:00 PM (60 min)";

showFallbackModal(textToCopy);
// User sees modal, text is auto-selected, user manually copies
```

---

## 4. handleCopySelected() Function Contract

### Function Signature

```javascript
/**
 * Handle copy selected slots button click
 * Validates selection, formats text, and initiates clipboard copy
 */
function handleCopySelected()
```

### Parameters

None (accesses global state via SelectionManager)

### Behavior

**Validation Phase**:
1. Get selected slot IDs from SelectionManager
2. If no slots selected:
   - Show error message: "Please select at least one slot to copy"
   - Return early (no copy operation)

**Data Retrieval Phase**:
3. Get slot data objects for selected IDs
4. Filter out any invalid/missing slots

**Formatting Phase**:
5. Call `formatSlotsForClipboard(selectedSlots)`
6. Receive formatted plain text string

**Clipboard Phase**:
7. Call `copyToClipboard(formattedText, onSuccess, onError)`
8. On success: Show success message "Copied N slot(s) to clipboard" (3-second auto-dismiss)
9. On error: Show fallback modal with formatted text

### Success Message Format

```
"Copied {count} slot(s) to clipboard"
```

Examples:
- "Copied 1 slot(s) to clipboard"
- "Copied 5 slot(s) to clipboard"

### Error Messages

| Scenario | Message |
|----------|---------|
| No slots selected | "Please select at least one slot to copy" |
| Clipboard API failure | (No message - fallback modal shown instead) |

### Example Flow

```javascript
function handleCopySelected() {
  // 1. Validation
  var selectedIds = SelectionManager.getSelected();

  if (selectedIds.length === 0) {
    showMessage('Please select at least one slot to copy', 'error');
    return;
  }

  // 2. Data retrieval
  var selectedSlots = getSlotDataByIds(selectedIds);

  // 3. Formatting
  var formattedText = formatSlotsForClipboard(selectedSlots);

  // 4. Clipboard operation
  copyToClipboard(
    formattedText,
    function() {
      showMessage('Copied ' + selectedIds.length + ' slot(s) to clipboard', 'success');
    },
    function(text) {
      showFallbackModal(text);
    }
  );
}
```

---

## 5. showMessage() Function Contract (Existing)

### Function Signature

```javascript
/**
 * Show success/error/info message with auto-dismiss
 * @param {string} message - Message text to display
 * @param {string} type - Message type: 'success', 'error', or 'info'
 */
function showMessage(message, type)
```

### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `message` | string | Yes | Message text to display |
| `type` | string | Yes | Message type: `'success'`, `'error'`, or `'info'` |

### Behavior

**Display**:
1. Set text content of `#errorMessage` div to `message`
2. Set class to `message {type}` (e.g., `message success`)
3. Remove `hidden` class to show message

**Auto-dismiss**:
- **Success**: 3000ms (3 seconds) - per FR-007
- **Error**: 5000ms (5 seconds) - existing behavior
- **Info**: 3000ms (3 seconds)

**CSS Classes**:
- `message`: Base message styling
- `success`: Green background/text (existing in Styles.html)
- `error`: Red background/text (existing in Styles.html)
- `info`: Blue background/text (if needed)

### Example Usage

```javascript
// Success message
showMessage('Copied 5 slot(s) to clipboard', 'success');
// Displays for 3 seconds

// Error message
showMessage('Please select at least one slot to copy', 'error');
// Displays for 5 seconds
```

---

## 6. Integration Contract

### Event Flow

```
User clicks "Copy Selected" button
  ↓
handleCopySelected() called
  ↓
Validate selection (SelectionManager.getSelected())
  ↓
  ├─ No slots → Show error message → END
  └─ Slots selected → Continue
     ↓
Retrieve slot data (getSlotDataByIds())
     ↓
Format text (formatSlotsForClipboard())
     ↓
Copy to clipboard (copyToClipboard())
     ↓
     ├─ SUCCESS → showMessage("Copied N slot(s)...", "success") → END
     └─ ERROR → showFallbackModal(text) → User manually copies → END
```

### Timing Guarantees

| Operation | Max Duration | Requirement |
|-----------|--------------|-------------|
| Clipboard write | 1000ms | SC-004: <1s for 50 slots |
| Format text | 100ms | Internal target |
| Show success message | 3000ms display | FR-007: 3-second auto-dismiss |
| Show fallback modal | <100ms | Instant user feedback |

### Success Criteria Validation

**SC-001**: Users can select and copy availability slots in under 10 seconds
- ✅ Click checkboxes (<2s) + Click copy button (<1s) + Clipboard operation (<1s) = ~4s total

**SC-002**: Copied text requires no manual reformatting
- ✅ `formatSlotsForClipboard()` produces final format per spec

**SC-003**: 90% of users successfully copy on first attempt
- ✅ Fallback modal ensures 100% success rate (manual copy if API fails)

**SC-004**: Clipboard operation completes within 1 second for 50 slots
- ✅ Research shows <50ms formatting + <50ms clipboard write = <100ms total

**SC-005**: Text is readable and professional when pasted
- ✅ Format validated in research.md with cross-platform testing

---

## 7. Error Handling Contract

### Error Hierarchy

1. **Validation Errors** (user-correctable):
   - No slots selected
   - → Show error message
   - → User selects slots and retries

2. **Clipboard API Errors** (system/browser-level):
   - API not available
   - Permission denied
   - Browser policy blocks
   - → Show fallback modal (always succeeds)

### Error Recovery

**All errors are recoverable**:
- Validation errors: User corrects and retries
- Clipboard errors: Fallback modal provides manual copy option

**No silent failures**:
- Every error produces visible feedback
- User always knows next action to take

### Logging Contract

**Console Logging**:
```javascript
// Success
console.log('Clipboard copy successful');

// API failure
console.error('Clipboard API failed:', error);

// API unavailable
console.warn('Clipboard API not available');

// Validation failure
console.log('Copy validation failed: no slots selected');
```

**User-Facing Messages**: Only validation errors show inline messages. Clipboard errors show fallback modal (no error message needed).

---

## 8. Performance Contract

### Benchmarks (from research.md)

| Operation | Target | Measured | Status |
|-----------|--------|----------|--------|
| formatSlotsForClipboard() (50 slots) | <100ms | <50ms | ✅ Pass |
| Clipboard API write | <1000ms | <50ms | ✅ Pass |
| Show fallback modal | <100ms | <10ms | ✅ Pass |
| Show success message | <100ms | <5ms | ✅ Pass |

### Memory Usage

| Resource | Usage | Limit |
|----------|-------|-------|
| Session storage | ~1.35 KB (50 slots) | 5-10 MB |
| Clipboard text | ~5 KB (50 slots) | No practical limit |
| Modal DOM | ~2 KB | N/A |

**Total memory impact**: <10 KB (negligible)

---

## 9. Testing Contract

### Unit Test Cases

**copyToClipboard()**:
1. ✅ Success: API available, write succeeds → onSuccess called
2. ✅ Error: API available, write fails → onError called with text
3. ✅ Error: API not available → onError called immediately
4. ✅ Empty text: No callbacks called (or validation error)

**showFallbackModal()**:
1. ✅ Modal created and appended to DOM
2. ✅ Textarea contains correct text
3. ✅ Text is auto-selected after 100ms
4. ✅ Close button removes modal
5. ✅ Backdrop click removes modal

**handleCopySelected()**:
1. ✅ No selection: Error message shown
2. ✅ Valid selection: Clipboard operation initiated
3. ✅ Success: Success message shown
4. ✅ Failure: Fallback modal shown

### Integration Test Cases

1. ✅ Select slots → Click copy → Success message → Paste in external app (correct format)
2. ✅ Select slots → Click copy (clipboard blocked) → Fallback modal → Manual copy → Paste (correct format)
3. ✅ Click copy (no selection) → Error message → Select slots → Click copy → Success

### Browser Compatibility Testing

Test in:
- ✅ Chrome 63+ (Windows, macOS)
- ✅ Firefox 53+ (Windows, macOS)
- ✅ Safari 13.1+ (macOS)
- ✅ Edge 79+ (Windows)

Verify:
- Clipboard API works or fallback modal appears
- Text format preserved when pasted into: Outlook, Gmail, Notepad, TextEdit, Slack, Teams

---

## 10. Security Contract

### Data Sanitization

**No user input in clipboard text**:
- All data comes from server (trusted source)
- Slot data is generated by AvailabilityService.gs (no user input)
- Selection state only stores slot IDs (deterministic, generated internally)

**XSS Prevention**:
- Textarea content is plain text (no HTML injection risk)
- Modal uses inline styles (no CSS injection)
- Event handlers use `onclick` attributes (scoped to function calls)

### Privacy

**No data transmission**:
- Clipboard operation is browser-local (no network requests)
- Session storage is browser-local
- No external services used

**Data Persistence**:
- Selection state: Cleared when browser tab closed
- Clipboard text: Managed by OS (outside app control)

### Permissions

**No additional permissions required**:
- Clipboard API uses default permissions policy (`self`)
- User gesture (button click) satisfies security requirements
- HTTPS context provided by Google Apps Script HTML Service

---

## Summary

All clipboard operations defined with:
- **Clear contracts** for function signatures and behavior
- **Error handling** with guaranteed fallback for 100% success rate
- **Performance benchmarks** validated against success criteria
- **Security guarantees** (no user input, no external services)
- **Testing requirements** for unit and integration validation

**Implementation**: All contracts can be implemented in `src/ui/Availability.html` (client-side only, no server changes needed).

**Next**: Create quickstart implementation guide in `quickstart.md`
