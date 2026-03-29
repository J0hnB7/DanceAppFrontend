/**
 * IndexedDB offline store for judge marks.
 * Database: "danceapp-judge"
 * Stores: "pending-marks", "round-cache"
 */

export interface PendingMark {
  key: string; // `${judgeTokenId}-${roundId}-${dance}-${pairId}`
  judgeTokenId: string;
  roundId: string;
  dance: string | null;
  danceId: string | null;
  pairId: string;
  recalled?: boolean;
  placement?: number;
  heatId?: string | null;
  deviceToken: string;
  createdAt: string;
  synced: boolean;
}

export interface RoundCacheData {
  roundId: string;
  roundType: string;
  dance: string;
  pairs: Array<{ id: string; startNumber: number; dancer1FirstName?: string; dancer1LastName?: string; dancer2FirstName?: string; dancer2LastName?: string }>;
  heats?: Array<{ id: string; heatNumber: number; pairIds: string[] }>;
  cachedAt: string;
}

export interface SyncResult {
  accepted: number;
  rejected: number;
  conflicts: string[];
}

const DB_NAME = "danceapp-judge";
const DB_VERSION = 1;
const MARKS_STORE = "pending-marks";
const CACHE_STORE = "round-cache";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(MARKS_STORE)) {
        db.createObjectStore(MARKS_STORE, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        db.createObjectStore(CACHE_STORE, { keyPath: "roundId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode,
  fn: (s: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = db.transaction(store, mode);
    const s = t.objectStore(store);
    const req = fn(s);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const judgeOfflineStore = {
  async saveMark(mark: PendingMark): Promise<void> {
    const db = await openDb();
    await tx(db, MARKS_STORE, "readwrite", (s) => s.put(mark));
    db.close();
  },

  async getPendingMarks(): Promise<PendingMark[]> {
    const db = await openDb();
    const marks = await tx<PendingMark[]>(db, MARKS_STORE, "readonly", (s) => s.getAll());
    db.close();
    return marks.filter((m) => !m.synced);
  },

  async markAsSynced(keys: string[]): Promise<void> {
    const db = await openDb();
    const t = db.transaction(MARKS_STORE, "readwrite");
    const s = t.objectStore(MARKS_STORE);
    for (const key of keys) {
      const req = s.get(key);
      req.onsuccess = () => {
        if (req.result) {
          s.put({ ...req.result, synced: true });
        }
      };
    }
    await new Promise<void>((resolve, reject) => {
      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
    });
    db.close();
  },

  async cacheRound(roundId: string, data: RoundCacheData): Promise<void> {
    const db = await openDb();
    await tx(db, CACHE_STORE, "readwrite", (s) => s.put({ ...data, roundId }));
    db.close();
  },

  async getCachedRound(roundId: string): Promise<RoundCacheData | null> {
    const db = await openDb();
    const result = await tx<RoundCacheData | undefined>(db, CACHE_STORE, "readonly", (s) => s.get(roundId));
    db.close();
    return result ?? null;
  },

  async syncAll(judgeTokenId: string, deviceToken: string): Promise<SyncResult> {
    const pending = await judgeOfflineStore.getPendingMarks();
    if (pending.length === 0) return { accepted: 0, rejected: 0, conflicts: [] };

    const { default: apiClient } = await import("@/lib/api-client");
    const competitionId = localStorage.getItem("judge_competition_id");
    if (!competitionId) return { accepted: 0, rejected: 0, conflicts: [] };

    try {
      const response = await apiClient.post(`/competitions/${competitionId}/sync`, {
        deviceToken,
        marks: pending.map((m) => ({
          roundId: m.roundId,
          dance: m.dance,
          danceId: m.danceId,
          pairId: m.pairId,
          recalled: m.recalled,
          placement: m.placement,
          heatId: m.heatId,
          deviceToken: m.deviceToken,
          createdAt: m.createdAt,
        })),
      }, { headers: { 'X-Judge-Token': judgeTokenId } });

      const result: SyncResult = response.data;
      if (result.accepted > 0) {
        await judgeOfflineStore.markAsSynced(pending.map((m) => m.key));
      }
      return result;
    } catch {
      return { accepted: 0, rejected: 0, conflicts: [] };
    }
  },

  async getPendingCount(): Promise<number> {
    const pending = await judgeOfflineStore.getPendingMarks();
    return pending.length;
  },
};

// Network event listeners — attach once
if (typeof window !== "undefined") {
  window.addEventListener("offline", () => {
    window.dispatchEvent(new CustomEvent("judge-offline"));
  });
}
