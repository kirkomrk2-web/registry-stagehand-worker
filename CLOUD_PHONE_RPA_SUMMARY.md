# Cloud Phone RPA Manual – Working Summary

_Last updated: 2025-11-27_

This document condenses the DuoPlus Cloud Phone RPA Manual to provide quick reference for automation work. Each section lists the core purpose, the important UI concepts, and any implementation notes that affect Stagehand/Browserbase flows.

## 1. Basic Functions
- **Process Management** – Create/edit processes, configure scheduled executions.
- **Template Store** – Use prefab DuoPlus templates as starting points.
- **Plan Management** – Monitor recurring tasks; paused plans can be manually re-run.
- **Task Log** – View execution history, including scheduled plan runs; supports manual stop actions.

## 2. Create Task Process
1. Rename the task in the upper-left corner.
2. Configure global variables/import data.
3. Drag actions from the left pane to build the flow.
4. Debug to run the flow on a phone.
5. Inspect debug logs for validation.
6. Publish as scheduled/loop tasks.

## 3. Variable Introduction
- **Static Constants** – Defined in Global Variables (text, boolean, number, string, Excel data).
- **Dynamic Variables** – Populated at runtime (e.g., email/network responses).
- **Element Variables** – Store UI controls for reuse across multiple actions.

## 4. Page Operations
Common UI primitives:
- Open Application (by package name or global constant)
- Page Back, Keyboard Ops, Screenshots
- Click/Long Press (by selector) or coordinate
- Input Content (supports variable binding and capture)
- Scroll/Slide configuration
- Upload File (defaults to `/sdcard/Download`)
- Execute `adb` command (returning output assignable to variables)

## 5. Wait Operation
- Fixed delay.
- Wait for Element (poll by selector, optionally store element variable).

## 6. Obtain Data
- Extract single element text.
- Retrieve email (OAuth2-compatible; filter by sender/subject; regex capture to variables).
- Initiate HTTP request (custom headers/extraction rules).
- Text extraction utilities.
- Log statements for debug output.
- Write text to file.

## 7. Environment Information
- Install apps from **Team App** or **Platform App** catalogs prior to automation runs.

## 8. Process Management (Logic Blocks)
- `If` blocks house conditional sub-flows.
- `For Loop Data` iterates over batch text/Excel rows.
- `For Loop Count` iterates a fixed number of times.
- `Terminate Task` to end execution immediately.

## 9. Third-Party Tools
- Built-in Outlook/OAuth2 email retrieval. Supports regex content extraction and fallback to latest email when filters omitted.

## 10. UI Analysis App
- Desktop shortcut `DumpElement` to inspect clickable elements.
- Provides selectors (`fullid`, `class`, `text`, `desc`) and order indexes for disambiguation.
- Element value clicks copy attributes to clipboard for quick RPA configuration.

---

### Usage Tips
- Pair Stagehand actions with these primitives by mirroring DuoPlus flows (e.g., wait-after-click, reuse element variables).
- Store credentials (e.g., DuoPlus API key) in environment variables accessible to workers—see README for setup details.
