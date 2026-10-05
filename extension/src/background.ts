// Background service worker. Content-script fetches run with the page's
// origin and get blocked by CORS, so network calls to the Worker go through here.
import { WORKER_URL } from "./config";
import { HEALTH_REQUEST, type HealthResponse } from "./messages";

async function checkHealth(): Promise<HealthResponse> {
  try {
    const res = await fetch(`${WORKER_URL}/health`, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) return { online: false };
    const body = (await res.json()) as { ok?: boolean };
    return { online: body.ok === true };
  } catch {
    return { online: false };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== HEALTH_REQUEST) return;
  checkHealth().then(sendResponse);
  return true; // keep the channel open for the async response
});
