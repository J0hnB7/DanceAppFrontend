import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date, options?: Intl.DateTimeFormatOptions, locale = "cs-CZ"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(new Date(date));
}

export function formatTime(date: string | Date, locale = "cs-CZ"): string {
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatCurrency(amount: number, currency = "EUR", locale = "cs-CZ"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const AVATAR_COLORS = [
  "#3b82f6", // blue
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#0a84ff", // accent blue
  "#06b6d4", // cyan
  "#2563eb", // blue-600
  "#7c3aed", // purple
  "#0ea5e9", // sky
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type BadgeVariant = "default" | "secondary" | "success" | "warning" | "destructive" | "outline";

export function getRoundStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "CALCULATED": return "success";
    case "IN_PROGRESS":
    case "OPEN": return "warning";
    default: return "secondary";
  }
}

export function getCompetitionStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "PUBLISHED":
    case "ONGOING": return "success";
    case "DRAFT": return "secondary";
    case "COMPLETED": return "outline";
    default: return "secondary";
  }
}

export function getSectionStatusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "COMPLETED": return "success";
    case "IN_PROGRESS": return "warning";
    default: return "secondary";
  }
}

/** Safe window.location.origin — returns empty string during SSR. */
export function getOrigin(): string {
  return typeof window !== "undefined" ? window.location.origin : "";
}

/**
 * Whitelists organizer-controlled image URLs that we render via {@code <img src>}
 * (MED-14). Accepts only inline {@code data:image/<type>;...} URLs — everything
 * else (including {@code javascript:}, remote {@code https://evil.com/track.gif},
 * SVG with embedded scripts) is rejected and an empty string is returned so the
 * {@code <img>} doesn't render.
 */
const QR_DATA_URL_REGEX = /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/;
export function safeQrImageSrc(input: string | null | undefined): string {
  if (!input) return "";
  // Length cap as defence-in-depth — a 5MB QR base64 string will be ~6.7MB,
  // way above any legitimate QR PNG (~3kB). Reject obviously oversized values
  // before regex-matching.
  if (input.length > 200_000) return "";
  return QR_DATA_URL_REGEX.test(input.trim()) ? input.trim() : "";
}

/** Extract a human-readable error message from any thrown value. */
export function getErrorMessage(err: unknown, fallback = "Unknown error"): string {
  if (typeof err === "string") return err;
  if (err && typeof err === "object") {
    // Axios error: extract backend response body message
    const axiosErr = err as { response?: { data?: { detail?: string; message?: string; error?: string } }; message?: string };
    const backendMsg = axiosErr.response?.data?.detail || axiosErr.response?.data?.message || axiosErr.response?.data?.error;
    if (backendMsg) return backendMsg;
    if ("message" in err && typeof (err as { message: unknown }).message === "string") {
      return (err as { message: string }).message || fallback;
    }
  }
  return fallback;
}
