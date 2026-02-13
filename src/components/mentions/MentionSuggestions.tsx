import { useState, useRef, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface MentionUser {
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface MentionSuggestionsProps {
  query: string;
  onSelect: (user: MentionUser) => void;
  position: { top: number; left: number } | null;
  visible: boolean;
}

const MentionSuggestions = ({ query, onSelect, position, visible }: MentionSuggestionsProps) => {
  const [users, setUsers] = useState<MentionUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (!query || query.length < 1) {
      setUsers([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("safe_profiles")
        .select("user_id, username, display_name, avatar_url")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(6);

      setUsers(
        (data || []).map((d) => ({
          user_id: d.user_id,
          username: d.username || "",
          display_name: d.display_name,
          avatar_url: d.avatar_url,
        }))
      );
      setSelectedIndex(0);
      setLoading(false);
    };

    const timeout = setTimeout(search, 200);
    return () => clearTimeout(timeout);
  }, [query]);

  if (!visible || users.length === 0) return null;

  return (
    <div
      className="absolute z-50 bg-popover border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto w-64"
      style={position ? { bottom: "100%", left: 0, marginBottom: 4 } : undefined}
    >
      {users.map((user, idx) => (
        <button
          key={user.user_id}
          className={cn(
            "w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-accent transition-colors text-sm",
            idx === selectedIndex && "bg-accent"
          )}
          onMouseDown={(e) => {
            e.preventDefault();
            onSelect(user);
          }}
        >
          <Avatar className="h-7 w-7">
            <AvatarImage src={user.avatar_url || ""} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {(user.display_name || user.username)?.[0]?.toUpperCase() || "?"}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{user.display_name || user.username}</p>
            <p className="text-xs text-muted-foreground">@{user.username}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

// Hook for mention detection in any text input
export const useMentionDetection = (
  text: string,
  cursorPosition: number
) => {
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    // Look backwards from cursor for @ that starts a mention
    const textBeforeCursor = text.slice(0, cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");

    if (lastAtIndex === -1) {
      setShowSuggestions(false);
      return;
    }

    // Check that @ is at start or preceded by whitespace
    if (lastAtIndex > 0 && !/\s/.test(textBeforeCursor[lastAtIndex - 1])) {
      setShowSuggestions(false);
      return;
    }

    const query = textBeforeCursor.slice(lastAtIndex + 1);
    
    // No spaces in mention query
    if (/\s/.test(query)) {
      setShowSuggestions(false);
      return;
    }

    if (query.length >= 1) {
      setMentionQuery(query);
      setMentionStart(lastAtIndex);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [text, cursorPosition]);

  return { mentionQuery, mentionStart, showSuggestions, setShowSuggestions };
};

// Utility to insert mention into text
export const insertMention = (
  text: string,
  mentionStart: number,
  cursorPosition: number,
  username: string
): { newText: string; newCursorPosition: number } => {
  const before = text.slice(0, mentionStart);
  const after = text.slice(cursorPosition);
  const mention = `@${username} `;
  return {
    newText: before + mention + after,
    newCursorPosition: before.length + mention.length,
  };
};

export { MentionSuggestions };
export type { MentionUser };
