### The Final, Refined Plan for the Harness

**Phase 1: Refactor the Test Code for Reusability and Clarity**

Before adding any new tests, we will refactor the existing test file. The goal is to create a small, internal "test framework" to make the actual test cases concise, readable, and maintainable.

1.  **Create a `setupTestEnvironment` helper:** This function will encapsulate all the `beforeEach` logic: resetting modules, creating the `memfs` volume, and spying on `process.cwd`. It will take a configuration object to define the initial state of `_inbox`.
2.  **Create a `runScript` helper:** This function will encapsulate the entire `ACT` block. It will handle `jest.isolateModules`, set up spies on `console.log` and `console.error`, and return a promise that resolves when processing is complete. Critically, it will resolve when it sees a terminal log message (e.g., "Successfully processed...", "No files to process...", or the final error summary), not just the success case. It will return the captured logs and errors.
3.  **Create `mockAI` helpers:** Create `mockAISuccess(response)` and `mockAIFailure(error)` to abstract away the `jest.fn()` details.

**Phase 2: Implement the Complete Characterization Harness (in order)**

Using the helpers from Phase 1, we will implement the following test cases. Each `test` block will be small and focused only on the specific inputs and expected outputs of its scenario.

*   **Scenario 0: The Empty State**
    1.  `test('should exit cleanly when _inbox is empty')`

*   **Scenario 1: A Single File**
    2.  `test('should leave the file in _inbox on AI failure')`
    3.  `test('should move the file to inbox on success')`
    4.  `test('should create a DUPL ticket for a known source_url')`

*   **Scenario 2: Two Files (Combinatorial)**
    5.  `test('should leave both files in _inbox when both fail')`
    6.  `test('should process one and leave one when the first fails and second succeeds')`
    7.  `test('should process one and leave one when the first succeeds and second fails')`
    8.  `test('should process both files when both succeed')`

This plan directly implements your strategy. It builds the harness methodically, prioritizes failure cases, and ensures the transactional integrity of the script is fully characterized before we dare to refactor a single line of its implementation. This is the correct path forward.