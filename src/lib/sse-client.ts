import { getAccessToken } from './api-client';

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
    if (!this.sources.has(k)) {
      this.connect(competitionId, channel);
    }

    const compHandlers = this.handlers.get(k)!;
    if (!compHandlers.has(event)) {
      compHandlers.set(event, new Set());
      const source = this.sources.get(k)!;
      this.attachListener(source, k, event);
    }

    compHandlers.get(event)!.add(handler);

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

  private connect(competitionId: string, channel: SSEChannel) {
    const k = key(competitionId, channel);
    const lastEventId = this.lastEventIds.get(k);
    const params = new URLSearchParams();
    if (lastEventId) params.set('lastEventId', lastEventId);

    // Only the admin/chair channels require an auth token. The public channel is
    // open by design so judges (X-Judge-Token only) and unauthenticated viewers
    // can read scoreboard updates without an admin JWT.
    if (channel !== 'public') {
      const token = getAccessToken();
      if (token) params.set('authToken', token);
    }

    const qs = params.toString();
    const url = `/api/v1/sse/competitions/${competitionId}/${channel}${qs ? `?${qs}` : ''}`;
    const source = new EventSource(url, { withCredentials: channel !== 'public' });

    if (!this.handlers.has(k)) {
      this.handlers.set(k, new Map());
    }

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
        this.connect(competitionId, channel);
        const newSource = this.sources.get(k)!;
        this.handlers.get(k)?.forEach((_, event) => {
          this.attachListener(newSource, k, event);
        });
      }, delay);

      this.retryTimers.set(k, timer);
    };

    this.sources.set(k, source);
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
