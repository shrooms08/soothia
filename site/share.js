// The share page's bet panel: quote, connect a wallet (Wallet Standard, with
// legacy providers as a fallback), sign, send, confirm, record. Talks only
// to the proxy's public action routes. wallets.js (small) loads at once;
// share-tx.js (web3.js) only for a legacy provider. Nothing here ever asks a
// wallet to send: Soothia's Worker broadcasts the signed transaction.
(function () {
  var main = document.querySelector("main.share");
  if (!main) return;
  var PROXY = main.getAttribute("data-proxy");
  var MARKET = main.getAttribute("data-market");
  var SITE = main.getAttribute("data-site");
  var OPEN = main.getAttribute("data-open") === "1";
  var STEPS = ["Signing", "Sending", "Confirming", "Recording"];
  var LAST_WALLET_KEY = "soothia:wallet";
  var V = main.getAttribute("data-v") || "0";
  var $ = function (id) { return document.getElementById(id); };

  // Closing time in the viewer's local time.
  var time = main.querySelector("time[datetime]");
  if (time) {
    var when = new Date(time.getAttribute("datetime"));
    if (!isNaN(when)) {
      time.textContent = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(when);
    }
  }
  if (!OPEN) return;

  var params = new URLSearchParams(location.search);
  var side = params.get("side") === "no" ? "no" : "yes";
  var amount = 1;
  var account = null;
  var walletInfo = null; // {name, icon, legacy, publicKey}
  var W = null;          // wallets.js
  var tx = null;         // share-tx.js, legacy providers only
  var busy = false;
  var quoteTimer = 0;
  var quoteSeq = 0;
  var ua = navigator.userAgent;
  var mobile = /Android|iPhone|iPad|iPod/i.test(ua);

  var sideButtons = main.querySelectorAll(".side");
  var chips = main.querySelectorAll(".chip[data-amount]");
  var custom = $("amount");
  var quoteLine = $("quote");
  var walletBox = $("wallet");
  var place = $("place");
  var steps = $("steps");
  var status = $("status");
  var outcome = $("outcome");
  var panel = $("bet");

  function pct(p) { return typeof p === "number" ? (p * 100).toFixed(1) + "%" : "—"; }
  function usd(n) { return "$" + Number(n).toFixed(2); }
  function short(a) { return a.slice(0, 4) + "…" + a.slice(-4); }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function link(label, href, cls) { var a = el("a", cls, label); a.href = href; a.target = "_blank"; a.rel = "noopener"; return a; }
  function remembered() { try { return localStorage.getItem(LAST_WALLET_KEY); } catch (e) { return null; } }
  function remember(name) { try { localStorage.setItem(LAST_WALLET_KEY, name); } catch (e) {} }
  function pageUrl(withSide) {
    var url = new URL(location.href);
    url.search = "";
    url.searchParams.set("side", withSide || side);
    return url.toString();
  }

  // In-app browser deep links verified from each wallet's docs (docs/wallets.md). No guesses.
  var DEEP_LINKS = [
    { name: "Phantom", url: function (page) { return "https://phantom.com/ul/browse/" + encodeURIComponent(page) + "?ref=" + encodeURIComponent(SITE); } },
    { name: "Solflare", url: function (page) { return "https://solflare.com/ul/v1/browse/" + encodeURIComponent(page) + "?ref=" + encodeURIComponent(SITE); } },
    { name: "Backpack", url: function (page) { return "https://backpack.app/ul/v1/browse/" + encodeURIComponent(page) + "?ref=" + encodeURIComponent(SITE); } },
  ];
  var INSTALL_LINKS = [["Phantom", "https://phantom.com"], ["Solflare", "https://solflare.com"], ["Backpack", "https://backpack.app"], ["Jupiter", "https://jup.ag/mobile"]];

  function renderSides() {
    sideButtons.forEach(function (b) {
      var on = b.getAttribute("data-side") === side;
      b.classList.toggle("selected", on);
      b.setAttribute("aria-checked", String(on));
    });
    place.textContent = "Place bet · " + side.toUpperCase() + " " + usd(amount);
  }
  function renderChips() {
    chips.forEach(function (c) { c.classList.toggle("selected", Number(c.getAttribute("data-amount")) === amount && custom.value === ""); });
  }
  function setOdds(yes, no) {
    main.querySelectorAll("[data-pct=yes]").forEach(function (n) { n.textContent = pct(yes); });
    main.querySelectorAll("[data-pct=no]").forEach(function (n) { n.textContent = pct(no); });
  }

  function requestQuote() {
    clearTimeout(quoteTimer);
    quoteLine.textContent = "Getting a quote…";
    quoteLine.classList.remove("error");
    quoteTimer = setTimeout(fetchQuote, 300);
  }
  function fetchQuote(retry) {
    var seq = ++quoteSeq;
    // Quotes do not depend on the wallet; using the stand-in address keeps Panta's
    // per-wallet quote limit for the real quote inside Place bet.
    var url = PROXY + "/api/actions/market/" + MARKET + "/quote?side=" + side + "&amount=" + amount.toFixed(2);
    fetch(url).then(function (r) { return r.json().then(function (b) { return { ok: r.ok, body: b }; }); }).then(function (res) {
      if (seq !== quoteSeq) return;
      if (!res.ok) {
        // Panta answers INVALID_MARKET_PARAMS to quotes that come too fast; one quiet retry.
        if (res.body.code === "invalid_market_params" && !retry) { quoteTimer = setTimeout(function () { fetchQuote(true); }, 1500); return; }
        quoteLine.textContent = res.body.message || "No quote right now."; quoteLine.classList.add("error"); return;
      }
      var q = res.body;
      quoteLine.textContent = "~" + q.shares.toFixed(2) + " " + side.toUpperCase() + " shares for " + usd(q.totalUsdc) + " incl. 2% fee";
      if (typeof q.yesPrice === "number") setOdds(q.yesPrice, q.noPrice);
    }).catch(function () {
      if (seq !== quoteSeq) return;
      quoteLine.textContent = "No quote right now. Check your connection.";
      quoteLine.classList.add("error");
    });
  }

  sideButtons.forEach(function (b) {
    b.addEventListener("click", function () { if (busy) return; side = b.getAttribute("data-side"); renderSides(); requestQuote(); if (!account) renderWallet(); });
  });
  chips.forEach(function (c) {
    c.addEventListener("click", function () { if (busy) return; amount = Number(c.getAttribute("data-amount")); custom.value = ""; renderChips(); renderSides(); requestQuote(); });
  });
  custom.addEventListener("input", function () {
    var v = Number(custom.value);
    if (custom.value === "" || !isFinite(v)) { amount = 1; renderChips(); renderSides(); requestQuote(); return; }
    v = Math.round(v * 100) / 100;
    if (v < 1 || v > 100) { quoteLine.textContent = "Bets are between $1 and $100."; quoteLine.classList.add("error"); renderChips(); return; }
    amount = v; renderChips(); renderSides(); requestQuote();
  });

  // ---- Wallets ----

  function walletIcon(info) {
    if (info.icon) { var img = el("img", "wallet-icon"); img.src = info.icon; img.alt = ""; img.width = 20; img.height = 20; return img; }
    return el("span", "wallet-icon wallet-initial", info.name.slice(0, 1).toUpperCase());
  }
  function detected() {
    if (!W) return [];
    var last = remembered();
    return W.listWallets().slice().sort(function (a, b) { return Number(b.name === last) - Number(a.name === last); });
  }

  var renderedKey = "";
  function renderWallet(force) {
    // Re-render only when something changed, so an open picker is not wiped by the polling.
    var key = account ? "connected:" + account : "wallets:" + detected().map(function (w) { return w.name; }).join(",") + ":" + side;
    if (!force && key === renderedKey) return;
    renderedKey = key;
    walletBox.replaceChildren();
    if (account) {
      var row = el("div", "wallet-row");
      row.append(walletIcon(walletInfo), el("span", "wallet-name", walletInfo.name), el("span", "mono", short(account)));
      var change = el("button", "linkish", "Change");
      change.type = "button";
      change.addEventListener("click", function () { if (busy) return; W.disconnect(); account = null; walletInfo = null; renderWallet(true); requestQuote(); });
      row.append(change);
      walletBox.append(row);
      place.disabled = false;
      return;
    }
    place.disabled = true;
    var wallets = detected();
    if (wallets.length) {
      var b = el("button", "btn primary wide", "Connect wallet");
      b.type = "button";
      b.setAttribute("data-action", "connect");
      b.addEventListener("click", function () { openPicker(wallets); });
      walletBox.append(b);
      if (mobile) walletBox.append(openInWallet());
    } else if (mobile) {
      walletBox.append(openInWallet());
    } else {
      walletBox.append(el("p", "wallet-picker-title", "No Solana wallet found"));
      var links = el("p", "links install-links");
      INSTALL_LINKS.forEach(function (pair) { links.append(link("Get " + pair[0] + " ↗", pair[1], "")); });
      walletBox.append(links, el("p", "fine", "Install one, then reload this page."));
    }
  }

  // Phones without an injected wallet: open this page inside a wallet's own browser.
  function openInWallet() {
    var box = el("div", "open-in");
    box.append(el("p", "wallet-picker-title", "Open in your wallet"));
    var grid = el("div", "open-in-grid");
    DEEP_LINKS.forEach(function (w) {
      var a = link(w.name, w.url(pageUrl(side)), "btn");
      a.removeAttribute("target");
      a.setAttribute("data-deeplink", w.name);
      grid.append(a);
    });
    var copy = el("button", "btn", "Copy link");
    copy.type = "button";
    copy.setAttribute("data-action", "copy-link");
    copy.addEventListener("click", function () {
      navigator.clipboard.writeText(pageUrl(side)).then(function () { copy.textContent = "Copied"; setTimeout(function () { copy.textContent = "Copy link"; }, 1500); }).catch(function () {});
    });
    grid.append(copy);
    box.append(grid, el("p", "fine", "Paste it into your wallet app's browser (Jupiter: tap the globe icon)."));
    return box;
  }

  function openPicker(wallets) {
    var old = walletBox.querySelector(".wallet-picker");
    if (old) old.remove();
    var picker = el("div", "wallet-picker");
    picker.setAttribute("role", "dialog");
    picker.setAttribute("aria-label", "Choose a wallet");
    picker.append(el("p", "wallet-picker-title", "Choose a wallet"));
    var list = el("div", "wallet-picker-list");
    wallets.forEach(function (info) {
      var option = el("button", "wallet-option");
      option.type = "button";
      option.setAttribute("data-wallet", info.name);
      option.append(walletIcon(info), el("span", "wallet-option-name", info.name));
      option.addEventListener("click", function () { picker.remove(); connectWallet(info.name); });
      list.append(option);
    });
    var cancel = el("button", "linkish", "Cancel");
    cancel.type = "button";
    cancel.addEventListener("click", function () { picker.remove(); });
    picker.append(list, cancel);
    walletBox.append(picker);
    var first = picker.querySelector(".wallet-option");
    if (first) first.focus();
  }

  function connectWallet(name, silent) {
    if (!W) return Promise.resolve(null);
    if (!silent) status.textContent = "Approve the connection in " + name + ".";
    return W.connect(name, silent ? { silent: true } : undefined).then(function (res) {
      if (!res) return null;
      account = res.publicKey;
      walletInfo = res;
      remember(name);
      status.textContent = "";
      renderWallet();
      requestQuote();
      if (res.legacy) loadTx(); // web3.js, only for a legacy provider
      return res;
    }).catch(function (e) {
      if (!silent) status.textContent = W.isRejection(e) ? "Connection cancelled." : name + " couldn't connect.";
      return null;
    });
  }
  function loadTx() {
    if (tx) return Promise.resolve(tx);
    return import("/share-tx.js?v=" + V).then(function (m) { tx = m; return m; });
  }

  // ---- Progress ----

  function showSteps(active, failed) {
    steps.hidden = active === null;
    var index = active === "done" ? STEPS.length : active === null ? -1 : STEPS.indexOf(active);
    steps.replaceChildren();
    STEPS.forEach(function (name, i) {
      var state = i < index ? "done" : i === index ? (failed ? "error" : "active") : "todo";
      var li = el("li", "step");
      li.setAttribute("data-state", state);
      li.append(el("span", "step-icon"), el("span", "step-label", state === "active" ? name + "…" : name));
      steps.append(li);
    });
  }
  function setBusy(on) {
    busy = on;
    place.disabled = on || !account;
    panel.classList.toggle("busy", on);
  }
  function failWith(step, message) {
    showSteps(step, true);
    status.textContent = message;
    status.classList.add("error");
    setBusy(false);
  }
  function post(url, body) {
    return fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (b) { return { ok: r.ok, status: r.status, body: b }; }); });
  }
  function postWithRetry(url, body, tries) {
    return post(url, body).then(function (res) {
      if (res.ok || res.status < 500 && res.status !== 429 || tries <= 1) return res;
      return new Promise(function (r) { setTimeout(r, 2500); }).then(function () { return postWithRetry(url, body, tries - 1); });
    }).catch(function () {
      if (tries <= 1) return { ok: false, status: 0, body: {} };
      return new Promise(function (r) { setTimeout(r, 2500); }).then(function () { return postWithRetry(url, body, tries - 1); });
    });
  }
  function waitConfirmed(sig, tries) {
    return fetch(PROXY + "/api/tx/status?signature=" + sig).then(function (r) { return r.json(); }).then(function (b) {
      if (b.status === "confirmed" || b.status === "failed") return b.status;
      return tries > 1 ? waitConfirmed(sig, tries - 1) : "pending";
    }).catch(function () { return tries > 1 ? waitConfirmed(sig, tries - 1) : "pending"; });
  }

  // ---- The bet ----

  function placeBet() {
    if (busy || !account || !W) return;
    status.textContent = "";
    status.classList.remove("error");
    outcome.hidden = true;
    setBusy(true);
    showSteps("Signing");
    var built, signature, nextHref, chainState = "pending";
    var legacy = walletInfo && walletInfo.legacy ? loadTx() : Promise.resolve(null);
    legacy.then(function () {
      return post(PROXY + "/api/actions/market/" + MARKET + "?side=" + side + "&amount=" + amount.toFixed(2), { account: account });
    }).then(function (res) {
      if (!res.ok) throw { step: "Signing", message: res.body.message || "Couldn't prepare the bet." };
      built = res.body;
      nextHref = built.links && built.links.next && built.links.next.href;
      status.textContent = built.message ? "Approve in " + walletInfo.name + ": " + built.message : "Approve in your wallet.";
      return W.signTransaction(built.transaction, walletInfo.legacy ? tx : undefined).catch(function (e) {
        throw { step: "Signing", message: W.isRejection(e) ? "Cancelled in your wallet. Nothing was sent." : "Your wallet couldn't sign this." };
      });
    }).then(function (signed) {
      var check = W.checkSignedTransaction(built.transaction, signed.signedTxBase64);
      if (!check.ok) throw { step: "Signing", message: check.problem === "too_large" ? "The signed transaction is too large to send." : "The transaction your wallet signed is not the one Soothia built. Nothing was sent." };
      showSteps("Sending");
      status.textContent = "Sending to Solana…";
      return post(PROXY + "/api/tx/send", { signedTxBase64: signed.signedTxBase64 });
    }).then(function (res) {
      if (!res.ok) throw { step: "Sending", message: res.body.message || "Solana didn't accept the transaction. Nothing was taken." };
      signature = res.body.signature;
      showSteps("Confirming");
      status.textContent = "Waiting for Solana to confirm…";
      return waitConfirmed(signature, 6);
    }).then(function (state) {
      if (state === "failed") throw { step: "Confirming", message: "The transaction failed on Solana. No USDC was taken." };
      chainState = state;
      showSteps("Recording");
      status.textContent = state === "confirmed" ? "Recording the bet with Panta…" : "Solana is slow right now; recording anyway…";
      return nextHref ? postWithRetry(PROXY + nextHref, { account: account, signature: signature }, 3) : { ok: false, body: {} };
    }).then(function (res) {
      showSteps("done");
      status.textContent = "";
      setBusy(false);
      var done = el("div", "done");
      var recorded = res.ok && res.body && res.body.type === "completed" && res.body.title;
      var title = recorded ? res.body.title : chainState === "confirmed" ? "Bet placed on Solana" : "Bet sent";
      var sub = usd(amount) + " on " + side.toUpperCase() + (recorded ? "" : chainState === "confirmed" ? ". Panta hasn't recorded it yet; Soothia will retry on its own within a few minutes." : ". Solana is still confirming it; check Solscan in a minute.");
      done.append(el("h2", "done-title", title), el("p", "done-sub", sub));
      var links = el("p", "links");
      links.append(link("Transaction on Solscan ↗", "https://solscan.io/tx/" + signature, ""), link("View on Panta ↗", main.getAttribute("data-panta"), ""));
      done.append(links);
      outcome.replaceChildren(done);
      outcome.hidden = false;
      requestQuote();
    }).catch(function (e) {
      failWith((e && e.step) || "Signing", (e && e.message) || "Something went wrong. Nothing was sent.");
    });
  }

  place.addEventListener("click", placeBet);

  renderSides();
  renderChips();
  renderWallet();
  requestQuote();

  // The wallet layer: small, loaded at once. Re-render as wallets register, and
  // reconnect the last used wallet silently when it is still installed.
  import("/wallets.js?v=" + V).then(function (m) {
    W = m;
    m.registerMobileWalletAdapter(SITE);
    m.onWalletsChange(function () { if (!account) renderWallet(); });
    renderWallet();
    var tries = 0;
    var poll = setInterval(function () {
      // Legacy providers inject without an event.
      if (!account) renderWallet();
      if (++tries >= 8) clearInterval(poll);
    }, 400);
    setTimeout(function () {
      var last = remembered();
      if (!account && last && detected().some(function (w) { return w.name === last; })) connectWallet(last, true);
    }, 600);
  }).catch(function () {
    status.textContent = "The wallet helper didn't load. Refresh the page.";
  });
})();
