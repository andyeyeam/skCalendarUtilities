/**
 * Google Sheets Utility Functions
 * Provides batch I/O operations and schema initialization helpers
 */

/**
 * Get values from a sheet range with error handling
 * @param {Sheet} sheet - The sheet object
 * @param {string} range - The A1 notation range (e.g., "A1:D10")
 * @returns {Array<Array>} 2D array of values
 */
function getValuesFromRange(sheet, range) {
  try {
    return sheet.getRange(range).getValues();
  } catch (e) {
    error('Failed to get values from range', { range, error: e.message });
    return [];
  }
}

/**
 * Set values to a sheet range with error handling
 * @param {Sheet} sheet - The sheet object
 * @param {string} range - The A1 notation range (e.g., "A1:D10")
 * @param {Array<Array>} values - 2D array of values to set
 * @returns {boolean} True if successful
 */
function setValuesToRange(sheet, range, values) {
  try {
    sheet.getRange(range).setValues(values);
    return true;
  } catch (e) {
    error('Failed to set values to range', { range, error: e.message });
    return false;
  }
}

/**
 * Batch read operation - get all values from a sheet
 * @param {Sheet} sheet - The sheet object
 * @returns {Array<Array>} 2D array of all values
 */
function batchRead(sheet) {
  try {
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow === 0 || lastCol === 0) {
      return [];
    }

    return sheet.getRange(1, 1, lastRow, lastCol).getValues();
  } catch (e) {
    error('Failed to batch read sheet', { sheetName: sheet.getName(), error: e.message });
    return [];
  }
}

/**
 * Batch write operation - write multiple rows at once
 * @param {Sheet} sheet - The sheet object
 * @param {Array<Array>} rows - Array of row arrays to write
 * @param {number} startRow - Starting row number (1-indexed)
 * @returns {boolean} True if successful
 */
function batchWrite(sheet, rows, startRow) {
  try {
    if (!rows || rows.length === 0) {
      return true;
    }

    const numRows = rows.length;
    const numCols = rows[0].length;

    sheet.getRange(startRow, 1, numRows, numCols).setValues(rows);
    return true;
  } catch (e) {
    error('Failed to batch write to sheet', { sheetName: sheet.getName(), startRow, error: e.message });
    return false;
  }
}

/**
 * Initialize a sheet with headers and default structure
 * @param {Sheet} sheet - The sheet object
 * @param {Array<string>} headers - Array of header column names
 * @returns {boolean} True if successful
 */
function initializeSheetWithHeaders(sheet, headers) {
  try {
    // Clear existing content
    sheet.clear();

    // Set headers in first row
    const headerRow = [headers];
    sheet.getRange(1, 1, 1, headers.length).setValues(headerRow);

    // Format headers (bold, background color)
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f3f3f3');

    // Freeze header row
    sheet.setFrozenRows(1);

    return true;
  } catch (e) {
    error('Failed to initialize sheet with headers', { sheetName: sheet.getName(), error: e.message });
    return false;
  }
}

/**
 * Create or get a named range in a sheet
 * @param {Spreadsheet} spreadsheet - The spreadsheet object
 * @param {string} name - The named range name
 * @param {string} range - The A1 notation range
 * @returns {NamedRange} The named range object
 */
function createOrGetNamedRange(spreadsheet, name, range) {
  try {
    // Check if named range already exists
    const existingRange = spreadsheet.getRangeByName(name);
    if (existingRange) {
      return existingRange;
    }

    // Create new named range
    const sheet = spreadsheet.getActiveSheet();
    const rangeObj = sheet.getRange(range);
    return spreadsheet.setNamedRange(name, rangeObj);
  } catch (e) {
    error('Failed to create or get named range', { name, range, error: e.message });
    return null;
  }
}

/**
 * Find a row by key-value match in first column
 * @param {Sheet} sheet - The sheet object
 * @param {string} key - The key to search for in first column
 * @returns {number} Row number (1-indexed) or -1 if not found
 */
function findRowByKey(sheet, key) {
  try {
    const data = batchRead(sheet);

    for (let i = 0; i < data.length; i++) {
      if (data[i][0] === key) {
        return i + 1; // Convert to 1-indexed
      }
    }

    return -1; // Not found
  } catch (e) {
    error('Failed to find row by key', { sheetName: sheet.getName(), key, error: e.message });
    return -1;
  }
}

/**
 * Append a row to the end of a sheet
 * @param {Sheet} sheet - The sheet object
 * @param {Array} row - Array of values to append
 * @returns {boolean} True if successful
 */
function appendRow(sheet, row) {
  try {
    sheet.appendRow(row);
    return true;
  } catch (e) {
    error('Failed to append row', { sheetName: sheet.getName(), error: e.message });
    return false;
  }
}
