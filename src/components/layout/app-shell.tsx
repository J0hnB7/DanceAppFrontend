import { Sidebar } from "./sidebar";
import { SandboxBanner } from "@/components/shared/sandbox-banner";

interface AppShellProps {
  children: React.ReactNode;
  title?: string;
  headerActions?: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <SandboxBanner />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-6 pt-8 lg:p-8 lg:pt-10 bg-transparent">
          {children}
        </main>
      </div>
    </div>
  );
}
