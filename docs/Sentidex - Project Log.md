### **Sentidex Project Log**

**Date:** 23 August 2025
**Objective:** A day-long sprint to forge a workflow for capturing fleeting ideas from Telegram, evolving from a raw concept to a fully automated, multi-provider system.

---

#### **1. Forging the Idea**

The project began with the core philosophy that this would not be a permanent knowledge base, but a **temporary processing queue to be driven to zero**. Foundational documents—the spec, user stories, and brand brief—were drafted to solidify this vision before any code was written.

#### **2. Architectural Decisions**

A clean, robust architecture was established from the outset:
*   **Orchestration:** GitHub Actions was chosen as the zero-server scheduler.
*   **Data Flow:** A two-stage pipeline using `_inbox/` (raw messages) and `inbox/` (processed, enriched files) was implemented to ensure a clean separation of concerns.
*   **Evolution from Bash to Node.js:** The initial use of Bash for scripting quickly proved brittle for handling structured data. A strategic decision was made to migrate all complex logic to Node.js, reserving Bash only for simple "glue" commands within the workflow YAML. This "right tool for the right job" approach proved critical.

#### **3. The Pluggable Intelligence Layer**

The most significant architectural evolution was the implementation of a flexible, provider-agnostic intelligence layer.
*   **The Orchestrator (`ai.js`):** A router was created to decouple the main application logic from any specific AI provider. This allows for switching models and services with a one-line configuration change.
*   **Initial Provider (OpenAI):** The system was first integrated with OpenAI's `gpt-5-nano` model to validate the pipeline.
*   **Strategic Expansion (OpenRouter):** To enhance flexibility and cost-effectiveness, **OpenRouter was integrated as a second provider, utilizing the free `gpt-oss-20b` model**. This immediately proved the value of the orchestrator architecture, providing a real way to switch between models based on cost, availability, or capability.

#### **4. Hardening and Automation**

The final phase focused on making the system resilient and fully autonomous.
*   **Concurrency:** A `concurrency` guard was implemented in the GitHub Actions workflow to prevent race conditions, ensuring that only one process could modify the repository at a time.
*   **Automation:** The system was fully automated using a two-file workflow structure:
    1.  `poll-and-process.yml`: Runs on a 15-minute schedule to ingest and enrich new messages.
    2.  `send-digests.yml`: Handles daily and weekly reports on separate, less frequent schedules.

---

### **Automation Status**

The core logic is sound, and all components are fully functional when triggered manually. However, the scheduled automation is still exhibiting intermittent bugs. Resolving these final scheduling and concurrency edge cases is a dedicated task for another day, leaving the system in a state of a robust, manually-operated tool for now.