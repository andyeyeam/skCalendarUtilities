/**
 * User Configuration Data Model
 * Represents user preferences and settings stored in Google Sheet
 */

/**
 * UserConfiguration data structure
 * @typedef {Object} UserConfiguration
 * @property {string} selectedCalendarId - Currently selected calendar ID
 * @property {number} defaultDateRange - Default date range for analytics (in days)
 * @property {number} maxEventsPerBatch - Maximum events to process in single batch
 * @property {number} operationTimeout - Timeout for bulk operations (in milliseconds)
 * @property {boolean} confirmBeforeDelete - Require confirmation before deleting events
 */

/**
 * Get default configuration values
 * @returns {UserConfiguration} Default configuration object
 */
function getDefaultConfig() {
  return {
    selectedCalendarId: '', // Empty - user must select calendar
    defaultDateRange: 30, // 30 days for analytics
    maxEventsPerBatch: 100, // Process 100 events per batch
    operationTimeout: 300000, // 5 minutes timeout
    confirmBeforeDelete: true // Always confirm destructive operations
  };
}

/**
 * Validate configuration object
 * @param {Object} config - Configuration object to validate
 * @returns {Object} Validation result with isValid and errors properties
 */
function validateConfig(config) {
  const errors = [];

  // Validate selectedCalendarId (can be empty initially)
  if (config.selectedCalendarId !== undefined && typeof config.selectedCalendarId !== 'string') {
    errors.push('selectedCalendarId must be a string');
  }

  // Validate defaultDateRange
  if (typeof config.defaultDateRange !== 'number' || config.defaultDateRange < 1 || config.defaultDateRange > 365) {
    errors.push('defaultDateRange must be a number between 1 and 365');
  }

  // Validate maxEventsPerBatch
  if (typeof config.maxEventsPerBatch !== 'number' || config.maxEventsPerBatch < 1 || config.maxEventsPerBatch > 1000) {
    errors.push('maxEventsPerBatch must be a number between 1 and 1000');
  }

  // Validate operationTimeout
  if (typeof config.operationTimeout !== 'number' || config.operationTimeout < 1000) {
    errors.push('operationTimeout must be a number >= 1000 milliseconds');
  }

  // Validate confirmBeforeDelete
  if (typeof config.confirmBeforeDelete !== 'boolean') {
    errors.push('confirmBeforeDelete must be a boolean');
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}

/**
 * Convert configuration object to sheet row format
 * @param {UserConfiguration} config - Configuration object
 * @returns {Array<Array>} 2D array suitable for sheet writing
 */
function configToSheetRows(config) {
  return [
    ['selectedCalendarId', config.selectedCalendarId],
    ['defaultDateRange', config.defaultDateRange],
    ['maxEventsPerBatch', config.maxEventsPerBatch],
    ['operationTimeout', config.operationTimeout],
    ['confirmBeforeDelete', config.confirmBeforeDelete]
  ];
}

/**
 * Convert sheet rows to configuration object
 * @param {Array<Array>} rows - 2D array from sheet (key-value pairs)
 * @returns {UserConfiguration} Configuration object
 */
function sheetRowsToConfig(rows) {
  const config = {};

  rows.forEach(row => {
    const key = row[0];
    let value = row[1];

    // Type conversion based on key
    if (key === 'defaultDateRange' || key === 'maxEventsPerBatch' || key === 'operationTimeout') {
      value = Number(value);
    } else if (key === 'confirmBeforeDelete') {
      value = value === true || value === 'true' || value === 'TRUE';
    }

    config[key] = value;
  });

  return config;
}

/**
 * Merge partial configuration with defaults
 * @param {Object} partialConfig - Partial configuration object
 * @returns {UserConfiguration} Complete configuration with defaults for missing values
 */
function mergeWithDefaults(partialConfig) {
  const defaults = getDefaultConfig();
  return Object.assign({}, defaults, partialConfig);
}
