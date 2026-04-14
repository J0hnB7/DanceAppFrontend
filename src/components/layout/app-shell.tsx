"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";
import { Sidebar } from "./sidebar";
import { SandboxBanner } from "@/components/shared/sandbox-banner";

interface AppShellProps {
  children: React.ReactNode;
  headerActions?: React.ReactNode;
  /** Custom sidebar — replaces the default Sidebar component */
  sidebar?: React.ReactNode;
  /** Remove default main padding (e.g. for competition detail with hero) */
  noPadding?: boolean;
}

export function AppShell({ children, headerActions, sidebar, noPadding }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  const sidebarContent = sidebar !== undefined ? sidebar : <Sidebar />;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SandboxBanner />

      {/* Mobile top bar */}
      <header className="flex shrink-0 items-center gap-3 border-b border-[rgba(255,255,255,0.07)] bg-[#0B0F1A] px-4 py-2.5 lg:hidden">
        <button
          onClick={() => setMobileOpen(true)}
          aria-label="Otevřít menu"
          aria-expanded={mobileOpen}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-[#94A3B8] transition-all hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ProPodium" className="h-7 w-7 rounded-[8px]" />
        </div>
        <span className="flex-1 text-sm font-bold text-[#F1F5F9]" style={{ fontFamily: "var(--font-sora)" }}>
          ProPodium
        </span>
        {headerActions && <div className="flex items-center gap-2">{headerActions}</div>}
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar — always visible */}
        <div className="hidden lg:flex h-full">
          {sidebarContent}
        </div>

        {/* Mobile sidebar overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-[150] bg-black/60 backdrop-blur-[4px] lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}

        {/* Mobile sidebar drawer */}
        <div
          className={`fixed inset-y-0 left-0 z-[160] flex h-full transition-transform duration-250 lg:hidden ${
            mobileOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="relative flex h-full flex-col">
            {sidebarContent}
            <button
              onClick={() => setMobileOpen(false)}
              aria-label="Zavřít menu"
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-[#94A3B8] hover:bg-[rgba(255,255,255,0.08)] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Desktop header actions */}
          {headerActions && (
            <div className="hidden lg:flex shrink-0 items-center justify-end gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
              {headerActions}
            </div>
          )}
          <main className={noPadding ? "flex-1 overflow-y-auto overflow-x-hidden bg-transparent" : "flex-1 overflow-y-auto overflow-x-hidden p-6 pt-8 lg:p-8 lg:pt-10 bg-transparent"}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
