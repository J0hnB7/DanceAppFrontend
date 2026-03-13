type SSEEventHandler = (data: unknown) => void;

interface SSESubscription {
  unsubscribe: () => void;
}

class SSEClient {
  private sources: Map<string, EventSource> = new Map();
  private handlers: Map<string, Map<string, Set<SSEEventHandler>>> = new Map();

  subscribe(competitionId: string, event: string, handler: SSEEventHandler): SSESubscription {
    const url = `/api/v1/sse/competitions/${competitionId}`;

    // Reuse existing EventSource for same competition
    if (!this.sources.has(competitionId)) {
      const source = new EventSource(url, { withCredentials: true });
      this.sources.set(competitionId, source);
      this.handlers.set(competitionId, new Map());

      source.onerror = () => {
        // Auto-reconnect handled by browser
      };
    }

    const compHandlers = this.handlers.get(competitionId)!;
    if (!compHandlers.has(event)) {
      compHandlers.set(event, new Set());
      const source = this.sources.get(competitionId)!;
      source.addEventListener(event, (e) => {
        const data = JSON.parse((e as MessageEvent).data);
        compHandlers.get(event)?.forEach((h) => h(data));
      });
    }

    compHandlers.get(event)!.add(handler);

    return {
      unsubscribe: () => {
        compHandlers.get(event)?.delete(handler);
        if (compHandlers.get(event)?.size === 0) {
          compHandlers.delete(event);
        }
        // Close source if no more handlers
        let totalHandlers = 0;
        compHandlers.forEach((set) => (totalHandlers += set.size));
        if (totalHandlers === 0) {
          this.sources.get(competitionId)?.close();
          this.sources.delete(competitionId);
          this.handlers.delete(competitionId);
        }
      },
    };
  }
}

export const sseClient = new SSEClient();
