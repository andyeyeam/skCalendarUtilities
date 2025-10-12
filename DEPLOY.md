# Deployment Guide: Calendar Utilities Web App

This guide covers deploying your Calendar Utilities application to Google Apps Script.

## Prerequisites

- Google account with Calendar access
- All source files in `src/` directory (✓ Complete)
- Internet connection

---

## Method 1: Manual Deployment (Browser-Based) ⭐ Recommended

### Step 1: Create Apps Script Project

1. Go to **[script.google.com](https://script.google.com)**
2. Click **"+ New Project"**
3. Click "Untitled project" at top-left
4. Rename to: **"Calendar Utilities"**
5. Click "Rename"

### Step 2: Enable Manifest File

1. Click **gear icon** ⚙️ (Project Settings) on left sidebar
2. Scroll to "General settings"
3. Check ☑ **"Show 'appsscript.json' manifest file in editor"**
4. Click **Editor** tab (top-left) to return

### Step 3: Setup Manifest

1. Click **`appsscript.json`** in the file list (left sidebar)
2. **Delete all existing content**
3. Copy content from: `src/appsscript.json` (see below)
4. Paste into the editor
5. Press **Ctrl+S** (or Cmd+S on Mac) to save

**appsscript.json content:**
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

⚠️ **Important:** Update `timeZone` to your timezone (e.g., "America/Los_Angeles", "Europe/London", "Asia/Tokyo")

### Step 4: Add Script Files

For each file below:
1. Click **+** next to "Files" → Select **"Script"**
2. Name the file (use the name shown below)
3. Copy content from corresponding file in `src/`
4. Press **Ctrl+S** to save

**Script Files to Create:**

| Apps Script Name | Copy From | Description |
|------------------|-----------|-------------|
| `Code` | `src/Code.gs` | Main entry point ⭐ Do this first |
| `utils/Logger` | `src/utils/Logger.gs` | Logging utilities |
| `utils/AuthUtils` | `src/utils/AuthUtils.gs` | OAuth helpers |
| `utils/SheetUtils` | `src/utils/SheetUtils.gs` | Sheet operations |
| `models/Config` | `src/models/Config.gs` | Config data model |
| `models/Event` | `src/models/Event.gs` | Event data model |
| `services/SheetService` | `src/services/SheetService.gs` | Sheet service |

**Note:** Apps Script uses flat file namespace. The `/` in names is just for organization.

### Step 5: Add HTML Files

For each file below:
1. Click **+** next to "Files" → Select **"HTML"**
2. Name the file (use exact name shown)
3. Copy content from corresponding file in `src/`
4. Press **Ctrl+S** to save

**HTML Files to Create:**

| Apps Script Name | Copy From | Description |
|------------------|-----------|-------------|
| `ui/Styles` | `src/ui/Styles.html` | Shared CSS styles |
| `ui/Menu` | `src/ui/Menu.html` | Main menu interface |
| `ui/BulkOps` | `src/ui/BulkOps.html` | Bulk ops placeholder |
| `ui/Analytics` | `src/ui/Analytics.html` | Analytics placeholder |
| `ui/Cleanup` | `src/ui/Cleanup.html` | Cleanup placeholder |

### Step 6: Verify All Files

Your file list should show:

```
📁 Files
  📄 appsscript.json
  📄 Code
  📄 models/Config
  📄 models/Event
  📄 services/SheetService
  📄 ui/Analytics
  📄 ui/BulkOps
  📄 ui/Cleanup
  📄 ui/Menu
  📄 ui/Styles
  📄 utils/AuthUtils
  📄 utils/Logger
  📄 utils/SheetUtils
```

**Total: 13 files**

### Step 7: Deploy as Web App

1. Click **Deploy** button (top-right)
2. Click **"New deployment"**
3. Click the **gear icon** ⚙️ next to "Select type"
4. Choose **"Web app"**
5. Fill in deployment settings:
   - **Description:** `Calendar Utilities MVP v1.0`
   - **Execute as:** `Me (your-email@gmail.com)`
   - **Who has access:** `Anyone with the link`
6. Click **"Deploy"**

### Step 8: Authorize the App

You'll see: **"Authorization required"**

1. Click **"Authorize access"**
2. Select your **Google account**
3. You'll see: ⚠️ **"Google hasn't verified this app"**
   - This is normal for personal apps!
   - Click **"Advanced"** (bottom-left)
   - Click **"Go to Calendar Utilities (unsafe)"**
4. Review permissions:
   ```
   ✓ See, edit, share, and permanently delete all calendars you can access
   ✓ See, edit, create, and delete all your Google Sheets spreadsheets
   ```
5. Click **"Allow"**

### Step 9: Copy Web App URL

After authorization succeeds:

1. You'll see **"Deployment"** dialog
2. Find **"Web app"** section
3. **Copy the URL** - it looks like:
   ```
   https://script.google.com/macros/s/AKfycbxXXXXXXXXXXXXXXXXXXXXXX/exec
   ```
4. **Save this URL** - you'll need it for:
   - Testing the app
   - Embedding in Google Sites
5. Click **"Done"**

---

## Method 2: CLI Deployment (Using clasp) 🚀 Advanced

### Prerequisites

- Node.js installed
- clasp CLI installed: `npm install -g @google/clasp`

### Step 1: Login to clasp

```bash
cd C:\Users\andre\Repos\speckit\skCalUtils
clasp login
```

This opens browser for Google authorization.

### Step 2: Create Apps Script Project

```bash
cd C:\Users\andre\Repos\speckit\skCalUtils
clasp create --title "Calendar Utilities" --type webapp --rootDir src
```

This creates `.clasp.json` with your script ID.

### Step 3: Push Files to Apps Script

```bash
clasp push
```

This uploads all files from `src/` to Apps Script.

### Step 4: Deploy Web App

```bash
clasp deploy --description "Calendar Utilities MVP v1.0"
```

### Step 5: Open in Browser

```bash
clasp open --webapp
```

This opens your deployed web app.

### Step 6: Get Deployment URL

```bash
clasp deployments
```

Copy the **Web app URL** from the output.

---

## Testing Your Deployment

### Test 1: Open Web App

1. Open the **Web app URL** in your browser
2. You should see:
   - ✅ "Calendar Utilities" heading
   - ✅ "Select Calendar" dropdown
   - ✅ Three utility buttons (disabled initially)

### Test 2: First Run Setup

On first access, the app automatically:
- ✅ Creates Google Sheet: **"Calendar Utilities Config"**
- ✅ Creates tabs: "Config" and "BulkOpQueue"
- ✅ Initializes default configuration

**Verify sheet creation:**
1. Go to [drive.google.com](https://drive.google.com)
2. Search: `Calendar Utilities Config`
3. Open the sheet
4. Check tabs: **Config** | **BulkOpQueue**

### Test 3: Calendar Selection

1. Click **"Select Calendar"** dropdown
2. Your calendars should populate (primary first)
3. Select a calendar
4. Verify:
   - ✅ Success message appears
   - ✅ Utility buttons become **enabled** (no longer gray)

### Test 4: Navigation

1. Click **"Bulk Operations"** button
2. Verify:
   - ✅ Page changes to full-screen "Coming Soon" message
   - ✅ "← Back to Menu" button appears at top
3. Click **"← Back to Menu"**
4. Verify:
   - ✅ Returns to main menu
   - ✅ Calendar still selected
5. Repeat for **Analytics** and **Cleanup** buttons

### Test 5: OAuth Persistence

1. Close your browser completely
2. Reopen browser
3. Open **Web app URL** again
4. Verify:
   - ✅ No authorization prompt (already authorized)
   - ✅ App loads immediately
   - ✅ Config persists (selected calendar remembered)

---

## Embedding in Google Sites

### Step 1: Create/Edit Google Site

1. Go to [sites.google.com](https://sites.google.com)
2. Open existing site or create new one
3. Click **"Edit"** (pencil icon)

### Step 2: Embed Web App

1. Navigate to page where you want to embed
2. Click **"Insert"** tab
3. Select **"Embed URL"**
4. Paste your **Web app URL**
5. Click **"Insert"**

### Step 3: Resize Embedded Frame

1. Click the embedded frame
2. Drag corners to resize:
   - **Recommended width:** 800px
   - **Recommended height:** 600px
3. Click **"Publish"** to save

### Step 4: Test Embedded App

1. View your published Google Sites page
2. Verify app loads in iframe
3. Test all navigation (menu → utility → back)

---

## Updating Your Deployment

### Manual Updates (Browser)

1. Go to [script.google.com](https://script.google.com)
2. Open your "Calendar Utilities" project
3. Edit files
4. Click **Deploy** → **Manage deployments**
5. Click **pencil icon** ✏️ next to active deployment
6. Change **"Version"** to "New version"
7. Update **Description**: `v1.1 - Added feature X`
8. Click **"Deploy"**

**Note:** Web app URL stays the same! No need to update Google Sites embed.

### CLI Updates (clasp)

```bash
cd C:\Users\andre\Repos\speckit\skCalUtils

# Pull latest from Apps Script (if edited in browser)
clasp pull

# Push local changes
clasp push

# Create new deployment
clasp deploy --description "v1.1 - Added feature X"
```

---

## Troubleshooting

### Issue: Blank Screen in Google Sites

**Cause:** X-Frame-Options not configured

**Solution:**
1. Verify `Code.gs` has:
   ```javascript
   .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
   ```
2. Re-deploy the web app

### Issue: "Authorization Required" on Every Load

**Cause:** OAuth scopes changed

**Solution:**
1. Deploy → **New deployment** (not edit)
2. Re-authorize with new permissions

### Issue: Config Sheet Not Created

**Cause:** Insufficient permissions or runtime error

**Solution:**
1. Check Apps Script logs: **Executions** tab
2. Manually create sheet:
   - Go to [sheets.google.com](https://sheets.google.com)
   - Create sheet: "Calendar Utilities Config"
   - Add tabs: "Config", "BulkOpQueue"

### Issue: "Script function not found: doGet"

**Cause:** Code.gs not saved or missing

**Solution:**
1. Verify `Code.gs` exists and has `doGet()` function
2. Save all files (Ctrl+S)
3. Re-deploy

### Issue: Calendar Dropdown Empty

**Cause:** No calendars with write access

**Solution:**
1. Check calendar permissions in Google Calendar
2. Verify OAuth scope includes `auth/calendar`
3. Check Apps Script logs for errors

---

## Getting Your Web App URL

If you lost your deployment URL:

### Option 1: Browser

1. Go to [script.google.com](https://script.google.com)
2. Open "Calendar Utilities" project
3. Click **Deploy** → **Manage deployments**
4. Copy URL from **Web app** section

### Option 2: CLI

```bash
clasp deployments
```

Look for deployment with type: `@WEBAPP`

---

## Next Steps

✅ **MVP Complete!** You now have a working calendar utilities menu.

**Future enhancements** (not yet implemented):
- Phase 4: Bulk Operations (delete, color change, move)
- Phase 5: Analytics & Insights
- Phase 6: Calendar Cleanup (duplicates)
- Phase 7: Polish (error handling, loading states, responsive design)

**Deployment checklist:**
- [ ] Update `timeZone` in `appsscript.json`
- [ ] All 13 files uploaded to Apps Script
- [ ] Web app deployed with correct permissions
- [ ] OAuth authorization completed
- [ ] Config sheet auto-created
- [ ] Calendar selection working
- [ ] Navigation tested (menu ↔ utilities)
- [ ] Embedded in Google Sites (optional)

---

## Support Resources

- **Apps Script Docs:** https://developers.google.com/apps-script
- **Calendar API:** https://developers.google.com/calendar/api
- **Sheets API:** https://developers.google.com/sheets/api
- **clasp CLI:** https://github.com/google/clasp
- **Project Spec:** `specs/001-build-an-embedded/spec.md`
- **Quickstart:** `specs/001-build-an-embedded/quickstart.md`

---

**Questions?** Check the quickstart guide at `specs/001-build-an-embedded/quickstart.md` for more details.
