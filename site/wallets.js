var F = Object.defineProperty;
var x = (e, n, t) => n in e ? F(e, n, { enumerable: !0, configurable: !0, writable: !0, value: t }) : e[n] = t;
var N = (e, n, t) => x(e, typeof n != "symbol" ? n + "" : n, t);
var z = function(e, n, t, r) {
  if (t === "a" && !r) throw new TypeError("Private accessor was defined without a getter");
  if (typeof n == "function" ? e !== n || !r : !n.has(e)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return t === "m" ? r : t === "a" ? r.call(e) : r ? r.value : n.get(e);
}, V = function(e, n, t, r, i) {
  if (r === "m") throw new TypeError("Private method is not writable");
  if (r === "a" && !i) throw new TypeError("Private accessor was defined without a setter");
  if (typeof n == "function" ? e !== n || !i : !n.has(e)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return r === "a" ? i.call(e, t) : i ? i.value = t : n.set(e, t), t;
}, A;
let p;
const k = /* @__PURE__ */ new Set();
function Y(e) {
  y = void 0, k.add(e);
}
function q(e) {
  y = void 0, k.delete(e);
}
const m = {};
function G() {
  if (p || (p = Object.freeze({ register: j, get: H, on: X }), typeof window > "u"))
    return p;
  const e = Object.freeze({ register: j });
  try {
    window.addEventListener("wallet-standard:register-wallet", ({ detail: n }) => n(e));
  } catch (n) {
    console.error(`wallet-standard:register-wallet event listener could not be added
`, n);
  }
  try {
    window.dispatchEvent(new J(e));
  } catch (n) {
    console.error(`wallet-standard:app-ready event could not be dispatched
`, n);
  }
  return p;
}
function j(...e) {
  return e = e.filter((n) => !k.has(n)), e.length ? (e.forEach((n) => Y(n)), m.register?.forEach((n) => R(() => n(...e))), function() {
    e.forEach((t) => q(t)), m.unregister?.forEach((t) => R(() => t(...e)));
  }) : () => {
  };
}
let y;
function H() {
  return y || (y = [...k]), y;
}
function X(e, n) {
  return m[e]?.push(n) || (m[e] = [n]), function() {
    m[e] = m[e]?.filter((r) => n !== r);
  };
}
function R(e) {
  try {
    e();
  } catch (n) {
    console.error(n);
  }
}
class J extends Event {
  get detail() {
    return z(this, A, "f");
  }
  get type() {
    return "wallet-standard:app-ready";
  }
  constructor(n) {
    super("wallet-standard:app-ready", {
      bubbles: !1,
      cancelable: !1,
      composed: !1
    }), A.set(this, void 0), V(this, A, n, "f");
  }
  /** @deprecated */
  preventDefault() {
    throw new Error("preventDefault cannot be called");
  }
  /** @deprecated */
  stopImmediatePropagation() {
    throw new Error("stopImmediatePropagation cannot be called");
  }
  /** @deprecated */
  stopPropagation() {
    throw new Error("stopPropagation cannot be called");
  }
}
A = /* @__PURE__ */ new WeakMap();
const B = "solana:mainnet", K = "standard:connect", Q = "standard:disconnect", Z = "standard:events", M = "solana:signTransaction";
class w extends Error {
  constructor(t, r = t) {
    super(r);
    N(this, "reason");
    this.reason = t;
  }
}
const U = [
  {
    name: "Phantom",
    find: () => {
      const e = window;
      return e.phantom?.solana ?? (e.solana?.isPhantom ? e.solana : null);
    }
  },
  { name: "Solflare", find: () => window.solflare ?? null },
  { name: "Backpack", find: () => window.backpack ?? null }
];
let s = null;
const P = /* @__PURE__ */ new Set();
function ee(e) {
  return e.chains.includes(B) && K in e.features && M in e.features;
}
function D() {
  return typeof window > "u" ? [] : G().get().filter(ee);
}
function de() {
  const e = D().map((n) => ({ name: n.name, icon: n.icon }));
  for (const n of U)
    e.some((t) => t.name.toLowerCase() === n.name.toLowerCase()) || n.find() && e.push({ name: n.name, icon: "", legacy: !0 });
  return e;
}
function fe(e) {
  P.add(e);
  const n = G(), t = [n.on("register", e), n.on("unregister", e)];
  return () => {
    P.delete(e);
    for (const r of t) r();
  };
}
function S() {
  for (const e of P) e();
}
function ne(e) {
  return e?.code === 4001 ? !0 : /reject|cancel|denied|declined/i.test(String(e?.message ?? ""));
}
function _(e) {
  return e instanceof w ? e : ne(e) ? new w("rejected") : new w("failed", String(e?.message ?? "").slice(0, 200));
}
function C(e) {
  return e.find((n) => n.chains.includes(B)) ?? e[0] ?? null;
}
function W() {
  return s ? s.kind === "legacy" ? { name: s.name, icon: "", legacy: !0, publicKey: s.publicKey } : { name: s.wallet.name, icon: s.wallet.icon, publicKey: s.account.address } : null;
}
async function ge(e, n = {}) {
  const t = D().find((o) => o.name === e);
  if (t)
    try {
      let o = n.silent ? C(t.accounts) : null;
      if (!o) {
        const d = await t.features[K].connect(n.silent ? { silent: !0 } : void 0);
        o = C(d.accounts);
      }
      if (!o) {
        if (n.silent) return null;
        throw new w("failed", "The wallet returned no account.");
      }
      s?.kind === "standard" && s.off?.();
      const g = t.features[Z]?.on("change", (c) => {
        if (!c.accounts || s?.kind !== "standard" || s.wallet !== t) return;
        const d = C(c.accounts);
        d ? s.account = d : s = null, S();
      });
      return s = { kind: "standard", wallet: t, account: o, off: g }, S(), W();
    } catch (o) {
      if (n.silent) return null;
      throw _(o);
    }
  const r = U.find((o) => o.name.toLowerCase() === e.toLowerCase()), i = r?.find();
  if (!r || !i) throw new w("no_wallet");
  try {
    let o = i.publicKey?.toString() ?? null;
    return o || (o = (await i.connect(n.silent ? { onlyIfTrusted: !0 } : void 0)).publicKey.toString()), s = { kind: "legacy", name: r.name, provider: i, publicKey: o }, S(), W();
  } catch (o) {
    if (n.silent) return null;
    throw _(o);
  }
}
async function he() {
  const e = s;
  if (s = null, S(), !!e)
    try {
      e.kind === "standard" ? (e.off?.(), await e.wallet.features[Q]?.disconnect()) : await e.provider.disconnect();
    } catch {
    }
}
function te(e) {
  return Uint8Array.from(atob(e), (n) => n.charCodeAt(0));
}
function re(e) {
  let n = "";
  for (const t of e) n += String.fromCharCode(t);
  return btoa(n);
}
const oe = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function ae(e) {
  let n = 0n;
  for (const r of e) n = n << 8n | BigInt(r);
  let t = "";
  for (; n > 0n; n /= 58n) t = oe[Number(n % 58n)] + t;
  for (const r of e) {
    if (r !== 0) break;
    t = "1" + t;
  }
  return t;
}
function se(e) {
  return ae(e.subarray(1, 65));
}
async function we(e, n) {
  if (!s) throw new w("no_wallet");
  const t = te(e);
  try {
    let r;
    if (s.kind === "standard") {
      const i = s.wallet.features[M], [o] = await i.signTransaction({ account: s.account, transaction: t, chain: B });
      r = o.signedTransaction;
    } else {
      if (!n) throw new w("legacy_needs_signer");
      r = n.serialize(await s.provider.signTransaction(n.deserialize(t)));
    }
    return { signedTxBase64: re(r), signature: se(r) };
  } catch (r) {
    throw _(r);
  }
}
const $ = 1232, ie = "ComputeBudget111111111111111111111111111111", ce = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function ue(e) {
  let n = 0n;
  for (const r of e) n = n << 8n | BigInt(r);
  let t = "";
  for (; n > 0n; n /= 58n) t = ce[Number(n % 58n)] + t;
  for (const r of e) {
    if (r !== 0) break;
    t = "1" + t;
  }
  return t;
}
function T(e) {
  return [...e].map((n) => n.toString(16).padStart(2, "0")).join("");
}
function I(e) {
  return Uint8Array.from(atob(e), (n) => n.charCodeAt(0));
}
function L(e) {
  let n = 0;
  const t = (u) => {
    if (n + u > e.length) throw new Error("truncated");
    return n += u, e.subarray(n - u, n);
  }, r = () => {
    let u = 0;
    for (let f = 0; ; f += 7) {
      const E = t(1)[0];
      if (u |= (E & 127) << f, !(E & 128)) return u;
      if (f > 14) throw new Error("bad length");
    }
  }, i = Array.from({ length: r() }, () => t(64));
  if (t(1)[0] !== 128) throw new Error("not a v0 transaction");
  const [o, l, g] = t(3), c = Array.from({ length: r() }, () => ue(t(32))), d = T(t(32)), b = (u) => {
    if (u >= c.length) return `lookup#${u - c.length}`;
    const f = u < o, E = f ? u < o - l : u < c.length - g;
    return `${c[u]}:${f ? "s" : "-"}:${E ? "w" : "-"}`;
  }, a = Array.from({ length: r() }, () => {
    const u = c[t(1)[0]] ?? "unknown", f = [...t(r())].map(b);
    return { program: u, accounts: f, data: T(t(r())) };
  }), h = T(e.subarray(n));
  if (c.length === 0) throw new Error("no accounts");
  return { signatures: i, feePayer: c[0], blockhash: d, instructions: a, lookups: h };
}
const O = (e, n) => e.program === n.program && e.data === n.data && e.accounts.join() === n.accounts.join();
function me(e, n) {
  let t, r;
  try {
    t = I(n), r = L(I(e));
  } catch (a) {
    return { ok: !1, problem: "unreadable", bytes: 0, detail: String(a.message) };
  }
  const i = t.length, o = (a, h) => ({
    ok: !1,
    problem: a,
    bytes: i,
    detail: h
  });
  if (i > $)
    return o("too_large", `${i} bytes, limit ${$}`);
  let l;
  try {
    l = L(t);
  } catch (a) {
    return o("unreadable", String(a.message));
  }
  if (l.signatures.length === 0 || l.signatures[0].every((a) => a === 0))
    return o("not_signed", "first signature is empty");
  if (l.signatures.length !== r.signatures.length) return o("changed", "signer count differs");
  if (l.feePayer !== r.feePayer) return o("changed", "fee payer differs");
  if (l.blockhash !== r.blockhash) return o("changed", "blockhash differs");
  if (l.lookups !== r.lookups) return o("changed", "address lookup tables differ");
  const g = (a) => a.instructions.filter((h) => h.program !== ie), c = g(r), d = g(l);
  if (d.length !== c.length) {
    const a = d.find((h) => !c.some((u) => O(u, h)));
    return o("changed", a ? `unexpected instruction for program ${a.program}` : "an instruction was removed");
  }
  for (let a = 0; a < c.length; a++)
    if (!O(c[a], d[a]))
      return o("changed", `instruction ${a + 1} (${c[a].program}) was altered`);
  const b = (a) => a.instructions.length - g(a).length;
  return { ok: !0, bytes: i, addedComputeBudget: b(l) - b(r) };
}
let v = null;
function pe(e) {
  if (v) return v;
  const n = navigator.userAgent;
  if (!/Android/i.test(n) || !/Chrome/i.test(n)) return Promise.resolve();
  const t = document.querySelector("main")?.getAttribute("data-v") ?? "0";
  return v = import(`/mwa.js?v=${encodeURIComponent(t)}`).then((i) => i.register(e)).catch(() => {
  }), v;
}
export {
  w as WalletError,
  me as checkSignedTransaction,
  ge as connect,
  W as connected,
  he as disconnect,
  se as firstSignature,
  ne as isRejection,
  de as listWallets,
  fe as onWalletsChange,
  pe as registerMobileWalletAdapter,
  we as signTransaction
};
