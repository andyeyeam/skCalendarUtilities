/**
 * Sheet Service
 * Manages configuration sheet initialization and CRUD operations
 */

const CONFIG_SHEET_NAME = 'Calendar Utilities Config';
const CONFIG_TAB_NAME = 'Config';
const QUEUE_TAB_NAME = 'BulkOpQueue';

/**
 * Get or create the configuration spreadsheet
 * @returns {Spreadsheet} The config spreadsheet object
 */
function getOrCreateConfigSheet() {
  try {
    var spreadsheet;

    // Search for existing config sheet
    const files = DriveApp.getFilesByName(CONFIG_SHEET_NAME);

    if (files.hasNext()) {
      const file = files.next();
      spreadsheet = SpreadsheetApp.openById(file.getId());
      log('Found existing config sheet', { id: file.getId() });
    } else {
      // Create new config sheet
      spreadsheet = SpreadsheetApp.create(CONFIG_SHEET_NAME);
      log('Created new config sheet', { id: spreadsheet.getId() });

      // Initialize sheet structure
      initializeConfigSheetStructure(spreadsheet);
    }

    // Always ensure OneToOne tabs exist (for both new and existing sheets)
    ensureOneToOneTabsExist(spreadsheet);

    return spreadsheet;
  } catch (e) {
    error('Failed to get or create config sheet', e);
    throw new Error('Could not access configuration sheet');
  }
}

/**
 * Initialize the config sheet structure with tabs and headers
 * @param {Spreadsheet} spreadsheet - The spreadsheet to initialize
 */
function initializeConfigSheetStructure(spreadsheet) {
  try {
    // Get or create Config tab
    let configSheet = spreadsheet.getSheetByName(CONFIG_TAB_NAME);
    if (!configSheet) {
      // Rename the default sheet or create new
      const sheets = spreadsheet.getSheets();
      if (sheets.length === 1 && sheets[0].getName() === 'Sheet1') {
        configSheet = sheets[0].setName(CONFIG_TAB_NAME);
      } else {
        configSheet = spreadsheet.insertSheet(CONFIG_TAB_NAME);
      }
    }

    // Initialize Config tab with headers
    initializeSheetWithHeaders(configSheet, ['Key', 'Value']);

    // Write default config
    const defaultConfig = getDefaultConfig();
    const configRows = configToSheetRows(defaultConfig);
    batchWrite(configSheet, configRows, 2); // Start at row 2 (after headers)

    // Get or create BulkOpQueue tab
    let queueSheet = spreadsheet.getSheetByName(QUEUE_TAB_NAME);
    if (!queueSheet) {
      queueSheet = spreadsheet.insertSheet(QUEUE_TAB_NAME);
    }

    // Initialize BulkOpQueue tab with headers
    const queueHeaders = [
      'OperationId',
      'OperationType',
      'Status',
      'CreatedAt',
      'UpdatedAt',
      'EventsTotal',
      'EventsProcessed',
      'ErrorMessage'
    ];
    initializeSheetWithHeaders(queueSheet, queueHeaders);

    log('Initialized config sheet structure');
  } catch (e) {
    error('Failed to initialize config sheet structure', e);
    throw e;
  }
}

/**
 * Get current user configuration from sheet
 * @returns {UserConfiguration} Configuration object
 */
function getConfig() {
  try {
    const spreadsheet = getOrCreateConfigSheet();
    const configSheet = spreadsheet.getSheetByName(CONFIG_TAB_NAME);

    // Read all config rows (skip header)
    const allData = batchRead(configSheet);
    if (allData.length <= 1) {
      // Only header present, return defaults
      return getDefaultConfig();
    }

    // Remove header row
    const configRows = allData.slice(1);

    // Convert to config object
    const config = sheetRowsToConfig(configRows);

    // Merge with defaults (in case new config keys were added)
    return mergeWithDefaults(config);
  } catch (e) {
    error('Failed to get config', e);
    return getDefaultConfig();
  }
}

/**
 * Update user configuration in sheet
 * @param {Object} updates - Partial config object with values to update
 * @returns {boolean} True if successful
 */
function updateConfig(updates) {
  try {
    // Validate updates
    const currentConfig = getConfig();
    const newConfig = Object.assign({}, currentConfig, updates);

    const validation = validateConfig(newConfig);
    if (!validation.isValid) {
      error('Invalid config updates', { errors: validation.errors });
      return false;
    }

    // Write updated config to sheet
    const spreadsheet = getOrCreateConfigSheet();
    const configSheet = spreadsheet.getSheetByName(CONFIG_TAB_NAME);

    // Convert config to rows
    const configRows = configToSheetRows(newConfig);

    // Clear existing data (keep headers)
    const lastRow = configSheet.getLastRow();
    if (lastRow > 1) {
      configSheet.getRange(2, 1, lastRow - 1, 2).clearContent();
    }

    // Write new config
    batchWrite(configSheet, configRows, 2);

    log('Updated config', { updates });
    return true;
  } catch (e) {
    error('Failed to update config', e);
    return false;
  }
}

/**
 * Get the config sheet ID (for creating direct links)
 * @returns {string} Spreadsheet ID or null
 */
function getConfigSheetId() {
  try {
    const spreadsheet = getOrCreateConfigSheet();
    return spreadsheet.getId();
  } catch (e) {
    error('Failed to get config sheet ID', e);
    return null;
  }
}

/**
 * Create a named range for config value
 * @param {string} key - Config key name
 * @returns {boolean} True if successful
 */
function createConfigNamedRange(key) {
  try {
    const spreadsheet = getOrCreateConfigSheet();
    const configSheet = spreadsheet.getSheetByName(CONFIG_TAB_NAME);

    // Find the row for this key
    const rowNum = findRowByKey(configSheet, key);
    if (rowNum === -1) {
      warn('Config key not found for named range', { key });
      return false;
    }

    // Create named range for the value cell
    const rangeName = `Config_${key}`;
    const range = `${CONFIG_TAB_NAME}!B${rowNum}`;

    createOrGetNamedRange(spreadsheet, rangeName, range);
    log('Created config named range', { key, range });
    return true;
  } catch (e) {
    error('Failed to create config named range', e);
    return false;
  }
}

/**
 * Reset configuration to defaults
 * @returns {boolean} True if successful
 */
function resetConfigToDefaults() {
  try {
    const defaultConfig = getDefaultConfig();
    const spreadsheet = getOrCreateConfigSheet();
    const configSheet = spreadsheet.getSheetByName(CONFIG_TAB_NAME);

    // Clear existing data (keep headers)
    const lastRow = configSheet.getLastRow();
    if (lastRow > 1) {
      configSheet.getRange(2, 1, lastRow - 1, 2).clearContent();
    }

    // Write default config
    const configRows = configToSheetRows(defaultConfig);
    batchWrite(configSheet, configRows, 2);

    log('Reset config to defaults');
    return true;
  } catch (e) {
    error('Failed to reset config to defaults', e);
    return false;
  }
}

/**
 * Ensure One-to-One Meeting Scheduler tabs exist
 * Internal function that takes spreadsheet as parameter to avoid infinite loop
 * @param {Spreadsheet} spreadsheet - The spreadsheet to initialize tabs in
 * @returns {Object} Result object with success status
 */
function ensureOneToOneTabsExist(spreadsheet) {
  try {

    // Tab 1: OneToOnePeople
    var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');
    if (!peopleSheet) {
      peopleSheet = spreadsheet.insertSheet('OneToOnePeople');
      var headers = ['PersonId', 'Name', 'CalendarEventId', 'CreatedAt', 'UpdatedAt', 'MeetingDay', 'MeetingTime'];
      initializeSheetWithHeaders(peopleSheet, headers);
      log('Created OneToOnePeople tab');
    } else {
      // Ensure existing sheet has all required columns
      var currentHeaders = peopleSheet.getRange(1, 1, 1, peopleSheet.getLastColumn()).getValues()[0];
      var requiredHeaders = ['PersonId', 'Name', 'CalendarEventId', 'CreatedAt', 'UpdatedAt', 'MeetingDay', 'MeetingTime'];

      if (currentHeaders.length < requiredHeaders.length) {
        // Add missing columns
        for (var i = currentHeaders.length; i < requiredHeaders.length; i++) {
          peopleSheet.getRange(1, i + 1).setValue(requiredHeaders[i]);
        }
        log('Added missing columns to OneToOnePeople tab');
      }
    }

    // Tab 2: OneToOneConfig
    var configSheet = spreadsheet.getSheetByName('OneToOneConfig');
    if (!configSheet) {
      configSheet = spreadsheet.insertSheet('OneToOneConfig');
      var headers = ['Key', 'Value'];
      initializeSheetWithHeaders(configSheet, headers);

      // Write default configuration
      var defaultConfig = [
        ['meetingDurationMinutes', '30'],
        ['minRecurrenceIntervalWeeks', '1'],
        ['calculatedRecurrenceWeeks', '1']
      ];
      batchWrite(configSheet, defaultConfig, 2);
      log('Created OneToOneConfig tab with defaults');
    }

    // Tab 3: OneToOneSlots
    var slotsSheet = spreadsheet.getSheetByName('OneToOneSlots');
    if (!slotsSheet) {
      slotsSheet = spreadsheet.insertSheet('OneToOneSlots');
      var headers = ['SlotId', 'Weekday', 'StartTime', 'EndTime', 'CreatedAt'];
      initializeSheetWithHeaders(slotsSheet, headers);
      log('Created OneToOneSlots tab');
    }

    log('One-to-One tabs initialization complete');
    return { success: true };
  } catch (e) {
    error('Failed to initialize One-to-One tabs', e);
    return { success: false, error: e.message };
  }
}

/**
 * Initialize One-to-One Meeting Scheduler tabs
 * Public wrapper function that gets the spreadsheet and calls ensureOneToOneTabsExist
 * @returns {Object} Result object with success status
 */
function initializeOneToOneTabs() {
  try {
    var spreadsheet = getOrCreateConfigSheet();
    return ensureOneToOneTabsExist(spreadsheet);
  } catch (e) {
    error('Failed to initialize One-to-One tabs', e);
    return { success: false, error: e.message };
  }
}

/**
 * Test function to verify One-to-One tabs initialization
 * Verifies tabs exist and default config values are set correctly
 * @returns {Object} Verification results
 */
function testInitializeOneToOneTabs() {
  try {
    // Initialize tabs
    var result = initializeOneToOneTabs();
    if (!result.success) {
      return { success: false, error: 'Initialization failed: ' + result.error };
    }

    var spreadsheet = getOrCreateConfigSheet();
    var results = {
      success: true,
      tabs: {},
      config: {},
      errors: []
    };

    // Verify OneToOnePeople tab
    var peopleSheet = spreadsheet.getSheetByName('OneToOnePeople');
    if (peopleSheet) {
      var peopleData = batchRead(peopleSheet);
      results.tabs.OneToOnePeople = {
        exists: true,
        headers: peopleData.length > 0 ? peopleData[0] : [],
        rowCount: peopleData.length
      };
    } else {
      results.errors.push('OneToOnePeople tab not found');
      results.success = false;
    }

    // Verify OneToOneConfig tab
    var configSheet = spreadsheet.getSheetByName('OneToOneConfig');
    if (configSheet) {
      var configData = batchRead(configSheet);
      results.tabs.OneToOneConfig = {
        exists: true,
        headers: configData.length > 0 ? configData[0] : [],
        rowCount: configData.length
      };

      // Verify default config values
      if (configData.length > 1) {
        for (var i = 1; i < configData.length; i++) {
          results.config[configData[i][0]] = configData[i][1];
        }
      }
    } else {
      results.errors.push('OneToOneConfig tab not found');
      results.success = false;
    }

    // Verify OneToOneSlots tab
    var slotsSheet = spreadsheet.getSheetByName('OneToOneSlots');
    if (slotsSheet) {
      var slotsData = batchRead(slotsSheet);
      results.tabs.OneToOneSlots = {
        exists: true,
        headers: slotsData.length > 0 ? slotsData[0] : [],
        rowCount: slotsData.length
      };
    } else {
      results.errors.push('OneToOneSlots tab not found');
      results.success = false;
    }

    // Verify expected default config values
    var expectedConfig = {
      'meetingDurationMinutes': '30',
      'minRecurrenceIntervalWeeks': '1',
      'calculatedRecurrenceWeeks': '1'
    };

    for (var key in expectedConfig) {
      if (results.config[key] !== expectedConfig[key]) {
        results.errors.push('Config mismatch for ' + key + ': expected ' + expectedConfig[key] + ', got ' + results.config[key]);
        results.success = false;
      }
    }

    log('One-to-One tabs verification complete', results);
    return results;
  } catch (e) {
    error('Failed to verify One-to-One tabs', e);
    return { success: false, error: e.message };
  }
}
