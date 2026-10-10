// Links, demo embed, and the page's small motions. No libraries.
(function () {
  var C = window.SOOTHIA || {};
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Outbound links come from config.js.
  document.querySelectorAll("[data-link]").forEach(function (a) {
    var url = C[a.getAttribute("data-link")];
    if (url) a.href = url;
  });

  // Demo: YouTube or Loom embed, a local mp4, or the placeholder.
  var demo = document.getElementById("demo-frame");
  var video = (C.DEMO_VIDEO_URL || "").trim();
  if (demo && video) {
    var m = video.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/);
    var loom = video.match(/loom\.com\/(?:share|embed)\/([\w]+)/);
    var src = m ? "https://www.youtube.com/embed/" + m[1] : loom ? "https://www.loom.com/embed/" + loom[1] : "";
    if (src) {
      var f = document.createElement("iframe");
      f.src = src; f.title = "Soothia demo"; f.loading = "lazy";
      f.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
      f.allowFullscreen = true;
      demo.replaceChildren(f);
    } else if (/\.mp4(\?|$)/.test(video)) {
      var v = document.createElement("video");
      v.src = video; v.controls = true; v.playsInline = true; v.preload = "metadata";
      demo.replaceChildren(v);
    }
  }

  // Traction strip: real numbers from the Worker, hidden entirely if the fetch fails.
  var strip = document.getElementById("stats");
  if (strip && C.STATS_URL) {
    fetch(C.STATS_URL, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : null; }).then(function (s) {
      if (!s || typeof s.marketsCreated !== "number" || typeof s.volumeUsdc !== "number" || typeof s.uniqueWallets !== "number") return;
      strip.hidden = false;
      var nodes = strip.querySelectorAll("[data-stat]");
      var shown = false;
      function show() {
        if (shown) return; shown = true;
        nodes.forEach(function (n) {
          var end = s[n.getAttribute("data-stat")], prefix = n.getAttribute("data-prefix") || "";
          var money = prefix === "$";
          var fmt = function (v) { return prefix + (money ? v.toFixed(2) : Math.round(v)); };
          var label = n.nextElementSibling;
          if (label && label.hasAttribute("data-one")) label.textContent = label.getAttribute(end === 1 ? "data-one" : "data-many");
          if (reduced) { n.textContent = fmt(end); return; }
          var t0 = performance.now(), dur = 1100;
          (function step(now) {
            var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
            n.textContent = fmt(end * e);
            if (p < 1) requestAnimationFrame(step);
          })(t0);
        });
      }
      if ("IntersectionObserver" in window) {
        var o = new IntersectionObserver(function (es) { if (es.some(function (x) { return x.isIntersecting; })) { show(); o.disconnect(); } });
        o.observe(strip);
      } else show();
    }).catch(function () {});
  }

  // The night sky is drawn by sky.js (shared with the share page).

  // Section reveals, once.
  var toReveal = document.querySelectorAll(".reveal");
  if (reduced || !("IntersectionObserver" in window)) {
    toReveal.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
      });
    }, { rootMargin: "0px 0px -10% 0px" });
    toReveal.forEach(function (el) { io.observe(el); });
  }

  // Hero reading moment: arc spins once, the underline draws, stars twinkle in.
  var hero = document.getElementById("hero");
  var orb = document.getElementById("hero-orb");
  if (hero && orb) {
    if (reduced) {
      hero.classList.add("read", "found");
    } else {
      setTimeout(function () { orb.classList.add("thinking"); }, 400);
      setTimeout(function () { orb.classList.remove("thinking"); hero.classList.add("read"); }, 1700);
      setTimeout(function () { hero.classList.add("found"); }, 2300);
    }
  }

  // 3D glass orb (site/orb3d.js, three.js), only after first paint and only on
  // capable desktops, or when ?orb=3d asks for it. The CSS orb stays in the DOM
  // as the default and the fallback; nothing in the layout moves.
  var orbNode = orb && orb.querySelector(".orb");
  var orbParam = new URLSearchParams(location.search).get("orb");
  var orbMode = orbParam === "3d" || orbParam === "css" ? orbParam : (C.ORB_DEFAULT || "css");
  function hasWebGL2() {
    try { var c = document.createElement("canvas"); return !!(window.WebGL2RenderingContext && c.getContext("webgl2")); } catch (e) { return false; }
  }
  function orbQualifies() {
    if (reduced) return false;
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return false;
    if ((navigator.hardwareConcurrency || 0) < 4) return false;
    if (typeof navigator.deviceMemory === "number" && navigator.deviceMemory < 4) return false;
    return hasWebGL2();
  }
  // Phones and tablets always keep the CSS orb, even with ?orb=3d.
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var want3d = orbNode && finePointer && (orbMode === "3d" ? hasWebGL2() : orbMode === "auto" && orbQualifies());
  if (want3d) {
    var forced = orbMode === "3d";
    // After first paint: two frames in, then idle.
    requestAnimationFrame(function () { requestAnimationFrame(function () { setTimeout(load3d, 0); }); });
  }
  function load3d() {
    import("/orb3d.js?v=" + (C.ORB_VERSION || "1")).then(function (m) {
      var handle = m.mountOrb(orbNode, {});
      if (!handle) return;
      window.__soothiaOrb = handle;
      handle.fps.then(function (fps) {
        window.__soothiaOrbFps = fps;
        if (fps < 45 && !forced) { handle.dispose(); window.__soothiaOrb = null; console.info("Soothia: 3D orb paused at " + fps.toFixed(0) + " fps, CSS orb restored."); }
        else console.info("Soothia: 3D orb at " + fps.toFixed(0) + " fps" + (forced ? " (forced)" : ""));
      });
    }).catch(function () {});
  }

  // Watching orb: the highlight drifts a little toward the cursor. Touch devices just breathe.
  var eye = orb && orb.querySelector(".orb-eye");
  if (eye && !reduced && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    window.addEventListener("mousemove", function (ev) {
      var r = orb.getBoundingClientRect();
      var dx = ev.clientX - (r.left + r.width / 2);
      var dy = ev.clientY - (r.top + r.height / 2);
      var d = Math.hypot(dx, dy) || 1;
      var k = Math.min(6, d / 60);
      eye.style.transform = "translate(" + (dx / d * k).toFixed(1) + "px," + (dy / d * k).toFixed(1) + "px)";
    }, { passive: true });
  }
})();
