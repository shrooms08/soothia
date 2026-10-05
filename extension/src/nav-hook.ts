// Runs in the page's MAIN world at document_start. Single-page apps change
// the URL with history.pushState/replaceState, which fire no event, so this
// wraps both and tells the content script. The page's own call is untouched.
import { NAV_CHANGED } from "./messages";

if (window.top === window) {
  for (const method of ["pushState", "replaceState"] as const) {
    const original = history[method];
    history[method] = function (this: History, ...args: Parameters<History["pushState"]>) {
      const result = original.apply(this, args);
      try {
        window.postMessage({ type: NAV_CHANGED }, window.location.origin);
      } catch {
        // Never let Soothia break a site's navigation.
      }
      return result;
    };
  }
}
