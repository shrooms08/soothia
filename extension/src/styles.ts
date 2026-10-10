// All Soothia styles live in this one file so the placeholder look can be
// swapped out later without touching behavior. Sizes used by the layout code
// are exported so the two stay in sync.

export const ORB_SIZE = 56;
export const ORB_MARGIN = 24;
export const CARD_WIDTH = 340;
export const CARD_GAP = 12;
export const EDGE_PADDING = 8;

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

export const STYLES = `
:host {
  all: initial;
}

*, *::before, *::after {
  box-sizing: border-box;
}

.orb {
  position: fixed;
  width: ${ORB_SIZE}px;
  height: ${ORB_SIZE}px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: radial-gradient(circle at 50% 45%, #ffffff 0%, #f3ecff 38%, #c9b3ff 72%, #9b7bff 100%);
  box-shadow:
    0 0 0 1px rgba(155, 123, 255, 0.35),
    0 0 18px 4px rgba(155, 123, 255, 0.45),
    0 6px 20px rgba(20, 10, 50, 0.35);
  cursor: grab;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  transition: transform 150ms ease-out;
  animation: soothia-pulse 3.2s ease-in-out infinite;
}

.orb:hover {
  transform: scale(1.05);
}

.orb:focus-visible {
  outline: 2px solid #c9b3ff;
  outline-offset: 4px;
}

.orb.dragging {
  cursor: grabbing;
  transform: scale(1.08);
  transition: none;
}

@keyframes soothia-pulse {
  0%, 100% {
    box-shadow:
      0 0 0 1px rgba(155, 123, 255, 0.35),
      0 0 14px 2px rgba(155, 123, 255, 0.35),
      0 6px 20px rgba(20, 10, 50, 0.35);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(155, 123, 255, 0.45),
      0 0 26px 8px rgba(155, 123, 255, 0.6),
      0 6px 20px rgba(20, 10, 50, 0.35);
  }
}

/* Orb states: idle is the base pulse above. */

.orb[data-state="thinking"] {
  animation: soothia-pulse-thinking 5.5s ease-in-out infinite;
}

/* Thinking ring: a thin arc circling just outside the orb. One half is
   violet and the other white, with a dark hairline shadow, so some part of
   it contrasts with any page, light or dark. */
.ring {
  position: absolute;
  inset: -8px;
  border: 3px solid transparent;
  border-top-color: #7c4dff;
  border-right-color: #ffffff;
  border-radius: 50%;
  filter: drop-shadow(0 0 1.5px rgba(0, 0, 0, 0.7));
  opacity: 0;
  pointer-events: none;
  transition: opacity 150ms ease-out;
}

.orb[data-state="thinking"] .ring {
  opacity: 1;
  animation: soothia-ring-spin 0.9s linear infinite;
}

@keyframes soothia-ring-spin {
  to { transform: rotate(360deg); }
}

.orb[data-state="found"] {
  animation: soothia-pulse-found 2.4s ease-in-out infinite;
}

@keyframes soothia-pulse-thinking {
  0%, 100% {
    box-shadow:
      0 0 0 1px rgba(155, 123, 255, 0.25),
      0 0 8px 1px rgba(155, 123, 255, 0.2),
      0 6px 20px rgba(20, 10, 50, 0.3);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(155, 123, 255, 0.35),
      0 0 16px 4px rgba(155, 123, 255, 0.35),
      0 6px 20px rgba(20, 10, 50, 0.3);
  }
}

@keyframes soothia-pulse-found {
  0%, 100% {
    box-shadow:
      0 0 0 2px rgba(201, 179, 255, 0.7),
      0 0 24px 8px rgba(155, 123, 255, 0.7),
      0 6px 20px rgba(20, 10, 50, 0.35);
  }
  50% {
    box-shadow:
      0 0 0 2px rgba(201, 179, 255, 0.9),
      0 0 40px 16px rgba(155, 123, 255, 0.85),
      0 6px 20px rgba(20, 10, 50, 0.35);
  }
}

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 20px;
  height: 20px;
  padding: 0 5px;
  border: 2px solid #15121f;
  border-radius: 10px;
  background: #7c4dff;
  color: #ffffff;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 11px;
  font-weight: 700;
  line-height: 16px;
  text-align: center;
  pointer-events: none;
}

.badge[hidden] {
  display: none;
}

.card {
  position: fixed;
  width: ${CARD_WIDTH}px;
  max-width: calc(100vw - ${EDGE_PADDING * 2}px);
  max-height: calc(100vh - ${EDGE_PADDING * 2}px);
  overflow-y: auto;
  padding: 18px 20px 10px;
  border: 1px solid rgba(155, 123, 255, 0.25);
  border-radius: 16px;
  background: #15121f;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.5);
  color: #f2eefc;
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.45;
  text-align: left;
  pointer-events: auto;
  animation: soothia-card-in 140ms ease-out;
}

.card[hidden] {
  display: none;
}

@keyframes soothia-card-in {
  from { opacity: 0; transform: translateY(4px); }
  to { opacity: 1; transform: translateY(0); }
}

.title {
  margin: 0 0 4px;
  font-size: 17px;
  font-weight: 650;
  letter-spacing: 0.01em;
  color: #ffffff;
}

.line {
  margin: 0 0 14px;
  color: #b9b1cf;
}

.tile {
  margin: 10px 0 12px;
  padding: 12px 14px;
  border: 1px solid rgba(155, 123, 255, 0.2);
  border-radius: 12px;
  background: #1d192b;
}

.question {
  margin: 0 0 8px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  color: #b9b1cf;
  font-size: 12px;
}

.chip {
  padding: 2px 8px;
  border-radius: 999px;
  background: rgba(155, 123, 255, 0.18);
  color: #d9ccff;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.quote {
  margin: 0 0 10px;
  color: #8b84a3;
  font-size: 12px;
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.odds {
  color: #4ade80;
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.button {
  padding: 7px 14px;
  border: 1px solid rgba(155, 123, 255, 0.45);
  border-radius: 999px;
  background: transparent;
  color: #d9ccff;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.button.small {
  margin: 2px 0 8px;
  padding: 4px 12px;
  font-size: 12px;
}

.button.primary {
  border-color: transparent;
  background: #7c4dff;
  color: #ffffff;
}

.button[aria-disabled="true"] {
  opacity: 0.5;
  cursor: not-allowed;
}

.button:focus-visible {
  outline: 2px solid #c9b3ff;
  outline-offset: 2px;
}

.button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

a.button {
  display: inline-block;
  text-decoration: none;
}

.button.wide {
  display: block;
  width: 100%;
  margin-top: 10px;
  padding: 10px 14px;
}

.link {
  padding: 0;
  border: none;
  background: none;
  color: #c9b3ff;
  font: inherit;
  font-size: 12px;
  text-decoration: underline;
  cursor: pointer;
  overflow-wrap: anywhere;
}

.link.block {
  display: block;
  margin-top: 10px;
}

.muted {
  margin: 0 0 10px;
  color: #8b84a3;
  font-size: 12px;
}

/* Review sheet */

.sheet {
  margin-top: 8px;
}

.sheet-head {
  display: flex;
  align-items: baseline;
  gap: 12px;
  margin-bottom: 10px;
}

.sheet-title {
  margin: 0 0 6px;
  color: #ffffff;
  font-size: 15px;
  font-weight: 650;
}

.field {
  display: block;
  margin-bottom: 10px;
}

.field-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.field-label {
  display: block;
  margin-bottom: 4px;
  color: #b9b1cf;
  font-size: 12px;
}

.counter {
  color: #8b84a3;
}

.input {
  display: block;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid rgba(155, 123, 255, 0.35);
  border-radius: 8px;
  background: #1d192b;
  color: #f2eefc;
  color-scheme: dark;
  font: inherit;
  font-size: 13px;
  line-height: 1.4;
  resize: vertical;
}

.input:focus-visible {
  outline: 2px solid #c9b3ff;
  outline-offset: 1px;
}

.types {
  display: grid;
  gap: 6px;
  margin-bottom: 10px;
}

.type {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 10px;
  border: 1px solid rgba(155, 123, 255, 0.25);
  border-radius: 10px;
  cursor: pointer;
}

.type:has(.type-box:checked) {
  border-color: #9b7bff;
  background: rgba(155, 123, 255, 0.12);
}

.type-box {
  margin: 3px 0 0;
  accent-color: #7c4dff;
}

.type-text {
  display: block;
  min-width: 0;
}

.type-name {
  display: block;
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
}

.type-fee {
  color: #4ade80;
}

.type-blurb {
  display: block;
  color: #b9b1cf;
  font-size: 12px;
  line-height: 1.35;
}

.rule {
  margin-bottom: 10px;
  color: #b9b1cf;
  font-size: 12px;
}

.rule-summary {
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.rule-text {
  margin: 6px 0 0;
  color: #d9ccff;
  overflow-wrap: anywhere;
}

.image-row {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 12px;
}

.thumb {
  flex: none;
  width: 56px;
  height: 56px;
  border-radius: 8px;
}

.thumb[hidden] {
  display: none;
}

.sources {
  margin: 0;
  padding: 0;
  list-style: none;
  min-width: 0;
}

.source {
  margin-bottom: 3px;
  font-size: 12px;
  overflow-wrap: anywhere;
}

.wallet {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  padding: 10px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 13px;
  font-variant-numeric: tabular-nums;
}

.wallet-address {
  color: #ffffff;
  font-weight: 600;
}

.wallet-holdings {
  color: #b9b1cf;
}

.fee {
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(155, 123, 255, 0.12);
  color: #d9ccff;
  font-size: 13px;
}

.fee:empty {
  display: none;
}

.fee-total {
  color: #ffffff;
}

.fit-note {
  margin: 8px 0 0;
}

.fit-note:empty {
  display: none;
}

.warn {
  margin: 8px 0 0;
  color: #fbbf24;
  font-size: 13px;
}

.warn:empty {
  display: none;
}

.status-line {
  margin: 10px 0 4px;
  color: #f2eefc;
}

.status-line:empty {
  display: none;
}

.form[hidden], .outcome[hidden], .steps[hidden] {
  display: none;
}

.steps {
  display: flex;
  gap: 6px;
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  font-size: 11px;
}

.step {
  flex: 1;
  padding: 5px 0;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: #8b84a3;
  text-align: center;
}

.step[data-state="active"] {
  background: rgba(155, 123, 255, 0.3);
  color: #ffffff;
}

.step[data-state="done"] {
  background: rgba(74, 222, 128, 0.18);
  color: #4ade80;
}

.step[data-state="error"] {
  background: rgba(248, 113, 113, 0.2);
  color: #f87171;
}

.toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 3px 0;
  color: #d9ccff;
  cursor: pointer;
}

.toggle-box {
  margin: 0;
  accent-color: #7c4dff;
}

.debug {
  margin-top: 4px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  color: #8b84a3;
  font-size: 12px;
}

.debug-summary {
  padding: 8px 0;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
}

.scan {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3px 10px;
  margin: 0 0 8px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11px;
  line-height: 1.4;
}

.scan-name {
  color: #8b84a3;
}

.scan-value {
  margin: 0;
  color: #d9ccff;
  overflow-wrap: anywhere;
}

.debug .status {
  padding: 6px 0;
}

.status {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-variant-numeric: tabular-nums;
}

.dot {
  flex: none;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #6b6480;
}

.status[data-state="good"] .dot {
  background: #4ade80;
  box-shadow: 0 0 6px rgba(74, 222, 128, 0.6);
}

.status[data-state="bad"] .dot {
  background: #f87171;
}

@media (prefers-reduced-motion: reduce) {
  /* The ring still appears while thinking; it just does not spin. */
  .orb, .orb[data-state], .orb[data-state="thinking"] .ring, .card {
    animation: none;
    transition: none;
  }
}
`;
