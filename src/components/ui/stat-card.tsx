import { cn } from "@/lib/utils";

interface StatCardProps {
  value: number | string;
  label: string;
  sub?: string;
  /** "blue" | "cyan" | "amber" | "green" — or legacy "bg-*" Tailwind class (ignored, falls back to blue) */
  color?: string;
  /** @deprecated ignored, kept for backwards compatibility */
  icon?: React.ElementType;
  className?: string;
}

const COLOR_MAP: Record<string, string> = {
  blue:  "#3B82F6",
  cyan:  "#06B6D4",
  amber: "#F59E0B",
  green: "#10B981",
  // legacy aliases
  "bg-blue-500":    "#3B82F6",
  "bg-[var(--accent)]": "#3B82F6",
  "bg-emerald-500": "#10B981",
  "bg-amber-500":   "#F59E0B",
  "bg-teal-500":    "#06B6D4",
  "bg-[var(--text-tertiary)]": "#9CA3AF",
};

export function StatCard({ value, label, sub, color = "blue", className }: StatCardProps) {
  const hex = COLOR_MAP[color] ?? "#3B82F6";
  return (
    <div className={cn(
      "rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]",
      className
    )}>
      <p
        className="text-[0.72rem] font-semibold uppercase tracking-[0.5px] mb-2"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </p>
      <p
        className="leading-none tracking-[-0.03em]"
        style={{
          fontFamily: "var(--font-sora, Sora, sans-serif)",
          fontWeight: 700,
          fontSize: "2rem",
          color: hex,
        }}
      >
        {value}
      </p>
      {sub && <p className="mt-1 text-[0.72rem]" style={{ color: "var(--text-tertiary)" }}>{sub}</p>}
    </div>
  );
}
