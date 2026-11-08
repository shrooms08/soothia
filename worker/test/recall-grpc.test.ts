// Total Recall: gRPC framing for Tatum's gateway, without a network. Run with `npm test`.
import assert from "node:assert/strict";
import { test } from "node:test";
import { encodeFrame, firstMessage } from "../src/recall/tatumGrpc";

test("a frame round trips", () => {
  const payload = new Uint8Array([1, 2, 3]);
  assert.deepEqual(Array.from(encodeFrame(payload)), [0, 0, 0, 0, 3, 1, 2, 3]);
  assert.deepEqual(firstMessage(encodeFrame(payload)), payload);
});

test("trailer frames are skipped and an empty body has no message", () => {
  const trailer = new Uint8Array([0x80, 0, 0, 0, 1, 65]);
  const data = encodeFrame(new Uint8Array([9]));
  const body = new Uint8Array([...trailer, ...data]);
  assert.deepEqual(firstMessage(body), new Uint8Array([9]));
  assert.equal(firstMessage(new Uint8Array()), null);
  assert.equal(firstMessage(trailer), null);
});

test("a truncated frame is an error, not a short message", () => {
  assert.throws(() => firstMessage(new Uint8Array([0, 0, 0, 0, 9, 1])), /truncated/);
});
