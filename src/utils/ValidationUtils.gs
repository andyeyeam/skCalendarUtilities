/**
 * Validation Utilities
 * Common validation functions for input validation
 */

/**
 * Validate email format
 * @param {string} email - Email address
 * @returns {boolean} True if valid
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') {
    return false;
  }

  var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Format validation errors for user display
 * @param {Array<string>} errors - Array of error messages
 * @returns {string} Formatted error message
 */
function formatValidationErrors(errors) {
  if (!errors || errors.length === 0) {
    return '';
  }

  if (errors.length === 1) {
    return errors[0];
  }

  return errors.join('; ');
}

/**
 * Validate string is non-empty
 * @param {string} value - String to validate
 * @param {string} fieldName - Field name for error message
 * @returns {Object} {isValid: boolean, error: string}
 */
function validateRequired(value, fieldName) {
  if (!value || (typeof value === 'string' && value.trim().length === 0)) {
    return {
      isValid: false,
      error: fieldName + ' is required'
    };
  }

  return {
    isValid: true,
    error: null
  };
}

/**
 * Validate string length
 * @param {string} value - String to validate
 * @param {string} fieldName - Field name for error message
 * @param {number} maxLength - Maximum allowed length
 * @returns {Object} {isValid: boolean, error: string}
 */
function validateMaxLength(value, fieldName, maxLength) {
  if (value && value.length > maxLength) {
    return {
      isValid: false,
      error: fieldName + ' must be ' + maxLength + ' characters or less'
    };
  }

  return {
    isValid: true,
    error: null
  };
}

/**
 * Validate number is within range
 * @param {number} value - Number to validate
 * @param {string} fieldName - Field name for error message
 * @param {number} min - Minimum allowed value
 * @param {number} max - Maximum allowed value
 * @returns {Object} {isValid: boolean, error: string}
 */
function validateNumberRange(value, fieldName, min, max) {
  if (isNaN(value)) {
    return {
      isValid: false,
      error: fieldName + ' must be a number'
    };
  }

  if (value < min || value > max) {
    return {
      isValid: false,
      error: fieldName + ' must be between ' + min + ' and ' + max
    };
  }

  return {
    isValid: true,
    error: null
  };
}

/**
 * Combine multiple validation results
 * @param {Array<Object>} validations - Array of validation result objects
 * @returns {Object} {isValid: boolean, errors: Array<string>}
 */
function combineValidations(validations) {
  var errors = [];

  for (var i = 0; i < validations.length; i++) {
    if (!validations[i].isValid && validations[i].error) {
      errors.push(validations[i].error);
    }
  }

  return {
    isValid: errors.length === 0,
    errors: errors
  };
}
