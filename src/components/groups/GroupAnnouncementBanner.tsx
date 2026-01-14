import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Megaphone, ChevronDown, ChevronUp, X, Trash2, Edit } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  expires_at: string | null;
  user_id: string;
}

interface GroupAnnouncementBannerProps {
  announcements: Announcement[];
  canManage?: boolean;
  onAnnouncementChange?: () => void;
}

export const GroupAnnouncementBanner = ({ 
  announcements, 
  canManage,
  onAnnouncementChange 
}: GroupAnnouncementBannerProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleAnnouncements = announcements.filter(a => !dismissedIds.has(a.id));

  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("group_announcements")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Announcement deleted");
      onAnnouncementChange?.();
    } catch (error) {
      console.error("Error deleting announcement:", error);
      toast.error("Failed to delete announcement");
    }
  };

  if (visibleAnnouncements.length === 0) return null;

  return (
    <div className="space-y-3">
      {visibleAnnouncements.map((announcement) => {
        const isExpanded = expandedId === announcement.id;
        const isLongContent = announcement.content.length > 150;

        return (
          <Card 
            key={announcement.id} 
            className="border-primary/30 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent overflow-hidden"
          >
            <CardContent className="py-3 px-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                  <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <Megaphone className="h-4 w-4 text-primary" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="bg-primary/20 text-primary border-primary/30 text-xs">
                      Announcement
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(announcement.created_at), { addSuffix: true })}
                    </span>
                    {announcement.expires_at && (
                      <span className="text-xs text-muted-foreground">
                        • Expires {formatDistanceToNow(new Date(announcement.expires_at), { addSuffix: true })}
                      </span>
                    )}
                  </div>

                  <h4 className="font-semibold text-foreground mt-1">{announcement.title}</h4>
                  
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                    {isExpanded || !isLongContent 
                      ? announcement.content 
                      : `${announcement.content.slice(0, 150)}...`}
                  </p>

                  {isLongContent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-0 text-primary hover:bg-transparent mt-1"
                      onClick={() => setExpandedId(isExpanded ? null : announcement.id)}
                    >
                      {isExpanded ? (
                        <>Show less <ChevronUp className="h-3 w-3 ml-1" /></>
                      ) : (
                        <>Read more <ChevronDown className="h-3 w-3 ml-1" /></>
                      )}
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {canManage && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Announcement</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete this announcement? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDelete(announcement.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground"
                    onClick={() => handleDismiss(announcement.id)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
