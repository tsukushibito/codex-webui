# Issue 24 Design

## Overview
- Extend the existing right-side control panel with a second section for pending user-input requests.
- Keep approvals and user-input requests as separate render paths with parallel state maps.

## Main Decisions
- Render one card per pending request.
- Render one textarea per question so free-form answers and "other" paths remain possible.
- Show predefined options as quick-fill buttons that populate the textarea.
- Submit answers as `{ answers: { [questionId]: string[] } }`, using newline-separated textarea entries.
- Handle `session/snapshot`, `user_input/pending`, `user_input/resolved`, and `user_input/timed_out` in the browser.

## Risks
- Request schemas may vary across app-server versions.
  - Mitigation: treat missing labels/options as optional and keep rendering generic.
- Browser-only logic can regress silently.
  - Mitigation: add a lightweight DOM/event test for the shipped client script.
