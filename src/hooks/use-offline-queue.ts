"use client";

import { useState, useEffect, useCallback } from "react";
import apiClient from "@/lib/api-client";

interface QueuedRequest {
  id: string;
  url: string;
  method: "POST" | "PUT";
  data: unknown;
  createdAt: number;
}

const QUEUE_KEY = "danceapp_offline_queue";

function readQueue(): QueuedRequest[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeQueue(queue: QueuedRequest[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export function useOfflineQueue() {
  const [queue, setQueue] = useState<QueuedRequest[]>(() => readQueue());
  const [syncing, setSyncing] = useState(false);

  const enqueue = useCallback((url: string, method: "POST" | "PUT", data: unknown) => {
    const item: QueuedRequest = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url,
      method,
      data,
      createdAt: Date.now(),
    };
    const next = [...readQueue(), item];
    writeQueue(next);
    setQueue(next);
  }, []);

  const sync = useCallback(async () => {
    const current = readQueue();
    if (!current.length || syncing) return;

    setSyncing(true);
    const failed: QueuedRequest[] = [];

    for (const req of current) {
      try {
        if (req.method === "POST") {
          await apiClient.post(req.url, req.data);
        } else {
          await apiClient.put(req.url, req.data);
        }
      } catch {
        failed.push(req);
      }
    }

    writeQueue(failed);
    setQueue(failed);
    setSyncing(false);
  }, [syncing]);

  // Auto-sync when coming back online
  useEffect(() => {
    const handler = () => sync();
    window.addEventListener("online", handler);
    return () => window.removeEventListener("online", handler);
  }, [sync]);

  return { queue, enqueue, sync, syncing, pendingCount: queue.length };
}
