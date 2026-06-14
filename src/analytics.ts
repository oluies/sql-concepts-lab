/**
 * Privacy-first analytics via GoatCounter (https://www.goatcounter.com).
 *
 * What this does and, more importantly, what it does NOT do:
 *  - No cookies, no localStorage, no fingerprinting. GoatCounter stores no IP
 *    address; it derives a salted hash that rotates daily purely to dedupe a
 *    visit, then discards it. Nothing collected can identify a person.
 *  - Honors Do Not Track and Global Privacy Control: if the visitor's browser
 *    signals either, the script is never loaded and every call here is a no-op.
 *  - We send only the lesson path (e.g. "/lesson/join") and coarse event names
 *    ("run-query", "exercise-pass"). The SQL you type, query results, and every
 *    other input never leave the page.
 *  - Disabled entirely unless GOATCOUNTER_CODE is set below, so local dev and
 *    any build without a configured code transmit nothing at all.
 *
 * To activate: create a free site at goatcounter.com, then set GOATCOUNTER_CODE
 * to your subdomain (the "CODE" in https://CODE.goatcounter.com).
 */

const GOATCOUNTER_CODE = "oluies"; // https://oluies.goatcounter.com

interface Hit {
  path: string;
  title?: string;
  event?: boolean;
}

declare global {
  interface Window {
    goatcounter?: { count?: (vars: Hit) => void };
  }
}

function optedOut(): boolean {
  const nav = navigator as Navigator & {
    globalPrivacyControl?: boolean;
    doNotTrack?: string | null;
  };
  const win = window as Window & { doNotTrack?: string | null };
  const dnt = nav.doNotTrack ?? win.doNotTrack;
  return dnt === "1" || dnt === "yes" || nav.globalPrivacyControl === true;
}

const enabled = Boolean(GOATCOUNTER_CODE) && !optedOut();
const queue: Hit[] = [];
let loaded = false;

function flush(): void {
  if (!loaded || !window.goatcounter?.count) return;
  while (queue.length) window.goatcounter.count(queue.shift()!);
}

function push(hit: Hit): void {
  if (!enabled) return;
  queue.push(hit);
  flush();
}

/** Inject the GoatCounter beacon, configured not to auto-count: this is a
 *  single-page app, so we emit each lesson view ourselves. */
export function initAnalytics(): void {
  if (!enabled) return;
  const s = document.createElement("script");
  s.async = true;
  s.dataset.goatcounter = `https://${GOATCOUNTER_CODE}.goatcounter.com/count`;
  s.dataset.goatcounterSettings = JSON.stringify({ no_onload: true });
  s.src = "//gc.zgo.at/count.js";
  s.onload = () => {
    loaded = true;
    flush();
  };
  document.head.appendChild(s);
}

/** Count a lesson view as a virtual page hit. */
export function trackPage(path: string, title?: string): void {
  push({ path, title });
}

/** Count a coarse, anonymous interaction (no query text or input). */
export function trackEvent(name: string): void {
  push({ path: name, event: true });
}
