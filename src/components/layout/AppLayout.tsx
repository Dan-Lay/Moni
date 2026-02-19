import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen max-w-[100vw] overflow-x-clip bg-background">
      <DesktopSidebar />
      <main className="pb-20 lg:pb-0 lg:pl-64 overflow-x-clip min-w-0">
        <div className="mx-auto max-w-6xl p-3 sm:p-4 lg:p-6 min-w-0">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};
