import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart3, Check, Users } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

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

interface PollCardProps {
  poll: Poll;
  onVoted?: () => void;
}

export const PollCard = ({ poll, onVoted }: PollCardProps) => {
  const { user } = useAuth();
  const [selectedOption, setSelectedOption] = useState<string>("");
  const [hasVoted, setHasVoted] = useState(false);
  const [voting, setVoting] = useState(false);
  const [votes, setVotes] = useState<{ option: number; count: number }[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);

  // Check if user has already voted and fetch vote counts
  useEffect(() => {
    const fetchVoteData = async () => {
      if (!user) return;

      // Check if user has voted
      const { data: userVote } = await supabase
        .from("poll_votes")
        .select("selected_option")
        .eq("poll_id", poll.id)
        .eq("user_id", user.id)
        .single();

      if (userVote) {
        setHasVoted(true);
        setSelectedOption(userVote.selected_option.toString());
      }

      // Fetch all votes for this poll
      const { data: allVotes } = await supabase
        .from("poll_votes")
        .select("selected_option")
        .eq("poll_id", poll.id);

      if (allVotes) {
        const voteCounts = poll.options.map((opt) => ({
          option: opt.id,
          count: allVotes.filter((v) => v.selected_option === opt.id).length,
        }));
        setVotes(voteCounts);
        setTotalVotes(allVotes.length);
      }
    };

    fetchVoteData();
  }, [poll.id, user, hasVoted]);

  const handleVote = async () => {
    if (!user || !selectedOption || hasVoted) return;

    setVoting(true);
    try {
      const { error } = await supabase.from("poll_votes").insert({
        poll_id: poll.id,
        user_id: user.id,
        selected_option: parseInt(selectedOption),
      });

      if (error) {
        if (error.code === "23505") {
          toast.error("You have already voted on this poll");
        } else {
          throw error;
        }
      } else {
        setHasVoted(true);
        toast.success("Vote submitted!");
        onVoted?.();
      }
    } catch (error) {
      console.error("Error voting:", error);
      toast.error("Failed to submit vote");
    } finally {
      setVoting(false);
    }
  };

  const getPercentage = (optionId: number) => {
    if (totalVotes === 0) return 0;
    const voteCount = votes.find((v) => v.option === optionId)?.count || 0;
    return Math.round((voteCount / totalVotes) * 100);
  };

  const getVoteCount = (optionId: number) => {
    return votes.find((v) => v.option === optionId)?.count || 0;
  };

  const isExpired = poll.expires_at && new Date(poll.expires_at) < new Date();

  return (
    <Card className="mb-4 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2 text-primary">
          <BarChart3 className="h-5 w-5" />
          <span className="font-semibold text-sm">Poll</span>
        </div>
        <h3 className="text-lg font-semibold mt-2">{poll.question}</h3>
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {totalVotes} {totalVotes === 1 ? "vote" : "votes"}
          </span>
          {poll.expires_at && !isExpired && (
            <span>Ends {formatDistanceToNow(new Date(poll.expires_at), { addSuffix: true })}</span>
          )}
          {isExpired && <span className="text-destructive">Poll ended</span>}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {!hasVoted && !isExpired && user ? (
          <div className="space-y-4">
            <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
              {poll.options.map((option) => (
                <div
                  key={option.id}
                  className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => setSelectedOption(option.id.toString())}
                >
                  <RadioGroupItem value={option.id.toString()} id={`option-${option.id}`} />
                  <Label htmlFor={`option-${option.id}`} className="flex-1 cursor-pointer">
                    {option.text}
                  </Label>
                </div>
              ))}
            </RadioGroup>
            <Button
              onClick={handleVote}
              disabled={!selectedOption || voting}
              className="w-full"
            >
              {voting ? "Submitting..." : "Vote"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {poll.options.map((option) => {
              const percentage = getPercentage(option.id);
              const voteCount = getVoteCount(option.id);
              const isSelected = selectedOption === option.id.toString();

              return (
                <div key={option.id} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      {isSelected && <Check className="h-4 w-4 text-primary" />}
                      <span className={isSelected ? "font-semibold" : ""}>
                        {option.text}
                      </span>
                    </div>
                    <span className="text-muted-foreground">
                      {percentage}% ({voteCount})
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
            {!user && (
              <p className="text-sm text-muted-foreground text-center pt-2">
                Sign in to vote on this poll
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
