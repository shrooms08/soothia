// The public leaderboard and profile pages. Everything shown comes from the API and
// goes in through textContent, so nothing a user chose can become markup.
(() => {
  const API = window.SOOTHIA.API_URL;
  const BOARDS = [
    ["score", "Call Score", "Needs 10 settled calls."],
    ["earners", "Earners", "Needs 5 settled stakes."],
    ["roi", "ROI", "Needs 5 settled stakes."],
    ["hits", "Best hit", "Needs a winning stake."],
    ["streaks", "Streaks", "Needs 5 settled calls."],
  ];
  const PERIODS = [
    ["week", "Week"],
    ["month", "Month"],
    ["all", "All time"],
  ];

  function h(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  }

  function sui(mist) {
    const value = BigInt(mist);
    const negative = value < 0n;
    const abs = negative ? -value : value;
    const fraction = (abs % 1000000000n).toString().padStart(9, "0").slice(0, 4).replace(/0+$/, "");
    return `${negative ? "-" : ""}${abs / 1000000000n}${fraction ? `.${fraction}` : ""} SUI`;
  }

  const signed = (mist) => `${BigInt(mist) > 0n ? "+" : ""}${sui(mist)}`;
  const percent = (rate) => (rate === null ? "–" : `${Math.round(rate * 100)}%`);
  const roi = (value) => (value === null ? "–" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`);
  const times = (value) => (value === null ? "–" : `${value.toFixed(2)}x`);

  async function fetchJson(path) {
    const response = await fetch(`${API}${path}`);
    return { status: response.status, body: await response.json().catch(() => null) };
  }

  function tabs(root, options, selected, choose) {
    root.replaceChildren(
      ...options.map(([value, label]) => {
        const tab = h("button", `social-tab${value === selected ? " selected" : ""}`, label);
        tab.type = "button";
        tab.setAttribute("role", "tab");
        tab.setAttribute("aria-selected", String(value === selected));
        tab.addEventListener("click", () => choose(value));
        return tab;
      }),
    );
  }

  function statCell(label, value) {
    const cell = h("div", "social-stat");
    cell.append(h("b", "", value), h("span", "", label));
    return cell;
  }

  // ---- Leaderboard ----

  function leaderboard() {
    const params = new URLSearchParams(location.search);
    const state = {
      board: BOARDS.some(([value]) => value === params.get("board")) ? params.get("board") : "score",
      period: PERIODS.some(([value]) => value === params.get("period")) ? params.get("period") : "all",
      league: params.get("league") ?? "",
      team: params.get("team") ?? "",
    };
    const status = document.getElementById("status");
    const rows = document.getElementById("rows");
    const league = document.getElementById("league");
    const team = document.getElementById("team");
    let seq = 0;

    const valueText = (row) => {
      switch (state.board) {
        case "score":
          return String(row.score);
        case "earners":
          return signed(row.profit);
        case "roi":
          return roi(row.roi);
        case "hits":
          return times(row.bestMultiplier);
        default:
          return `${row.streak} in a row`;
      }
    };

    function fillSelect(select, names, label, value) {
      select.replaceChildren(h("option", "", label), ...names.map((name) => h("option", "", name)));
      select.firstChild.value = "";
      if (value && !names.includes(value)) select.append(h("option", "", value));
      select.value = value;
    }

    function renderRows(list) {
      rows.replaceChildren(
        ...list.map((row) => {
          const item = h("li", "social-row");
          const name = h("a", "social-handle", `@${row.handle}`);
          name.href = `/u/${encodeURIComponent(row.handle)}`;
          item.append(
            h("span", "social-rank", String(row.rank)),
            name,
            h("span", "social-value", valueText(row)),
            h("span", "social-meta", `Score ${row.score} · ${row.calls} calls · ${percent(row.hitRate)} right · streak ${row.streak}`),
          );
          return item;
        }),
      );
    }

    async function load() {
      const current = ++seq;
      tabs(document.getElementById("boards"), BOARDS, state.board, (value) => update({ board: value }));
      tabs(document.getElementById("periods"), PERIODS, state.period, (value) => update({ period: value }));
      const query = new URLSearchParams({ board: state.board, period: state.period });
      if (state.league) query.set("league", state.league);
      if (state.team) query.set("team", state.team);
      status.textContent = "Loading…";
      try {
        const { status: code, body } = await fetchJson(`/social/leaderboard?${query}`);
        if (current !== seq) return;
        if (code !== 200 || !body) throw new Error("failed");
        fillSelect(league, body.filters.leagues, "All leagues", state.league);
        fillSelect(team, body.filters.teams, "All teams", state.team);
        renderRows(body.rows);
        status.textContent = body.rows.length ? "" : `Nobody qualifies yet. ${BOARDS.find(([value]) => value === state.board)[2]}`;
      } catch {
        if (current !== seq) return;
        rows.replaceChildren();
        status.textContent = "Couldn't load the leaderboard. Try again in a moment.";
      }
    }

    function update(change) {
      Object.assign(state, change);
      const query = new URLSearchParams();
      for (const key of ["board", "period", "league", "team"]) if (state[key]) query.set(key, state[key]);
      history.replaceState(null, "", `/leaderboard?${query}`);
      void load();
    }

    league.addEventListener("change", () => update({ league: league.value, team: "" }));
    team.addEventListener("change", () => update({ team: team.value, league: "" }));
    void load();
  }

  // ---- Profile ----

  function statsGrid(stats) {
    const grid = h("div", "social-stats");
    grid.append(
      statCell("Call Score", String(stats.score)),
      statCell("calls", String(stats.calls)),
      statCell("settled", String(stats.settled)),
      statCell("right", `${stats.hits} (${percent(stats.hitRate)})`),
      statCell("Brier", stats.brier === null ? "–" : stats.brier.toFixed(3)),
      statCell("streak", String(stats.currentStreak)),
      statCell("best streak", String(stats.bestStreak)),
      statCell("staked", sui(stats.stakedMist)),
      statCell("returned", sui(stats.returnedMist)),
      statCell("profit", signed(stats.profitMist)),
      statCell("ROI", roi(stats.roiPercent)),
      statCell("won / lost stakes", `${stats.wonStakes} / ${stats.lostStakes}`),
    );
    return grid;
  }

  function breakdown(title, group) {
    const names = Object.keys(group).sort((a, b) => group[b].settled - group[a].settled || a.localeCompare(b));
    if (names.length === 0) return [];
    const section = h("section", "social-section");
    section.append(h("h2", "", title));
    const list = h("ul", "social-breakdown");
    for (const name of names) {
      const stats = group[name];
      const item = h("li", "");
      item.append(h("span", "", name), h("span", "social-meta", `${stats.settled} settled · ${percent(stats.hitRate)} right · score ${stats.score}`));
      list.append(item);
    }
    section.append(list);
    return [section];
  }

  function stakeText(stake) {
    if (!stake) return "";
    const amount = sui(stake.amountMist);
    if (stake.result === "won") return `Staked ${amount}, won ${sui(stake.payoutMist)}`;
    if (stake.result === "lost") return `Staked ${amount}, lost`;
    if (stake.result === "refunded") return `Staked ${amount}, refunded`;
    return `Staked ${amount}`;
  }

  function callRow(call) {
    const item = h("li", "social-call");
    const head = h("div", "social-call-head");
    head.append(h("span", "social-call-match", `${call.match.home} vs ${call.match.away}`), h("span", `social-chip ${call.status}`, call.status));
    item.append(head, h("p", "social-meta", `${call.lean} · ${call.confidence}%${call.match.competition ? ` · ${call.match.competition}` : ""}`));
    const stake = stakeText(call.stake);
    if (stake) item.append(h("p", "social-meta", stake));
    if (call.proof) {
      const link = h("a", "social-proof", "Proof on Sui");
      link.href = call.proof.url;
      link.target = "_blank";
      link.rel = "noopener";
      item.append(link);
    }
    return item;
  }

  async function profile() {
    const handle = document.body.dataset.handle;
    const status = document.getElementById("status");
    const root = document.getElementById("profile");
    let body;
    try {
      const result = await fetchJson(`/social/profile/${encodeURIComponent(handle)}`);
      if (result.status === 404) {
        status.textContent = `There is no public profile called @${handle}.`;
        return;
      }
      if (result.status !== 200 || !result.body) throw new Error("failed");
      body = result.body;
    } catch {
      status.textContent = "Couldn't load this profile. Try again in a moment.";
      return;
    }
    const since = document.getElementById("since");
    const address = h("a", "social-proof", `${body.profile.address.slice(0, 6)}…${body.profile.address.slice(-4)}`);
    address.href = `https://suivision.xyz/account/${encodeURIComponent(body.profile.address)}`;
    address.target = "_blank";
    address.rel = "noopener";
    since.append(`Public since ${new Date(body.profile.publicSince).toLocaleDateString()} · `, address);

    if (!body.stats) {
      status.textContent = "Stats appear within about 15 minutes of going public.";
      return;
    }
    status.textContent = "";
    let period = "all";
    const periodTabs = h("div", "social-tabs social-periods");
    const gridSlot = h("div", "");
    const bestSlot = h("p", "social-meta");
    const renderPeriod = () => {
      tabs(periodTabs, PERIODS, period, (value) => {
        period = value;
        renderPeriod();
      });
      const stats = body.periods[period];
      gridSlot.replaceChildren(statsGrid(stats));
      bestSlot.textContent = stats.bestMultiplier ? `Best multiplier ${times(stats.bestMultiplier.value)} on ${stats.bestMultiplier.match}` : "";
    };
    renderPeriod();

    const calls = h("section", "social-section");
    calls.append(h("h2", "", "Recent calls"));
    if (body.calls.length === 0) calls.append(h("p", "social-meta", "No public calls yet."));
    else {
      const list = h("ul", "social-calls");
      list.append(...body.calls.map(callRow));
      calls.append(list);
    }
    root.replaceChildren(periodTabs, gridSlot, bestSlot, ...breakdown("Leagues", body.breakdowns.leagues), ...breakdown("Teams", body.breakdowns.teams), calls);
  }

  if (document.body.dataset.page === "leaderboard") leaderboard();
  else void profile();
})();
