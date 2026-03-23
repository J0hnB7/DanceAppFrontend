type SSEEventHandler = (data: unknown) => void;

interface SSESubscription {
  unsubscribe: () => void;
}

const BACKOFF_INITIAL_MS = 1_000;
const BACKOFF_MAX_MS = 30_000;

class SSEClient {
  private sources: Map<string, EventSource> = new Map();
  private handlers: Map<string, Map<string, Set<SSEEventHandler>>> = new Map();
  private retryDelays: Map<string, number> = new Map();
  private retryTimers: Map<string, ReturnType<typeof setTimeout>> = new Map();
  /** Tracks the last eventId seen per competition (from `eventId` in SSE payloads) */
  private lastEventIds: Map<string, string> = new Map();

  /** Call this when an SSE payload contains an eventId to track for Last-Event-ID replay. */
  trackEventId(competitionId: string, eventId: string) {
    this.lastEventIds.set(competitionId, eventId);
  }

  subscribe(competitionId: string, event: string, handler: SSEEventHandler): SSESubscription {
    if (!this.sources.has(competitionId)) {
      this.connect(competitionId);
    }

    const compHandlers = this.handlers.get(competitionId)!;
    if (!compHandlers.has(event)) {
      compHandlers.set(event, new Set());
      const source = this.sources.get(competitionId)!;
      this.attachListener(source, competitionId, event);
    }

    compHandlers.get(event)!.add(handler);

    return {
      unsubscribe: () => {
        const h = this.handlers.get(competitionId);
        h?.get(event)?.delete(handler);
        if (h?.get(event)?.size === 0) h.delete(event);

        // Close source if no more handlers across all events
        let totalHandlers = 0;
        h?.forEach((set) => (totalHandlers += set.size));
        if (totalHandlers === 0) {
          this.teardown(competitionId);
        }
      },
    };
  }

  private connect(competitionId: string) {
    const lastEventId = this.lastEventIds.get(competitionId);
    const url = lastEventId
      ? `/api/v1/sse/competitions/${competitionId}?lastEventId=${lastEventId}`
      : `/api/v1/sse/competitions/${competitionId}`;
    const source = new EventSource(url, { withCredentials: true });

    if (!this.handlers.has(competitionId)) {
      this.handlers.set(competitionId, new Map());
    }

    source.onopen = () => {
      // Reset backoff on successful connection
      this.retryDelays.set(competitionId, BACKOFF_INITIAL_MS);
    };

    source.onerror = () => {
      source.close();
      this.sources.delete(competitionId);

      // Don't reconnect if all subscriptions were removed
      const h = this.handlers.get(competitionId);
      let totalHandlers = 0;
      h?.forEach((set) => (totalHandlers += set.size));
      if (totalHandlers === 0) return;

      const delay = this.retryDelays.get(competitionId) ?? BACKOFF_INITIAL_MS;
      this.retryDelays.set(competitionId, Math.min(delay * 2, BACKOFF_MAX_MS));

      const timer = setTimeout(() => {
        this.retryTimers.delete(competitionId);
        // Re-connect and re-attach all existing event listeners
        this.connect(competitionId);
        const newSource = this.sources.get(competitionId)!;
        this.handlers.get(competitionId)?.forEach((_, event) => {
          this.attachListener(newSource, competitionId, event);
        });
      }, delay);

      this.retryTimers.set(competitionId, timer);
    };

    this.sources.set(competitionId, source);
  }

  private attachListener(source: EventSource, competitionId: string, event: string) {
    source.addEventListener(event, (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        // Track eventId for Last-Event-ID replay on reconnect
        if (data && typeof data === "object" && "eventId" in data && typeof data.eventId === "string") {
          this.lastEventIds.set(competitionId, data.eventId);
        }
        this.handlers.get(competitionId)?.get(event)?.forEach((h) => h(data));
      } catch {
        console.warn("[SSE] Malformed payload for event", event, (e as MessageEvent).data);
      }
    });
  }

  private teardown(competitionId: string) {
    this.sources.get(competitionId)?.close();
    this.sources.delete(competitionId);
    this.handlers.delete(competitionId);
    this.retryDelays.delete(competitionId);
    this.lastEventIds.delete(competitionId);
    const timer = this.retryTimers.get(competitionId);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.retryTimers.delete(competitionId);
    }
  }
}

export const sseClient = new SSEClient();
