import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, BarChart3, X, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface PollOption {
  id: number;
  text: string;
}

interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
  vote_count?: number;
}

const Polls = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showStatsDialog, setShowStatsDialog] = useState(false);
  const [selectedPoll, setSelectedPoll] = useState<Poll | null>(null);
  const [pollStats, setPollStats] = useState<{ option: number; text: string; count: number; percentage: number }[]>([]);
  
  // Create form state
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchPolls = async () => {
    try {
      const { data: pollsData, error } = await supabase
        .from("polls")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch vote counts for each poll
      const pollsWithCounts = await Promise.all(
        (pollsData || []).map(async (poll) => {
          const { count } = await supabase
            .from("poll_votes")
            .select("*", { count: "exact", head: true })
            .eq("poll_id", poll.id);

          return {
            ...poll,
            options: poll.options as unknown as PollOption[],
            vote_count: count || 0,
          };
        })
      );

      setPolls(pollsWithCounts);
    } catch (error) {
      console.error("Error fetching polls:", error);
      toast.error("Failed to load polls");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolls();
  }, []);

  const handleCreatePoll = async () => {
    const validOptions = options.filter((o) => o.trim());
    if (!question.trim()) {
      toast.error("Please enter a question");
      return;
    }
    if (validOptions.length < 2) {
      toast.error("Please add at least 2 options");
      return;
    }

    setCreating(true);
    try {
      const pollOptions: PollOption[] = validOptions.map((text, index) => ({
        id: index,
        text: text.trim(),
      }));

      const { error } = await supabase.from("polls").insert([{
        question: question.trim(),
        options: pollOptions as unknown as any,
        expires_at: expiresAt || null,
        is_active: true,
      }]);

      if (error) throw error;

      toast.success("Poll created successfully");
      setShowCreateDialog(false);
      setQuestion("");
      setOptions(["", ""]);
      setExpiresAt("");
      fetchPolls();
    } catch (error) {
      console.error("Error creating poll:", error);
      toast.error("Failed to create poll");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (poll: Poll) => {
    try {
      const { error } = await supabase
        .from("polls")
        .update({ is_active: !poll.is_active })
        .eq("id", poll.id);

      if (error) throw error;

      toast.success(poll.is_active ? "Poll deactivated" : "Poll activated");
      fetchPolls();
    } catch (error) {
      console.error("Error toggling poll:", error);
      toast.error("Failed to update poll");
    }
  };

  const handleDeletePoll = async (pollId: string) => {
    if (!confirm("Are you sure you want to delete this poll? All votes will be lost.")) return;

    try {
      const { error } = await supabase.from("polls").delete().eq("id", pollId);
      if (error) throw error;

      toast.success("Poll deleted");
      fetchPolls();
    } catch (error) {
      console.error("Error deleting poll:", error);
      toast.error("Failed to delete poll");
    }
  };

  const handleViewStats = async (poll: Poll) => {
    setSelectedPoll(poll);
    
    try {
      const { data: votes } = await supabase
        .from("poll_votes")
        .select("selected_option")
        .eq("poll_id", poll.id);

      const totalVotes = votes?.length || 0;
      const stats = poll.options.map((option) => {
        const count = votes?.filter((v) => v.selected_option === option.id).length || 0;
        return {
          option: option.id,
          text: option.text,
          count,
          percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0,
        };
      });

      setPollStats(stats);
      setShowStatsDialog(true);
    } catch (error) {
      console.error("Error fetching stats:", error);
      toast.error("Failed to load poll statistics");
    }
  };

  const addOption = () => {
    if (options.length < 6) {
      setOptions([...options, ""]);
    }
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  return (
    <AdminLayout title="Polls Management">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Polls</h1>
            <p className="text-slate-400">Create and manage polls for your community</p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Poll
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Polls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">{polls.length}</div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Active Polls</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-400">
                {polls.filter((p) => p.is_active).length}
              </div>
            </CardContent>
          </Card>
          <Card className="bg-slate-800 border-slate-700">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-slate-400">Total Votes</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-400">
                {polls.reduce((acc, p) => acc + (p.vote_count || 0), 0)}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Polls Table */}
        <Card className="bg-slate-800 border-slate-700">
          <CardHeader>
            <CardTitle className="text-white">All Polls</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-slate-400">Loading...</div>
            ) : polls.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No polls yet. Create your first poll!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Question</TableHead>
                    <TableHead className="text-slate-400">Options</TableHead>
                    <TableHead className="text-slate-400">Votes</TableHead>
                    <TableHead className="text-slate-400">Status</TableHead>
                    <TableHead className="text-slate-400">Created</TableHead>
                    <TableHead className="text-slate-400 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {polls.map((poll) => (
                    <TableRow key={poll.id} className="border-slate-700">
                      <TableCell className="text-white font-medium max-w-xs truncate">
                        {poll.question}
                      </TableCell>
                      <TableCell className="text-slate-300">
                        {poll.options.length} options
                      </TableCell>
                      <TableCell className="text-slate-300">{poll.vote_count || 0}</TableCell>
                      <TableCell>
                        <Badge variant={poll.is_active ? "default" : "secondary"}>
                          {poll.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-sm">
                        {format(new Date(poll.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleViewStats(poll)}
                            title="View Statistics"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleToggleActive(poll)}
                            title={poll.is_active ? "Deactivate" : "Activate"}
                          >
                            {poll.is_active ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300"
                            onClick={() => handleDeletePoll(poll.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create Poll Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Poll</DialogTitle>
            <DialogDescription>
              Ask your community a question and let them vote.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                placeholder="What would you like to ask?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Options</Label>
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(index, e.target.value)}
                  />
                  {options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <Button type="button" variant="outline" size="sm" onClick={addOption}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Option
                </Button>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires">Expires At (Optional)</Label>
              <Input
                id="expires"
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePoll} disabled={creating}>
              {creating ? "Creating..." : "Create Poll"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Stats Dialog */}
      <Dialog open={showStatsDialog} onOpenChange={setShowStatsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Poll Statistics</DialogTitle>
            <DialogDescription>{selectedPoll?.question}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {pollStats.map((stat) => (
              <div key={stat.option} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span>{stat.text}</span>
                  <span className="text-muted-foreground">
                    {stat.percentage}% ({stat.count} votes)
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${stat.percentage}%` }}
                  />
                </div>
              </div>
            ))}
            <div className="pt-2 border-t text-sm text-muted-foreground">
              Total votes: {pollStats.reduce((acc, s) => acc + s.count, 0)}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Polls;
