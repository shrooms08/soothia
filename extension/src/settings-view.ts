// The card's settings section: what most people need, with the rest behind "Developer".
import { el } from "./dom";

export interface SettingsParts {
  version: string;
  scanAgain: HTMLElement;
  wallet: HTMLElement;
  /** Debug info, Link record, the replays and the proxy status. */
  developer: HTMLElement[];
}

export const OFFLINE_TEXT = "Can't reach Soothia right now.";

export function createSettingsSection(parts: SettingsParts): {
  root: HTMLDetailsElement;
  developer: HTMLDetailsElement;
  /** True, false, or null while checking. Only a failed check shows outside Developer. */
  setOnline(online: boolean | null): void;
} {
  const root = el("details", "debug");
  const summary = el("summary", "debug-summary", "settings");
  summary.append(el("span", "debug-version", parts.version));

  const offline = el("p", "warn settings-offline", OFFLINE_TEXT);
  offline.setAttribute("role", "status");
  offline.hidden = true;

  const developer = el("details", "developer");
  const developerBody = el("div", "developer-body");
  developerBody.append(...parts.developer);
  developer.append(el("summary", "developer-summary", "Developer"), developerBody);

  root.append(summary, parts.scanAgain, parts.wallet, offline, developer);
  return {
    root,
    developer,
    setOnline(online) {
      offline.hidden = online !== false;
    },
  };
}
