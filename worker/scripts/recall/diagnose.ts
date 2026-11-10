// Explains a 401 from the Walrus Memory relayer. Read-only: it writes no memories.
// Run: cd worker && npx tsx scripts/recall/diagnose.ts
//
// MEMWAL_KEY never leaves this machine and is never printed. MEMWAL_ACCOUNT_ID is
// sent to Sui only after a complete scan of public events shows it is not a
// delegate private key pasted into the wrong line. Reads use Sui's public GraphQL:
// Tatum's Sui JSON-RPC returns 404 and its gRPC gateway rejects the SDK's gRPC-web.

import { delegateKeyToPublicKey, delegateKeyToSuiAddress } from "@mysten-incubation/memwal";
import { MAINNET_RELAYER } from "../../src/recall/memory";
import { type CliEnv, loadEnvOrExit, openStore, readDevVars, safeError } from "./shared";

const SUI_GRAPHQL = "https://graphql.mainnet.sui.io/graphql";
const MAX_EVENT_PAGES = 4_000;

const env = loadEnvOrExit();

interface RelayerConfig {
  packageId: string;
  registryId?: string;
  network: string;
}

interface AccountEvent {
  name: string;
  json: Record<string, unknown>;
}

interface ObjectRead {
  exists: boolean;
  type: string | null;
  owner: unknown;
  json: Record<string, unknown>;
  via: string;
}

function bytesToHex(bytes: Iterable<number>): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function shapeOf(value: string): string {
  if (!value) return "empty";
  if (/^0x[0-9a-f]{64}$/i.test(value)) return "0x + 64 hex";
  if (/^[0-9a-f]{64}$/i.test(value)) return "64 hex, no 0x";
  if (value.startsWith("suiprivkey")) return "suiprivkey string";
  return "other format";
}

const keyLooksLikeId = (value: string): boolean => /^(0x)?[0-9a-f]{64}$/i.test(value);

const isKeyShaped = (value: string): boolean => shapeOf(value) !== "other format" && shapeOf(value) !== "empty";

function normalizeId(value: string): string {
  const clean = value.trim().toLowerCase().replace(/^0x/, "");
  return `0x${clean}`;
}

/** A Move vector<u8> as JSON may be a byte array, hex, or base64. Returns hex. */
function toHex(value: unknown): string | null {
  if (Array.isArray(value) && value.every((item) => typeof item === "number")) return bytesToHex(value as number[]);
  if (typeof value !== "string") return null;
  if (/^(0x)?[0-9a-f]+$/i.test(value) && value.replace(/^0x/, "").length % 2 === 0)
    return value.replace(/^0x/, "").toLowerCase();
  try {
    return bytesToHex(Buffer.from(value, "base64"));
  } catch {
    return null;
  }
}

async function graphql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(SUI_GRAPHQL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error(`graphql_http_${response.status}`);
  const body = (await response.json()) as { data?: T; errors?: { message?: string }[] };
  if (body.errors?.length) throw new Error(`graphql: ${String(body.errors[0].message).slice(0, 200)}`);
  return body.data as T;
}

/** Every event from the MemWal account module, newest first. Sends only the public package id. */
async function accountEvents(packageId: string): Promise<{ events: AccountEvent[]; complete: boolean }> {
  const query = `query($m:String!,$c:String){events(last:50,before:$c,filter:{module:$m}){pageInfo{hasPreviousPage startCursor} nodes{contents{type{repr} json}}}}`;
  const events: AccountEvent[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < MAX_EVENT_PAGES; page++) {
    type Page = {
      events: {
        pageInfo: { hasPreviousPage: boolean; startCursor: string | null };
        nodes: { contents: { type: { repr: string }; json: Record<string, unknown> } }[];
      };
    };
    const data: Page = await graphql<Page>(query, { m: `${packageId}::account`, c: cursor });
    for (const node of data.events.nodes)
      events.push({ name: node.contents.type.repr.split("::").pop() ?? "", json: node.contents.json ?? {} });
    if (!data.events.pageInfo.hasPreviousPage) return { events, complete: true };
    cursor = data.events.pageInfo.startCursor;
  }
  return { events, complete: false };
}

async function ownedMemwalObjects(address: string): Promise<{ id: string; type: string }[]> {
  const data = await graphql<{
    address: { objects: { nodes: { address: string; contents: { type: { repr: string } } | null }[] } } | null;
  }>(
    `
      query ($a: SuiAddress!) {
        address(address: $a) {
          objects(first: 50) {
            nodes {
              address
              contents {
                type {
                  repr
                }
              }
            }
          }
        }
      }
    `,
    { a: address },
  );
  return (data.address?.objects.nodes ?? []).flatMap((node) => {
    const type = node.contents?.type.repr ?? "";
    return /memwal|account/i.test(type) ? [{ id: node.address, type }] : [];
  });
}

async function readObject(id: string): Promise<ObjectRead> {
  const data = await graphql<{
    object: {
      owner: { __typename: string } | null;
      asMoveObject: { contents: { type: { repr: string }; json: Record<string, unknown> } } | null;
    } | null;
  }>(
    `
      query ($a: SuiAddress!) {
        object(address: $a) {
          owner {
            __typename
          }
          asMoveObject {
            contents {
              type {
                repr
              }
              json
            }
          }
        }
      }
    `,
    { a: id },
  );
  if (!data.object) return { exists: false, type: null, owner: null, json: {}, via: "Sui GraphQL" };
  return {
    exists: true,
    type: data.object.asMoveObject?.contents.type.repr ?? null,
    owner: data.object.owner?.__typename ?? null,
    json: data.object.asMoveObject?.contents.json ?? {},
    via: "Sui GraphQL",
  };
}

/** Finds public keys anywhere under a field whose name mentions delegates. */
function delegateKeysIn(node: unknown, inside = false): string[] {
  if (Array.isArray(node)) return node.flatMap((item) => delegateKeysIn(item, inside));
  if (typeof node !== "object" || node === null) return [];
  return Object.entries(node).flatMap(([name, value]) => {
    if (inside && /public_?key|pub_?key/i.test(name)) {
      const hex = toHex(value);
      return hex ? [hex] : [];
    }
    return delegateKeysIn(value, inside || /delegate/i.test(name));
  });
}

async function tryList(accountId: string): Promise<{ ok: boolean; text: string }> {
  try {
    const store = await openStore({ ...env, MEMWAL_ACCOUNT_ID: accountId } as CliEnv);
    const picks = await store.list("pick", true);
    return { ok: true, text: `OK, ${picks.length} pick(s)` };
  } catch (error) {
    return { ok: false, text: safeError(error, env) };
  }
}

function printVerdict(text: string): void {
  console.log(`\nVERDICT: ${text}`);
}

async function main(): Promise<void> {
  const key = env.MEMWAL_KEY.trim();
  const accountRaw = (readDevVars().MEMWAL_ACCOUNT_ID ?? "").trim();

  console.log("1. Key shape (formats only, as written in the file)");
  console.log(`   MEMWAL_KEY: length ${key.length}, ${shapeOf(key)}`);
  console.log(`   MEMWAL_ACCOUNT_ID: length ${accountRaw.length}, ${shapeOf(accountRaw)}`);
  console.log(`   TATUM_API_KEY: length ${env.TATUM_API_KEY?.trim().length ?? 0}`);
  if (!isKeyShaped(key)) {
    printVerdict("D) MEMWAL_KEY is not a 64-hex or suiprivkey value, so it cannot be a delegate private key.");
    return;
  }
  const publicKey = bytesToHex(await delegateKeyToPublicKey(key));
  console.log(`   Public key derived from MEMWAL_KEY: ${publicKey}`);
  console.log(`   Sui address derived from MEMWAL_KEY: ${await delegateKeyToSuiAddress(key)}`);

  const configResponse = await fetch(`${MAINNET_RELAYER}/config`, { signal: AbortSignal.timeout(15_000) });
  if (!configResponse.ok) throw new Error(`relayer_config_http_${configResponse.status}`);
  const config = (await configResponse.json()) as RelayerConfig;

  console.log("\n2. Public on-chain lookup (sends no value from .dev.vars)");
  const { events, complete } = await accountEvents(config.packageId);
  const named = (name: string): AccountEvent[] => events.filter((event) => event.name === name);
  const added = named("DelegateKeyAdded");
  const removed = named("DelegateKeyRemoved");
  console.log(
    `   Read ${events.length} account events (${complete ? "complete" : "INCOMPLETE"}): ${added.length} delegate keys added, ${removed.length} removed`,
  );
  if (!complete) {
    printVerdict(
      "D) The on-chain event scan did not finish, so nothing can be concluded and the account id was not sent anywhere.",
    );
    return;
  }

  // Compared locally: the key's value is checked against public ids, never sent.
  const knownAccounts = new Set(
    [...named("AccountCreated"), ...named("DelegateKeyAdded")]
      .map((event) => String(event.json.account_id))
      .concat(named("AccountImported").map((event) => String(event.json.new_account_id)))
      .map(normalizeId),
  );
  if (keyLooksLikeId(key) && knownAccounts.has(normalizeId(key))) {
    const accountLine = accountRaw.replace(/^0x/, "").toLowerCase();
    const accountLineIsPublicKey = added.some(
      (event) =>
        normalizeId(String(event.json.account_id)) === normalizeId(key) && toHex(event.json.public_key) === accountLine,
    );
    printVerdict(
      accountLineIsPublicKey
        ? "D) MEMWAL_KEY holds the account id and MEMWAL_ACCOUNT_ID holds the delegate PUBLIC key. The delegate private key is not in the file."
        : "D) MEMWAL_KEY holds a MemWal account id. That value belongs on the MEMWAL_ACCOUNT_ID line.",
    );
    return;
  }

  const keyHexRaw = /^(0x)?[0-9a-f]{64}$/i.test(key) ? key.replace(/^0x/, "").toLowerCase() : null;
  const isActive = (event: AccountEvent, hex: string): boolean =>
    toHex(event.json.public_key) === hex &&
    !removed.some((gone) => gone.json.account_id === event.json.account_id && toHex(gone.json.public_key) === hex);

  if (isKeyShaped(accountRaw)) {
    const accountAsKeyPublic = bytesToHex(await delegateKeyToPublicKey(accountRaw));
    if (added.some((event) => isActive(event, accountAsKeyPublic))) {
      printVerdict(
        "D) MEMWAL_ACCOUNT_ID and MEMWAL_KEY look swapped: the value on the account id line is a registered delegate private key.",
      );
      return;
    }
  }
  if (keyHexRaw && added.some((event) => isActive(event, keyHexRaw))) {
    printVerdict("D) MEMWAL_KEY holds a delegate PUBLIC key. It needs the matching private key.");
    return;
  }

  const keyAccounts = [
    ...new Set(added.filter((event) => isActive(event, publicKey)).map((event) => String(event.json.account_id))),
  ];
  console.log(`   Accounts this key is registered on: ${keyAccounts.length ? keyAccounts.join(", ") : "none found"}`);

  const accountId = normalizeId(accountRaw);
  console.log("\n3. Account object on Sui");
  const object = await readObject(accountId);
  console.log(`   Read through: ${object.via}`);
  console.log(`   Exists: ${object.exists ? "yes" : "no"}`);

  if (!object.exists) {
    const owned = [
      ...named("AccountCreated")
        .filter((event) => normalizeId(String(event.json.owner)) === accountId)
        .map((event) => String(event.json.account_id)),
      ...named("AccountImported")
        .filter((event) => normalizeId(String(event.json.owner)) === accountId)
        .map((event) => String(event.json.new_account_id)),
    ];
    try {
      for (const item of await ownedMemwalObjects(accountId)) {
        console.log(`   Owned object: ${item.id} ${item.type}`);
        if (/MemWalAccount/.test(item.type)) owned.push(item.id);
      }
    } catch (error) {
      console.log(`   Could not list owned objects: ${safeError(error, env)}`);
    }
    const real = [...new Set([...keyAccounts, ...owned])];
    printVerdict(
      real.length
        ? `A) ACCOUNT_ID is a wallet address. Real MemWal account id is likely: ${real.join(", ")}`
        : "A) ACCOUNT_ID is a wallet address, or nothing at all on mainnet: no MemWal account found for this address",
    );
    return;
  }

  console.log(`   Type: ${object.type}`);
  console.log(`   Owner: ${JSON.stringify(object.owner)}`);
  console.log(`   Field names: ${Object.keys(object.json).join(", ") || "(none returned)"}`);

  const imported = named("AccountImported").find(
    (event) => normalizeId(String(event.json.legacy_account_id)) === accountId,
  );
  if (!/::account::MemWalAccount/.test(object.type ?? "")) {
    printVerdict(`D) ACCOUNT_ID exists on Sui but is not a MemWal account; its type is ${object.type}.`);
    return;
  }
  const accountPackage = (object.type ?? "").split("::")[0];
  console.log(`   Account package: ${accountPackage}`);
  console.log(
    `   Relayer package: ${config.packageId} (network ${config.network}, registry ${config.registryId ?? "not given"})`,
  );
  if (imported) console.log(`   This account was migrated. New account id: ${String(imported.json.new_account_id)}`);

  const onObject = [...new Set(delegateKeysIn(object.json))];
  const fromEvents = [
    ...new Set(
      added
        .filter((event) => normalizeId(String(event.json.account_id)) === accountId)
        .flatMap((event) => {
          const hex = toHex(event.json.public_key);
          return hex && isActive(event, hex) ? [hex] : [];
        }),
    ),
  ];
  const delegates = onObject.length ? onObject : fromEvents;
  console.log(
    `   Registered delegate public keys (${onObject.length ? "from the object" : "from events"}): ${delegates.length}`,
  );
  for (const delegate of delegates)
    console.log(`     ${delegate}${delegate === publicKey ? "  <- matches MEMWAL_KEY" : ""}`);

  if (!delegates.includes(publicKey)) {
    printVerdict("B) ACCOUNT_ID is a MemWal account, but the derived public key is NOT among its delegate keys");
    return;
  }

  printVerdict("C) ACCOUNT_ID is a MemWal account and the key IS registered");
  console.log("\n4. Same read that list.ts does first, with each form of the id");
  const withPrefix = await tryList(accountId);
  console.log(`   With 0x: ${withPrefix.text}`);
  const withoutPrefix = await tryList(accountId.slice(2));
  console.log(`   Without 0x: ${withoutPrefix.text}`);
  if (!withPrefix.ok && !withoutPrefix.ok) {
    console.log("\n5. Relayer configuration against the account");
    console.log(`   Relayer network: ${config.network}`);
    console.log(`   Relayer package: ${config.packageId}`);
    console.log(`   Relayer registry: ${config.registryId ?? "not given"}`);
    console.log(`   Account package: ${accountPackage}`);
    console.log(`   Packages match: ${accountPackage.toLowerCase() === config.packageId.toLowerCase() ? "yes" : "NO"}`);
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(safeError(error, env));
    process.exit(1);
  },
);
