import { useState, useEffect } from "react";
import { Heart, Smile, Angry, Frown, Sparkles, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export type ReactionType = 'like' | 'love' | 'laugh' | 'angry' | 'sad' | 'wow';

interface ReactionCount {
  reaction_type: ReactionType;
  count: number;
}

interface ReactionPickerProps {
  postId: string;
  onReactionChange?: () => void;
}

const REACTIONS: { type: ReactionType; icon: React.ReactNode; label: string; color: string }[] = [
  { type: 'like', icon: <ThumbsUp className="h-5 w-5" />, label: 'Like', color: 'text-primary' },
  { type: 'love', icon: <Heart className="h-5 w-5" />, label: 'Love', color: 'text-red-500' },
  { type: 'laugh', icon: <Smile className="h-5 w-5" />, label: 'Haha', color: 'text-yellow-500' },
  { type: 'wow', icon: <Sparkles className="h-5 w-5" />, label: 'Wow', color: 'text-yellow-400' },
  { type: 'sad', icon: <Frown className="h-5 w-5" />, label: 'Sad', color: 'text-blue-400' },
  { type: 'angry', icon: <Angry className="h-5 w-5" />, label: 'Angry', color: 'text-orange-500' },
];

export const ReactionPicker = ({ postId, onReactionChange }: ReactionPickerProps) => {
  const { user } = useAuth();
  const [userReaction, setUserReaction] = useState<ReactionType | null>(null);
  const [reactionCounts, setReactionCounts] = useState<ReactionCount[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [totalReactions, setTotalReactions] = useState(0);

  // Fetch user's reaction and all reaction counts
  useEffect(() => {
    const fetchReactions = async () => {
      // Get all reactions for this post
      const { data: allReactions, error } = await supabase
        .from("post_reactions")
        .select("reaction_type, user_id")
        .eq("post_id", postId);

      if (error) {
        console.error("Error fetching reactions:", error);
        return;
      }

      // Count reactions by type
      const counts: Record<ReactionType, number> = {
        like: 0, love: 0, laugh: 0, angry: 0, sad: 0, wow: 0
      };
      
      allReactions?.forEach((r) => {
        counts[r.reaction_type as ReactionType]++;
        if (user && r.user_id === user.id) {
          setUserReaction(r.reaction_type as ReactionType);
        }
      });

      const countsArray = Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => ({ reaction_type: type as ReactionType, count }));
      
      setReactionCounts(countsArray);
      setTotalReactions(allReactions?.length || 0);
    };

    fetchReactions();
  }, [postId, user]);

  const handleReaction = async (type: ReactionType) => {
    if (!user) return;
    setIsOpen(false);

    try {
      if (userReaction === type) {
        // Remove reaction
        await supabase
          .from("post_reactions")
          .delete()
          .eq("post_id", postId)
          .eq("user_id", user.id);
        
        setUserReaction(null);
        setTotalReactions(prev => Math.max(0, prev - 1));
        setReactionCounts(prev => {
          const updated = prev.map(r => 
            r.reaction_type === type 
              ? { ...r, count: Math.max(0, r.count - 1) }
              : r
          ).filter(r => r.count > 0);
          return updated;
        });
      } else {
        // Upsert reaction (insert or update)
        const { error } = await supabase
          .from("post_reactions")
          .upsert({
            post_id: postId,
            user_id: user.id,
            reaction_type: type,
          }, {
            onConflict: 'post_id,user_id'
          });

        if (error) throw error;

        // Update local state
        const previousReaction = userReaction;
        setUserReaction(type);
        
        if (!previousReaction) {
          setTotalReactions(prev => prev + 1);
        }

        setReactionCounts(prev => {
          let updated = [...prev];
          
          // Decrease count for previous reaction
          if (previousReaction) {
            updated = updated.map(r => 
              r.reaction_type === previousReaction 
                ? { ...r, count: Math.max(0, r.count - 1) }
                : r
            ).filter(r => r.count > 0);
          }
          
          // Increase count for new reaction
          const existing = updated.find(r => r.reaction_type === type);
          if (existing) {
            updated = updated.map(r => 
              r.reaction_type === type ? { ...r, count: r.count + 1 } : r
            );
          } else {
            updated.push({ reaction_type: type, count: 1 });
          }
          
          return updated;
        });
      }
      
      onReactionChange?.();
    } catch (error) {
      console.error("Error toggling reaction:", error);
    }
  };

  const currentReaction = userReaction 
    ? REACTIONS.find(r => r.type === userReaction) 
    : REACTIONS[0];

  // Get top 3 reactions for display
  const topReactions = reactionCounts
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);

  return (
    <div className="flex items-center gap-1">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1 sm:gap-2 transition-colors",
              userReaction ? currentReaction?.color : "text-muted-foreground"
            )}
            onMouseEnter={() => setIsOpen(true)}
          >
            <span className={userReaction ? currentReaction?.color : ""}>
              {userReaction ? currentReaction?.icon : <ThumbsUp className="h-5 w-5" />}
            </span>
            <span className="hidden sm:inline">
              {userReaction ? currentReaction?.label : 'Like'}
            </span>
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-auto p-2 bg-popover border border-border shadow-lg z-50"
          side="top"
          align="start"
          onMouseLeave={() => setIsOpen(false)}
        >
          <div className="flex gap-1">
            {REACTIONS.map(({ type, icon, label, color }) => (
              <Button
                key={type}
                variant="ghost"
                size="sm"
                className={cn(
                  "p-2 h-auto transition-transform hover:scale-125",
                  userReaction === type && "bg-accent",
                  color
                )}
                onClick={() => handleReaction(type)}
                title={label}
              >
                {icon}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Reaction summary */}
      {totalReactions > 0 && (
        <div className="flex items-center gap-1 text-muted-foreground text-sm">
          <div className="flex -space-x-1">
            {topReactions.map(({ reaction_type }) => {
              const reaction = REACTIONS.find(r => r.type === reaction_type);
              return (
                <span key={reaction_type} className={cn("text-xs", reaction?.color)}>
                  {reaction?.icon}
                </span>
              );
            })}
          </div>
          <span className="ml-1">{totalReactions}</span>
        </div>
      )}
    </div>
  );
};