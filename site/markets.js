// The markets page: category, sort and resolved filters applied client-side to
// the server-rendered cards (nodes are reordered, never rebuilt, so tilt and
// reveal keep working), with the state mirrored in the URL. Closing times are
// shown in the viewer's local time.
(function () {
  var main = document.getElementById("markets");
  if (!main) return;
  var params = new URLSearchParams(location.search);
  var state = { cat: params.get("cat") || "all", sort: params.get("sort") || "closing", resolved: params.get("resolved") === "1" };
  var cards = [].slice.call(main.querySelectorAll(".mcard"));
  var sections = { primary: document.getElementById("live"), p2p: document.getElementById("p2p"), resolved: document.getElementById("resolved") };
  var fmt = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  main.querySelectorAll("time[datetime]").forEach(function (t) {
    var d = new Date(t.getAttribute("datetime"));
    if (!isNaN(d)) t.textContent = fmt.format(d);
  });

  function keyFor(card) {
    var closes = card.getAttribute("data-closes") || card.getAttribute("data-ends") || "";
    if (state.sort === "volume") return -Number(card.getAttribute("data-volume") || 0);
    if (state.sort === "new") return -(Date.parse(card.getAttribute("data-created") || "") || 0);
    return closes ? Date.parse(closes) : Number.MAX_SAFE_INTEGER;
  }

  function apply() {
    var url = new URL(location.href);
    ["cat", "sort", "resolved"].forEach(function (k) { url.searchParams.delete(k); });
    if (state.cat !== "all") url.searchParams.set("cat", state.cat);
    if (state.sort !== "closing") url.searchParams.set("sort", state.sort);
    if (state.resolved) url.searchParams.set("resolved", "1");
    history.replaceState(null, "", url.pathname + (url.search || ""));

    main.querySelectorAll(".filter-cat").forEach(function (b) { b.classList.toggle("selected", b.getAttribute("data-cat") === state.cat); b.setAttribute("aria-pressed", String(b.getAttribute("data-cat") === state.cat)); });
    var sortSelect = document.getElementById("sort");
    if (sortSelect) sortSelect.value = state.sort;
    var resolvedToggle = document.getElementById("show-resolved");
    if (resolvedToggle) { resolvedToggle.classList.toggle("selected", state.resolved); resolvedToggle.setAttribute("aria-pressed", String(state.resolved)); }

    Object.keys(sections).forEach(function (phase) {
      var section = sections[phase];
      if (!section) return;
      var grid = section.querySelector(".mgrid");
      var own = cards.filter(function (c) { return c.getAttribute("data-phase") === phase && (state.cat === "all" || c.getAttribute("data-category") === state.cat); });
      own.sort(function (a, b) { return keyFor(a) - keyFor(b); });
      own.forEach(function (c) { grid.appendChild(c); });
      cards.forEach(function (c) { if (c.getAttribute("data-phase") === phase) c.hidden = own.indexOf(c) < 0; });
      var empty = section.querySelector(".mempty");
      if (empty) empty.hidden = own.length > 0;
      var count = section.querySelector(".mcount");
      if (count) count.textContent = own.length ? String(own.length) : "";
      section.hidden = phase === "resolved" ? !state.resolved : false;
    });
  }

  main.querySelectorAll(".filter-cat").forEach(function (b) {
    b.addEventListener("click", function () { state.cat = b.getAttribute("data-cat"); apply(); });
  });
  var sort = document.getElementById("sort");
  if (sort) sort.addEventListener("change", function () { state.sort = sort.value; apply(); });
  var resolved = document.getElementById("show-resolved");
  if (resolved) resolved.addEventListener("click", function () { state.resolved = !state.resolved; apply(); });
  apply();
})();
