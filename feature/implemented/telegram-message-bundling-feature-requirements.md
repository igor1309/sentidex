---
date: 2026-02-20
model: gpt-5.2
---

# Telegram Message Bundling — Feature Requirements

## 1. Purpose
Group user-written notes and any immediately following forwarded messages into a single logical record (“bundle”) for storage and processing.

---

## 2. Message Types

Each incoming message is classified as exactly one of:

### Note
A user-authored plain text message with no forward metadata.

### Forward
Any message containing forward metadata, including media-only forwards.

### Other
Any message that is neither Note nor Forward, including:
- Non-forwarded media
- System/service messages
- Bot messages
- Polls, locations, contacts, reactions

---

## 3. Bundle Start

A bundle starts when a **Note** message is received.

That message becomes the bundle header.

---

## 4. Bundle Membership

After a bundle starts, all **Forward** messages received within the active window belong to that bundle.

Multiple forwards may belong to one bundle.

---

## 5. Bundle Termination

An active bundle is closed when any of the following occurs:

1) No Forward message is received within **10 seconds** after the Note  
2) Another Note message is received  
3) An **Other** message is received  
4) End of input stream

---

## 6. Note-Only Bundles

If no Forward messages arrive before termination, the bundle is treated as a valid note-only bundle and preserved.

---

## 7. Ordering

- Messages inside a bundle must preserve original chronological order  
- Bundles must preserve stream order

---

## 8. Source Handling

Forwarded messages may originate from any Telegram source.

All available provenance metadata must be captured.

Missing metadata must not prevent bundling.

---

## 9. Error Handling

If classification or sequencing is ambiguous:

- Close the current bundle  
- Start a new bundle  
- Mark affected bundles as **ambiguous**

No silent reassignment is permitted.

Ambiguity conditions include:

- A **Forward** message is observed with no active bundle and the most recent message is not a **Note** within the bundling rules.
- Messages have identical timestamps or timestamp order conflicts such that more than one valid bundle interpretation is possible.
- A message cannot be deterministically classified into **Note**, **Forward**, or **Other** based on available metadata.

Receiving a new **Note** always terminates the current bundle normally and never makes it ambiguous.

---

## 10. Output Contract

Each finalized bundle must expose:

- Note text  
- List of forwarded messages (may be empty)  
- Bundle start and end timestamps  
- Message IDs  
- Source metadata  
- Status: `normal | ambiguous`