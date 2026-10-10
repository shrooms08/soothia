// Night sky: a few chrome stars in the side gutters, never behind text.
// #sky takes data-count (wide screens) and data-count-narrow (under 720px).
(function () {
  var sky = document.getElementById("sky");
  if (!sky) return;
  var narrow = window.innerWidth < 720;
  var count = Number(sky.getAttribute(narrow ? "data-count-narrow" : "data-count")) || 20;
  for (var i = 0; i < count; i++) {
    var s = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    s.setAttribute("class", "sky-star");
    s.innerHTML = '<use href="#star"/>';
    var left = i % 2 ? (narrow ? 95 + Math.random() * 4 : 86 + Math.random() * 12) : (narrow ? 1 + Math.random() * 4 : 2 + Math.random() * 12);
    var size = 6 + Math.random() * 8;
    s.style.cssText = "left:" + left.toFixed(1) + "%;top:" + (3 + Math.random() * 94).toFixed(1) + "%;width:" + size.toFixed(0) + "px;height:" + size.toFixed(0) + "px;opacity:" + (0.1 + Math.random() * 0.15).toFixed(2) + ";animation-delay:" + (Math.random() * 8).toFixed(1) + "s;animation-duration:" + (5 + Math.random() * 6).toFixed(1) + "s";
    sky.appendChild(s);
  }
})();
