# Quickstart Guide: Calendar Utilities Application

**Feature**: 001-build-an-embedded
**Target Users**: Developers deploying the application
**Estimated Time**: 15-20 minutes

## Overview

This guide walks you through deploying the Calendar Utilities Application as a Google Apps Script web app and embedding it in Google Sites. After following these steps, you'll have a functioning calendar utilities interface accessible through your Google Sites page.

## Prerequisites

- Google Workspace account with Google Calendar access
- Google Sites page where you want to embed the application
- Basic familiarity with Google Apps Script (helpful but not required)

## Step 1: Create Apps Script Project

### Option A: Using Apps Script IDE (Beginner-Friendly)

1. Go to [script.google.com](https://script.google.com)
2. Click **New Project**
3. Rename project to "Calendar Utilities" (top-left corner)
4. Your project is created with a default `Code.gs` file

### Option B: Using clasp CLI (Advanced)

```bash
# Install clasp globally
npm install -g @google/clasp

# Login to Google account
clasp login

# Create new project
clasp create --title "Calendar Utilities" --type webapp

# Open in browser
clasp open
```

## Step 2: Configure OAuth Scopes

1. In Apps Script IDE, click the **gear icon** (Project Settings)
2. Check **"Show 'appsscript.json' manifest file in editor"**
3. Return to **Editor** tab
4. Open `appsscript.json` from file list
5. Replace contents with:

```json
{
  "timeZone": "America/New_York",
  "dependencies": {},
  "exceptionLogging": "STACKDRIVER",
  "runtimeVersion": "V8",
  "oauthScopes": [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/script.external_request"
  ],
  "webapp": {
    "executeAs": "USER_ACCESSING",
    "access": "ANYONE_ANONYMOUS"
  }
}
```

6. **Important**: Update `timeZone` to your local timezone (e.g., "America/Los_Angeles", "Europe/London")
7. Save the file (Ctrl+S or Cmd+S)

## Step 3: Add Source Code

Follow the implementation plan structure in `plan.md`. You'll create these files:

### File Structure

```
src/
├── Code.gs                      # Main entry point
├── ui/
│   ├── Menu.html
│   ├── BulkOps.html
│   ├── Analytics.html
│   ├── Cleanup.html
│   └── Styles.html
├── services/
│   ├── CalendarService.gs
│   ├── SheetService.gs
│   ├── BulkOpsService.gs
│   ├── AnalyticsService.gs
│   └── CleanupService.gs
├── models/
│   ├── Event.gs
│   ├── Config.gs
│   └── OperationQueue.gs
└── utils/
    ├── AuthUtils.gs
    ├── SheetUtils.gs
    └── Logger.gs
```

### Quick Start Files (Minimal MVP)

For initial testing, create these essential files:

**Code.gs** (Main Entry Point):
```javascript
function doGet(e) {
  const template = HtmlService.createTemplateFromFile('Menu');
  return template.evaluate()
    .setTitle('Calendar Utilities')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
```

**Menu.html** (Basic Menu):
```html
<!DOCTYPE html>
<html>
  <head>
    <base target="_top">
    <?!= include('Styles'); ?>
  </head>
  <body>
    <div class="container">
      <h1>Calendar Utilities</h1>
      <nav class="menu">
        <button onclick="navigateToUtility('BulkOps')">Bulk Operations</button>
        <button onclick="navigateToUtility('Analytics')">Analytics</button>
        <button onclick="navigateToUtility('Cleanup')">Cleanup</button>
      </nav>
    </div>

    <script>
      function navigateToUtility(name) {
        alert('Navigate to: ' + name); // TODO: Implement navigation
      }
    </script>
  </body>
</html>
```

**Styles.html** (Shared CSS):
```html
<style>
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Roboto", sans-serif;
    font-size: 16px;
    line-height: 1.5;
    color: #333333;
    background-color: #FFFFFF;
    margin: 0;
    padding: 1rem;
  }

  .container {
    max-width: 800px;
    margin: 0 auto;
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #333333;
    margin-bottom: 2rem;
  }

  .menu {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  button {
    background-color: #4285f4;
    color: white;
    border: none;
    border-radius: 6px;
    padding: 1rem;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  button:hover {
    background-color: #3367d6;
  }

  button:active {
    background-color: #2851a3;
  }
</style>
```

## Step 4: Deploy as Web App

1. In Apps Script IDE, click **Deploy** > **New deployment**
2. Click **gear icon** next to "Select type"
3. Choose **Web app**
4. Configure deployment:
   - **Description**: "Calendar Utilities v1"
   - **Execute as**: Me (your email)
   - **Who has access**: Anyone with the link
5. Click **Deploy**
6. **Authorize access**:
   - Click **Authorize access**
   - Select your Google account
   - Click **Advanced** (if warning appears)
   - Click **Go to Calendar Utilities (unsafe)** (this is safe for your own app)
   - Click **Allow** to grant permissions
7. **Copy the Web app URL** (looks like: `https://script.google.com/macros/s/.../exec`)
8. Click **Done**

## Step 5: First Run Setup (Data Sheet Creation)

1. Open the **Web app URL** in a new browser tab
2. You should see the Calendar Utilities menu
3. **Behind the scenes**, the app will:
   - Create a Google Sheet named "Calendar Utilities Config"
   - Initialize configuration with default values
   - Set up the bulk operation queue schema

**To verify setup**:
1. Go to [drive.google.com](https://drive.google.com)
2. Search for "Calendar Utilities Config"
3. Open the sheet - you should see "Config" and "BulkOpQueue" tabs
4. Verify default configuration is present

## Step 6: Embed in Google Sites

1. Go to your **Google Sites** page (sites.google.com)
2. Edit the page where you want to embed the app
3. Click **Insert** > **Embed URL**
4. Paste the **Web app URL** from Step 4
5. Click **Insert**
6. **Resize the embedded frame**:
   - Click the embedded frame
   - Drag corners to adjust size (recommended: 800px width, 600px height)
7. Click **Publish** to save changes

## Step 7: Test the Application

### Test 1: Menu Display
1. Visit your Google Sites page
2. Verify the Calendar Utilities menu appears in the iframe
3. Verify buttons are styled correctly (blue accent color, rounded corners)

### Test 2: Calendar Selection (Once Implemented)
1. Click a utility button (should show navigation or alert for now)
2. Verify no errors in browser console (F12 > Console)

### Test 3: OAuth Persistence
1. Close browser completely
2. Reopen Google Sites page
3. Verify app loads without re-authorization prompt

## Troubleshooting

### Issue: "Authorization Required" on Every Load

**Cause**: OAuth scopes not configured correctly

**Solution**:
1. Verify `appsscript.json` has correct scopes
2. Re-deploy: Deploy > New deployment
3. Re-authorize when prompted

### Issue: Blank Screen in Google Sites Iframe

**Cause**: X-Frame-Options not set to allow embedding

**Solution**:
1. Check `doGet()` includes:
   ```javascript
   .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
   ```
2. Re-deploy the web app

### Issue: "Script function not found: doGet"

**Cause**: Main entry point missing

**Solution**:
1. Ensure `Code.gs` contains `doGet()` function
2. Save all files
3. Refresh deployment: Deploy > Manage deployments > Edit > Deploy

### Issue: Config Sheet Not Created

**Cause**: Sheet creation failed silently

**Solution**:
1. Manually create sheet:
   - Go to [sheets.google.com](https://sheets.google.com)
   - Create new sheet named "Calendar Utilities Config"
   - Add tabs: "Config", "BulkOpQueue"
2. Run initialization manually:
   - In Apps Script IDE: Run > Run function > `initializeConfigSheet`

### Issue: Quota/Rate Limit Errors

**Cause**: Exceeded Calendar API quota

**Solution**:
1. Check quota usage: [Google Cloud Console](https://console.cloud.google.com) > APIs & Services > Calendar API
2. Wait 24 hours for quota reset
3. Optimize bulk operations to use fewer API calls

## Next Steps

### Implement Core Utilities

Follow the task list in `tasks.md` to implement:

1. **User Story 1 (P1)**: Complete menu navigation
2. **User Story 2 (P2)**: Bulk operations utility
3. **User Story 3 (P3)**: Analytics utility
4. **User Story 4 (P4)**: Cleanup utility

### Enhance UI

Refer to `plan.md` design specifications:
- Typography: 16px base, 1.5 line-height
- Colors: #FFFFFF (white), #333333 (dark gray), #4285f4 (blue accent)
- Spacing: 0.5rem, 1rem, 2rem scale
- Border radius: 4-8px on interactive elements

### Monitor Usage

1. Check Apps Script logs: Apps Script IDE > Executions
2. Review quota usage: Google Cloud Console > APIs & Services
3. Monitor error rates and user feedback

## Development Workflow

### Local Development with clasp

```bash
# Pull latest code
clasp pull

# Edit files locally
# ... make changes ...

# Push changes
clasp push

# Deploy new version
clasp deploy --description "Version 1.1 - Added analytics"
```

### Version Control

```bash
# Initialize git repo
git init

# Add files
git add src/
git add specs/

# Commit
git commit -m "Initial implementation of calendar utilities"

# Push to remote (GitHub, GitLab, etc.)
git remote add origin <your-repo-url>
git push -u origin main
```

### Testing Changes

1. Make code changes in Apps Script IDE or locally with clasp
2. Save all files
3. Deploy > Test deployments (for testing before publishing)
4. Test in Google Sites iframe
5. When ready: Deploy > New deployment (production version)

## Security Checklist

- [ ] OAuth scopes limited to calendar + sheets only
- [ ] Web app executes as "User accessing" (not as developer)
- [ ] No sensitive data logged to Apps Script logger
- [ ] Input validation on all user inputs
- [ ] Config sheet only accessible to app owner
- [ ] XSS protection: Use `textContent`, avoid `innerHTML`

## Support & Resources

- **Apps Script Documentation**: https://developers.google.com/apps-script
- **Calendar API Reference**: https://developers.google.com/calendar/api
- **Sheets API Reference**: https://developers.google.com/sheets/api
- **This Project's Spec**: See `spec.md` for requirements
- **Implementation Plan**: See `plan.md` for architecture
- **API Contracts**: See `contracts/api-spec.md` for function signatures

## Maintenance

### Update OAuth Scopes (If Needed)

1. Edit `appsscript.json`
2. Add/remove scopes
3. Deploy > New deployment
4. All users must re-authorize

### Migrate Data Schema

1. Update `data-model.md` with new schema
2. Implement migration function in `SheetService.gs`
3. Run migration: Apps Script IDE > Run > `migrateConfigSchema`
4. Verify migration success in config sheet

### Backup Configuration

Config sheet is auto-backed up by Google Drive version history:
1. Go to Google Drive
2. Find "Calendar Utilities Config" sheet
3. Right-click > Manage versions
4. Restore previous version if needed

---

**Congratulations!** You've successfully deployed the Calendar Utilities Application. For implementation details, refer to the `tasks.md` file (generated by `/speckit.tasks` command).
