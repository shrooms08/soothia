// What the content script sends to /detect. A page with a match on it always asks for
// the match itself: prose sent alongside would make the Worker draft claims from the
// text instead, which carry no fixture, so they can't be premium, settled by ESPN or backed.
import type { FixtureSignal, PageContext } from "./messages";

export interface HereInfo {
  url: string;
  site: string;
  title: string;
}

export function detectPage(
  read: { kind: "page"; page: PageContext } | { kind: string },
  fixture: FixtureSignal | null,
  here: HereInfo,
): PageContext {
  if (fixture) {
    const base = read.kind === "page" ? (read as { page: PageContext }).page : here;
    // No text: the Worker builds the match claims from the fixture and its evidence.
    return { url: base.url, site: base.site, title: base.title, text: "" };
  }
  return read.kind === "page" ? (read as { page: PageContext }).page : { ...here, text: "" };
}
