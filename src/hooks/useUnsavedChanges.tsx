import { useEffect, useCallback, useState, useRef } from "react";
import { useLocation } from "react-router-dom";

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  message?: string;
}

export function useUnsavedChanges({ 
  hasUnsavedChanges, 
  message = "You have unsaved changes. Are you sure you want to leave?" 
}: UseUnsavedChangesOptions) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<(() => void) | null>(null);
  const location = useLocation();
  const prevLocationRef = useRef(location.pathname);

  // Handle browser back/forward/refresh with beforeunload
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges, message]);

  // Track location changes to detect navigation attempts
  useEffect(() => {
    // If location changed and we have unsaved changes, this means navigation happened
    // We can't block it with BrowserRouter, but we can warn via beforeunload
    prevLocationRef.current = location.pathname;
  }, [location.pathname]);

  const proceed = useCallback(() => {
    setIsBlocked(false);
    if (pendingNavigation) {
      pendingNavigation();
      setPendingNavigation(null);
    }
  }, [pendingNavigation]);

  const reset = useCallback(() => {
    setIsBlocked(false);
    setPendingNavigation(null);
  }, []);

  // Method to trigger navigation check manually (for custom navigation handlers)
  const checkNavigation = useCallback((onProceed: () => void) => {
    if (hasUnsavedChanges) {
      setIsBlocked(true);
      setPendingNavigation(() => onProceed);
      return false; // Navigation blocked
    }
    onProceed();
    return true; // Navigation allowed
  }, [hasUnsavedChanges]);

  return {
    isBlocked,
    proceed,
    reset,
    message,
    checkNavigation,
    hasUnsavedChanges,
  };
}
