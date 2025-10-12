# Research: Calendar Utilities Application

**Feature**: 001-build-an-embedded
**Date**: 2025-10-11
**Phase**: 0 - Technical Research

## Overview

This document captures research findings and technical decisions for implementing a Google Apps Script calendar utilities application with simplified OAuth authorization and Google Sites embedding.

## Key Research Areas

### 1. OAuth Authorization Persistence in Apps Script

**Decision**: Use Apps Script's built-in OAuth2 scopes with one-time authorization

**Rationale**:
- Apps Script automatically handles OAuth token persistence after initial authorization
- Once user grants permissions, tokens are stored and refreshed automatically by the platform
- No custom token storage or refresh logic needed
- Scopes are declared in `appsscript.json` manifest file

**Implementation Approach**:
```javascript
// appsscript.json manifest
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request"
  ]
}
```

**Authorization Flow**:
1. User accesses web app URL for first time
2. Apps Script prompts for OAuth consent (one-time)
3. User grants permissions
4. Platform stores and manages tokens indefinitely
5. Subsequent access uses stored credentials automatically

**Alternatives Considered**:
- Custom OAuth2 library: Rejected - unnecessary complexity, reinvents platform capability
- Service accounts: Rejected - requires domain-wide delegation, not suitable for user-specific calendar access

### 2. Google Sites Embedding Strategy

**Decision**: Deploy as standalone Apps Script web app, embed via iframe in Google Sites

**Rationale**:
- Simplest deployment model - single web app URL
- iframe embedding supported by Google Sites (Insert > Embed URL)
- Avoids Apps Script add-on complexity (sidebar/dialog UIs)
- Enables full-screen utility display within page context

**Implementation Approach**:
```javascript
// Code.gs - doGet() serves HTML
function doGet() {
  return HtmlService.createTemplateFromFile('ui/Menu')
    .evaluate()
    .setTitle('Calendar Utilities')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL); // Enable iframe embedding
}
```

**Embedding in Google Sites**:
1. Deploy Apps Script project as web app (Anyone with link access)
2. Copy web app URL
3. In Google Sites: Insert > Embed URL
4. Paste web app URL
5. Adjust iframe dimensions as needed

**Alternatives Considered**:
- Apps Script add-on: Rejected - complex publishing process, sidebar UX doesn't match requirement
- Custom domain hosting: Rejected - violates constitution (no external hosting)

### 3. Google Sheets Data Schema Management

**Decision**: Use columnar schema with programmatic initialization and batch operations

**Rationale**:
- Sheets API supports batch getValue/setValue operations for performance
- Columnar structure (headers + data rows) is human-readable
- Programmatic schema ensures consistency across deployments
- Named ranges enable reliable column access

**Schema Design**:
```
Sheet: "Config"
Columns: Setting | Value | Description
Row 1: selectedCalendarId | <calendar-id> | Active calendar for utilities
Row 2: lastSync | <timestamp> | Last successful operation timestamp
Row 3: theme | light | UI theme preference

Sheet: "BulkOpQueue"
Columns: Timestamp | OperationType | Criteria | Status | EventsAffected
```

**Implementation Pattern**:
```javascript
function initializeConfigSheet() {
  const ss = SpreadsheetApp.openById(getConfigSheetId());
  let sheet = ss.getSheetByName('Config');

  if (!sheet) {
    sheet = ss.insertSheet('Config');
    sheet.getRange(1, 1, 1, 3).setValues([['Setting', 'Value', 'Description']]);
    sheet.setFrozenRows(1);
  }

  // Batch write default config if empty
  if (sheet.getLastRow() === 1) {
    const defaults = [
      ['selectedCalendarId', 'primary', 'Active calendar'],
      ['lastSync', new Date().toISOString(), 'Last sync'],
      ['theme', 'light', 'UI theme']
    ];
    sheet.getRange(2, 1, defaults.length, 3).setValues(defaults);
  }
}
```

**Alternatives Considered**:
- Key-value pairs in Script Properties: Rejected - not human-readable, limited to 9KB per property
- JSON blob in single cell: Rejected - difficult to manually inspect/edit

### 4. Calendar API Rate Limiting and Quota Management

**Decision**: Implement operation queue with progress tracking and exponential backoff

**Rationale**:
- Apps Script Calendar API quota: 20,000 calls/day (generous for typical usage)
- Batch operations can hit rate limits during large bulk ops
- Queue + progress indicator provides transparency (matches clarification decision)
- Exponential backoff prevents quota exhaustion errors

**Implementation Strategy**:
```javascript
class OperationQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.batchSize = 100; // Process 100 events per batch
    this.delayMs = 100;   // 100ms between batches
  }

  async processQueue(progressCallback) {
    while (this.queue.length > 0) {
      const batch = this.queue.splice(0, this.batchSize);

      try {
        await this.executeBatch(batch);
        progressCallback(this.getTotalProcessed(), this.getTotalRemaining());
      } catch (error) {
        if (error.message.includes('Rate limit')) {
          // Exponential backoff
          this.delayMs *= 2;
          this.queue.unshift(...batch); // Re-queue failed batch
        } else {
          throw error;
        }
      }

      Utilities.sleep(this.delayMs);
    }
  }
}
```

**Quota Monitoring**:
- Log API call counts to sheet for visibility
- Display quota usage in UI (optional future enhancement)

**Alternatives Considered**:
- No queue (fail fast): Rejected - poor UX for large operations
- Third-party queue service: Rejected - adds external dependency, violates constitution

### 5. Duplicate Detection Algorithm

**Decision**: Use title + start time exact match (confirmed in clarifications)

**Rationale**:
- Simple comparison, fast execution
- Minimizes false positives (matches user expectation)
- No fuzzy matching complexity needed initially

**Implementation Approach**:
```javascript
function findDuplicates(events) {
  const seen = new Map(); // key: "title|startTime", value: [events]
  const duplicates = [];

  events.forEach(event => {
    const key = `${event.getTitle()}|${event.getStartTime().getTime()}`;

    if (seen.has(key)) {
      seen.get(key).push(event);
    } else {
      seen.set(key, [event]);
    }
  });

  seen.forEach((eventList, key) => {
    if (eventList.length > 1) {
      duplicates.push({ key, events: eventList });
    }
  });

  return duplicates;
}
```

**Edge Cases**:
- Events with identical titles at different times: Not flagged (correct)
- Recurring events: Each instance treated separately (acceptable)

### 6. Analytics Table Generation

**Decision**: Server-side computation with HTML table rendering (confirmed in clarifications)

**Rationale**:
- No charting library needed (simple tables)
- Fast rendering for 100+ events
- Accessible, works in all browsers
- Aligns with modern minimalist design (no visual clutter)

**Metrics to Compute**:
```javascript
function computeAnalytics(events, startDate, endDate) {
  const analytics = {
    totalEvents: events.length,
    totalHours: 0,
    byCategory: {}, // { categoryName: { count, hours } }
    byDay: {},       // { dayName: count }
    busiestDay: null,
    mostFrequentType: null
  };

  events.forEach(event => {
    const duration = (event.getEndTime() - event.getStartTime()) / (1000 * 60 * 60);
    analytics.totalHours += duration;

    // Categorize by color/calendar
    const category = event.getColor() || 'default';
    if (!analytics.byCategory[category]) {
      analytics.byCategory[category] = { count: 0, hours: 0 };
    }
    analytics.byCategory[category].count++;
    analytics.byCategory[category].hours += duration;

    // Count by day of week
    const day = event.getStartTime().toLocaleDateString('en-US', { weekday: 'long' });
    analytics.byDay[day] = (analytics.byDay[day] || 0) + 1;
  });

  return analytics;
}
```

**Table Rendering**:
- Server generates HTML table
- Client-side displays with CSS styling (typography, spacing)

### 7. UI State Management (Full-Screen Utility Display)

**Decision**: Use HTML Service with client-side navigation via `google.script.run`

**Rationale**:
- Full-screen utility display confirmed in clarifications
- Apps Script supports multi-page navigation through template switching
- Back button triggers server-side function to reload menu

**Navigation Pattern**:
```javascript
// Client-side (Menu.html)
function navigateToUtility(utilityName) {
  google.script.run
    .withSuccessHandler(displayUtility)
    .loadUtility(utilityName);
}

function displayUtility(html) {
  document.body.innerHTML = html;
}

// Server-side (Code.gs)
function loadUtility(utilityName) {
  const template = HtmlService.createTemplateFromFile(`ui/${utilityName}`);
  return template.evaluate().getContent();
}
```

**Back Navigation**:
```javascript
// Client-side (in each utility HTML)
function backToMenu() {
  google.script.run
    .withSuccessHandler(displayMenu)
    .loadMenu();
}
```

## Best Practices Summary

### Apps Script Development
- Use `clasp` for local development and version control
- Enable V8 runtime for modern JavaScript (ES6+)
- Use Apps Script Logger for debugging (`Logger.log()`)
- Test OAuth flows in incognito mode to simulate first-run

### Performance Optimization
- Batch Calendar API calls (fetch events in date ranges, not one-by-one)
- Cache calendar list in user properties (avoid repeated fetches)
- Use `SpreadsheetApp.flush()` to ensure sheet writes complete
- Minimize HTML Service round-trips with `google.script.run`

### Security & Privacy
- Declare minimal OAuth scopes needed (calendar + sheets only)
- Never log sensitive user data
- Validate all user inputs before processing
- Use `HtmlService.createTemplate()` for safe HTML rendering (auto-escapes)

### Deployment Checklist
1. Set OAuth scopes in `appsscript.json`
2. Deploy as web app: Execute as "User accessing the web app"
3. Share with "Anyone with the link"
4. Test authorization flow in incognito
5. Embed URL in Google Sites
6. Verify iframe functionality

## Unresolved Items

*None - all technical decisions finalized*

## References

- [Apps Script OAuth Scopes](https://developers.google.com/apps-script/guides/services/authorization)
- [HTML Service Best Practices](https://developers.google.com/apps-script/guides/html/best-practices)
- [Calendar API Quotas](https://developers.google.com/calendar/api/guides/quota)
- [Sheets API Batch Operations](https://developers.google.com/apps-script/reference/spreadsheet/range#getvalues)
