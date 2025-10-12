/**
 * Logger utility for Calendar Utilities Application
 * Provides consistent logging interface across the application
 */

/**
 * Log an informational message
 * @param {string} message - The message to log
 * @param {Object} data - Optional data object to log
 */
function log(message, data) {
  const timestamp = new Date().toISOString();
  const logMessage = `[INFO] ${timestamp} - ${message}`;

  if (data) {
    Logger.log(logMessage + ': ' + JSON.stringify(data));
  } else {
    Logger.log(logMessage);
  }
}

/**
 * Log an informational message (alias for log)
 * @param {string} message - The message to log
 * @param {Object} data - Optional data object to log
 */
function info(message, data) {
  log(message, data);
}

/**
 * Log a warning message
 * @param {string} message - The warning message
 * @param {Object} data - Optional data object to log
 */
function warn(message, data) {
  const timestamp = new Date().toISOString();
  const logMessage = `[WARN] ${timestamp} - ${message}`;

  if (data) {
    Logger.log(logMessage + ': ' + JSON.stringify(data));
  } else {
    Logger.log(logMessage);
  }
}

/**
 * Log an error message
 * @param {string} message - The error message
 * @param {Error|Object} error - Error object or additional data
 */
function error(message, error) {
  const timestamp = new Date().toISOString();
  let logMessage = `[ERROR] ${timestamp} - ${message}`;

  if (error) {
    if (error.stack) {
      logMessage += '\nStack trace: ' + error.stack;
    } else {
      logMessage += ': ' + JSON.stringify(error);
    }
  }

  Logger.log(logMessage);
}
