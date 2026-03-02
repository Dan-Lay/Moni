import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-clip" style={{ background: 'hsl(220 20% 97%)' }}>
      <DesktopSidebar />
      <main className="pb-20 lg:pb-0 lg:pl-64 overflow-x-clip min-w-0">
        <div className="mx-auto max-w-6xl p-4 sm:p-5 lg:p-8 min-w-0">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};
