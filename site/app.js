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

  // Night sky: a few chrome stars in the side gutters, never behind text.
  var sky = document.getElementById("sky");
  if (sky) {
    var narrow = window.innerWidth < 720;
    for (var i = 0; i < 20; i++) {
      var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      s.setAttribute("class", "sky-star");
      s.innerHTML = '<use href="#star"/>';
      var left = i % 2 ? (narrow ? 95 + Math.random() * 4 : 86 + Math.random() * 12) : (narrow ? 1 + Math.random() * 4 : 2 + Math.random() * 12);
      var size = 6 + Math.random() * 8;
      s.style.cssText = "left:" + left.toFixed(1) + "%;top:" + (3 + Math.random() * 94).toFixed(1) + "%;width:" + size.toFixed(0) + "px;height:" + size.toFixed(0) + "px;opacity:" + (0.1 + Math.random() * 0.15).toFixed(2) + ";animation-delay:" + (Math.random() * 8).toFixed(1) + "s;animation-duration:" + (5 + Math.random() * 6).toFixed(1) + "s";
      sky.appendChild(s);
    }
  }

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
