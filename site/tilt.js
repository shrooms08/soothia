// 3D tilt for the "How it works" cards and the market tile: pointer devices
// only, off under reduced motion. Under 2 KB, no libraries.
(function () {
  if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  var MAX = 6;
  document.querySelectorAll(".tilt").forEach(function (card) {
    var sheen = document.createElement("span");
    sheen.className = "sheen";
    card.appendChild(sheen);
    var target = { x: 0, y: 0, sx: 50, sy: 50 },
      current = { x: 0, y: 0, sx: 50, sy: 50 },
      raf = 0,
      over = false;
    function tick() {
      raf = 0;
      var k = 0.16,
        still = true;
      for (var key in target) {
        var d = target[key] - current[key];
        if (Math.abs(d) > 0.01) {
          still = false;
          current[key] += d * k;
        } else current[key] = target[key];
      }
      card.style.transform = "rotateX(" + current.y.toFixed(2) + "deg) rotateY(" + current.x.toFixed(2) + "deg)";
      sheen.style.background =
        "radial-gradient(circle at " +
        current.sx.toFixed(1) +
        "% " +
        current.sy.toFixed(1) +
        "%, rgba(244,241,255,.14), rgba(244,241,255,0) 60%)";
      if (!still) raf = requestAnimationFrame(tick);
    }
    function schedule() {
      if (!raf) raf = requestAnimationFrame(tick);
    }
    card.addEventListener("pointerenter", function () {
      over = true;
      card.classList.add("tilting");
    });
    card.addEventListener("pointermove", function (e) {
      if (!over) return;
      var r = card.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width,
        py = (e.clientY - r.top) / r.height;
      target.x = (px - 0.5) * 2 * MAX;
      target.y = (0.5 - py) * 2 * MAX;
      target.sx = px * 100;
      target.sy = py * 100;
      schedule();
    });
    card.addEventListener("pointerleave", function () {
      over = false;
      card.classList.remove("tilting");
      target.x = 0;
      target.y = 0;
      target.sx = 50;
      target.sy = 50;
      schedule();
    });
  });
})();
