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
  alerts: [],

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
