// Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { earningsView, estimateUsdc } from "../src/earnings";

const NOW = Date.parse("2026-10-11T12:00:00Z");
const live = {
  totalVolumeUsdc: 6,
  royaltyBps: 2000,
  skewBps: 5832,
  creatorFeesUsdc: 0,
  isGraduated: false,
  graduationThresholdUsdc: 1000,
};

test("the estimate is the royalty share of the whole pool, rounded to cents", () => {
  assert.equal(estimateUsdc(live), 1.2);
  assert.equal(estimateUsdc({ ...live, totalVolumeUsdc: 123.456, royaltyBps: 1500 }), 18.52);
  assert.equal(estimateUsdc(null), null);
});

test("during the buying window the line shows the estimate and the local close time", () => {
  const view = earningsView("2026-10-12T12:14:35Z", live, NOW);
  assert.equal(view.phase, "open");
  assert.equal(view.estimateUsdc, 1.2);
  assert.match(
    view.text,
    /^Estimated ~\$1\.20 so far \(up to 20% of the pool, lower if the market is very one-sided\)\. Claimable after the buying window closes on .+\.$/,
  );
  const reduced = earningsView("2026-10-12T12:14:35Z", { ...live, royaltyBps: 1200 }, NOW);
  assert.match(reduced.text, /\(12%, down from 20% of the pool/);
});

test("with no liquidity figure there is no number, only the share and the date", () => {
  const view = earningsView("2026-10-12T12:14:35Z", null, NOW);
  assert.equal(view.estimateUsdc, null);
  assert.match(view.text, /^Up to 20% of the pool\. Claimable after .+\.$/);
  assert.doesNotMatch(view.text, /\$/);
});

test("after the buying window the line says it has closed", () => {
  assert.equal(earningsView("2026-10-01T00:00:00Z", live, NOW).phase, "claimable");
  assert.equal(earningsView("2026-10-01T00:00:00Z", live, NOW).text, "Estimated ~$1.20. The buying window has closed.");
  assert.equal(earningsView("2026-10-01T00:00:00Z", null, NOW).text, "The buying window has closed.");
  assert.equal(earningsView(null, null, NOW).phase, "open");
});
