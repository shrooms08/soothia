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

.card {
  position: fixed;
  width: ${CARD_WIDTH}px;
  max-width: calc(100vw - ${EDGE_PADDING * 2}px);
  padding: 18px 20px;
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
  .orb, .card {
    animation: none;
    transition: none;
  }
}
`;
