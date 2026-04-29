import apiClient from './api-client';

type SSEEventHandler = (data: unknown) => void;

interface SSESubscription {
  unsubscribe: () => void;
}

export type SSEChannel = 'admin' | 'public' | 'chair';

const BACKOFF_INITIAL_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;
/** After this many consecutive failures, trigger polling fallback */
const MAX_RECONNECTS_BEFORE_POLLING = 3;

const key = (competitionId: string, channel: SSEChannel) => `${competitionId}:${channel}`;

/**
 * Fetches a single-use SSE ticket for the given (competition, channel). The
 * BE issues a 5-min TTL ticket bound to the authenticated user, and the
 * EventSource passes it as ?ticket=… instead of the long-lived JWT
 * (CRIT-8 sub-fix C — keeps the JWT out of URLs / referrer headers / logs).
 */
async function fetchSseTicket(competitionId: string, channel: 'admin' | 'chair'): Promise<string> {
  const res = await apiClient.post<{ ticket: string }>('/sse/ticket', { competitionId, channel });
  return res.data.ticket;
}

class SSEClient {
  private sources: Map<string, EventSource> = new Map();
  private handlers: Map<string, Map<string, Set<SSEEventHandler>>> = new Map();
  private retryDelays: Map<string, number> = new Map();
  private retryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  /** Tracks the last eventId seen per (competitionId, channel) (from `eventId` in SSE payloads) */
  private lastEventIds: Map<string, string> = new Map();
  /** Counts consecutive reconnect failures per (competitionId, channel) */
  private reconnectFailures: Map<string, number> = new Map();
  /** Callbacks to call after successful SSE (re)connect, per (competitionId, channel) */
  private reconnectCallbacks: Map<string, Set<() => void>> = new Map();
  /** Callbacks to call after MAX_RECONNECTS_BEFORE_POLLING failures (polling fallback), per (competitionId, channel) */
  private pollingFallbackCallbacks: Map<string, Set<() => void>> = new Map();
  /** Channels currently in the middle of opening (ticket fetch + EventSource creation). */
  private connecting: Set<string> = new Set();

  /** Register a callback that fires on every successful SSE (re)open for a channel */
  onReconnect(competitionId: string, cb: () => void, channel: SSEChannel = 'admin'): () => void {
    const k = key(competitionId, channel);
    if (!this.reconnectCallbacks.has(k)) {
      this.reconnectCallbacks.set(k, new Set());
    }
    this.reconnectCallbacks.get(k)!.add(cb);
    return () => this.reconnectCallbacks.get(k)?.delete(cb);
  }

  /** Register a callback that fires when polling fallback is triggered (after MAX_RECONNECTS failures) */
  onPollingFallback(competitionId: string, cb: () => void, channel: SSEChannel = 'admin'): () => void {
    const k = key(competitionId, channel);
    if (!this.pollingFallbackCallbacks.has(k)) {
      this.pollingFallbackCallbacks.set(k, new Set());
    }
    this.pollingFallbackCallbacks.get(k)!.add(cb);
    return () => this.pollingFallbackCallbacks.get(k)?.delete(cb);
  }

  /** Call this when an SSE payload contains an eventId to track for Last-Event-ID replay. */
  trackEventId(competitionId: string, eventId: string, channel: SSEChannel = 'admin') {
    this.lastEventIds.set(key(competitionId, channel), eventId);
  }

  subscribe(
    competitionId: string,
    event: string,
    handler: SSEEventHandler,
    channel: SSEChannel = 'admin',
  ): SSESubscription {
    const k = key(competitionId, channel);

    if (!this.handlers.has(k)) {
      this.handlers.set(k, new Map());
    }
    const compHandlers = this.handlers.get(k)!;
    const isNewEvent = !compHandlers.has(event);
    if (isNewEvent) {
      compHandlers.set(event, new Set());
    }
    compHandlers.get(event)!.add(handler);

    // Open connection if needed. Ticket fetch is async, so the source may be
    // created shortly after this call returns — that's fine because we attach
    // the listener for any registered events as part of connect().
    if (!this.sources.has(k) && !this.connecting.has(k)) {
      this.connecting.add(k);
      void this.connect(competitionId, channel);
    } else if (isNewEvent && this.sources.has(k)) {
      // Source already open and a brand-new event type was just registered — attach now.
      this.attachListener(this.sources.get(k)!, k, event);
    }

    return {
      unsubscribe: () => {
        const h = this.handlers.get(k);
        h?.get(event)?.delete(handler);
        if (h?.get(event)?.size === 0) h.delete(event);

        // Close source if no more handlers across all events
        let totalHandlers = 0;
        h?.forEach((set) => (totalHandlers += set.size));
        if (totalHandlers === 0) {
          this.teardown(k);
        }
      },
    };
  }

  private async connect(competitionId: string, channel: SSEChannel) {
    const k = key(competitionId, channel);
    const lastEventId = this.lastEventIds.get(k);
    const params = new URLSearchParams();
    if (lastEventId) params.set('lastEventId', lastEventId);

    // Public channel — no auth, no ticket. Admin/chair — fetch a single-use
    // ticket from /sse/ticket and pass it as ?ticket=. Pre-fix this passed
    // the user's JWT directly, leaking it to logs and referrer headers
    // (CRIT-8 sub-fix C).
    if (channel !== 'public') {
      try {
        const ticket = await fetchSseTicket(competitionId, channel);
        params.set('ticket', ticket);
      } catch (err) {
        console.warn(`[SSE] Failed to fetch ${channel} ticket:`, err);
        this.connecting.delete(k);
        // Treat ticket failure the same as repeated reconnect failures:
        // hand off to polling fallback so the page stays functional.
        this.pollingFallbackCallbacks.get(k)?.forEach((cb) => cb());
        this.teardown(k);
        return;
      }
    }

    const qs = params.toString();
    const url = `/api/v1/sse/competitions/${competitionId}/${channel}${qs ? `?${qs}` : ''}`;
    const source = new EventSource(url, { withCredentials: channel !== 'public' });

    this.sources.set(k, source);
    this.connecting.delete(k);

    // Attach listeners for every event already registered against this channel.
    this.handlers.get(k)?.forEach((_, event) => {
      this.attachListener(source, k, event);
    });

    source.onopen = () => {
      this.retryDelays.set(k, BACKOFF_INITIAL_MS);
      this.reconnectFailures.set(k, 0);
      this.reconnectCallbacks.get(k)?.forEach((cb) => cb());
    };

    source.onerror = () => {
      source.close();
      this.sources.delete(k);

      const h = this.handlers.get(k);
      let totalHandlers = 0;
      h?.forEach((set) => (totalHandlers += set.size));
      if (totalHandlers === 0) return;

      const failures = (this.reconnectFailures.get(k) ?? 0) + 1;
      this.reconnectFailures.set(k, failures);
      if (failures >= MAX_RECONNECTS_BEFORE_POLLING) {
        this.pollingFallbackCallbacks.get(k)?.forEach((cb) => cb());
        this.teardown(k);
        return;
      }

      const delay = this.retryDelays.get(k) ?? BACKOFF_INITIAL_MS;
      this.retryDelays.set(k, Math.min(delay * 2, BACKOFF_MAX_MS));

      const timer = setTimeout(() => {
        this.retryTimers.delete(k);
        if (!this.connecting.has(k)) {
          this.connecting.add(k);
          void this.connect(competitionId, channel);
        }
      }, delay);

      this.retryTimers.set(k, timer);
    };
  }

  private attachListener(source: EventSource, k: string, event: string) {
    source.addEventListener(event, (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        if (data && typeof data === 'object' && 'eventId' in data && typeof data.eventId === 'string') {
          this.lastEventIds.set(k, data.eventId);
        }
        this.handlers.get(k)?.get(event)?.forEach((h) => h(data));
      } catch {
        console.warn('[SSE] Malformed payload for event', event, (e as MessageEvent).data);
      }
    });
  }

  private teardown(k: string) {
    this.sources.get(k)?.close();
    this.sources.delete(k);
    this.handlers.delete(k);
    this.retryDelays.delete(k);
    this.lastEventIds.delete(k);
    this.reconnectFailures.delete(k);
    this.reconnectCallbacks.delete(k);
    this.pollingFallbackCallbacks.delete(k);
    this.connecting.delete(k);
    const timer = this.retryTimers.get(k);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.retryTimers.delete(k);
    }
  }
}

export const sseClient = new SSEClient();

import { useState, useEffect } from 'react';

/** Hook that tracks SSE connection state for a competition channel. */
export function useSSEConnected(competitionId: string, channel: SSEChannel = 'admin'): boolean {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const unsubReconnect = sseClient.onReconnect(competitionId, () => setConnected(true), channel);
    const unsubFallback = sseClient.onPollingFallback(competitionId, () => setConnected(false), channel);

    return () => {
      unsubReconnect();
      unsubFallback();
    };
  }, [competitionId, channel]);

  return connected;
}
