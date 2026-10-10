// The share page's bet panel: quote, connect Phantom, sign, send, confirm,
// record. Talks only to the proxy's public action routes. The web3.js piece
// (share-tx.js) loads after Connect. Nothing here ever asks Phantom to send.
(function () {
  var main = document.querySelector("main.share");
  if (!main) return;
  var PROXY = main.getAttribute("data-proxy");
  var MARKET = main.getAttribute("data-market");
  var SITE = main.getAttribute("data-site");
  var OPEN = main.getAttribute("data-open") === "1";
  var STEPS = ["Signing", "Sending", "Confirming", "Recording"];
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
  var provider = null;
  var tx = null; // share-tx.js module, loaded after Connect
  var busy = false;
  var quoteTimer = 0;
  var quoteSeq = 0;
  var mobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  var isMobileWidth = window.innerWidth < 720;

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
  function deepLink(withSide) {
    var url = new URL(location.href);
    url.search = "";
    if (withSide) url.searchParams.set("side", withSide);
    return "https://phantom.app/ul/browse/" + encodeURIComponent(url.toString()) + "?ref=" + encodeURIComponent(SITE);
  }

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
    var url = PROXY + "/api/actions/market/" + MARKET + "/quote?side=" + side + "&amount=" + amount.toFixed(2) + (account ? "&account=" + account : "");
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
    b.addEventListener("click", function () { if (busy) return; side = b.getAttribute("data-side"); renderSides(); requestQuote(); });
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

  // ---- Wallet ----

  function findProvider() {
    var p = window.phantom && window.phantom.solana;
    return p && p.isPhantom ? p : null;
  }
  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text) n.textContent = text; return n; }
  function link(label, href, cls) { var a = el("a", cls, label); a.href = href; a.target = "_blank"; a.rel = "noopener"; return a; }

  function renderWallet() {
    walletBox.replaceChildren();
    if (account) {
      var row = el("div", "wallet-row");
      row.append(el("span", "phantom-badge", "P"), el("span", "mono", short(account)));
      walletBox.append(row);
      place.disabled = false;
      return;
    }
    place.disabled = true;
    provider = findProvider();
    if (provider) {
      var b = el("button", "btn primary wide", "Connect Phantom");
      b.type = "button";
      b.addEventListener("click", connect);
      walletBox.append(b);
    } else if (mobile) {
      // No wallet in this browser: reopen the page inside Phantom's own browser.
      var yes = link("Bet YES", deepLink("yes"), "btn primary");
      var no = link("Bet NO", deepLink("no"), "btn primary");
      yes.setAttribute("data-deeplink", "yes"); no.setAttribute("data-deeplink", "no");
      var grid = el("div", "cta"); grid.append(yes, no);
      var c = link("Connect Phantom", deepLink(side), "btn wide"); c.setAttribute("data-deeplink", "connect");
      walletBox.append(grid, c, el("p", "fine", "Opens in Phantom's in-app browser."));
    } else {
      walletBox.append(link("Install Phantom", "https://phantom.com", "btn primary wide"), el("p", "fine", "Phantom is a Solana wallet for Chrome, Brave, Firefox and phones."));
    }
  }

  function connect() {
    provider = findProvider();
    if (!provider) return;
    status.textContent = "";
    provider.connect().then(function (res) {
      var key = (res && res.publicKey) || provider.publicKey;
      account = key.toString();
      renderWallet();
      requestQuote();
      // Fetch the signing helpers now so Place bet is instant.
      loadTx();
    }).catch(function (e) {
      status.textContent = isRejection(e) ? "Connection cancelled." : "Phantom couldn't connect.";
    });
  }
  function loadTx() {
    if (tx) return Promise.resolve(tx);
    return import("/share-tx.js").then(function (m) { tx = m; return m; });
  }
  function isRejection(e) {
    var msg = String((e && e.message) || e || "").toLowerCase();
    return (e && e.code === 4001) || msg.indexOf("reject") >= 0 || msg.indexOf("cancel") >= 0;
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

  // ---- The bet ----

  function placeBet() {
    if (busy || !account) return;
    status.textContent = "";
    status.classList.remove("error");
    outcome.hidden = true;
    setBusy(true);
    showSteps("Signing");
    var built, signature, nextHref, chainState = "pending";
    loadTx().then(function () {
      return post(PROXY + "/api/actions/market/" + MARKET + "?side=" + side + "&amount=" + amount.toFixed(2), { account: account });
    }).then(function (res) {
      if (!res.ok) throw { step: "Signing", message: res.body.message || "Couldn't prepare the bet." };
      built = res.body;
      nextHref = built.links && built.links.next && built.links.next.href;
      status.textContent = built.message ? "Approve in Phantom: " + built.message : "Approve in Phantom.";
      return provider.signTransaction(tx.deserialize(built.transaction)).catch(function (e) {
        throw { step: "Signing", message: isRejection(e) ? "Cancelled in Phantom. Nothing was sent." : "Phantom couldn't sign this." };
      });
    }).then(function (signed) {
      var signedBase64 = tx.serialize(signed);
      var check = tx.checkSignedTransaction(built.transaction, signedBase64);
      if (!check.ok) throw { step: "Signing", message: check.problem === "too_large" ? "The signed transaction is too large to send." : "The transaction Phantom signed is not the one Soothia built. Nothing was sent." };
      showSteps("Sending");
      status.textContent = "Sending to Solana…";
      return post(PROXY + "/api/tx/send", { signedTxBase64: signedBase64 });
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
      // The callback tells Panta about the bet (submit, verify, report). Retry a few
      // times; if it still fails, the Worker's own sweep records the bet later.
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

  place.addEventListener("click", placeBet);

  renderSides();
  renderChips();
  renderWallet();
  requestQuote();
  // Phantom injects itself a moment after the page loads.
  var tries = 0;
  var poll = setInterval(function () {
    if (findProvider() || ++tries > 10) { clearInterval(poll); if (!account) renderWallet(); }
  }, 250);
  if (window.phantom === undefined) window.addEventListener("load", function () { if (!account) renderWallet(); });
})();
