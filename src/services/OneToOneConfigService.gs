/**
 * One-to-One Configuration Service
 * Manages configuration settings for the one-to-one meeting scheduler
 */

/**
 * Get current one-to-one scheduler configuration
 * @returns {Object} {success: boolean, config: Object, isDefault: boolean, error: string}
 */
function getOneToOneConfig() {
  try {
    log('getOneToOneConfig started');

    // Get spreadsheet and config sheet
    var spreadsheet = getOrCreateConfigSheet();
    var configSheet = spreadsheet.getSheetByName('OneToOneConfig');

    if (!configSheet) {
      return {
        success: false,
        error: 'OneToOneConfig sheet not found',
        errorType: 'system'
      };
    }

    // Read all data from sheet
    var allData = batchRead(configSheet);

    // Build config object from key-value pairs
    var config = {};
    var isDefault = false;

    if (allData.length <= 1) {
      // Only header row, return defaults
      config = getDefaultOneToOneConfig();
      isDefault = true;
    } else {
      // Parse config from sheet
      for (var i = 1; i < allData.length; i++) {
        if (allData[i][0] && allData[i][0].toString().trim().length > 0) {
          var key = allData[i][0];
          var value = allData[i][1];
          config[key] = value;
        }
      }

      // Merge with defaults in case new config keys were added
      var defaults = getDefaultOneToOneConfig();
      for (var key in defaults) {
        if (!config.hasOwnProperty(key)) {
          config[key] = defaults[key];
        }
      }
    }

    // Convert string values to numbers where appropriate
    config.meetingDurationMinutes = parseInt(config.meetingDurationMinutes, 10);
    config.minRecurrenceIntervalWeeks = parseInt(config.minRecurrenceIntervalWeeks, 10);
    config.calculatedRecurrenceWeeks = parseInt(config.calculatedRecurrenceWeeks, 10);

    log('getOneToOneConfig completed', { isDefault: isDefault });
    return {
      success: true,
      config: config,
      isDefault: isDefault
    };
  } catch (e) {
    error('getOneToOneConfig failed', e);
    return {
      success: false,
      error: e.message || 'Failed to get configuration',
      errorType: 'system'
    };
  }
}

/**
 * Update one-to-one scheduler configuration
 * @param {Object} config - Configuration object
 * @returns {Object} {success: boolean, config: Object, error: string}
 */
function updateOneToOneConfig(config) {
  try {
    log('updateOneToOneConfig started', config);

    // Validate configuration
    var validation = validateOneToOneConfig(config);
    if (!validation.isValid) {
      return {
        success: false,
        error: formatValidationErrors(validation.errors),
        errorType: 'validation'
      };
    }

    // Get spreadsheet and config sheet
    var spreadsheet = getOrCreateConfigSheet();
    var configSheet = spreadsheet.getSheetByName('OneToOneConfig');

    if (!configSheet) {
      return {
        success: false,
        error: 'OneToOneConfig sheet not found',
        errorType: 'system'
      };
    }

    // Prepare config data for writing
    var configRows = [
      ['meetingDurationMinutes', config.meetingDurationMinutes.toString()],
      ['minRecurrenceIntervalWeeks', config.minRecurrenceIntervalWeeks.toString()],
      ['calculatedRecurrenceWeeks', config.calculatedRecurrenceWeeks ? config.calculatedRecurrenceWeeks.toString() : '1']
    ];

    // Clear existing data (keep headers)
    var lastRow = configSheet.getLastRow();
    if (lastRow > 1) {
      configSheet.getRange(2, 1, lastRow - 1, 2).clearContent();
    }

    // Write new config
    batchWrite(configSheet, configRows, 2);

    log('updateOneToOneConfig completed');
    return {
      success: true,
      config: config,
      message: 'Configuration updated successfully'
    };
  } catch (e) {
    error('updateOneToOneConfig failed', e);
    return {
      success: false,
      error: e.message || 'Failed to update configuration',
      errorType: 'system'
    };
  }
}

/**
 * Get default one-to-one configuration
 * @returns {Object} Default configuration object
 */
function getDefaultOneToOneConfig() {
  return {
    meetingDurationMinutes: 30,
    minRecurrenceIntervalWeeks: 1,
    calculatedRecurrenceWeeks: 1
  };
}

/**
 * Validate one-to-one configuration
 * @param {Object} config - Configuration object to validate
 * @returns {Object} {isValid: boolean, errors: Array<string>}
 */
function validateOneToOneConfig(config) {
  var errors = [];

  // Validate meetingDurationMinutes
  if (!config.meetingDurationMinutes) {
    errors.push('Meeting duration is required');
  } else {
    var duration = parseInt(config.meetingDurationMinutes, 10);
    if (isNaN(duration) || duration < 15 || duration > 240) {
      errors.push('Meeting duration must be between 15 and 240 minutes');
    } else if (duration % 15 !== 0) {
      errors.push('Meeting duration must be divisible by 15 minutes');
    }
  }

  // Validate minRecurrenceIntervalWeeks
  if (!config.minRecurrenceIntervalWeeks) {
    errors.push('Minimum recurrence interval is required');
  } else {
    var interval = parseInt(config.minRecurrenceIntervalWeeks, 10);
    if (isNaN(interval) || interval < 1 || interval > 52) {
      errors.push('Minimum recurrence interval must be between 1 and 52 weeks');
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
