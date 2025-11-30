# Feature Specification: Bulk Import People from Clipboard

**Feature Branch**: `009-load-from-file`
**Created**: 2025-01-30
**Status**: Draft
**Input**: User description: "Load from file: Create a feature that lets me copy a list of names from the clipboard into an edit box and then adds all the names into the application on mass. The names can either be comma delimitted or separated by a carriage return. The appication should never allow duplicate names to be added under any circumstances."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bulk Import from Clipboard (Priority: P1)

As a user managing the one-to-one meeting scheduler, I want to paste a list of names from my clipboard into a text box and have them all added at once, so that I can quickly populate my meeting group from an existing list (like a team roster or spreadsheet) without adding each person individually.

**Why this priority**: This is the core functionality requested. Users with existing lists of people (from spreadsheets, documents, or other sources) need a fast way to import multiple names at once. Adding 20+ people one-by-one is tedious and error-prone.

**Independent Test**: Copy a list of 10 names from any source (Excel, Word, text file), paste into the bulk import text box, click import, and verify all 10 people are added to the system. This delivers immediate value for users onboarding new teams.

**Acceptance Scenarios**:

1. **Given** I have a comma-delimited list of names "Alice Smith, Bob Jones, Carol Davis", **When** I paste it into the import box and submit, **Then** all 3 people are added to the one-to-one group
2. **Given** I have a newline-separated list of names (one per line), **When** I paste it into the import box and submit, **Then** all people are added to the one-to-one group
3. **Given** I have a mixed list with both commas and newlines "Alice Smith, Bob Jones\nCarol Davis", **When** I paste it and submit, **Then** all 3 people are extracted and added correctly
4. **Given** I paste a list with 50 names, **When** I submit the import, **Then** all 50 people are added successfully

---

### User Story 2 - Duplicate Prevention (Priority: P1)

As a user importing names, I want the system to automatically detect and skip duplicates (both within the pasted list and against existing people), so that I don't accidentally create duplicate entries in my meeting group.

**Why this priority**: The user explicitly required "The application should never allow duplicate names to be added under any circumstances." Duplicate prevention is a critical data integrity constraint that must be enforced during bulk import.

**Independent Test**: Paste a list containing duplicate names ("Alice Smith, Bob Jones, Alice Smith"), submit the import, and verify only unique names are added with clear feedback about skipped duplicates. Can also test by pasting names that already exist in the system.

**Acceptance Scenarios**:

1. **Given** I paste a list "Alice Smith, Bob Jones, Alice Smith", **When** I submit, **Then** only Alice Smith and Bob Jones are added (one copy each), and I see a message indicating 1 duplicate was skipped
2. **Given** the system already contains "Alice Smith" and "Bob Jones", **When** I paste "Alice Smith, Carol Davis, Bob Jones", **Then** only Carol Davis is added, and I see a message that 2 names were skipped because they already exist
3. **Given** I paste a list with different capitalizations "alice smith, Alice Smith, ALICE SMITH", **When** I submit, **Then** only one "Alice Smith" is added (case-insensitive duplicate detection)
4. **Given** I paste a list with extra whitespace " Alice Smith , Bob Jones  ", **When** I submit, **Then** names are trimmed and added correctly

---

### User Story 3 - Import Validation and Feedback (Priority: P1)

As a user importing names, I want to see clear feedback about what was imported, what was skipped, and any errors, so that I understand exactly what happened and can correct any issues.

**Why this priority**: Bulk operations need transparency. Users must know which names succeeded, which failed, and why. Without feedback, users can't trust the import process or fix problems.

**Independent Test**: Paste a list with valid names, duplicates, and invalid entries (empty lines, special characters), submit, and verify detailed success message showing counts of added, skipped, and failed names.

**Acceptance Scenarios**:

1. **Given** I paste a list with 10 names and 2 duplicates, **When** the import completes, **Then** I see a success message: "Added 8 people, skipped 2 duplicates"
2. **Given** I paste a list with empty lines and whitespace-only lines, **When** I submit, **Then** empty lines are ignored and I see how many valid names were processed
3. **Given** I paste a list where all names already exist, **When** I submit, **Then** I see a message "No new people added - all 5 names already exist in the system"
4. **Given** I paste a list with names exceeding 100 characters, **When** I submit, **Then** invalid names are rejected and I see which names failed validation and why

---

### User Story 4 - Import UI Integration (Priority: P2)

As a user, I want the bulk import feature to be easily accessible in the People tab alongside the existing "Add Person" form, so that I can choose between adding one person or importing multiple without switching contexts.

**Why this priority**: The feature must be discoverable and integrate seamlessly with the existing UI. However, this is lower priority than the core functionality - the import logic can work even with basic UI.

**Independent Test**: Navigate to People tab, find the bulk import section, verify it's clearly labeled, has a text area for pasting names, and an import button.

**Acceptance Scenarios**:

1. **Given** I'm viewing the People tab, **When** I look for the bulk import feature, **Then** I see a clearly labeled text area and import button
2. **Given** I have just added people via bulk import, **When** the import completes, **Then** the text area clears automatically and the people list refreshes to show new entries
3. **Given** I start typing in the bulk import text area, **When** I want to cancel, **Then** I can clear the text area or navigate away without triggering the import
4. **Given** I click the import button with an empty text area, **When** the validation runs, **Then** I see a message prompting me to paste names first

---

### Edge Cases

- What happens when the pasted text contains only commas or only newlines (no actual names)?
- What happens when a name contains a comma as part of the name (e.g., "Smith, Jr., John")?
- What happens when the pasted list contains thousands of names?
- What happens if the bulk import is triggered while another operation (like Create Meetings) is in progress?
- What happens when names contain special characters, numbers, or emojis?
- What happens when the same name appears multiple times in the pasted list with slight variations (extra spaces, different capitalization)?
- What happens when the pasted text is very large (exceeds text area limits or server processing capacity)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a multi-line text area in the People tab for pasting bulk name lists
- **FR-002**: System MUST parse pasted text as comma-delimited names
- **FR-003**: System MUST parse pasted text as newline-delimited names (carriage return/line feed)
- **FR-004**: System MUST support mixed delimiters (both commas and newlines in the same input)
- **FR-005**: System MUST trim whitespace from each extracted name before validation
- **FR-006**: System MUST perform case-insensitive duplicate detection within the pasted list
- **FR-007**: System MUST check each extracted name against existing people in the system (case-insensitive)
- **FR-008**: System MUST skip duplicate names and NOT add them to the system
- **FR-009**: System MUST validate each extracted name using the same validation rules as the single-person add form (name required, max 100 characters, valid characters)
- **FR-010**: System MUST ignore empty lines and whitespace-only entries in the pasted list
- **FR-011**: System MUST add all valid, non-duplicate names to the OneToOnePeople sheet in a single batch operation
- **FR-012**: System MUST display a success message showing counts: total names added, duplicates skipped, validation failures
- **FR-013**: System MUST refresh the people list display after successful bulk import
- **FR-014**: System MUST clear the text area after successful bulk import
- **FR-015**: System MUST provide a working indicator during the import process
- **FR-016**: System MUST handle import failures gracefully and report which specific names failed and why

### Key Entities

This feature operates on existing entities from Feature 006:

- **Person**: Represents individuals in the one-to-one group (stored in OneToOnePeople sheet) - bulk import creates multiple Person instances
- **Bulk Import Input**: Transient data structure representing parsed names from clipboard (not persisted)
  - Raw text from text area
  - Extracted names (array of strings)
  - Validation results per name (success/failure/duplicate)
  - Summary counts (added, skipped, failed)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can import 50 names in a single paste operation (one action vs 50 individual adds)
- **SC-002**: Bulk import completes within 10 seconds for up to 100 names
- **SC-003**: 100% of duplicate names are detected and prevented (both within list and against existing people)
- **SC-004**: Users see detailed feedback within 2 seconds of import completion showing exactly what was added and skipped
- **SC-005**: Empty lines and whitespace-only entries are ignored without causing errors
- **SC-006**: Case-insensitive duplicate detection works correctly (Alice Smith = alice smith = ALICE SMITH)
- **SC-007**: Both comma-delimited and newline-delimited formats are supported without user needing to specify format
- **SC-008**: Mixed delimiter formats (commas + newlines) are handled correctly
- **SC-009**: The people list refreshes automatically after import to show newly added names

## Assumptions

- The bulk import feature will be added to the existing People tab in OneToOne.html
- Duplicate detection will be case-insensitive and based on exact name matching (not fuzzy matching)
- Names with slight variations (e.g., "John Smith" vs "John A. Smith") are considered different and both will be added
- Names containing commas as part of the actual name (e.g., "Smith, Jr.") may be incorrectly split if using comma delimiter - users should use newline delimiter for such names
- The feature will use the existing `addPerson()` validation logic to ensure consistency
- Maximum reasonable bulk import size is 100 names (system should handle this without performance issues)
- Users will paste from external sources (Excel, Word, text files, email lists, etc.)
- The feature will NOT support file upload - only clipboard paste into text area
- Calendar events are NOT automatically created during bulk import (users must use "Create Meetings" afterward)

## Out of Scope

- File upload functionality (CSV, Excel, text file upload)
- Advanced name parsing (handling titles like Dr., suffixes like Jr./Sr., middle names)
- Fuzzy duplicate detection (similar but not identical names)
- Bulk editing or bulk deletion of imported names
- Undo/rollback of bulk import operation
- Preview of what will be imported before committing
- Importing additional person attributes beyond name (email, role, etc.)
- Progress bar showing percentage completion during import
- Bulk import from other sources (Google Contacts, Active Directory, etc.)
