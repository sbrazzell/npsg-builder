import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { UserMenu } from "@/components/layout/user-menu";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-full flex">
      <div className="hidden md:flex md:flex-shrink-0">
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col bg-background overflow-auto min-w-0">
        <header className="h-12 border-b border-border bg-card flex items-center justify-between px-4 shrink-0 sticky top-0 z-30">
          <MobileNav />
          {/* UserMenu shown on mobile only — desktop users see it in the sidebar */}
          <div className="md:hidden">
            <UserMenu />
          </div>
        </header>
        <main className="flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}
