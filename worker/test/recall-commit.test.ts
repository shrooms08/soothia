// Total Recall: decoding the on-chain commit event, and merging pick versions.
// No network. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { mergePicks } from "../src/recall/picks";
import type { PickRecord } from "../src/recall/records";
import { decodePickCommitted, encodePickCommitted } from "../src/recall/sui";

const HASH = "ab".repeat(32);
const COMMITTER = `0x${"cd".repeat(32)}`;

test("a PickCommitted event decodes to the hash, pick id and committer", () => {
  assert.deepEqual(decodePickCommitted(encodePickCommitted(HASH, "p_0123456789abcdef", COMMITTER)), {
    hash: HASH,
    pickId: "p_0123456789abcdef",
    committer: COMMITTER,
  });
});

test("the event layout matches the Move struct: length-prefixed hash first", () => {
  const bytes = encodePickCommitted(HASH, "p_1", COMMITTER);
  assert.equal(bytes[0], 32);
  assert.equal(bytes[1], 0xab);
  assert.equal(bytes[33], 3);
  assert.equal(bytes.length, 1 + 32 + 1 + 3 + 32);
});

const pick = (id: string, digest: string | null): PickRecord => ({
  id,
  at: "2026-11-08T08:00:00.000Z",
  question: "q",
  category: "sports",
  pYes: 0.5,
  marketYes: null,
  entities: [],
  endTime: "2026-11-08T17:00:00.000Z",
  source: { site: "espn.com", url: "https://www.espn.com" },
  hash: HASH,
  commit: digest ? { digest, network: "mainnet" } : null,
});

test("mergePicks keeps the committed version whichever order the versions arrive in", () => {
  assert.equal(mergePicks([pick("a", null), pick("a", "d1")])[0].commit?.digest, "d1");
  assert.equal(mergePicks([pick("a", "d1"), pick("a", null)])[0].commit?.digest, "d1");
  assert.equal(mergePicks([pick("a", null), pick("b", null)]).length, 2);
});
