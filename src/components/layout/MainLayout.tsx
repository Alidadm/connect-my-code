import { ReactNode, useState } from "react";
import { Header } from "./Header";
import { LeftSidebar } from "./LeftSidebar";
import { RightSidebar } from "./RightSidebar";
import { MobileNav } from "./MobileNav";

interface MainLayoutProps {
  children: ReactNode;
}

export const MainLayout = ({ children }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="pt-16 pb-20 lg:pb-4 px-2 sm:px-4 max-w-[1920px] mx-auto">
        <div className="flex gap-4">
          <LeftSidebar />
          <main className="flex-1 min-w-0 py-4">
            {children}
          </main>
          <RightSidebar />
        </div>
      </div>
      <MobileNav />
    </div>
  );
};
