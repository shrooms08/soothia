// Offscreen document (chrome.offscreen, AUDIO_PLAYBACK): plays the onboarding
// music while the welcome page is open, so it can start without a gesture.
// Controlled by MUSIC_CONTROL messages from the background and the welcome page.
import { MUSIC_CONTROL, type MusicAction, type MusicStatus } from "./messages";

const VOLUME = 0.14;
const FADE_IN_MS = 2000;
const FADE_OUT_MS = 1200;
const DUCK_LEVEL = 0.7;
const DUCK_MS = 600;

const audio = new Audio(chrome.runtime.getURL("music/onboarding.mp3"));
audio.loop = true;
audio.preload = "auto";
let target = 0;
let muted = false;
let started = false;
let error = "";
let fade: ReturnType<typeof setInterval> | undefined;
let duckTimer: ReturnType<typeof setTimeout> | undefined;

/** Moves the volume toward `to` over `ms`, replacing any fade in progress. */
function fadeTo(to: number, ms: number, then?: () => void): void {
  clearInterval(fade);
  const from = audio.volume;
  const startedAt = Date.now();
  fade = setInterval(() => {
    const t = Math.min(1, (Date.now() - startedAt) / ms);
    audio.volume = from + (to - from) * t;
    if (t >= 1) {
      clearInterval(fade);
      then?.();
    }
  }, 40);
}

function level(): number {
  return muted ? 0 : target;
}

async function start(): Promise<void> {
  target = VOLUME;
  if (started && !audio.paused) {
    fadeTo(level(), 300);
    return;
  }
  audio.volume = 0;
  try {
    await audio.play();
    started = true;
    error = "";
    fadeTo(level(), FADE_IN_MS);
  } catch (reason) {
    error = String((reason as Error)?.message ?? reason);
  }
}

function stop(): void {
  target = 0;
  if (!started || audio.paused) {
    window.close();
    return;
  }
  fadeTo(0, FADE_OUT_MS, () => {
    audio.pause();
    started = false;
    window.close();
  });
}

function duck(): void {
  if (!started || audio.paused || muted) return;
  clearTimeout(duckTimer);
  fadeTo(VOLUME * DUCK_LEVEL, 50, () => {
    duckTimer = setTimeout(() => fadeTo(level(), DUCK_MS - 50), 0);
  });
}

function status(): MusicStatus {
  return { playing: started && !audio.paused, muted, error };
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== MUSIC_CONTROL) return;
  const action = message.action as MusicAction;
  // "ensure" is the background's to answer (it creates this document first).
  if (action === "ensure") return;
  switch (action) {
    case "start":
      muted = message.muted === true;
      start().then(() => sendResponse(status()));
      return true;
    case "stop":
      sendResponse(status());
      stop();
      return;
    case "mute":
      muted = true;
      fadeTo(0, 300);
      break;
    case "unmute":
      muted = false;
      fadeTo(level(), 300);
      break;
    case "duck":
      duck();
      break;
    case "status":
      break;
  }
  sendResponse(status());
});
