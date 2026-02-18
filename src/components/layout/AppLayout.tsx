import { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { DesktopSidebar } from "./DesktopSidebar";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background">
      <DesktopSidebar />
      <main className="pb-20 lg:pb-0 lg:pl-64">
        <div className="mx-auto max-w-6xl p-4 lg:p-6">
          {children}
        </div>
      </main>
      <BottomNav />
    </div>
  );
};
