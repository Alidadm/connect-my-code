import { useState, useEffect } from "react";
import { PollCard } from "./PollCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface PollOption {
  id: number;
  text: string;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  created_at: string;
  expires_at: string | null;
}

export const FeedPolls = () => {
  const { user } = useAuth();
  const [polls, setPolls] = useState<Poll[]>([]);
  const [votedPollIds, setVotedPollIds] = useState<Set<string>>(new Set());

  const fetchPolls = async () => {
    try {
      // Fetch active polls
      const { data: pollsData, error } = await supabase
        .from("polls")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Filter out expired polls
      const now = new Date();
      const activePolls = (pollsData || []).filter((poll) => {
        if (!poll.expires_at) return true;
        return new Date(poll.expires_at) > now;
      });

      // If user is logged in, fetch their voted polls
      if (user) {
        const { data: votesData } = await supabase
          .from("poll_votes")
          .select("poll_id")
          .eq("user_id", user.id);

        const votedIds = new Set((votesData || []).map((v) => v.poll_id));
        setVotedPollIds(votedIds);

        // Filter out polls user has already voted on
        const unvotedPolls = activePolls.filter((poll) => !votedIds.has(poll.id));
        setPolls(unvotedPolls.map(p => ({
          ...p,
          options: p.options as unknown as PollOption[]
        })));
      } else {
        // Show all active polls for non-logged in users (they can see results)
        setPolls(activePolls.map(p => ({
          ...p,
          options: p.options as unknown as PollOption[]
        })));
      }
    } catch (error) {
      console.error("Error fetching polls:", error);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, [user]);

  const handleVoted = () => {
    // Refresh polls after voting to hide the voted poll
    fetchPolls();
  };

  if (polls.length === 0) {
    return null;
  }

  return (
    <div className="mb-4">
      {polls.slice(0, 1).map((poll) => (
        <PollCard key={poll.id} poll={poll} onVoted={handleVoted} />
      ))}
    </div>
  );
};
