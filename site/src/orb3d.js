// The 3D glass orb for the landing hero (site/orb3d.js, built by
// scripts/build-orb.mjs). Mounted by app.js only on capable desktops or with
// ?orb=3d. A transmissive glass sphere with swirling inner mist, a chrome
// glint on the upper-right rim, four tiny chrome stars on tilted orbits, a
// violet glow, and the hero's "reading moment": a ring of light that orbits
// the ball once on load. Everything is disposed cleanly on unmount.
import {
  AdditiveBlending, BackSide, CanvasTexture, Color, DataTexture, DirectionalLight, EquirectangularReflectionMapping, ExtrudeGeometry, FloatType,
  Group, LinearFilter, Mesh, MeshPhysicalMaterial, MeshStandardMaterial, PerspectiveCamera, PointLight, RGBAFormat, Scene, ShaderMaterial, Shape,
  SphereGeometry, Sprite, SpriteMaterial, TorusGeometry, Vector2, Vector3, WebGLRenderer,
} from "three";

const PALETTE = { core: 0xf4f1ff, mid: 0xafa9ec, edge: 0x7f77dd, deep: 0x534ab7, ivory: 0xf5f0e6 };
const MAX_DPR = 1.75;
const MAX_TILT = (8 * Math.PI) / 180;

// A small procedural environment: ivory light top-left, violet rim right, dark below.
function environmentTexture() {
  const w = 128, h = 64;
  const data = new Float32Array(w * h * 4);
  const ivory = new Color(PALETTE.ivory), violet = new Color(PALETTE.edge), deep = new Color(0x120f1e);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const u = x / w, v = y / h; // v: 0 top, 1 bottom
      const c = deep.clone();
      const key = Math.exp(-(((u - 0.22) * 3.2) ** 2 + ((v - 0.22) * 4) ** 2));
      const rim = Math.exp(-(((u - 0.78) * 2.6) ** 2 + ((v - 0.5) * 2.2) ** 2));
      const top = Math.max(0, 0.5 - v) * 0.5;
      c.lerp(ivory, Math.min(1, key * 2.2 + top * 0.5));
      c.lerp(violet, Math.min(1, rim * 1.1));
      const i = (y * w + x) * 4;
      data[i] = c.r; data[i + 1] = c.g; data[i + 2] = c.b; data[i + 3] = 1;
    }
  }
  const texture = new DataTexture(data, w, h, RGBAFormat, FloatType);
  texture.mapping = EquirectangularReflectionMapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function glowTexture(inner, outer) {
  const size = 256;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, inner);
  g.addColorStop(0.35, inner.replace(/[\d.]+\)$/, "0.45)"));
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new CanvasTexture(canvas);
}

// The logo's four-point star, extruded a little so it catches light.
function starGeometry(size, depth) {
  const s = new Shape();
  const k = size;
  s.moveTo(0, -k);
  s.bezierCurveTo(0.06 * k, -0.24 * k, 0.16 * k, -0.08 * k, 0.64 * k, 0);
  s.bezierCurveTo(0.16 * k, 0.08 * k, 0.06 * k, 0.24 * k, 0, k);
  s.bezierCurveTo(-0.06 * k, 0.24 * k, -0.16 * k, 0.08 * k, -0.64 * k, 0);
  s.bezierCurveTo(-0.16 * k, -0.08 * k, -0.06 * k, -0.24 * k, 0, -k);
  return new ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: depth * 0.5, bevelSize: depth * 0.5, bevelSegments: 2, curveSegments: 8 });
}

const CORE_VERTEX = `
varying vec3 vNormal; varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = normalize(-mv.xyz);
  gl_Position = projectionMatrix * mv;
}`;
// The CSS orb's radial fill as a lit-looking sphere: ivory core, lavender mid, violet rim, a soft eye highlight.
const CORE_FRAGMENT = `
precision highp float;
uniform vec3 uCore; uniform vec3 uMid; uniform vec3 uEdge; uniform vec3 uDeep; uniform float uTime;
varying vec3 vNormal; varying vec3 vView;
void main() {
  vec3 n = normalize(vNormal);
  float f = 1.0 - max(dot(n, normalize(vView)), 0.0);
  vec3 col = mix(uCore, uMid, smoothstep(0.0, 0.85, f * 1.25));
  col = mix(col, uEdge, smoothstep(0.55, 1.0, f));
  col = mix(col, uDeep, pow(f, 5.0) * 0.6);
  vec3 eye = normalize(vec3(-0.42, 0.5, 0.75));
  col += vec3(1.0) * pow(max(dot(n, eye), 0.0), 14.0) * 0.5;
  col += uMid * pow(max(dot(n, normalize(vec3(0.7, -0.6, 0.4))), 0.0), 6.0) * 0.18;
  gl_FragColor = vec4(col, 1.0);
}`;

const MIST_VERTEX = `
varying vec3 vPos;
void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;

// Simplex noise (Ashima Arts, MIT) driving a slow swirl of violet and ivory.
const MIST_FRAGMENT = `
precision highp float;
uniform float uTime; uniform vec3 uViolet; uniform vec3 uIvory; uniform float uOpacity;
varying vec3 vPos;
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0); const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy)); vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz); vec3 l=1.0-g; vec3 i1=min(g.xyz,l.zxy); vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx; vec3 x2=x0-i2+C.yyy; vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857; vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z); vec4 x_=floor(j*ns.z); vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy; vec4 y=y_*ns.x+ns.yyyy; vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy); vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0; vec4 s1=floor(b1)*2.0+1.0; vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy; vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x); vec3 p1=vec3(a0.zw,h.y); vec3 p2=vec3(a1.xy,h.z); vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0); m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}
void main(){
  float t = uTime * 0.06;
  vec3 p = vPos * 1.6;
  float a = atan(p.z, p.x) + t * 1.2;
  vec3 q = vec3(cos(a) * length(p.xz), p.y + t * 0.4, sin(a) * length(p.xz));
  float n = snoise(q + vec3(0.0, t, 0.0)) * 0.6 + snoise(q * 2.3 - vec3(t * 0.7)) * 0.4;
  float wisp = smoothstep(0.05, 0.75, n);
  float fade = 1.0 - smoothstep(0.55, 1.0, length(vPos));
  vec3 col = mix(uViolet, uIvory, wisp * 0.8);
  gl_FragColor = vec4(col, wisp * fade * uOpacity);
}`;

export function mountOrb(orbElement, options = {}) {
  const canvas = document.createElement("canvas");
  canvas.className = "orb-canvas";
  canvas.setAttribute("aria-hidden", "true");
  let renderer;
  try {
    renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: "high-performance" });
  } catch {
    return null;
  }
  const dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
  renderer.setPixelRatio(dpr);
  renderer.setClearColor(0x000000, 0);
  // The canvas is bigger than the 120px orb so the glow and orbiting stars have room; it sits
  // absolutely over the CSS orb, so nothing in the layout moves.
  const box = orbElement.getBoundingClientRect();
  const size = Math.round(Math.max(120, box.width) * 2.6);
  renderer.setSize(size, size, false);
  canvas.style.cssText = `position:absolute;left:50%;top:50%;width:${size}px;height:${size}px;transform:translate(-50%,-50%);pointer-events:none;`;
  orbElement.appendChild(canvas);
  orbElement.classList.add("is-3d");

  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 0.1, 20);
  camera.position.set(0, 0, 5.6);
  // A unit sphere spans the 120px orb: 2.6x canvas means the sphere is ~1/2.6 of the canvas.
  const fit = (2.6 / 2) * (2 * Math.tan((28 * Math.PI) / 360) * 5.6) / 2;
  const SCALE = 1 / fit;

  const env = environmentTexture();
  scene.environment = env;

  const root = new Group();
  root.scale.setScalar(SCALE);
  scene.add(root);

  // The ball itself: an unlit gradient core (the palette) seen through a thin glass shell.
  const core = new ShaderMaterial({
    vertexShader: CORE_VERTEX, fragmentShader: CORE_FRAGMENT,
    uniforms: { uCore: { value: new Color(PALETTE.core) }, uMid: { value: new Color(PALETTE.mid) }, uEdge: { value: new Color(PALETTE.edge) }, uDeep: { value: new Color(PALETTE.deep) }, uTime: { value: 0 } },
  });
  const coreMesh = new Mesh(new SphereGeometry(0.93, 64, 64), core);
  root.add(coreMesh);

  // Mist rides in the opaque pass (additive, no depth write) so the glass transmission sees it.
  const mist = new ShaderMaterial({
    vertexShader: MIST_VERTEX, fragmentShader: MIST_FRAGMENT, transparent: false, depthWrite: false, depthTest: true, blending: AdditiveBlending,
    uniforms: { uTime: { value: 0 }, uViolet: { value: new Color(PALETTE.edge) }, uIvory: { value: new Color(0xffffff) }, uOpacity: { value: 0.5 } },
  });
  const mistMesh = new Mesh(new SphereGeometry(0.9, 48, 48), mist);
  root.add(mistMesh);

  const glass = new MeshPhysicalMaterial({
    color: 0xffffff, transmission: 0.96, thickness: 0.35, roughness: 0.12, metalness: 0,
    clearcoat: 1, clearcoatRoughness: 0.12, ior: 1.4, iridescence: 0.3, iridescenceIOR: 1.3, iridescenceThicknessRange: [120, 400],
    envMapIntensity: 0.9, specularIntensity: 0.55,
  });
  const sphere = new Mesh(new SphereGeometry(1, 72, 72), glass);
  root.add(sphere);

  // A violet back-facing rim so the edge reads #7F77DD against black.
  const rim = new Mesh(
    new SphereGeometry(1.006, 48, 48),
    new MeshStandardMaterial({ color: PALETTE.edge, transparent: true, opacity: 0.3, side: BackSide, roughness: 0.7, metalness: 0 }),
  );
  root.add(rim);

  const glowTex = glowTexture("rgba(127,119,221,0.9)", "rgba(83,74,183,0)");
  const glow = new Sprite(new SpriteMaterial({ map: glowTex, transparent: true, opacity: 0.55, depthWrite: false, blending: AdditiveBlending }));
  glow.scale.setScalar(3.9);
  glow.position.z = -0.6;
  root.add(glow);

  // Chrome stars: a little self-light so they stay silver rather than taking the violet environment.
  const chrome = new MeshStandardMaterial({ color: 0xffffff, metalness: 0.9, roughness: 0.22, envMapIntensity: 1.2, emissive: 0x8e8ba0, emissiveIntensity: 0.35 });
  // The glint and the orbiting stars live outside the tilting root: they face the camera.
  const stars = new Group();
  scene.add(stars);
  const glint = new Mesh(starGeometry(0.22, 0.035), chrome);
  glint.position.set(0.8, 0.86, 0.5).multiplyScalar(SCALE);
  stars.add(glint);

  const orbiters = [];
  for (let i = 0; i < 4; i++) {
    const star = new Mesh(starGeometry(0.07 + i * 0.012, 0.016), chrome);
    stars.add(star);
    const tilt = (0.45 + i * 0.35) * (i % 2 ? -1 : 1);
    const turn = i * 0.8;
    orbiters.push({ star, radius: (1.42 + i * 0.17) * SCALE, speed: 0.22 + i * 0.06, phase: i * 1.7, tilt, turn });
  }
  const tmp = new Vector3();

  // The reading moment: a thin ring of light that orbits the ball once.
  const ring = new Mesh(
    new TorusGeometry(1.26, 0.012, 8, 96, Math.PI * 1.35),
    new MeshStandardMaterial({ color: PALETTE.ivory, emissive: PALETTE.ivory, emissiveIntensity: 1.6, transparent: true, opacity: 0 }),
  );
  ring.rotation.x = 1.15;
  root.add(ring);

  // Soft lights for the chrome and the clearcoat; the core is unlit so it keeps the palette.
  const key = new DirectionalLight(PALETTE.ivory, 0.9);
  key.position.set(-2, 3, 3);
  scene.add(key);
  const rimLight = new PointLight(PALETTE.deep, 8, 12, 1.4);
  rimLight.position.set(2.6, -0.4, -1.4);
  scene.add(rimLight);

  // ---- Motion ----
  const start = performance.now();
  const pointer = new Vector2(0, 0);
  const tilt = new Vector2(0, 0);
  let frames = 0, running = true, visible = true, disposed = false, raf = 0;
  const fpsWindow = [];
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const onMove = (event) => {
    const r = orbElement.getBoundingClientRect();
    const dx = (event.clientX - (r.left + r.width / 2)) / Math.max(1, window.innerWidth / 2);
    const dy = (event.clientY - (r.top + r.height / 2)) / Math.max(1, window.innerHeight / 2);
    pointer.set(Math.max(-1, Math.min(1, dx)), Math.max(-1, Math.min(1, dy)));
  };
  if (!reduced) window.addEventListener("mousemove", onMove, { passive: true });

  let last = start;
  function frame(now) {
    if (disposed) return;
    raf = running && visible ? requestAnimationFrame(frame) : 0;
    const t = (now - start) / 1000;
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    frames++;
    fpsWindow.push(now);
    while (fpsWindow.length && now - fpsWindow[0] > 1000) fpsWindow.shift();

    // Breathing 0.98..1.02 and a slow idle turn; the whole ball eases toward the cursor (max 8°).
    const breathe = reduced ? 1 : 1 + 0.02 * Math.sin((t / 4.8) * Math.PI * 2);
    root.scale.setScalar(SCALE * breathe);
    tilt.x += (pointer.y * MAX_TILT - tilt.x) * Math.min(1, dt * 3);
    tilt.y += (pointer.x * MAX_TILT - tilt.y) * Math.min(1, dt * 3);
    root.rotation.set(tilt.x, tilt.y + (reduced ? 0 : t * 0.08), 0);
    sphere.rotation.y = t * 0.05;
    mist.uniforms.uTime.value = reduced ? 0 : t;
    glint.quaternion.copy(camera.quaternion);
    glint.rotation.z = Math.sin(t * 0.8) * 0.12;
    glint.scale.setScalar(breathe);
    for (const o of orbiters) {
      const a = o.phase + (reduced ? 0 : t * o.speed);
      // A circle in the XZ plane, tilted about X then turned about Y, so stars pass behind and in front.
      tmp.set(Math.cos(a) * o.radius, 0, Math.sin(a) * o.radius);
      tmp.applyAxisAngle(new Vector3(1, 0, 0), o.tilt).applyAxisAngle(new Vector3(0, 1, 0), o.turn);
      o.star.position.copy(tmp);
      o.star.quaternion.copy(camera.quaternion);
      o.star.rotation.z = a * 1.2;
    }
    // Reading moment: the ring appears at 0.4 s, orbits once over 1.2 s, then fades.
    const ringT = (t - 0.4) / 1.2;
    if (ringT > 0 && ringT < 1.25) {
      ring.rotation.y = ringT * Math.PI * 2;
      ring.material.opacity = ringT < 1 ? Math.min(1, ringT * 6) * 0.95 : Math.max(0, 1 - (ringT - 1) * 4) * 0.95;
    } else ring.material.opacity = 0;
    glow.material.opacity = 0.5 + 0.08 * Math.sin((t / 4.8) * Math.PI * 2);
    renderer.render(scene, camera);
    if (options.onFrame) options.onFrame(frames, t);
  }

  function resume() {
    if (!raf && !disposed && running && visible) { last = performance.now(); raf = requestAnimationFrame(frame); }
  }
  const onVisibility = () => { running = !document.hidden; if (running) resume(); };
  document.addEventListener("visibilitychange", onVisibility);
  const observer = "IntersectionObserver" in window
    ? new IntersectionObserver((entries) => { visible = entries.some((e) => e.isIntersecting); if (visible) resume(); }, { threshold: 0.05 })
    : null;
  if (observer) observer.observe(orbElement);
  raf = requestAnimationFrame(frame);

  // FPS over the first two seconds; the caller decides whether to keep the scene.
  const fpsPromise = new Promise((resolve) => setTimeout(() => resolve(frames / 2), 2000));

  function dispose() {
    if (disposed) return;
    disposed = true;
    if (raf) cancelAnimationFrame(raf);
    window.removeEventListener("mousemove", onMove);
    document.removeEventListener("visibilitychange", onVisibility);
    if (observer) observer.disconnect();
    scene.traverse((node) => {
      if (node.geometry) node.geometry.dispose();
      if (node.material) {
        const materials = Array.isArray(node.material) ? node.material : [node.material];
        for (const m of materials) { if (m.map) m.map.dispose(); m.dispose(); }
      }
    });
    env.dispose();
    glowTex.dispose();
    renderer.dispose();
    canvas.remove();
    orbElement.classList.remove("is-3d");
  }
  return { dispose, fps: fpsPromise, currentFps: () => fpsWindow.length };
}
