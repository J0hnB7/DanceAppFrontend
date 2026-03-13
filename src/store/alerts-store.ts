import { create } from "zustand";

export type AlertLevel = "info" | "warning" | "error" | "success";

export interface AppAlert {
  id: string;
  level: AlertLevel;
  title: string;
  description?: string;
  competitionId?: string;
  sectionId?: string;
  createdAt: Date;
  read: boolean;
  actionLabel?: string;
  actionHref?: string;
}

interface AlertsState {
  alerts: AppAlert[];
  addAlert: (alert: Omit<AppAlert, "id" | "createdAt" | "read">) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  removeAlert: (id: string) => void;
  unreadCount: () => number;
}

export const useAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [
    // Seed with demo alerts so UI is visually interesting out of the box
    {
      id: "alert-001",
      level: "warning",
      title: "Judge #2 offline > 3 min",
      description: "Judge 2 has not responded since 10:32",
      competitionId: "comp-001",
      createdAt: new Date(Date.now() - 4 * 60_000),
      read: false,
      actionLabel: "Manage judges",
      actionHref: "/dashboard/competitions/comp-001/judges",
    },
    {
      id: "alert-002",
      level: "success",
      title: "Results ready for approval",
      description: "Junior I Standard C — final calculated",
      competitionId: "comp-001",
      sectionId: "sec-003",
      createdAt: new Date(Date.now() - 10 * 60_000),
      read: false,
      actionLabel: "View results",
      actionHref: "/dashboard/competitions/comp-001/sections/sec-003/results",
    },
    {
      id: "alert-003",
      level: "info",
      title: "Registration closed",
      description: "Slovak Dance Cup 2026 deadline passed",
      competitionId: "comp-001",
      createdAt: new Date(Date.now() - 60 * 60_000),
      read: true,
    },
  ],

  addAlert: (alert) =>
    set((state) => ({
      alerts: [
        {
          ...alert,
          id: `alert-${Date.now()}`,
          createdAt: new Date(),
          read: false,
        },
        ...state.alerts,
      ],
    })),

  markRead: (id) =>
    set((state) => ({
      alerts: state.alerts.map((a) => (a.id === id ? { ...a, read: true } : a)),
    })),

  markAllRead: () =>
    set((state) => ({
      alerts: state.alerts.map((a) => ({ ...a, read: true })),
    })),

  removeAlert: (id) =>
    set((state) => ({
      alerts: state.alerts.filter((a) => a.id !== id),
    })),

  unreadCount: () => get().alerts.filter((a) => !a.read).length,
}));
