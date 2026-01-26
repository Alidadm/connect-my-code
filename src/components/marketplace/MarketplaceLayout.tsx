import { ReactNode } from "react";
import { MarketplaceSidebar } from "./MarketplaceSidebar";

interface MarketplaceLayoutProps {
  children: ReactNode;
  onCreateListing: () => void;
  unreadMessages?: number;
}

export const MarketplaceLayout = ({ children, onCreateListing, unreadMessages }: MarketplaceLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <MarketplaceSidebar 
          onCreateListing={onCreateListing} 
          unreadMessages={unreadMessages}
        />
        <main className="flex-1 min-w-0 lg:ml-0">
          {children}
        </main>
      </div>
    </div>
  );
};
