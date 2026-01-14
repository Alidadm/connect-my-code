import { ReactNode, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function AdminRouteGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [checking, setChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const hasRedirectedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const redirectToLogin = (reason?: "admin" | "auth") => {
      if (hasRedirectedRef.current) return;
      hasRedirectedRef.current = true;

      if (reason === "admin") {
        toast({
          title: "Admin access required",
          description: "Please log in with an admin account to continue.",
          variant: "destructive",
        });
      } else if (reason === "auth") {
        toast({
          title: "Session required",
          description: "Please log in to continue.",
          variant: "destructive",
        });
      }

      navigate("/login", {
        replace: true,
        state: { from: location.pathname + location.search },
      });
    };

    const check = async () => {
      if (loading) return;

      if (!user) {
        setChecking(false);
        setIsAuthorized(false);
        redirectToLogin("auth");
        return;
      }

      setChecking(true);

      const { data, error } = await supabase.rpc("has_role", {
        _role: "admin",
        _user_id: user.id,
      });

      if (cancelled) return;

      if (error || !data) {
        setChecking(false);
        setIsAuthorized(false);
        redirectToLogin("admin");
        return;
      }

      setIsAuthorized(true);
      setChecking(false);
    };

    check();

    return () => {
      cancelled = true;
    };
  }, [loading, user, toast, navigate, location.pathname, location.search]);

  if (loading || checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Checking access…</span>
        </div>
      </div>
    );
  }

  // Only render children if authorized
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Redirecting…</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
