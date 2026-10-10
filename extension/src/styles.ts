// All Soothia styles live in this one file. Tokens come from
// design/soothia-ui-sheet.html (section 01); every component below maps to a
// mono-labelled component in that sheet. Sizes used by the layout code are
// exported so the two stay in sync.

export const ORB_SIZE = 56;
export const ORB_MARGIN = 20;
export const CARD_WIDTH = 340;
export const CARD_GAP = 12;
export const EDGE_PADDING = 8;

// Font families are namespaced so they never clash with the host page's
// fonts. fonts.ts registers them on the document with the FontFace API.
export const FONT_SERIF = "Soothia Lora";
export const FONT_SANS = "Soothia Inter";
export const FONT_MONO = "Soothia JetBrains Mono";

// Inline styles for the host element. Applied with !important so site CSS
// cannot move, hide, or restyle it.
export const HOST_STYLES: Record<string, string> = {
  all: "initial",
  position: "fixed",
  top: "0",
  left: "0",
  width: "0",
  height: "0",
  "z-index": "2147483647",
  display: "block",
  "pointer-events": "none",
};

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M2 4l3 3 3-3' stroke='%23A9A5BD' stroke-width='1.4' fill='none'/%3E%3C/svg%3E\")";

export const STYLES = `
:host {
  all: initial;

  --sth-orb-core: #F4F1FF;
  --sth-orb-mid:  #AFA9EC;
  --sth-orb-edge: #7F77DD;
  --sth-orb-deep: #534AB7;
  --sth-orb-fill: radial-gradient(circle at 38% 34%, #FFFFFF 0%, #F4F1FF 24%, #D6D1F6 52%, #AFA9EC 76%, #7F77DD 100%);
  --sth-orb-fill-bright: radial-gradient(circle at 38% 34%, #FFFFFF 0%, #F8F6FF 30%, #DFDAF9 56%, #B8B2F0 78%, #8A82E4 100%);
  --sth-orb-glow: 0 0 16px 2px rgba(127,119,221,.42), 0 0 40px 6px rgba(83,74,183,.26);
  --sth-orb-glow-bright: 0 0 22px 6px rgba(175,169,236,.7), 0 0 60px 14px rgba(127,119,221,.45);
  --sth-orb-edge-light: 0 2px 10px rgba(14,13,20,.35);
  --sth-chrome: linear-gradient(135deg, #FFFFFF 0%, #D3D1DE 34%, #6F6C82 50%, #F3F2F8 64%, #8E8BA0 100%);

  --sth-ink: #000000;
  /* Pure black surfaces; raised elements sit one level up so hierarchy survives. */
  --sth-surface: #000000;
  --sth-raised: #0B0B0F;
  --sth-raised-hover: #121218;
  --sth-surface-2: var(--sth-raised);
  --sth-surface-3: rgba(175,169,236,.10);
  --sth-hairline: rgba(175,169,236,.22);
  --sth-hairline-soft: rgba(175,169,236,.14);
  /* X dark mode is also pure black: the hairline and violet glow separate the card from the page. */
  --sth-shadow: 0 0 0 1px rgba(127,119,221,.12), 0 12px 40px rgba(83,74,183,.28), 0 24px 60px -12px rgba(0,0,0,.65);
  --sth-blur: blur(18px) saturate(140%);

  --sth-text: #F5F0E6;
  --sth-text-2: #A9A5BD;
  --sth-text-3: #8C88A0;
  --sth-text-on-orb: #16131F;
  --sth-link: #CFCAF6;

  --sth-yes: #5DCAA5;  --sth-yes-bg: rgba(93,202,165,.12);
  --sth-no:  #F0997B;  --sth-no-bg:  rgba(240,153,123,.12);
  --sth-warn: #F2C069; --sth-warn-bg: rgba(242,192,105,.10);
  --sth-focus: #F4F1FF;

  --sth-font-serif: "${FONT_SERIF}", "Lora", Georgia, serif;
  --sth-font-sans: "${FONT_SANS}", "Inter", system-ui, -apple-system, sans-serif;
  --sth-font-mono: "${FONT_MONO}", "JetBrains Mono", ui-monospace, Menlo, monospace;

  --sth-r-card: 20px; --sth-r-tile: 14px;
  --sth-r-field: 12px; --sth-r-pill: 999px;
  --sth-space-1: 4px; --sth-space-2: 8px; --sth-space-3: 12px;
  --sth-space-4: 16px; --sth-space-5: 24px;
  --sth-target: 32px;
  --sth-card-w: ${CARD_WIDTH}px; --sth-orb: ${ORB_SIZE}px;

  --sth-breathe: 4.8s; --sth-shimmer: 9s;
  --sth-think: 1.1s;   --sth-twinkle: .6s;
  --sth-pulse: .9s;    --sth-ease: cubic-bezier(.2,.7,.2,1);
}

*, *::before, *::after {
  box-sizing: border-box;
}

:host :focus-visible {
  outline: 2px solid var(--sth-focus);
  outline-offset: 2px;
}

@keyframes sthBreathe {
  0%, 100% { box-shadow: 0 0 16px 2px rgba(127,119,221,.42), 0 0 40px 6px rgba(83,74,183,.26); }
  50% { box-shadow: 0 0 24px 5px rgba(127,119,221,.6), 0 0 60px 12px rgba(83,74,183,.36); }
}
@keyframes sthBreatheBright {
  0%, 100% { box-shadow: 0 0 22px 6px rgba(175,169,236,.7), 0 0 60px 14px rgba(127,119,221,.45); }
  50% { box-shadow: 0 0 30px 9px rgba(175,169,236,.85), 0 0 80px 20px rgba(127,119,221,.55); }
}
@keyframes sthShimmer {
  0% { transform: translate(-14%, -10%) rotate(0deg); }
  50% { transform: translate(10%, 8%) rotate(180deg); }
  100% { transform: translate(-14%, -10%) rotate(360deg); }
}
@keyframes sthSpin { to { transform: rotate(360deg); } }
@keyframes sthTwinkle {
  0% { transform: scale(0) rotate(-45deg); opacity: 0; }
  60% { transform: scale(1.25) rotate(8deg); opacity: 1; }
  100% { transform: scale(1) rotate(0deg); opacity: 1; }
}
@keyframes sthPulse {
  0% { transform: scale(1); opacity: .7; }
  100% { transform: scale(2.4); opacity: 0; }
}
@keyframes sthCardIn {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

/* ---------- Orb (orb.idle / orb.thinking / orb.found / orb.success) ---------- */

.orb {
  position: fixed;
  width: var(--sth-orb);
  height: var(--sth-orb);
  padding: 0;
  border: none;
  background: transparent;
  cursor: grab;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  transition: transform 150ms var(--sth-ease);
}
.orb:hover { transform: scale(1.04); }
.orb.dragging { cursor: grabbing; transform: scale(.96); transition: none; }

.orb-body {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  background: var(--sth-orb-fill);
  box-shadow: var(--sth-orb-glow);
  animation: sthBreathe var(--sth-breathe) ease-in-out infinite;
}
.orb-shimmer {
  position: absolute;
  inset: -20%;
  background:
    radial-gradient(circle at 30% 30%, rgba(255,255,255,.75) 0%, rgba(255,255,255,0) 32%),
    radial-gradient(circle at 72% 70%, rgba(127,119,221,.35) 0%, rgba(127,119,221,0) 36%);
  animation: sthShimmer var(--sth-shimmer) ease-in-out infinite;
}
/* The chrome glint on the upper-right rim: part of the mark, always on. */
.orb-glint {
  position: absolute;
  right: -6px;
  top: -8px;
  width: 22px;
  height: 22px;
  pointer-events: none;
}
.orb-glint svg, .star svg { display: block; width: 100%; height: 100%; }

.orb-arc {
  position: absolute;
  inset: -7px;
  border-radius: 50%;
  border: 1.5px solid transparent;
  border-top-color: var(--sth-text);
  border-right-color: rgba(245,240,230,.35);
  opacity: 0;
  pointer-events: none;
}
.orb[data-state="thinking"] .orb-arc {
  opacity: 1;
  animation: sthSpin var(--sth-think) linear infinite;
}
/* Ivory vanishes on a white page: the arc goes deep violet there. */
:host([data-theme="light"]) .orb-arc {
  border-top-color: var(--sth-orb-deep);
  border-right-color: rgba(83,74,183,.35);
}

.orb[data-state="found"] .orb-body {
  background: var(--sth-orb-fill-bright);
  animation: sthBreatheBright 3.2s ease-in-out infinite;
}
.orb-stars { position: absolute; inset: 0; pointer-events: none; }
.orb-stars .star {
  position: absolute;
  transform-origin: 50% 50%;
  animation: sthTwinkle var(--sth-twinkle) var(--sth-ease) both;
}
.orb-stars .star:nth-child(1) { left: -22px; top: -10px; width: 16px; height: 16px; }
.orb-stars .star:nth-child(2) { left: -34px; top: 16px; width: 12px; height: 12px; animation-delay: .12s; }
.orb-stars .star:nth-child(3) { left: 4px; top: -30px; width: 13px; height: 13px; animation-delay: .24s; }

.orb-pulse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(244,241,255,.9) 0%, rgba(175,169,236,.4) 60%, rgba(175,169,236,0) 72%);
  opacity: 0;
  pointer-events: none;
}
.orb.success .orb-pulse { animation: sthPulse var(--sth-pulse) var(--sth-ease) both; }
.orb.success .orb-body { animation: sthBreatheBright 1.2s ease-in-out; }

/* On light pages the orb's edge needs help, and the stars a drop shadow. */
:host([data-theme="light"]) .orb-body {
  box-shadow: var(--sth-orb-glow), var(--sth-orb-edge-light), inset 0 0 0 1px rgba(83,74,183,.35);
  animation: none;
}
:host([data-theme="light"]) .orb[data-state="found"] .orb-body {
  box-shadow: var(--sth-orb-glow-bright), var(--sth-orb-edge-light), inset 0 0 0 1px rgba(83,74,183,.35);
}
:host([data-theme="light"]) .orb-stars .star,
:host([data-theme="light"]) .orb-glint { filter: drop-shadow(0 1px 1px rgba(14,13,20,.5)); }

/* ---------- Card ---------- */

.card {
  position: fixed;
  width: var(--sth-card-w);
  max-width: calc(100vw - ${EDGE_PADDING * 2}px);
  max-height: calc(100vh - ${EDGE_PADDING * 2}px);
  display: flex;
  flex-direction: column;
  border: 1px solid var(--sth-hairline);
  border-radius: var(--sth-r-card);
  background: var(--sth-surface);
  -webkit-backdrop-filter: var(--sth-blur);
  backdrop-filter: var(--sth-blur);
  box-shadow: var(--sth-shadow);
  color: var(--sth-text);
  font: 400 14px/1.45 var(--sth-font-sans);
  text-align: left;
  overflow: hidden;
  pointer-events: auto;
  animation: sthCardIn 140ms var(--sth-ease);
}
.card[hidden] { display: none; }

.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
  padding: 14px 12px 12px 16px;
}
.brand { display: flex; align-items: center; gap: 10px; }
.mark { position: relative; width: 20px; height: 20px; flex: none; }
.mark-body {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--sth-orb-fill);
  box-shadow: 0 0 8px rgba(127,119,221,.6);
}
.mark .star { position: absolute; right: -4px; top: -5px; width: 11px; height: 11px; }
.wordmark { font: 500 18px/1 var(--sth-font-serif); color: var(--sth-text); }
.close {
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--sth-text-2);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
.close:hover { background: var(--sth-surface-3); color: var(--sth-text); }
.close svg { display: block; }

.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  flex: none;
  margin: 0 16px 12px;
  padding: 3px;
  border: 1px solid var(--sth-hairline-soft);
  border-radius: var(--sth-r-pill);
  background: var(--sth-surface-2);
}
.tab {
  height: 32px;
  border: 0;
  border-radius: var(--sth-r-pill);
  background: transparent;
  color: var(--sth-text-2);
  font: 500 13px/1 var(--sth-font-sans);
  cursor: pointer;
}
.tab.selected { background: var(--sth-raised-hover); color: var(--sth-text); }

.body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.body[hidden] { display: none; }
/* While a sheet is open the body stops scrolling: the sheet's form scrolls
   under its own fixed footer instead (review-sheet: "button sticks to the bottom"). */
.body.has-sheet { padding: 0; overflow: hidden; gap: 0; }

/* ---------- Type ---------- */

.line {
  margin: 0;
  color: var(--sth-text-2);
  font: 400 13px/1.5 var(--sth-font-sans);
}
.note, .muted {
  margin: 0;
  color: var(--sth-text-2);
  font: 400 12px/1.5 var(--sth-font-sans);
}
.note:empty, .muted:empty, .status-line:empty, .warn:empty { display: none; }
.mono { font-family: var(--sth-font-mono); }
.status-line { margin: 10px 0 0; color: var(--sth-text); font: 400 13px/1.5 var(--sth-font-sans); }

/* ---------- Buttons (btn.primary / btn.secondary / link) ---------- */

.button {
  height: 36px;
  padding: 0 18px;
  border: 1px solid rgba(175,169,236,.3);
  border-radius: var(--sth-r-pill);
  background: rgba(175,169,236,.08);
  color: var(--sth-text);
  font: 600 13px/1 var(--sth-font-sans);
  cursor: pointer;
  white-space: nowrap;
}
.button { background: var(--sth-raised); }
.button:hover { background: var(--sth-raised-hover); }
.button.primary {
  padding: 0 14px;
  border: 0;
  background: linear-gradient(180deg, #F4F1FF, #C9C3F2);
  color: var(--sth-text-on-orb);
  box-shadow: 0 0 0 1px rgba(255,255,255,.4) inset, 0 4px 14px -4px rgba(127,119,221,.6);
}
.button.primary:hover {
  background: linear-gradient(180deg, #FFFFFF, #D6D1F6);
  box-shadow: 0 6px 20px -4px rgba(175,169,236,.7);
}
.button.wide {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  width: 100%;
  height: 44px;
  font-size: 14px;
}
.button.ext::after { content: " \\2197"; margin-left: 4px; }
.button.wide.primary { box-shadow: 0 0 0 1px rgba(255,255,255,.4) inset, 0 6px 20px -6px rgba(127,119,221,.7); }
.button.small { height: 32px; padding: 0 16px; }
.button.dry {
  border: 1px dashed rgba(175,169,236,.5);
  background: transparent;
  color: var(--sth-link);
  box-shadow: none;
}
.button.dry:hover { background: var(--sth-surface-3); }
.button:disabled, .button[aria-disabled="true"], .button.primary:disabled {
  border: 0;
  background: rgba(175,169,236,.12);
  color: var(--sth-text-3);
  box-shadow: none;
  cursor: not-allowed;
}
a.button { display: inline-flex; align-items: center; justify-content: center; text-decoration: none; }

.link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 32px;
  padding: 0;
  border: none;
  background: none;
  color: var(--sth-link);
  font: 500 13px/1 var(--sth-font-sans);
  text-decoration: none;
  cursor: pointer;
}
.link:hover { color: var(--sth-text); text-decoration: underline; }
.link.ext::after { content: " \\2197"; }
.link.block { display: flex; margin-top: 4px; }
.link.mono { font: 400 12px/1 var(--sth-font-mono); color: var(--sth-text-2); }
.live-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sth-yes);
  box-shadow: 0 0 6px var(--sth-yes);
}
.ghost {
  height: 32px;
  padding: 0 10px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--sth-text-2);
  font: 500 12px/1 var(--sth-font-sans);
  cursor: pointer;
}
.ghost:hover { color: var(--sth-text); background: var(--sth-surface-3); }

/* ---------- Claim tiles (claim-tile.unmatched / .matched / .own-live) ---------- */

.tile {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--sth-hairline-soft);
  border-radius: var(--sth-r-tile);
  background: var(--sth-raised);
}
.meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.chip {
  padding: 5px 8px;
  border-radius: var(--sth-r-pill);
  background: var(--sth-raised-hover);
  color: var(--sth-link);
  font: 500 11px/1 var(--sth-font-sans);
  letter-spacing: .06em;
  text-transform: uppercase;
}
.ends { color: var(--sth-text-2); font: 400 11px/1 var(--sth-font-mono); }
.question {
  margin: 0;
  color: var(--sth-text);
  font: 400 17px/1.4 var(--sth-font-serif);
  text-wrap: pretty;
  overflow-wrap: anywhere;
}
.quote {
  margin: 0;
  color: var(--sth-text-2);
  font: italic 400 13px/1.5 var(--sth-font-serif);
  overflow-wrap: anywhere;
}
.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.actions.end { justify-content: flex-end; }
.odds { color: var(--sth-yes); font: 500 15px/1 var(--sth-font-mono); }

/* ---------- Empty / skipped / error (this-page.empty, .skipped, .error) ---------- */

.state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 36px 12px 40px;
  text-align: center;
}
.state.error { padding: 32px 12px; gap: 16px; }
.state-orb {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: radial-gradient(circle at 38% 34%, #F4F1FF 0%, #AFA9EC 60%, #534AB7 100%);
  opacity: .55;
}
.state.skipped .state-orb { opacity: .35; }
.state.error .state-orb { opacity: .35; box-shadow: 0 0 0 1.5px rgba(240,153,123,.6); }
.state-text { margin: 0; color: var(--sth-text); font: 400 19px/1.4 var(--sth-font-serif); }

/* ---------- Sheets (review-sheet, bet-sheet) ---------- */

.sheet { display: flex; flex-direction: column; flex: 1 1 auto; min-height: 0; }
.sheet-head {
  display: flex;
  align-items: center;
  gap: 4px;
  flex: none;
  padding: 10px 12px;
  border-top: 1px solid var(--sth-hairline-soft);
  border-bottom: 1px solid var(--sth-hairline-soft);
}
.back {
  height: 32px;
  padding: 0 8px;
  border: 0;
  border-radius: 10px;
  background: transparent;
  color: var(--sth-text-2);
  font: 500 13px/1 var(--sth-font-sans);
  cursor: pointer;
}
.back:hover { color: var(--sth-text); background: var(--sth-surface-3); }
.sheet-title { margin: 0 0 0 4px; color: var(--sth-text); font: 500 16px/1 var(--sth-font-serif); }
.form, .outcome {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  gap: 18px;
  padding: 16px;
  overflow-y: auto;
}
.outcome.success ~ .steps { display: none; }
/* Once an outcome shows, the footer button has done its job. */
.outcome:not([hidden]) ~ .sheet-foot { display: none; }
.form[hidden], .outcome[hidden], .steps[hidden] { display: none; }
.sheet-foot {
  flex: none;
  padding: 12px 16px 16px;
  border-top: 1px solid var(--sth-hairline-soft);
}
.sheet-foot:empty { display: none; }
.sheet-foot .status-line { margin: 0 0 10px; }

.field { display: flex; flex-direction: column; gap: 8px; }
.field-label {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  color: var(--sth-text-2);
  font: 500 12px/1.2 var(--sth-font-sans);
}
.counter { color: var(--sth-text-3); font: 400 11px/1 var(--sth-font-mono); }
.counter.over { color: var(--sth-no); font-weight: 500; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }

.input {
  display: block;
  width: 100%;
  min-height: 40px;
  padding: 0 12px;
  border: 1px solid var(--sth-hairline);
  border-radius: var(--sth-r-field);
  background: var(--sth-surface-2);
  color: var(--sth-text);
  color-scheme: dark;
  font: 500 13px/1.3 var(--sth-font-sans);
}
.input:focus-visible {
  outline: none;
  border-color: rgba(175,169,236,.45);
  box-shadow: 0 0 0 3px rgba(175,169,236,.12);
}
textarea.input {
  padding: 12px;
  font: 400 16px/1.45 var(--sth-font-serif);
  resize: vertical;
}
select.input {
  padding-right: 30px;
  appearance: none;
  -webkit-appearance: none;
  background-image: ${CHEVRON};
  background-repeat: no-repeat;
  background-position: right 10px center;
  cursor: pointer;
}
input[type="date"].input { font-family: var(--sth-font-mono); }
input[type="number"].input { font-family: var(--sth-font-mono); }

/* Market type cards */
.types { display: flex; flex-direction: column; gap: 8px; }
.type {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px;
  border: 1px solid rgba(175,169,236,.14);
  border-radius: var(--sth-r-field);
  background: var(--sth-raised);
  cursor: pointer;
}
.type:hover { background: var(--sth-raised-hover); }
.type:has(.type-box:checked) { border-color: var(--sth-orb-mid); background: var(--sth-raised-hover); }
.type-box {
  flex: none;
  width: 16px;
  height: 16px;
  margin: 0;
  appearance: none;
  -webkit-appearance: none;
  border: 1.5px solid var(--sth-text-3);
  border-radius: 50%;
  background: transparent;
  cursor: pointer;
}
.type-box:checked { border-color: var(--sth-focus); background: radial-gradient(circle, #F4F1FF 0 4px, transparent 4.5px); }
.type-text { display: flex; flex-direction: column; gap: 6px; min-width: 0; flex: 1; }
.type-name { display: flex; align-items: center; color: var(--sth-text); font: 600 14px/1 var(--sth-font-sans); }
.type-fee { margin-left: auto; color: var(--sth-text-2); font: 500 13px/1 var(--sth-font-mono); }
.type:has(.type-box:checked) .type-fee { color: var(--sth-text); }
.type-blurb { color: var(--sth-text-2); font: 400 12.5px/1.5 var(--sth-font-sans); }
.type:not(:has(.type-box:checked)) .type-blurb { display: none; }

/* How it resolves */
.rule { border: 1px solid rgba(175,169,236,.14); border-radius: var(--sth-r-field); background: var(--sth-raised); }
.rule-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 40px;
  padding: 0 12px;
  color: var(--sth-text);
  font: 500 13px/1 var(--sth-font-sans);
  list-style: none;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}
.rule-summary::-webkit-details-marker { display: none; }
.rule-summary::after {
  content: "";
  width: 10px;
  height: 10px;
  background: ${CHEVRON} center / contain no-repeat;
}
.rule[open] .rule-summary::after { transform: rotate(180deg); }
.rule-body { display: flex; flex-direction: column; gap: 10px; padding: 0 12px 12px; }
.sources { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }
.source a, .source {
  display: inline-block;
  padding: 7px 10px;
  border: 1px solid rgba(175,169,236,.2);
  background: var(--sth-raised-hover);
  border-radius: var(--sth-r-pill);
  color: var(--sth-text);
  font: 400 12px/1 var(--sth-font-mono);
  text-decoration: none;
}
.source a:hover { border-color: rgba(175,169,236,.5); }
.rule-text { margin: 0; color: var(--sth-text-3); font: 400 11.5px/1.5 var(--sth-font-sans); overflow-wrap: anywhere; }

/* Wallet row (wallet-row.connected / .disconnected) */
.wallet {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--sth-r-field);
  background: var(--sth-surface-2);
}
.wallet.disconnected { padding: 0; background: transparent; }
.wallet-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--sth-yes); }
.wallet-text { display: flex; flex-direction: column; gap: 5px; min-width: 0; }
.wallet-address { color: var(--sth-text); font: 500 13px/1 var(--sth-font-mono); }
.wallet-holdings { color: var(--sth-text-2); font: 400 11px/1 var(--sth-font-mono); }
.wallet .ghost { margin-left: auto; }
.button.connect {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 100%;
  height: 44px;
  border-radius: var(--sth-r-field);
  font-size: 14px;
}
.phantom-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 6px;
  background: #AB9FF2;
  color: var(--sth-text-on-orb);
  font: 700 10px/1 var(--sth-font-sans);
}

/* Fee box */
.fee {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border: 1px solid rgba(175,169,236,.14);
  border-radius: var(--sth-r-field);
  background: var(--sth-raised);
  color: var(--sth-text-2);
  font: 400 13px/1.5 var(--sth-font-sans);
}
.fee:empty { display: none; }
.fee-row { display: flex; justify-content: space-between; gap: 12px; font: 400 12px/1 var(--sth-font-sans); }
.fee-row.total { color: var(--sth-text); font: 500 13px/1 var(--sth-font-sans); }
.fee-row .mono { font-family: var(--sth-font-mono); }

/* Amber warning */
.warn {
  display: flex;
  gap: 10px;
  margin: 0;
  padding: 10px 12px;
  border: 1px solid rgba(242,192,105,.3);
  border-radius: var(--sth-r-field);
  background: var(--sth-warn-bg);
  color: var(--sth-warn);
  font: 400 12.5px/1.5 var(--sth-font-sans);
}
.warn svg { flex: none; margin-top: 1px; }
.warn .mono { font-family: var(--sth-font-mono); }

/* Progress steps (progress-steps) */
.steps {
  display: flex;
  flex: none;
  flex-direction: column;
  gap: 14px;
  margin: 0 16px 16px;
  padding: 16px;
  border: 1px solid var(--sth-hairline);
  border-radius: 16px;
  background: var(--sth-raised);
  list-style: none;
}
.step { display: flex; align-items: center; gap: 12px; color: var(--sth-text-3); font: 500 13px/1 var(--sth-font-sans); }
.step-icon { position: relative; flex: none; width: 20px; height: 20px; }
.step-icon::before {
  content: "";
  position: absolute;
  inset: 1.5px;
  border-radius: 50%;
  border: 1.5px solid rgba(175,169,236,.25);
}
.step[data-state="active"] { color: var(--sth-text); font-weight: 600; }
.step[data-state="active"] .step-icon::before { inset: 0; border-color: rgba(175,169,236,.2); }
.step[data-state="active"] .step-icon::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.5px solid transparent;
  border-top-color: var(--sth-text);
  animation: sthSpin var(--sth-think) linear infinite;
}
.step[data-state="done"] { color: var(--sth-text-2); }
.step[data-state="done"] .step-icon::before { inset: 0; border: 0; background: rgba(93,202,165,.16); }
.step[data-state="done"] .step-icon::after {
  content: "";
  position: absolute;
  inset: 0;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 10 10'%3E%3Cpath d='M2 5.2l2 2 4-4.4' stroke='%235DCAA5' stroke-width='1.6' fill='none' stroke-linecap='round'/%3E%3C/svg%3E") center no-repeat;
}
.step[data-state="error"] { color: var(--sth-no); }
.step[data-state="error"] .step-icon::before { inset: 0; border-color: rgba(240,153,123,.6); }

/* ---------- Bet sheet ---------- */

.sides { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.side {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  height: 68px;
  border: 1px solid var(--sth-hairline);
  border-radius: var(--sth-r-tile);
  background: var(--sth-raised);
  cursor: pointer;
}
.side:hover { background: var(--sth-raised-hover); }
.side-label { color: var(--sth-text-2); font: 600 13px/1 var(--sth-font-sans); letter-spacing: .06em; }
.side-pct { color: var(--sth-text-2); font: 500 22px/1 var(--sth-font-mono); }
.side-yes.selected { border: 1.5px solid var(--sth-yes); background: var(--sth-yes-bg); }
.side-yes.selected .side-label, .side-yes.selected .side-pct { color: var(--sth-yes); }
.side-no.selected { border: 1.5px solid var(--sth-no); background: var(--sth-no-bg); }
.side-no.selected .side-label, .side-no.selected .side-pct { color: var(--sth-no); }

.chips { display: grid; grid-template-columns: 1fr 1fr 1fr 1.6fr; gap: 6px; }
.chip-button {
  height: 40px;
  border: 1px solid var(--sth-hairline);
  border-radius: var(--sth-r-field);
  background: var(--sth-raised);
  color: var(--sth-text);
  font: 500 14px/1 var(--sth-font-mono);
  cursor: pointer;
}
.chip-button:hover { background: var(--sth-raised-hover); }
.chip-button.selected { border-color: var(--sth-orb-mid); background: var(--sth-raised-hover); }
.custom {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  padding: 0 10px;
  border: 1px solid var(--sth-hairline);
  border-radius: var(--sth-r-field);
  background: var(--sth-surface-2);
}
.custom:focus-within { border-color: rgba(175,169,236,.45); box-shadow: 0 0 0 3px rgba(175,169,236,.12); }
.custom-sign { color: var(--sth-text-3); font: 500 14px/1 var(--sth-font-mono); }
.custom .input.amount {
  min-height: 0;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  font: 500 14px/1 var(--sth-font-mono);
  -moz-appearance: textfield;
}
.custom .input.amount::-webkit-outer-spin-button, .custom .input.amount::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.custom .input.amount::placeholder { color: var(--sth-text-3); font: 400 13px/1 var(--sth-font-sans); }
.custom .input.amount:focus-visible { box-shadow: none; }

.quote-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: var(--sth-r-field);
  background: var(--sth-surface-2);
  color: var(--sth-text);
  font: 400 13px/1.55 var(--sth-font-sans);
}
.quote-box:empty { display: none; }
.quote-box .mono { font-family: var(--sth-font-mono); }
.quote-box .yes { color: var(--sth-yes); }
.quote-box .no { color: var(--sth-no); }
.quote-box .note { color: var(--sth-text-2); }

.button.buy { border: 0; color: var(--sth-ink); }
.button.buy[data-side="yes"] { background: var(--sth-yes); box-shadow: 0 6px 20px -8px rgba(93,202,165,.8); }
.button.buy[data-side="no"] { background: var(--sth-no); box-shadow: 0 6px 20px -8px rgba(240,153,123,.8); }
.button.buy:disabled { background: rgba(175,169,236,.12); color: var(--sth-text-3); box-shadow: none; }

/* ---------- Success (success.market-live / success.bet-placed) ---------- */

.success { padding: 28px 20px 20px; gap: 18px; align-items: stretch; }
.flourish { position: relative; height: 64px; }
.flourish .star {
  position: absolute;
  left: 50%;
  animation: sthTwinkle var(--sth-twinkle) var(--sth-ease) both;
}
.flourish .star:nth-child(1) { top: 0; width: 30px; height: 46px; margin-left: -15px; }
.flourish .star:nth-child(2) { top: 28px; width: 16px; height: 16px; margin-left: -46px; animation-delay: .12s; }
.flourish .star:nth-child(3) { top: 22px; width: 18px; height: 18px; margin-left: 28px; animation-delay: .24s; }
.success-title { margin: 0; color: var(--sth-text); font: 400 26px/1.25 var(--sth-font-serif); text-align: center; }
.success-sub { margin: 0; color: var(--sth-text-2); font: 400 15px/1.45 var(--sth-font-serif); text-align: center; text-wrap: pretty; }
.button-stack { display: flex; flex-direction: column; gap: 8px; }
.button-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.button-grid .button { height: 40px; }
.button-grid .button.tall { height: 44px; font-size: 14px; }
.summary-box {
  padding: 12px;
  border: 1px solid rgba(93,202,165,.25);
  border-radius: var(--sth-r-field);
  background: rgba(93,202,165,.08);
  color: var(--sth-text);
  font: 400 13px/1.55 var(--sth-font-sans);
  text-align: center;
}
.summary-box .mono { font-family: var(--sth-font-mono); }
.summary-box .yes { color: var(--sth-yes); }
.summary-box .no { color: var(--sth-no); }
.summary-box .muted-inline { color: var(--sth-text-2); }
.centered { align-self: center; }

/* ---------- My bets ---------- */

.refresh-row { display: flex; justify-content: flex-end; }
.refresh-row .link { padding: 0 4px; font-size: 12px; }
.positions { display: flex; flex-direction: column; gap: 8px; }
.position { display: flex; align-items: center; gap: 10px; }
.side-chip {
  flex: none;
  width: 28px;
  background: var(--sth-raised-hover);
  padding: 5px 0;
  border-radius: 6px;
  text-align: center;
  font: 600 11px/1 var(--sth-font-sans);
  letter-spacing: .06em;
}
.side-chip-yes { color: var(--sth-yes); background: var(--sth-yes-bg); }
.side-chip-no { color: var(--sth-no); background: var(--sth-no-bg); }
.position-text { color: var(--sth-text); font: 400 13px/1 var(--sth-font-mono); }
.tile.market .question { font-size: 16px; }
.tile.market .actions { margin-top: 8px; }

/* Tooltip for the disabled Claim button */
.tip { position: relative; }
.tip::after {
  content: attr(data-tip);
  position: absolute;
  right: 0;
  bottom: calc(100% + 8px);
  padding: 8px 10px;
  border-radius: 8px;
  background: var(--sth-orb-core);
  color: var(--sth-text-on-orb);
  font: 500 12px/1 var(--sth-font-sans);
  white-space: nowrap;
  box-shadow: 0 8px 20px rgba(0,0,0,.4);
  opacity: 0;
  pointer-events: none;
  transition: opacity 120ms var(--sth-ease);
}
.tip::before {
  content: "";
  position: absolute;
  right: 18px;
  bottom: calc(100% + 3px);
  border: 5px solid transparent;
  border-top-color: var(--sth-orb-core);
  opacity: 0;
  pointer-events: none;
}
.tip:hover::after, .tip:focus-within::after, .tip:hover::before, .tip:focus-within::before { opacity: 1; }

/* ---------- Debug footer ---------- */

.debug {
  flex: none;
  padding: 8px 16px 12px;
  border-top: 1px solid rgba(175,169,236,.10);
  color: var(--sth-text-3);
  font: 400 11px/1.7 var(--sth-font-mono);
}
.debug-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  list-style: none;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}
.debug-summary::-webkit-details-marker { display: none; }
.debug-summary::before {
  content: "";
  width: 8px;
  height: 8px;
  background: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='8' height='8' viewBox='0 0 8 8'%3E%3Cpath d='M2 1l4 3-4 3z' fill='%238C88A0'/%3E%3C/svg%3E") center no-repeat;
  transition: transform 120ms var(--sth-ease);
}
.debug[open] .debug-summary::before { transform: rotate(90deg); }
.scan {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 2px 10px;
  margin: 0 0 8px;
}
.scan-name { color: var(--sth-text-3); }
.scan-value { margin: 0; color: var(--sth-text-2); overflow-wrap: anywhere; }
.debug .button.small { margin: 2px 0 8px; font-size: 12px; }
.toggle { display: flex; align-items: center; gap: 8px; padding: 3px 0; color: var(--sth-text-2); cursor: pointer; }
.toggle-box { margin: 0; accent-color: var(--sth-orb-edge); }
.status { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--sth-text-3); }
.status[data-state="good"] .dot { background: var(--sth-yes); box-shadow: 0 0 6px rgba(93,202,165,.6); }
.status[data-state="bad"] .dot { background: var(--sth-no); }

@media (prefers-reduced-motion: reduce) {
  :host * { animation: none !important; transition: none !important; }
  /* The thinking arc stays visible and static; found stars render at rest;
     the success pulse is replaced by the found glow for 1.2s. */
  .orb[data-state="thinking"] .orb-arc { opacity: 1; }
  .orb-stars .star, .flourish .star { opacity: 1; transform: none; }
  .orb.success .orb-body { background: var(--sth-orb-fill-bright); box-shadow: var(--sth-orb-glow-bright); }
}
`;
