import Header from "@/components/header";

/**
 * Shell for every authenticated surface: role-aware nav, theme toggle, and
 * the user menu. Pages inside this group must call `requireSession()`.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid h-svh grid-rows-[auto_1fr]">
      <Header />
      <main className="overflow-y-auto">{children}</main>
    </div>
  );
}
