import React from "react";
import { useNavigate } from "react-router-dom";

// Renders text with @mentions as clickable links
export const MentionText = ({ text, className }: { text: string; className?: string }) => {
  const navigate = useNavigate();

  if (!text) return null;

  // Match @username patterns
  const parts = text.split(/(@[\w.]+)/g);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("@") && part.length > 1) {
          const username = part.slice(1);
          return (
            <button
              key={i}
              className="text-primary font-medium hover:underline inline"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/${username}`);
              }}
            >
              {part}
            </button>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </span>
  );
};
