import type { Page } from '@playwright/test';

export interface WaitForSseOptions {
  timeoutMs?: number;
  backendOrigin?: string;
  needles?: string[];
}

/**
 * Waits for the first SSE event of the given name whose raw data contains every
 * substring in `needles`. Runs EventSource inside the browser context so auth
 * cookies + CORS behave exactly as in production.
 *
 * Substring matching is intentional: it keeps the helper simple, avoids sending
 * arbitrary predicates to the browser, and covers every case we need (event
 * contains a specific roundType, pairId, event kind, etc.). For richer checks
 * parse the returned payload in the spec and run assertions there.
 */
export async function waitForSseEvent<T = unknown>(
  page: Page,
  url: string,
  eventName: string,
  opts: WaitForSseOptions = {}
): Promise<T> {
  const { timeoutMs = 15_000, backendOrigin = 'http://localhost:8080', needles = [] } = opts;
  const absoluteUrl = url.startsWith('http') ? url : `${backendOrigin}${url}`;

  return page.evaluate(
    ([absoluteUrl, eventName, needles, timeoutMs]) =>
      new Promise<T>((resolve, reject) => {
        let settled = false;
        const es = new EventSource(absoluteUrl, { withCredentials: true });
        const timer = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          es.close();
          reject(new Error(`waitForSseEvent timeout after ${timeoutMs}ms for event "${eventName}"`));
        }, timeoutMs);

        const handler = (ev: MessageEvent) => {
          if (settled) return;
          const raw = typeof ev.data === 'string' ? ev.data : '';
          if (needles.some(n => !raw.includes(n))) return;
          settled = true;
          window.clearTimeout(timer);
          es.close();
          try { resolve(JSON.parse(raw) as T); } catch { resolve(raw as unknown as T); }
        };

        es.addEventListener(eventName, handler as EventListener);
        es.onerror = () => {
          // Swallow transient errors. EventSource auto-reconnects; the timeout is authoritative.
        };
      }),
    [absoluteUrl, eventName, needles, timeoutMs] as const
  );
}

export async function waitForRoundOpened(
  page: Page,
  competitionId: string,
  roundType: 'HEAT' | 'SEMIFINAL' | 'FINAL' | 'DANCE_OFF',
  opts: Omit<WaitForSseOptions, 'needles'> = {}
) {
  return waitForSseEvent(
    page,
    `/api/v1/sse/competitions/${competitionId}/public`,
    'round:opened',
    { ...opts, needles: [`"roundType":"${roundType}"`] }
  );
}
