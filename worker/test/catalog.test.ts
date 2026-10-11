// Catalog normalization and the matcher's eligibility rule. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { filterSort, normalizeRow, phaseOf, type CatalogRow, type DetailCache } from "../src/catalog";
import { matchable } from "../src/match";

const ORIGIN = "https://proxy.test";
const detail = (over: Partial<DetailCache> = {}): DetailCache => ({
  title: "",
  yesPrice: null,
  noPrice: null,
  primaryPhaseEnd: null,
  resolvedOutcome: null,
  createdAt: null,
  resolved: false,
  fetchedAt: 0,
  ...over,
});

test("phases: primary, p2p for secondary, resolved by flag, phase, status or price source", () => {
  assert.equal(phaseOf({ phase: "primary", resolved: false }), "primary");
  assert.equal(phaseOf({ phase: "secondary", status: "secondary_active", resolved: false }), "p2p");
  assert.equal(phaseOf({ phase: "secondary", status: "secondary_active", resolved: true }), "resolved");
  assert.equal(phaseOf({ phase: "resolved" }), "resolved");
  assert.equal(phaseOf({ phase: "secondary", priceSource: "resolved_outcome" }), "resolved");
});

test("a row is normalized with one-decimal odds, volume, images and Soothia attribution", () => {
  const row: CatalogRow = {
    marketId: "CLQqZ7r6WYC5xNumWrmC7UAkQ1Z6pdCbjJSy7wQu1DgL",
    category: "crypto",
    title: "Will BTC reach a new all-time high by December 31, 2026?",
    images: [],
    phase: "primary",
    status: "open",
    resolved: false,
    startTime: 1791637200,
    endTime: 1798761600,
    yesPrice: "0.501663897",
    noPrice: "0.498336103",
    totalVolumeUsdc: "6.00",
    volumeUsdc: "1.00",
  };
  const item = normalizeRow(
    row,
    detail({ primaryPhaseEnd: "2026-10-12T12:14:35.000Z", createdAt: "2026-10-10T12:11:47.000Z" }),
    new Set([row.marketId!]),
    ORIGIN,
  )!;
  assert.equal(item.phase, "primary");
  assert.equal(item.yesPct, 50.2);
  assert.equal(item.noPct, 49.8);
  assert.equal(item.volumeUsdc, 6);
  assert.equal(item.closesAt, "2026-10-12T12:14:35.000Z");
  assert.equal(item.endsAt, "2027-01-01T00:00:00.000Z");
  assert.equal(item.createdBySoothia, true);
  assert.equal(item.imageUrl, `${ORIGIN}/img/crypto.png`);
  assert.equal(item.pantaUrl, `https://www.panta.market/market/${row.marketId}`);
  assert.equal(item.soothiaUrl, `https://soothia.fun/m/${row.marketId}`);
  const withImage = normalizeRow(
    { ...row, category: "pop-culture", images: ["https://res.cloudinary.com/x/y.webp"] },
    null,
    new Set(),
    ORIGIN,
  )!;
  assert.equal(withImage.imageUrl, "https://res.cloudinary.com/x/y.webp");
  assert.equal(withImage.createdBySoothia, false);
});

test("blank titles come from the cached detail; without any title the row is dropped", () => {
  const row: CatalogRow = {
    marketId: "4J6WxFGuCw9deMJ6pQ7gwpVXCvLorMrz28icSnCYWeGB",
    category: "sports",
    title: "",
    description: "",
    phase: "secondary",
    status: "secondary",
    resolved: false,
    endTime: 1791662400,
    yesPrice: "0.518009008",
    noPrice: "0.481990992",
    volumeUsdc: "11.00",
    totalVolumeUsdc: "16.00",
  };
  assert.equal(normalizeRow(row, null, new Set(), ORIGIN), null);
  const filled = normalizeRow(
    row,
    detail({ title: "Manchester United will win against Spurs with 2 or more goals" }),
    new Set(),
    ORIGIN,
  )!;
  assert.equal(filled.question, "Manchester United will win against Spurs with 2 or more goals");
  assert.equal(filled.phase, "p2p");
  assert.equal(filled.yesPct, 51.8);
  assert.equal(filled.closesAt, null);
  assert.equal(filled.volumeUsdc, 16);
});

test("resolved markets carry the outcome and no odds", () => {
  const row: CatalogRow = {
    marketId: "9ArgG5SQf9T6QbVWEjNwpBpNkdPjNWNTNB15nkdivv15",
    category: "sports",
    title: "Will Arsenal beat Leeds United on October 10, 2026?",
    phase: "resolved",
    status: "resolved",
    resolved: true,
    yesPrice: "1",
    noPrice: "0",
    priceSource: "resolved_outcome",
    totalVolumeUsdc: "323.036406",
  };
  const item = normalizeRow(row, null, new Set(), ORIGIN)!;
  assert.equal(item.phase, "resolved");
  assert.equal(item.resolvedOutcome, "YES");
  assert.equal(item.yesPct, null);
  assert.equal(item.volumeUsdc, 323.04);
  const no = normalizeRow({ ...row, yesPrice: "0", noPrice: "1" }, null, new Set(), ORIGIN)!;
  assert.equal(no.resolvedOutcome, "NO");
});

test("filters by status and category, sorts by closing, volume or newest", () => {
  const base = {
    category: "crypto",
    imageUrl: "",
    noPct: 50,
    yesPct: 50,
    resolvedOutcome: null,
    createdBySoothia: false,
    pantaUrl: "",
    soothiaUrl: "",
  };
  const items = [
    {
      ...base,
      id: "a",
      question: "A",
      phase: "primary" as const,
      volumeUsdc: 6,
      closesAt: "2026-10-12T12:00:00Z",
      endsAt: "2026-12-31T00:00:00Z",
      createdAt: "2026-10-10T00:00:00Z",
    },
    {
      ...base,
      id: "b",
      question: "B",
      phase: "p2p" as const,
      category: "sports",
      volumeUsdc: 16,
      closesAt: null,
      endsAt: "2026-10-11T00:00:00Z",
      createdAt: "2026-10-01T00:00:00Z",
    },
    {
      ...base,
      id: "c",
      question: "C",
      phase: "resolved" as const,
      volumeUsdc: 323,
      closesAt: null,
      endsAt: "2026-10-10T00:00:00Z",
      createdAt: "2026-10-05T00:00:00Z",
      resolvedOutcome: "YES" as const,
    },
    {
      ...base,
      id: "d",
      question: "D",
      phase: "p2p" as const,
      volumeUsdc: 2,
      closesAt: null,
      endsAt: "2026-10-20T00:00:00Z",
      createdAt: "2026-10-09T00:00:00Z",
    },
  ];
  assert.deepEqual(
    filterSort(items, { status: "live" }).map((i) => i.id),
    ["a"],
  );
  assert.deepEqual(
    filterSort(items, { status: "p2p", sort: "closing" }).map((i) => i.id),
    ["b", "d"],
  );
  assert.deepEqual(
    filterSort(items, { status: "p2p", sort: "volume" }).map((i) => i.id),
    ["b", "d"],
  );
  assert.deepEqual(
    filterSort(items, { status: "p2p", sort: "new" }).map((i) => i.id),
    ["d", "b"],
  );
  assert.deepEqual(
    filterSort(items, { status: "p2p", category: "sports" }).map((i) => i.id),
    ["b"],
  );
  assert.deepEqual(
    filterSort(items, { status: "resolved" }).map((i) => i.id),
    ["c"],
  );
  assert.equal(filterSort(items, { status: "all" }).length, 4);
  // The matcher never offers resolved or ended markets, and carries phase and the Panta page.
  const offered = matchable(items, Date.parse("2026-10-10T12:00:00Z"));
  assert.deepEqual(
    offered.map((m) => `${m.id}:${m.phase}`),
    ["a:primary", "b:p2p", "d:p2p"],
  );
  assert.equal(offered[1].yesPrice, 0.5);
});
