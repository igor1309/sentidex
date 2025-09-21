### Plan for Next Weekend: Hardening & Validation

The goal for this weekend is to leverage our new, clean architecture to increase the application's robustness. We will focus on improving data integrity with schema-based validation and making filesystem operations safer.

---

#### **Priority 1: Implement Schema-Based Validation with Zod**

The current manual validation is brittle. We will replace it with `zod` to create a single source of truth for our data shapes.

1.  **Install Dependency:**
    *   Add `zod` to the project: `npm install zod`.

2.  **Define AI Response Schema:**
    *   In `scripts/core/messageProcessor.js`, create a Zod schema that formally defines the expected AI output. This schema should enforce the rules from our prompt (e.g., `summary` is a string, `tags` is an array of strings, `title` is a string).

3.  **Integrate Schema:**
    *   Replace the entire body of the `validateAiResults` function with a single line: `AiResponseSchema.parse(aiResults)`. This will provide much more detailed error messages for free.

4.  **Add Unit Tests:**
    *   In `test/messageProcessor.test.js`, add new, fast unit tests that specifically target the validation.
    *   Create tests that prove the schema correctly throws errors for invalid data (e.g., `tags` is null, `summary` is not a string).

#### **Priority 2: Improve Filesystem Safety**

We currently delete files from the inbox, which is risky. We will change this to an archive model.

1.  **Implement Archiving:**
    *   In the `scripts/adapters/fileSystem.js` adapter, create a new function: `archive(sourcePath)`.
    *   This function should move the processed file from `_inbox/` to a new directory, `_archive/processed/YYYY-MM-DD/`.
    *   In `scripts/process-messages.js`, replace the `fileSystem.unlink(inboxPath)` call with `fileSystem.archive(inboxPath)`.

2.  **Update Characterization Tests:**
    *   Modify the relevant tests in `test/process-messages.test.js` to assert that processed files now exist in the expected archive directory instead of being deleted.

---

#### **Stretch Goal (If Time Permits): Transactional Writes**

To prevent corrupted files, we can make writes atomic.

1.  **Modify `writeFile` Adapter:**
    *   In `scripts/adapters/fileSystem.js`, update the `writeFile` function.
    *   The new logic should first write to a temporary file (e.g., `filename.tmp`) and then use `fs.renameSync` to move it to its final destination atomically.
    *   The existing characterization tests should pass without any changes, as this is a purely internal improvement.

#### **Definition of Done for the Weekend:**

*   [ ] Zod is integrated, and the old manual validation function is gone.
*   [ ] New unit tests for the Zod schema are written and passing.
*   [ ] Processed files are archived instead of deleted.
*   [ ] The characterization harness is updated and all tests are green.