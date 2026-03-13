"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function calcTimeLeft(target: Date): TimeLeft | null {
  const diff = target.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

interface CountdownTimerProps {
  target: Date | string;
  label?: string;
  className?: string;
  /** When less than this many minutes remain, show warning styling */
  warnBelowMinutes?: number;
  onExpire?: () => void;
}

export function CountdownTimer({
  target,
  label,
  className,
  warnBelowMinutes = 5,
  onExpire,
}: CountdownTimerProps) {
  const targetDate = typeof target === "string" ? new Date(target) : target;
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(() => calcTimeLeft(targetDate));

  useEffect(() => {
    const interval = setInterval(() => {
      const t = calcTimeLeft(targetDate);
      setTimeLeft(t);
      if (!t) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate, onExpire]);

  if (!timeLeft) {
    return (
      <div className={cn("text-sm font-semibold text-[var(--destructive)]", className)}>
        {label ? `${label} — expired` : "Expired"}
      </div>
    );
  }

  const totalMinutes =
    timeLeft.days * 24 * 60 + timeLeft.hours * 60 + timeLeft.minutes;
  const isWarning = totalMinutes < warnBelowMinutes;

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className={cn("flex flex-col gap-0.5", className)}>
      {label && (
        <p className="text-xs text-[var(--text-tertiary)]">{label}</p>
      )}
      <div className="flex items-center gap-1 font-mono font-bold tabular-nums">
        {timeLeft.days > 0 && (
          <>
            <span
              className={cn(
                "text-lg",
                isWarning ? "text-[var(--destructive)]" : "text-[var(--text-primary)]"
              )}
            >
              {timeLeft.days}d
            </span>
            <span className="text-[var(--text-tertiary)]">·</span>
          </>
        )}
        <span
          className={cn(
            "text-lg",
            isWarning ? "text-[var(--destructive)]" : "text-[var(--text-primary)]"
          )}
        >
          {pad(timeLeft.hours)}:{pad(timeLeft.minutes)}:{pad(timeLeft.seconds)}
        </span>
      </div>
    </div>
  );
}
