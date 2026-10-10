// Error guards for the content script. Nothing Soothia does may surface in
// chrome://extensions or break the host page: every entry point is wrapped,
// and window-level error events that come from our own code are swallowed
// and reported to the debug footer instead.

let reportIssue: (text: string) => void = () => {};
let contextDead = false;

/** True once the extension was reloaded or updated under this page: chrome.* calls now throw. */
export function isContextDead(): boolean {
  return contextDead;
}

function describe(error: unknown): string {
  if (error instanceof Error) return `${error.name}: ${error.message}`.slice(0, 200);
  return String(error).slice(0, 200);
}

function noteIfDead(error: unknown): void {
  if (/context invalidated|Extension context/i.test(describe(error))) contextDead = true;
}

/** Runs `fn`, turning any throw or rejection into a debug-footer line. */
export function safe<T>(label: string, fn: () => T): T | undefined {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result.catch((error: unknown) => {
        noteIfDead(error);
        reportIssue(`${label}: ${describe(error)}`);
        return undefined;
      }) as T;
    }
    return result;
  } catch (error) {
    noteIfDead(error);
    reportIssue(`${label}: ${describe(error)}`);
    return undefined;
  }
}

/** Wraps a callback (listener, observer, timer) so it can never throw out. */
export function guarded<A extends unknown[]>(label: string, fn: (...args: A) => unknown): (...args: A) => void {
  return (...args: A) => {
    safe(label, () => fn(...args));
  };
}

function ours(text: string): boolean {
  let id = "";
  try {
    id = chrome.runtime.id;
  } catch {
    // Context gone; our scripts are still "ours".
  }
  return (id !== "" && text.includes(id)) || /soothia/i.test(text);
}

/** Swallows window error events that originate in our bundles; the page's own errors pass through. */
export function installGuards(report: (text: string) => void): void {
  reportIssue = report;
  window.addEventListener("error", (event) => {
    const where = `${event.filename ?? ""} ${(event.error as Error | undefined)?.stack ?? ""}`;
    if (!ours(where)) return;
    event.preventDefault();
    noteIfDead(event.error);
    reportIssue(`error: ${describe(event.error ?? event.message)}`);
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event.reason as Error | undefined;
    const where = `${reason?.stack ?? ""} ${describe(reason)}`;
    if (!ours(where) && !/context invalidated|Receiving end does not exist|message port closed/i.test(where)) return;
    event.preventDefault();
    noteIfDead(reason);
    reportIssue(`rejection: ${describe(reason)}`);
  });
}
