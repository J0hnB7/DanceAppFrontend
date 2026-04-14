"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/contexts/locale-context";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
  backHref?: string;
}

export function PageHeader({ title, description, actions, className, backHref }: PageHeaderProps) {
  const router = useRouter();
  const { t } = useLocale();

  return (
    <div className={cn("mb-6 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="flex items-start gap-3">
        {backHref && (
          <button
            onClick={() => router.push(backHref)}
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-secondary)] hover:text-[var(--text-primary)]"
            aria-label={t("common.back")}
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div>
          <h2 className="text-xl font-semibold text-[var(--text-primary)]" style={{ fontFamily: "var(--font-sora, Sora, sans-serif)" }}>{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{description}</p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
