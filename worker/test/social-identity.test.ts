// Going public: challenges, signatures and the KV index, with everything faked.
import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import type { Env } from "../src/http";
import type { RecallStore } from "../src/recall/memory";
import type { ProfileRecord } from "../src/recall/records";
import { clearMemoryCache } from "../src/store";
import { CHALLENGE_TTL_SEC, handleFromName } from "../src/social/identity";
import { socialRoute, type SocialDeps } from "../src/social/routes";

const NOW = Date.parse("2026-11-09T12:00:00.000Z");
const INSTALL = "12345678-1234-1234-1234-123456789abc";
const keypair = Ed25519Keypair.generate();
const ADDRESS = keypair.toSuiAddress();
const OTHER = `0x${"ab".repeat(32)}`;

function harness(options: { now?: number; name?: string | null; verify?: SocialDeps["verify"]; putFails?: boolean } = {}) {
  const data = new Map<string, { value: string; metadata?: unknown; ttl?: number }>();
  const written: ProfileRecord[] = [];
  let now = options.now ?? NOW;
  const kv = {
    get: async (key: string, type?: string) => {
      const entry = data.get(key);
      if (!entry) return null;
      return type === "json" ? JSON.parse(entry.value) : entry.value;
    },
    put: async (key: string, value: string, opts?: { metadata?: unknown; expirationTtl?: number }) => {
      if (options.putFails) throw new Error("kv down");
      data.set(key, { value, metadata: opts?.metadata, ttl: opts?.expirationTtl });
    },
    delete: async (key: string) => {
      data.delete(key);
    },
  };
  const env = { SOOTHIA_CACHE: kv } as unknown as Env;
  const store = { write: async (_kind: string, record: ProfileRecord) => (written.push(record), { jobId: "j" }) } as unknown as RecallStore;
  const deps: SocialDeps = {
    now: () => now,
    store: () => store,
    lookupName: async () => options.name ?? null,
    // The real SDK check, against a real signature, unless a test replaces it.
    verify:
      options.verify ??
      (async (message, signature, address) => {
        try {
          await verifyPersonalMessageSignature(message, signature, { address });
          return true;
        } catch {
          return false;
        }
      }),
  };
  const call = async (method: string, path: string, body?: unknown, headers: Record<string, string> = { "X-Soothia-Install": INSTALL }) => {
    const response = await socialRoute(new Request(`https://x${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }), env, path.split("?")[0], deps);
    return { status: response.status, body: (await response.json()) as Record<string, any> };
  };
  return { data, written, call, advance: (ms: number) => (now += ms) };
}

type Harness = ReturnType<typeof harness>;

async function signed(h: Harness, action: string, address = ADDRESS, signer = keypair): Promise<string> {
  const { body } = await h.call("POST", "/social/profile/challenge", { address, action });
  return (await signer.signPersonalMessage(new TextEncoder().encode(body.message))).signature;
}

async function publish(h: Harness, handle = "Arsenal_Fan"): Promise<{ status: number; body: Record<string, any> }> {
  return h.call("POST", "/social/profile/publish", { handle, address: ADDRESS, signature: await signed(h, "publish") });
}

beforeEach(() => clearMemoryCache());

test("a challenge names the address and action, and expires in 10 minutes", async () => {
  const h = harness();
  const { status, body } = await h.call("POST", "/social/profile/challenge", { address: ADDRESS });
  assert.equal(status, 200);
  assert.match(body.message, /not a transaction/);
  assert.match(body.message, /Action: publish/);
  assert.ok(body.message.includes(ADDRESS));
  assert.equal(body.expiresAt, NOW + 600_000);
  assert.equal(h.data.get(`socialchallenge:${ADDRESS}`)?.ttl, CHALLENGE_TTL_SEC);
});

test("challenges check their input and fail closed when KV is down", async () => {
  assert.equal((await harness().call("POST", "/social/profile/challenge", { address: "0x12" })).body.error, "invalid_address");
  assert.equal((await harness().call("POST", "/social/profile/challenge", { address: ADDRESS, action: "steal" })).body.error, "invalid_action");
  assert.equal((await harness({ putFails: true }).call("POST", "/social/profile/challenge", { address: ADDRESS })).body.error, "kv_unavailable");
});

test("a signed publish stores the memory and the index, with the handle lowered", async () => {
  const h = harness();
  const { status, body } = await publish(h);
  assert.equal(status, 200);
  assert.deepEqual(body.profile, { handle: "arsenal_fan", address: ADDRESS, publicSince: new Date(NOW).toISOString(), shareHistory: false });
  assert.deepEqual(h.written, [{ address: ADDRESS, handle: "arsenal_fan", publicSince: new Date(NOW).toISOString(), shareHistory: false }]);
  const index = JSON.parse(h.data.get("profile:arsenal_fan")!.value);
  assert.equal(index.address, ADDRESS);
  assert.ok(index.userKey);
  assert.deepEqual(JSON.parse(h.data.get(`profileaddr:${ADDRESS}`)!.value), index);
  assert.equal(JSON.stringify(body).includes(index.userKey), false, "the user key must never be sent");
});

test("a signature is used once", async () => {
  const h = harness();
  const signature = await signed(h, "publish");
  assert.equal((await h.call("POST", "/social/profile/publish", { handle: "first", address: ADDRESS, signature })).status, 200);
  await h.call("POST", "/social/profile/unpublish", { address: ADDRESS, signature: await signed(h, "unpublish") });
  const again = await h.call("POST", "/social/profile/publish", { handle: "second", address: ADDRESS, signature });
  assert.equal(again.status, 401);
  assert.equal(again.body.error, "challenge_expired");
});

test("a wrong wallet's signature is refused and stores nothing", async () => {
  const h = harness();
  const { status, body } = await h.call("POST", "/social/profile/publish", { handle: "thief", address: ADDRESS, signature: await signed(h, "publish", ADDRESS, Ed25519Keypair.generate()) });
  assert.equal(status, 401);
  assert.equal(body.error, "invalid_signature");
  assert.equal(h.written.length, 0);
  assert.equal(h.data.has("profile:thief"), false);
});

test("a publish signature cannot be spent on another action", async () => {
  const h = harness();
  await publish(h);
  const signature = await signed(h, "update");
  const { status } = await h.call("POST", "/social/profile/unpublish", { address: ADDRESS, signature });
  assert.equal(status, 401);
  assert.ok(h.data.has("profile:arsenal_fan"));
});

test("an expired challenge is refused", async () => {
  const h = harness();
  const signature = await signed(h, "publish");
  h.advance(600_001);
  assert.equal((await h.call("POST", "/social/profile/publish", { handle: "late", address: ADDRESS, signature })).body.error, "challenge_expired");
});

test("handles are 3-20 characters of a-z 0-9 and underscore", async () => {
  for (const handle of ["ab", "a".repeat(21), "has space", "dash-ed", "émile", 7, ""]) {
    assert.equal((await harness().call("POST", "/social/profile/publish", { handle, address: ADDRESS, signature: "x" })).body.error, "invalid_handle", String(handle));
  }
});

test("a taken handle is refused whatever its case, without using the signature", async () => {
  const h = harness();
  await publish(h, "taken");
  h.data.delete(`profileaddr:${ADDRESS}`);
  h.data.delete([...h.data.keys()].find((key) => key.startsWith("profileuser:"))!);
  const second = await h.call("POST", "/social/profile/publish", { handle: "TAKEN", address: ADDRESS, signature: "x" });
  assert.equal(second.status, 409);
  assert.equal(second.body.error, "handle_taken");
});

test("one address and one record get one profile", async () => {
  const h = harness();
  await publish(h, "first");
  assert.equal((await h.call("POST", "/social/profile/publish", { handle: "second", address: ADDRESS, signature: "x" })).body.error, "already_public");
  assert.equal((await h.call("POST", "/social/profile/publish", { handle: "third", address: OTHER, signature: "x" })).body.error, "record_already_public");
});

test("publishing needs an install id", async () => {
  assert.equal((await harness().call("POST", "/social/profile/publish", { handle: "abc", address: ADDRESS, signature: "x" }, {})).body.error, "missing_install");
});

test("if the KV index cannot be written, publish says so", async () => {
  const h = harness();
  const signature = await signed(h, "publish");
  const failing = harness({ putFails: true });
  for (const [key, value] of h.data) failing.data.set(key, value);
  assert.equal((await failing.call("POST", "/social/profile/publish", { handle: "abc", address: ADDRESS, signature })).body.error, "kv_unavailable");
});

test("update turns history sharing on, signed", async () => {
  const h = harness();
  await publish(h);
  const { body } = await h.call("POST", "/social/profile/update", { address: ADDRESS, shareHistory: true, signature: await signed(h, "update") });
  assert.equal(body.profile.shareHistory, true);
  assert.equal(h.written.at(-1)?.shareHistory, true);
  assert.equal(JSON.parse(h.data.get("profile:arsenal_fan")!.value).shareHistory, true);
  assert.equal(JSON.parse(h.data.get(`profileaddr:${ADDRESS}`)!.value).shareHistory, true);
});

test("turning history off removes old calls now, not at the next snapshot", async () => {
  const h = harness();
  await publish(h);
  h.data.set("socialstats:arsenal_fan", { value: "{}" });
  await h.call("POST", "/social/profile/update", { address: ADDRESS, shareHistory: false, signature: await signed(h, "update") });
  assert.equal(h.data.has("socialstats:arsenal_fan"), false);
  assert.deepEqual(JSON.parse(h.data.get("social:hidden")!.value).map((entry: { handle: string }) => entry.handle), ["arsenal_fan"]);
});

test("update and unpublish need a profile and a real signature", async () => {
  const h = harness();
  assert.equal((await h.call("POST", "/social/profile/update", { address: ADDRESS, shareHistory: true, signature: "x" })).body.error, "not_public");
  assert.equal((await h.call("POST", "/social/profile/unpublish", { address: ADDRESS, signature: "x" })).body.error, "not_public");
  await publish(h);
  assert.equal((await h.call("POST", "/social/profile/update", { address: ADDRESS, shareHistory: "yes", signature: "x" })).body.error, "invalid_share_history");
  assert.equal((await h.call("POST", "/social/profile/unpublish", { address: ADDRESS, signature: "x" })).status, 401);
});

test("unpublish removes every index entry, hides the handle and frees it", async () => {
  const h = harness();
  await publish(h);
  h.data.set("socialstats:arsenal_fan", { value: "{}" });
  await h.call("POST", "/social/profile/unpublish", { address: ADDRESS, signature: await signed(h, "unpublish") });
  assert.deepEqual([...h.data.keys()].filter((key) => key.startsWith("profile") || key.startsWith("socialstats")), []);
  assert.equal(h.written.at(-1)?.unpublished, true);
  assert.equal(JSON.parse(h.data.get("social:hidden")!.value)[0].handle, "arsenal_fan");
  assert.equal((await publish(h)).status, 200);
  assert.deepEqual(JSON.parse(h.data.get("social:hidden")!.value), []);
});

test("by-address says whether an address is public, without the user key", async () => {
  const h = harness();
  assert.deepEqual((await h.call("GET", `/social/profile/by-address?address=${ADDRESS}`)).body, { public: false });
  await publish(h);
  const { body } = await h.call("GET", `/social/profile/by-address?address=${ADDRESS}`);
  assert.equal(body.public, true);
  assert.equal(body.profile.handle, "arsenal_fan");
  assert.equal("userKey" in body.profile, false);
});

test("a SuiNS name becomes a suggested handle", async () => {
  assert.deepEqual((await harness({ name: "alice.sui" }).call("GET", `/social/suins?address=${ADDRESS}`)).body, { name: "alice.sui", suggestion: "alice" });
  assert.deepEqual((await harness({ name: null }).call("GET", `/social/suins?address=${ADDRESS}`)).body, { name: null, suggestion: null });
  assert.equal(handleFromName("@my-name"), "my_name");
  assert.equal(handleFromName("sub.alice.sui"), "sub");
  assert.equal(handleFromName("ab.sui"), null);
});

test("a failed name lookup is the same as no name", async () => {
  const response = await socialRoute(new Request(`https://x/social/suins?address=${ADDRESS}`), { SOOTHIA_CACHE: {} } as unknown as Env, "/social/suins", {
    lookupName: async () => {
      throw new Error("down");
    },
    verify: async () => true,
    store: () => ({}) as RecallStore,
  });
  assert.deepEqual(await response.json(), { name: null, suggestion: null });
});

test("unknown social paths are 404", async () => {
  assert.equal((await harness().call("GET", "/social/nope")).status, 404);
});
