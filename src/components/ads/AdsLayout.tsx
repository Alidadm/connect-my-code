import { ReactNode } from "react";
import { Megaphone } from "lucide-react";
import { Link } from "react-router-dom";

interface AdsLayoutProps {
  children: ReactNode;
}

export const AdsLayout = ({ children }: AdsLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Simple Header for Ads */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="max-w-7xl mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          <Link to="/ads" className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Megaphone className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-xl">Ads Manager</span>
          </Link>
          <Link 
            to="/" 
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Back to Dolphysn
          </Link>
        </div>
      </header>
      
      {/* Main Content - No Sidebars */}
      <main className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        {children}
      </main>
    </div>
  );
};
