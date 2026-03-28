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
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SandboxBanner />
      <div className="flex flex-1 overflow-hidden">
        {sidebar ?? <Sidebar />}
        <div className="flex flex-1 flex-col overflow-hidden">
          {headerActions && (
            <div className="flex shrink-0 items-center justify-end gap-2 border-b border-[var(--border)] bg-[var(--surface)] px-6 py-3">
              {headerActions}
            </div>
          )}
          <main className={noPadding ? "flex-1 overflow-y-auto overflow-x-hidden bg-transparent max-lg:pt-14" : "flex-1 overflow-y-auto overflow-x-hidden p-6 pt-8 lg:p-8 lg:pt-10 bg-transparent"}>
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
