// The welcome page (welcome.html): a four-step stepper shown once after
// install, soft onboarding music, and a sound check behind ?sfx=1.
import { el, icon } from "./dom";
import { MUSIC_CONTROL, type MusicAction, type MusicStatus } from "./messages";
import { installMusicHooks, isMusicPlaying, startMusic, stopMusic } from "./music";
import {
  armSounds,
  filesStyleAvailable,
  getAudioState,
  getStyle,
  isMuted,
  onAudioState,
  playSound,
  setDuckHook,
  setMuted,
  setStyle,
  SOUND_NAMES,
  SYNTH_STYLES,
  type SfxStyle,
} from "./sfx";
import { WELCOME_STYLES } from "./styles";

const MUTED_KEY = "soothia:muted";
const STYLE_KEY = "soothia:sfxStyle";
const MUSIC_URL = "music/onboarding.mp3";
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

// ---- Music: the offscreen player when it works, the in-page path otherwise ----

let offscreenMusic = false;
let loggedFallback = false;

function musicMessage(action: MusicAction): Promise<MusicStatus | undefined> {
  return chrome.runtime.sendMessage({ type: MUSIC_CONTROL, action }).catch(() => undefined) as Promise<MusicStatus | undefined>;
}

function showHint(reason: string): void {
  if (!loggedFallback) {
    loggedFallback = true;
    console.info(`Soothia: onboarding music falls back to starting on a tap (${reason}).`);
  }
  document.getElementById("sound-hint")?.removeAttribute("hidden");
}

function musicIsPlaying(): boolean {
  return offscreenMusic || isMusicPlaying();
}

function leave(): void {
  if (offscreenMusic) void musicMessage("stop");
  stopMusic();
}

back.addEventListener("click", () => go(step - 1));
next.addEventListener("click", () => {
  if (step === STEPS) {
    leave();
    setTimeout(() => window.close(), 1300);
  } else go(step + 1);
});
document.addEventListener("keydown", (event) => {
  if (event.key === "ArrowRight") go(step + 1);
  if (event.key === "ArrowLeft") go(step - 1);
});
document.getElementById("show-me")?.addEventListener("click", leave);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopMusic();
});

document.getElementById("pin-link")?.addEventListener("click", (event) => {
  event.preventDefault();
  const how = document.getElementById("pin-how");
  if (how) how.hidden = !how.hidden;
});

// The version, so a tester can tell which build this is.
try {
  const version = document.getElementById("version");
  if (version) version.textContent = `Soothia ${chrome.runtime.getManifest().version}`;
} catch {
  // Not inside the extension (harness preview).
}

// Night sky in the side gutters.
const sky = document.getElementById("sky");
if (sky) {
  for (let i = 0; i < 18; i++) {
    const star = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    star.setAttribute("class", "sky-star");
    star.innerHTML = '<use href="#star"/>';
    const left = i % 2 ? 84 + Math.random() * 14 : 2 + Math.random() * 14;
    const size = 6 + Math.random() * 8;
    // Rest opacity .25 to .55, 3 to 6 s cycles with random offsets: only a few peak at once.
    star.style.cssText = `left:${left.toFixed(1)}%;top:${(3 + Math.random() * 94).toFixed(1)}%;width:${size.toFixed(0)}px;height:${size.toFixed(0)}px;--rest:${(0.25 + Math.random() * 0.3).toFixed(2)};animation-delay:${(Math.random() * 6).toFixed(1)}s;animation-duration:${(3 + Math.random() * 3).toFixed(1)}s`;
    sky.append(star);
  }
}

// ---- Sound: shared mute and style, the speaker toggle, and the music ----

armSounds(window);
installMusicHooks();
// UI sounds duck whichever player is active.
setDuckHook(() => {
  if (offscreenMusic) void musicMessage("duck");
});

const soundToggle = document.getElementById("sound-toggle") as HTMLButtonElement | null;
function renderToggle(): void {
  if (!soundToggle) return;
  const label = isMuted() ? "Unmute sound" : "Mute sound";
  soundToggle.setAttribute("aria-label", label);
  soundToggle.title = label;
  soundToggle.replaceChildren(icon(isMuted() ? "muted" : "sound"));
  const box = document.getElementById("mute") as HTMLInputElement | null;
  if (box) box.checked = isMuted();
}
function saveMuted(value: boolean): void {
  setMuted(value);
  renderToggle();
  chrome.storage.local.set({ [MUTED_KEY]: value }).catch(() => {});
  if (offscreenMusic) void musicMessage(value ? "mute" : "unmute");
}
soundToggle?.addEventListener("click", () => saveMuted(!isMuted()));

chrome.storage.local
  .get([MUTED_KEY, STYLE_KEY])
  .then((stored) => {
    setMuted(stored[MUTED_KEY] === true);
    const saved = stored[STYLE_KEY];
    if (typeof saved === "string" && [...SYNTH_STYLES, "files"].includes(saved)) setStyle(saved as SfxStyle);
    renderToggle();
  })
  .catch(renderToggle);

// The background creates the offscreen player so music starts on load. If
// that fails or is blocked, the in-page player starts on the first gesture.
let musicWanted = true;
function startMusicSoon(): void {
  if (!musicWanted || offscreenMusic || isMusicPlaying()) return;
  setTimeout(() => void startMusic(MUSIC_URL), 150);
}
for (const type of ["pointerdown", "keydown", "touchstart"]) {
  window.addEventListener(type, startMusicSoon, { capture: true, passive: true });
}
void musicMessage("ensure").then((status) => {
  if (status?.playing) {
    offscreenMusic = true;
    document.getElementById("sound-hint")?.setAttribute("hidden", "");
  } else showHint(status?.error || "no offscreen player");
});

// Dev-only sound check: welcome.html?sfx=1
const devHooks = {
  getAudioState,
  isMusicPlaying: musicIsPlaying,
  isOffscreenMusic: () => offscreenMusic,
  playSound,
  startMusic: () => startMusic(MUSIC_URL),
  stopMusic,
};
(window as unknown as { soothiaAudio?: typeof devHooks }).soothiaAudio = devHooks;

if (new URLSearchParams(location.search).get("sfx") === "1") {
  const test = document.getElementById("sfx-test");
  const grid = document.getElementById("sfx-grid");
  const state = document.getElementById("audio-state");
  const musicButton = document.getElementById("music-toggle") as HTMLButtonElement | null;
  const box = document.getElementById("mute") as HTMLInputElement | null;
  if (test && grid && state) {
    test.hidden = false;
    const render = (): void => {
      const audio = getAudioState();
      state.textContent = `audio: ${audio.muted ? "muted" : audio.context} · style ${audio.style} · last ${audio.last}${musicIsPlaying() ? ` · music playing (${offscreenMusic ? "offscreen" : "in page"})` : ""}`;
      if (musicButton) musicButton.textContent = musicIsPlaying() ? "Stop music" : "Play music";
    };
    onAudioState(render);
    setInterval(render, 500);
    render();

    const buildGrid = (styles: SfxStyle[]): void => {
      grid.replaceChildren();
      grid.style.gridTemplateColumns = `auto repeat(${styles.length}, 1fr)`;
      grid.append(el("span", ""));
      for (const kind of styles) grid.append(el("span", "sfx-col mono", kind));
      for (const name of SOUND_NAMES) {
        grid.append(el("span", "sfx-row-name mono", name));
        for (const kind of styles) {
          const button = el("button", "button small", "▶");
          button.type = "button";
          button.setAttribute("aria-label", `${name} in ${kind}`);
          button.addEventListener("click", () => playSound(name, kind));
          grid.append(button);
        }
      }
      grid.append(el("span", "sfx-row-name mono", "use"));
      for (const kind of styles) {
        const label = el("label", "sfx-use");
        const radio = el("input", "");
        radio.type = "radio";
        radio.name = "sfx-style";
        radio.value = kind;
        radio.checked = getStyle() === kind;
        radio.addEventListener("change", () => {
          setStyle(kind);
          chrome.storage.local.set({ [STYLE_KEY]: kind }).catch(() => {});
        });
        label.append(radio, "Use this style");
        grid.append(label);
      }
    };
    buildGrid(SYNTH_STYLES);
    void filesStyleAvailable().then((available) => {
      if (available) buildGrid([...SYNTH_STYLES, "files"]);
    });

    musicButton?.addEventListener("click", () => {
      if (musicIsPlaying()) {
        musicWanted = false;
        if (offscreenMusic) {
          offscreenMusic = false;
          void musicMessage("stop");
        }
        stopMusic();
      } else {
        musicWanted = true;
        void musicMessage("ensure").then((status) => {
          if (status?.playing) offscreenMusic = true;
          else void startMusic(MUSIC_URL);
        });
      }
      setTimeout(render, 300);
    });
    box?.addEventListener("change", () => saveMuted(box.checked));
  }
}

go(1);
