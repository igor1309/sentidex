# ADR-001: Unified Repository for Code and Data

**Date**: 2025-09-21
**Status**: Accepted

## Context

The Sentidex system operates on a "repo-as-a-database" model. GitHub Actions workflows poll for new messages, process them, and commit the resulting markdown files back into the same repository where the application code resides.

This raises a fundamental architectural question: Should the application code (e.g., `scripts/`, `docs/`) and the operational data (e.g., `_inbox/`, `inbox/`) be kept in this single, unified repository (a "monorepo"), or should they be separated into two distinct repositories?

## The Decision

We have decided to maintain a **single, unified repository** for both the Sentidex application code and its data.

This decision is contingent on implementing specific Git practices to ensure a clean separation of concerns within the repository's history, addressing the primary drawback of a commingled history.

## Rationale and Argument

The discussion balanced two competing needs: architectural simplicity versus developer ergonomics.

### Argument for Separation: Clean Code History

Initially, separating the repositories seems attractive. It would provide a perfectly clean Git history for the application code, free from the "noise" of frequent, automated data commits. This would theoretically make it easier to track down bugs introduced during code refactoring.

### Argument against Separation: Increased Complexity

Separating the repos would break the elegant, transactional nature of the current system and introduce significant complexity:

1.  **Broken Atomic Commits**: A single `git commit` in the monorepo represents a complete, atomic transaction (e.g., "polled 5 messages and processed 3"). In a multi-repo setup, code and data changes are disconnected, making it difficult to determine which version of a script processed which piece of data.
2.  **Complex Workflows**: GitHub Actions would need to check out two repositories, manage authentication and write permissions between them, and perform complex git operations to commit data changes to the second repo. This increases points of failure.
3.  **Difficult Local Development**: Testing scripts locally would require cloning and managing two separate repositories in the correct directory structure, adding unnecessary friction.

### The Refined Solution: A Unified Repo with Process Isolation

The chosen solution captures the best of both worlds by enforcing two key principles within the single repository.

#### 1. Isolate Automation with Distinct Git Identities

Instead of a generic "GitHub Action" author, each distinct automated process is given a unique identity. This turns the Git log into a structured, high-level operational ledger.

-   **Polling Step Commits**: Authored by `Sentidex Poll Bot`.
-   **Processing Step Commits**: Authored by `Sentidex Process Bot`.

This allows for powerful, at-a-glance monitoring of the pipeline's health directly from the `git log`. A "Poll Bot" commit without a corresponding "Process Bot" commit, for example, immediately indicates a failure in the processing stage.

#### 2. Isolate Development with Branching

All human-led code development (features, fixes, refactoring) must occur on separate branches. The `trunk` (or `main`) branch is treated as a production-level log, only updated by automated commits or merges from feature branches.

This workflow ensures that:
-   A developer's work is never blocked by or mixed with automated commits.
-   The Git history of application code can be easily viewed and analyzed by filtering by the developer's author name: `git log --author="Your Name"`.
-   Tools like `git revert` and `git bisect` remain effective, as they can be targeted at the clean, author-filtered history of code changes, ignoring the automated data commits.

## Final Consequences

By adopting this refined monorepo approach, we achieve:

-   **Simplicity**: The entire system remains self-contained with simple, robust workflows.
-   **Atomicity**: Git commits continue to function as transactional records of work.
-   **Maintainability**: The Git history remains clean and navigable for both operational monitoring and code maintenance by filtering by author.
-   **Low Friction**: Local development remains as simple as a single `git clone`.