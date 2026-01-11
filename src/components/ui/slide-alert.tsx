import { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SlideAlertProps {
  message: string;
  type?: "error" | "warning" | "info";
  isVisible: boolean;
  onClose: () => void;
  autoClose?: boolean;
  autoCloseDelay?: number;
}

export const SlideAlert = ({
  message,
  type = "error",
  isVisible,
  onClose,
  autoClose = true,
  autoCloseDelay = 5000,
}: SlideAlertProps) => {
  useEffect(() => {
    if (isVisible && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoClose, autoCloseDelay, onClose]);

  const bgColor = {
    error: "bg-destructive/10 border-destructive/50 text-destructive",
    warning: "bg-yellow-500/10 border-yellow-500/50 text-yellow-700 dark:text-yellow-400",
    info: "bg-primary/10 border-primary/50 text-primary",
  };

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        isVisible ? "max-h-24 opacity-100 mb-4" : "max-h-0 opacity-0 mb-0"
      )}
    >
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-lg border",
          bgColor[type]
        )}
      >
        <AlertCircle className="h-5 w-5 flex-shrink-0" />
        <p className="text-sm flex-1">{message}</p>
        <button
          onClick={onClose}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
