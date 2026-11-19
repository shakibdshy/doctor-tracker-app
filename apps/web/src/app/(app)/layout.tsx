import IdleSessionGuard from "@/shell/idle-session-guard";
import Header from "@/shell/header";
import { Sidebar } from "@/shell/sidebar";

/**
 * Shell for every authenticated surface: pine sidebar on desktop, top bar
 * with pill nav on mobile. Pages inside this group must call
 * `requireSession()`, and the idle-session guard signs the user out after
 * 15 minutes without input (ADR-0004). `main` is the scroll container for
 * the content column.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-svh">
      <IdleSessionGuard />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
