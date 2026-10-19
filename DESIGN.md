# Design System: RoboSentinel

## Visual theme
An indoor-robot operations console: balanced density (6/10), predictable hierarchy
(3/10 variance), static restrained motion (1/10). Safety and readability outrank
marketing styling. The graphite console theme uses one instrument-teal action
accent; healthy, warning and critical colours are reserved for semantic state.
The opening mission strip frames the product thesis before the live controls: a
last report is not permission to move. No decorative animations or invented
operational metrics are used. No existing identity or supplied reference exists;
these are implementation choices derived from the monitoring requirements, not an
external brand standard.

## Colour roles
- Graphite canvas #0f1717; surface #172221; raised surface #1d2a29; border #344643.
- Ink #eef7f3; secondary ink #a9bbb4.
- Instrument teal #51c7aa, with #80e2c7 for readable emphasis: the single
  interactive accent and focus treatment.
- Healthy #64d0a6; warning #f3b75b; critical #ff7b83 are semantic safety colours,
  always paired with explicit text and never used as decorative accents.

## Typography and spacing
Offline system sans-serif stack; monospace numbers, timestamps and telemetry.
No downloaded fonts. Body 16px, dense metadata at least 12px, heading clamp
28..48px for the primary title. 4px spacing base; 16/24px section padding;
8/12px corners, no floating shadows.

## Components and hierarchy
Top simulation-only banner, a short safety-argument mission strip, then robot
state and primary run controls. Main area uses an asymmetric telemetry/fault grid;
safety state is prominent and persistent. The replay adds a fixed causal-progress
map whose executed/current/pending states are driven by the real replay step index.
Readings use flat bordered sections. Faults show severity, rule evidence, time,
recommendation. History is chronological with clear event types. Inputs have
labels above, errors below. Empty faults explain healthy monitoring. Disabled
recovery controls have visible reasons. Consequential actions use a labelled
confirmation dialog naming the simulation action; cancel has initial focus.

## Responsive and accessibility rules
Max width 1440px; major dashboard panels become a single column below 768px;
the compact telemetry grid retains two reading columns. No horizontal page overflow.
Grid children min-width 0; wrap long evidence. At least 44px interactive targets,
visible focus, semantic headings, labelled values and no colour-only meaning.
No perpetual motion, staggered alerts, gradients, emojis or status pulse effects.
The dark theme honours `prefers-reduced-motion`; interaction transitions collapse
to near-instant changes when requested.
Safety messages must not disappear automatically. Canonical examples are the
telemetry definition list, fault evidence panel and confirmed recovery dialog.

## Release QA notes
The monitoring badge reflects critical faults, warning/latch/shutdown or no-fault
state while still stating that monitoring is active. A module-load error marks
the commanded state unavailable instead of leaving a stale motion label.
Core confirmation is mandatory for reset as well as recovery and shutdown.
Automated Chromium checks cover desktop, 768px tablet, 390px and 320px narrow
layouts, keyboard controls, cancel-first dialog focus and >=44px target heights.
Text-role colour tokens are tested at >=4.5:1 for their dark-console roles; this is
not a full WCAG or screen-reader certification. See docs/verification.md.

## Judge replay

The cockpit links to a separate `/replay.html` evidence view using the same
offline tokens, not a marketing page. Four adjacent readouts distinguish the
reported mode, commanded state, motion authorization and latch; retry eligibility
has its actual reason and explicit confirmation requirement. Twelve manually
advanced steps show real operations, clocks, faults, checks and event history.
The causal map makes the 12-step story scannable without hiding pending steps.
Waiting does not advance this scripted scene. Partial/complete JSON export is
labelled; restart reconstructs only this independent replay, not the live plant.
Initialization/error states disable execution rather than showing success.
The replay has keyboard controls and checked 320px/tablet containment; this does
not add a manual screen-reader or hardware validation claim.
