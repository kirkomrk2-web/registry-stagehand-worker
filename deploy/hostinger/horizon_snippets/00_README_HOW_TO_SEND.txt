Horizon AI Builder – How to send patches with small messages

Because the chat has a strict character limit and does not accept file uploads (except PNG), send the changes as a sequence of very short messages (snippets). Paste each snippet in a separate message and tell Horizon which file to edit and where to insert/replace.

Order:
1) 01_agents_contact_snippet.txt (src/lib/agents.js)
2) 02_utils_name_validation_snippet.txt (src/lib/utils.js)
3) 03_chatwidget_state_snippet.txt (src/components/ChatWidget.jsx)
4) 04_chatwidget_addbot_wrapper_snippet.txt (src/components/ChatWidget.jsx)
5) 05_chatwidget_triggers_effects_snippet.txt (src/components/ChatWidget.jsx)
6) 06_chatwidget_ui_snippet.txt (src/components/ChatWidget.jsx)
7) 07_chatwidget_close_confirm_snippet.txt (src/components/ChatWidget.jsx)
8) 08_chatwidget_error_handling_snippet.txt (src/components/ChatWidget.jsx)

Instruction template to paste before each snippet:
"Please apply the following patch. File: <path>. If REPLACE is indicated, find the existing code block and replace exactly. If ADD is indicated, insert near the described section. Confirm when done."

After all patches:
- Build the project and run locally. Test the 1‑minute fallback (temporarily set minutes to 1 inside startFallbackTimer).
- Verify contacts drawer appears after the "soon" message; the bell and close‑confirm are visible; Latin names validate.
