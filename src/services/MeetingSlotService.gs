/**
 * Meeting Slot Service
 * Manages CRUD operations for available meeting time slots
 */

/**
 * Add a new meeting time slot
 * @param {string} weekday - Day of week (Monday-Sunday)
 * @param {string} startTime - Start time in HH:MM format
 * @returns {Object} {success: boolean, slot: Object, error: string}
 */
function addMeetingSlot(weekday, startTime) {
  try {
    log('addMeetingSlot started', { weekday: weekday, startTime: startTime });

    // Get current config to get meeting duration
    var configResponse = getOneToOneConfig();
    if (!configResponse.success) {
      return {
        success: false,
        error: 'Failed to load configuration',
        errorType: 'system'
      };
    }

    var meetingDuration = configResponse.config.meetingDurationMinutes;

    // Calculate end time from start time + duration
    var startMinutes = parseTime(startTime);
    if (isNaN(startMinutes)) {
      return {
        success: false,
        error: 'Invalid start time format',
        errorType: 'validation'
      };
    }

    var endMinutes = startMinutes + meetingDuration;
    var endTime = minutesToTime(endMinutes);

    // Validate slot data
    var validation = validateSlotData(weekday, startTime, endTime, meetingDuration);
    if (!validation.isValid) {
      return {
        success: false,
        error: formatValidationErrors(validation.errors),
        errorType: 'validation'
      };
    }

    // Get spreadsheet and slots sheet
    var spreadsheet = getOrCreateConfigSheet();
    var slotsSheet = spreadsheet.getSheetByName('OneToOneSlots');

    if (!slotsSheet) {
      return {
        success: false,
        error: 'OneToOneSlots sheet not found',
        errorType: 'system'
      };
    }

    // Create slot object
    var slot = createMeetingSlot(null, weekday, startTime, endTime);

    // Convert to row and append to sheet
    var row = slotToRow(slot);
    appendRow(slotsSheet, row);

    log('addMeetingSlot completed', { slotId: slot.slotId, endTime: endTime });

    // Return serialized slot
    var serializedSlot = {
      slotId: String(slot.slotId || ''),
      weekday: String(slot.weekday || ''),
      startTime: String(slot.startTime || ''),
      endTime: String(slot.endTime || ''),
      createdAt: String(slot.createdAt || '')
    };

    return {
      success: true,
      slot: serializedSlot
    };
  } catch (e) {
    error('addMeetingSlot failed', e);
    return {
      success: false,
      error: e.message || 'Failed to add time slot',
      errorType: 'system'
    };
  }
}

/**
 * Edit a meeting time slot
 * @param {string} slotId - Unique slot identifier
 * @param {string} weekday - Updated day of week
 * @param {string} startTime - Updated start time
 * @returns {Object} {success: boolean, slot: Object, error: string}
 */
function editMeetingSlot(slotId, weekday, startTime) {
  try {
    log('editMeetingSlot started', { slotId: slotId, weekday: weekday, startTime: startTime });

    // Get current config to get meeting duration
    var configResponse = getOneToOneConfig();
    if (!configResponse.success) {
      return {
        success: false,
        error: 'Failed to load configuration',
        errorType: 'system'
      };
    }

    var meetingDuration = configResponse.config.meetingDurationMinutes;

    // Calculate end time from start time + duration
    var startMinutes = parseTime(startTime);
    if (isNaN(startMinutes)) {
      return {
        success: false,
        error: 'Invalid start time format',
        errorType: 'validation'
      };
    }

    var endMinutes = startMinutes + meetingDuration;
    var endTime = minutesToTime(endMinutes);

    // Validate slot data
    var validation = validateSlotData(weekday, startTime, endTime, meetingDuration);
    if (!validation.isValid) {
      return {
        success: false,
        error: formatValidationErrors(validation.errors),
        errorType: 'validation'
      };
    }

    // Get spreadsheet and slots sheet
    var spreadsheet = getOrCreateConfigSheet();
    var slotsSheet = spreadsheet.getSheetByName('OneToOneSlots');

    if (!slotsSheet) {
      return {
        success: false,
        error: 'OneToOneSlots sheet not found',
        errorType: 'system'
      };
    }

    // Find the slot by slotId
    var allData = batchRead(slotsSheet);
    var slotRowIndex = -1;
    var existingSlot = null;

    for (var i = 1; i < allData.length; i++) {
      if (allData[i][0] === slotId) {
        slotRowIndex = i + 1; // Convert to 1-indexed
        existingSlot = rowToSlot(allData[i]);
        break;
      }
    }

    if (slotRowIndex === -1) {
      return {
        success: false,
        error: 'Slot not found',
        errorType: 'validation'
      };
    }

    // Update slot object
    var updatedSlot = createMeetingSlot(
      slotId,
      weekday,
      startTime,
      endTime,
      existingSlot.createdAt
    );

    // Convert to row and update sheet
    var row = slotToRow(updatedSlot);
    slotsSheet.getRange(slotRowIndex, 1, 1, row.length).setValues([row]);

    log('editMeetingSlot completed', { slotId: slotId, endTime: endTime });

    // Return serialized slot
    var serializedSlot = {
      slotId: String(updatedSlot.slotId || ''),
      weekday: String(updatedSlot.weekday || ''),
      startTime: String(updatedSlot.startTime || ''),
      endTime: String(updatedSlot.endTime || ''),
      createdAt: String(updatedSlot.createdAt || '')
    };

    return {
      success: true,
      slot: serializedSlot
    };
  } catch (e) {
    error('editMeetingSlot failed', e);
    return {
      success: false,
      error: e.message || 'Failed to edit time slot',
      errorType: 'system'
    };
  }
}

/**
 * Delete a meeting time slot
 * @param {string} slotId - Unique slot identifier
 * @returns {Object} {success: boolean, slotId: string, error: string}
 */
function deleteMeetingSlot(slotId) {
  try {
    log('deleteMeetingSlot started', { slotId: slotId });

    // Get spreadsheet and slots sheet
    var spreadsheet = getOrCreateConfigSheet();
    var slotsSheet = spreadsheet.getSheetByName('OneToOneSlots');

    if (!slotsSheet) {
      return {
        success: false,
        error: 'OneToOneSlots sheet not found',
        errorType: 'system'
      };
    }

    // Find the slot by slotId
    var allData = batchRead(slotsSheet);
    var slotRowIndex = -1;

    for (var i = 1; i < allData.length; i++) {
      if (allData[i][0] === slotId) {
        slotRowIndex = i + 1; // Convert to 1-indexed
        break;
      }
    }

    if (slotRowIndex === -1) {
      return {
        success: false,
        error: 'Slot not found',
        errorType: 'validation'
      };
    }

    // Optional: Check if this is the last slot and there are active meetings
    // This would prevent deletion of the last slot if meetings exist
    // For now, we'll allow deletion (meetings can be regenerated)

    // Delete the row from sheet
    slotsSheet.deleteRow(slotRowIndex);

    log('deleteMeetingSlot completed', { slotId: slotId });
    return {
      success: true,
      slotId: slotId,
      message: 'Time slot deleted successfully'
    };
  } catch (e) {
    error('deleteMeetingSlot failed', e);
    return {
      success: false,
      error: e.message || 'Failed to delete time slot',
      errorType: 'system'
    };
  }
}

/**
 * Test function to verify client-server communication
 * @returns {Object} Simple test response
 */
function testMeetingSlots() {
  Logger.log('testMeetingSlots called');
  return {
    success: true,
    message: 'Test successful',
    timestamp: new Date().toISOString()
  };
}

/**
 * Get all meeting time slots
 * @returns {Object} {success: boolean, slots: Array<Object>, count: number, error: string}
 */
function listMeetingSlots() {
  try {
    Logger.log('listMeetingSlots started');

    // Get spreadsheet and slots sheet
    var spreadsheet = getOrCreateConfigSheet();
    Logger.log('Got spreadsheet: ' + (spreadsheet ? 'YES' : 'NO'));

    if (!spreadsheet) {
      Logger.log('Spreadsheet is null!');
      return {
        success: false,
        error: 'Could not access configuration spreadsheet',
        errorType: 'system',
        slots: [],
        count: 0
      };
    }

    var slotsSheet = spreadsheet.getSheetByName('OneToOneSlots');
    Logger.log('Got slotsSheet: ' + (slotsSheet ? 'YES' : 'NO'));

    if (!slotsSheet) {
      return {
        success: false,
        error: 'OneToOneSlots sheet not found. Please ensure the sheet is initialized.',
        errorType: 'system',
        slots: [],
        count: 0
      };
    }

    // Read all data from sheet
    var allData = batchRead(slotsSheet);
    Logger.log('Read ' + allData.length + ' rows from sheet');

    // Skip header row and convert to slot objects
    var slots = [];
    for (var i = 1; i < allData.length; i++) {
      // Skip empty rows
      if (allData[i][0] && allData[i][0].toString().trim().length > 0) {
        var slot = rowToSlot(allData[i]);

        // Explicitly serialize to plain object (ensure JSON compatibility)
        var serializedSlot = {
          slotId: String(slot.slotId || ''),
          weekday: String(slot.weekday || ''),
          startTime: String(slot.startTime || ''),
          endTime: String(slot.endTime || ''),
          createdAt: String(slot.createdAt || '')
        };

        slots.push(serializedSlot);
      }
    }

    Logger.log('listMeetingSlots completed with ' + slots.length + ' slots');

    // Return explicitly structured response
    var response = {
      success: true,
      slots: slots,
      count: slots.length
    };

    Logger.log('Returning response: ' + JSON.stringify(response));
    return response;
  } catch (e) {
    Logger.log('listMeetingSlots error: ' + e.message);
    Logger.log('Stack: ' + e.stack);
    return {
      success: false,
      error: e.message || 'Failed to list time slots',
      errorType: 'system',
      slots: [],
      count: 0
    };
  }
}
