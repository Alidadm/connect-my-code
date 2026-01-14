import { useState, useEffect } from "react";
import { Heart, Smile, Angry, Frown, Sparkles, ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";

export type ReactionType = 'like' | 'love' | 'laugh' | 'angry' | 'sad' | 'wow';

interface ReactionCount {
  reaction_type: ReactionType;
  count: number;
}

interface ReactionWithUser {
  reaction_type: ReactionType;
  user_id: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
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
  const [reactionsWithUsers, setReactionsWithUsers] = useState<ReactionWithUser[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [totalReactions, setTotalReactions] = useState(0);

  // Fetch user's reaction and all reaction counts with user profiles
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

      if (!allReactions || allReactions.length === 0) {
        setReactionsWithUsers([]);
        setReactionCounts([]);
        setTotalReactions(0);
        return;
      }

      // Get unique user IDs and fetch their profiles
      const userIds = [...new Set(allReactions.map(r => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      // Map profiles to reactions
      const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
      const reactionsWithProfiles: ReactionWithUser[] = allReactions.map(r => ({
        reaction_type: r.reaction_type as ReactionType,
        user_id: r.user_id,
        profiles: profileMap.get(r.user_id) || undefined
      }));

      setReactionsWithUsers(reactionsWithProfiles);

      // Count reactions by type
      const counts: Record<ReactionType, number> = {
        like: 0, love: 0, laugh: 0, angry: 0, sad: 0, wow: 0
      };
      
      allReactions.forEach((r) => {
        counts[r.reaction_type as ReactionType]++;
        if (user && r.user_id === user.id) {
          setUserReaction(r.reaction_type as ReactionType);
        }
      });

      const countsArray = Object.entries(counts)
        .filter(([, count]) => count > 0)
        .map(([type, count]) => ({ reaction_type: type as ReactionType, count }));
      
      setReactionCounts(countsArray);
      setTotalReactions(allReactions.length);
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
        setReactionsWithUsers(prev => prev.filter(r => r.user_id !== user.id));
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

        // Update reactionsWithUsers
        setReactionsWithUsers(prev => {
          const filtered = prev.filter(r => r.user_id !== user.id);
          return [...filtered, { reaction_type: type, user_id: user.id, profiles: undefined }];
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

  // Group reactions by type for tooltip
  const reactionsByType = REACTIONS.reduce((acc, reaction) => {
    const usersWithThisReaction = reactionsWithUsers.filter(r => r.reaction_type === reaction.type);
    if (usersWithThisReaction.length > 0) {
      acc[reaction.type] = usersWithThisReaction;
    }
    return acc;
  }, {} as Record<ReactionType, ReactionWithUser[]>);

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

      {/* Reaction summary with tooltip */}
      {totalReactions > 0 && (
        <HoverCard openDelay={200} closeDelay={100}>
          <HoverCardTrigger asChild>
            <button className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground transition-colors cursor-pointer">
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
            </button>
          </HoverCardTrigger>
          <HoverCardContent 
            className="w-64 p-3 bg-popover border border-border shadow-lg z-50"
            side="top"
            align="start"
          >
            <div className="space-y-3">
              {Object.entries(reactionsByType).map(([type, users]) => {
                const reaction = REACTIONS.find(r => r.type === type);
                if (!reaction) return null;
                
                return (
                  <div key={type} className="space-y-1.5">
                    <div className={cn("flex items-center gap-2 font-medium text-sm", reaction.color)}>
                      {reaction.icon}
                      <span>{reaction.label}</span>
                      <span className="text-muted-foreground">({users.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 pl-7">
                      {users.slice(0, 5).map((u) => (
                        <div key={u.user_id} className="flex items-center gap-1.5">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={u.profiles?.avatar_url || ""} />
                            <AvatarFallback className="text-[10px] bg-muted">
                              {u.profiles?.display_name?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground truncate max-w-[100px]">
                            {u.profiles?.display_name || "User"}
                          </span>
                        </div>
                      ))}
                      {users.length > 5 && (
                        <span className="text-xs text-muted-foreground">
                          +{users.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </HoverCardContent>
        </HoverCard>
      )}
    </div>
  );
};