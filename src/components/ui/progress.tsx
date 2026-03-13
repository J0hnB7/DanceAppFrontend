import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0-100
  className?: string;
  color?: "default" | "success" | "warning" | "destructive";
  size?: "sm" | "md" | "lg";
  label?: string;
}

const gradientMap = {
  default: "linear-gradient(90deg, #6ea8f7 0%, #7c6cf0 100%)",
  success: "linear-gradient(90deg, #6dd8c8 0%, #34c98e 100%)",
  warning: "linear-gradient(90deg, #fbbf80 0%, #f59e6b 100%)",
  destructive: "linear-gradient(90deg, #f98aaa 0%, #f06b8a 100%)",
};

export function Progress({ value, className, color = "default", size = "md", label }: ProgressProps) {
  const clamped = Math.min(100, Math.max(0, value));
  const heightClass = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";

  return (
    <div className={cn("w-full", className)}>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--text-secondary)]">
          <span>{label}</span>
          <span className="font-medium text-[var(--text-primary)]">{clamped}%</span>
        </div>
      )}
      <div className={cn("w-full overflow-hidden rounded-full bg-[var(--surface-secondary)]", heightClass)}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out shadow-[0_1px_4px_rgba(91,141,238,0.25)]"
          style={{ width: `${clamped}%`, background: gradientMap[color] }}
        />
      </div>
    </div>
  );
}
