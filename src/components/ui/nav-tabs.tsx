"use client";

import { cn } from "@/lib/utils";

interface TabItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string;
}

interface NavTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function NavTabs({ tabs, activeTab, onChange, className }: NavTabsProps) {
  return (
    <div className={cn("flex items-center gap-1 border-b border-[var(--border)]", className)}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px",
            activeTab === tab.id
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          )}
        >
          {tab.icon}
          {tab.label}
          {tab.badge && (
            <span className="ml-0.5 rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-semibold text-white leading-none">
              {tab.badge}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
