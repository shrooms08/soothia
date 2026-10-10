// The welcome page (welcome.html): a four-step stepper shown once after
// install, plus a sound check behind ?sfx=1 for auditioning the effects.
import { el } from "./dom";
import { armSounds, isMuted, playSound, setMuted, type SoundName } from "./sfx";
import { WELCOME_STYLES } from "./styles";

const MUTED_KEY = "soothia:muted";
const STEPS = 4;
const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const style = document.createElement("style");
style.textContent = WELCOME_STYLES;
document.head.append(style);

const sections = [...document.querySelectorAll<HTMLElement>(".step")];
const back = document.getElementById("back") as HTMLButtonElement;
const next = document.getElementById("next") as HTMLButtonElement;
const dots = document.getElementById("dots") as HTMLElement;
let step = 1;
let interacted = false;

for (let index = 1; index <= STEPS; index++) {
  const dot = el("button", "dot");
  dot.type = "button";
  dot.setAttribute("role", "tab");
  dot.setAttribute("aria-label", `Step ${index}`);
  dot.addEventListener("click", () => go(index));
  dots.append(dot);
}

function go(target: number): void {
  const clamped = Math.min(STEPS, Math.max(1, target));
  if (clamped === step && interacted) return;
  const advanced = clamped > step;
  step = clamped;
  for (const section of sections) {
    const own = Number(section.dataset.step) === step;
    section.hidden = !own;
    if (own && !reduced) {
      section.classList.remove("in");
      void section.offsetWidth;
      section.classList.add("in");
    } else if (own) section.classList.add("in");
  }
  for (const [index, dot] of [...dots.children].entries()) {
    dot.classList.toggle("selected", index + 1 === step);
    dot.setAttribute("aria-selected", String(index + 1 === step));
  }
  back.disabled = step === 1;
  next.textContent = step === STEPS ? "Done" : "Next";
  if (interacted && advanced) playSound("open");
  interacted = true;
  document.getElementById("welcome")?.classList.toggle("found", step === 1 || step === 4);
}

back.addEventListener("click", () => go(step - 1));
next.addEventListener("click", () => (step === STEPS ? window.close() : go(step + 1)));
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") go(step + 1);
  if (event.key === "ArrowLeft") go(step - 1);
});

document.getElementById("pin-link")?.addEventListener("click", (event) => {
  event.preventDefault();
  const how = document.getElementById("pin-how");
  if (how) how.hidden = !how.hidden;
});

// Night sky in the side gutters.
const sky = document.getElementById("sky");
if (sky) {
  for (let i = 0; i < 18; i++) {
    const star = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    star.setAttribute("class", "sky-star");
    star.innerHTML = '<use href="#star"/>';
    const left = i % 2 ? 84 + Math.random() * 14 : 2 + Math.random() * 14;
    const size = 6 + Math.random() * 8;
    star.style.cssText = `left:${left.toFixed(1)}%;top:${(3 + Math.random() * 94).toFixed(1)}%;width:${size.toFixed(0)}px;height:${size.toFixed(0)}px;opacity:${(0.1 + Math.random() * 0.15).toFixed(2)};animation-delay:${(Math.random() * 8).toFixed(1)}s;animation-duration:${(5 + Math.random() * 6).toFixed(1)}s`;
    sky.append(star);
  }
}

// Sounds: the mute setting is shared with the in-page card.
armSounds(document);
chrome.storage.local
  .get(MUTED_KEY)
  .then((stored) => {
    setMuted(stored[MUTED_KEY] === true);
    const box = document.getElementById("mute") as HTMLInputElement | null;
    if (box) box.checked = isMuted();
  })
  .catch(() => {});

// Dev-only sound check: welcome.html?sfx=1
if (new URLSearchParams(location.search).get("sfx") === "1") {
  const test = document.getElementById("sfx-test");
  const buttons = document.getElementById("sfx-buttons");
  if (test && buttons) {
    test.hidden = false;
    for (const name of ["found", "open", "marketLive", "betPlaced", "softError"] as SoundName[]) {
      const button = el("button", "button", name);
      button.type = "button";
      button.addEventListener("click", () => playSound(name));
      buttons.append(button);
    }
    const box = document.getElementById("mute") as HTMLInputElement | null;
    box?.addEventListener("change", () => {
      setMuted(box.checked);
      chrome.storage.local.set({ [MUTED_KEY]: box.checked }).catch(() => {});
    });
  }
}

go(1);
