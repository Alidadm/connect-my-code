import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  Clock,
  MapPin,
  Users,
  Star,
  Check,
  Share2,
  MoreHorizontal,
  MessageCircle,
  Image as ImageIcon,
  Send,
  Loader2,
  ArrowLeft,
  Globe,
  Lock,
  UserPlus,
  Trash2,
  Edit,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import {
  useEvent,
  useEventRSVPs,
  useEventComments,
  useEventMedia,
  useEventCategories,
  useRSVP,
  useAddComment,
  useDeleteComment,
  useDeleteEvent,
  useUploadEventMedia,
} from "@/hooks/useEvents";
import { InviteToEventDialog } from "@/components/events/InviteToEventDialog";
import { ShareEventDialog } from "@/components/events/ShareEventDialog";
import { toast } from "sonner";

const EventDetail = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: event, isLoading } = useEvent(eventId);
  const { data: categories } = useEventCategories();
  const { data: rsvps } = useEventRSVPs(eventId);
  const { data: comments } = useEventComments(eventId);
  const { data: media } = useEventMedia(eventId);

  const rsvpMutation = useRSVP();
  const addCommentMutation = useAddComment();
  const deleteCommentMutation = useDeleteComment();
  const deleteEventMutation = useDeleteEvent();
  const uploadMediaMutation = useUploadEventMedia();

  const [commentText, setCommentText] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!event) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto py-12 text-center">
          <CalendarDays className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {t("events.notFound", { defaultValue: "Event Not Found" })}
          </h1>
          <p className="text-muted-foreground mb-4">
            {t("events.notFoundDesc", {
              defaultValue: "This event may have been deleted or doesn't exist.",
            })}
          </p>
          <Button onClick={() => navigate("/events")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("events.backToEvents", { defaultValue: "Back to Events" })}
          </Button>
        </div>
      </MainLayout>
    );
  }

  const startDate = new Date(event.start_date);
  const endDate = event.end_date ? new Date(event.end_date) : null;
  const category = categories?.find((c) => c.slug === event.category);
  const isCreator = user?.id === event.creator_id;

  const goingRSVPs = rsvps?.filter((r) => r.status === "going") || [];
  const interestedRSVPs = rsvps?.filter((r) => r.status === "interested") || [];

  const handleRSVP = async (status: "going" | "interested" | null) => {
    if (!user) {
      navigate("/login");
      return;
    }
    await rsvpMutation.mutateAsync({ eventId: event.id, status });
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !eventId) return;
    await addCommentMutation.mutateAsync({
      eventId,
      content: commentText.trim(),
    });
    setCommentText("");
  };

  const handleDeleteEvent = async () => {
    if (window.confirm(t("events.confirmDelete", { defaultValue: "Are you sure you want to delete this event?" }))) {
      await deleteEventMutation.mutateAsync(event.id);
      navigate("/events");
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;
    await uploadMediaMutation.mutateAsync({ eventId, file });
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate("/events")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          {t("events.backToEvents", { defaultValue: "Back to Events" })}
        </Button>

        {/* Cover & Title */}
        <Card className="overflow-hidden">
          <div
            className={cn(
              "h-64 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10 relative",
              event.cover_url && "bg-none"
            )}
          >
            {event.cover_url && (
              <img
                src={event.cover_url}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            )}

            {/* Category badge */}
            {category && (
              <Badge
                className="absolute top-4 left-4"
                style={{ backgroundColor: category.color }}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </Badge>
            )}

            {/* Privacy badge */}
            <Badge variant="secondary" className="absolute top-4 right-4">
              {event.privacy === "public" ? (
                <>
                  <Globe className="h-3 w-3 mr-1" />
                  {t("events.public", { defaultValue: "Public" })}
                </>
              ) : (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  {t("events.private", { defaultValue: "Private" })}
                </>
              )}
            </Badge>
          </div>

          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-4">
              {/* Date box */}
              <div className="flex-shrink-0 w-20 h-20 rounded-xl bg-primary/10 flex flex-col items-center justify-center border border-primary/20">
                <span className="text-sm font-medium text-primary uppercase">
                  {format(startDate, "MMM")}
                </span>
                <span className="text-3xl font-bold text-primary">
                  {format(startDate, "d")}
                </span>
              </div>

              <div className="flex-1">
                <h1 className="text-2xl font-bold mb-2">{event.title}</h1>

                {/* Creator */}
                {event.creator && (
                  <div className="flex items-center gap-2 mb-4">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={event.creator.avatar_url || undefined} />
                      <AvatarFallback className="text-xs">
                        {event.creator.display_name?.[0] || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm text-muted-foreground">
                      {t("events.hostedBy", { defaultValue: "Hosted by" })}{" "}
                      <span
                        className="font-medium text-foreground cursor-pointer hover:underline"
                        onClick={() =>
                          navigate(`/${event.creator?.username}`)
                        }
                      >
                        {event.creator.display_name}
                      </span>
                    </span>
                  </div>
                )}

                {/* Date & Time */}
                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mb-4">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4" />
                    <span>{format(startDate, "EEEE, MMMM d, yyyy")}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>
                      {format(startDate, "h:mm a")}
                      {endDate && ` - ${format(endDate, "h:mm a")}`}
                    </span>
                  </div>
                </div>

                {/* Location */}
                {event.location_name && (
                  <div className="flex items-start gap-2 text-sm mb-4">
                    <MapPin className="h-4 w-4 mt-0.5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{event.location_name}</p>
                      {event.location_address && (
                        <p className="text-muted-foreground">
                          {event.location_address}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Stats */}
                <div className="flex items-center gap-6 text-sm">
                  <span className="flex items-center gap-1">
                    <Check className="h-4 w-4 text-green-500" />
                    <span className="font-medium">{event.going_count}</span>{" "}
                    {t("events.going", { defaultValue: "going" })}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">{event.interested_count}</span>{" "}
                    {t("events.interested", { defaultValue: "interested" })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2">
                {user && !isCreator && (
                  <div className="flex gap-2">
                    <Button
                      variant={event.user_rsvp === "going" ? "default" : "outline"}
                      onClick={() =>
                        handleRSVP(event.user_rsvp === "going" ? null : "going")
                      }
                      disabled={rsvpMutation.isPending}
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {t("events.going", { defaultValue: "Going" })}
                    </Button>
                    <Button
                      variant={
                        event.user_rsvp === "interested" ? "secondary" : "outline"
                      }
                      onClick={() =>
                        handleRSVP(
                          event.user_rsvp === "interested" ? null : "interested"
                        )
                      }
                      disabled={rsvpMutation.isPending}
                    >
                      <Star className="h-4 w-4 mr-2" />
                      {t("events.interested", { defaultValue: "Interested" })}
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  {isCreator && (
                    <Button
                      variant="outline"
                      onClick={() => setShowInviteDialog(true)}
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      {t("events.invite", { defaultValue: "Invite" })}
                    </Button>
                  )}
                  <Button variant="outline" onClick={() => setShowShareDialog(true)}>
                    <Share2 className="h-4 w-4 mr-2" />
                    {t("common.share", { defaultValue: "Share" })}
                  </Button>

                  {isCreator && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Edit className="h-4 w-4 mr-2" />
                          {t("events.edit", { defaultValue: "Edit Event" })}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={handleDeleteEvent}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          {t("events.delete", { defaultValue: "Delete Event" })}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs: About, Discussion, Photos, Attendees */}
        <Tabs defaultValue="about" className="w-full">
          <TabsList className="w-full justify-start bg-card border">
            <TabsTrigger value="about">
              {t("events.about", { defaultValue: "About" })}
            </TabsTrigger>
            <TabsTrigger value="discussion" className="gap-2">
              <MessageCircle className="h-4 w-4" />
              {t("events.discussion", { defaultValue: "Discussion" })}
              {comments && comments.length > 0 && (
                <span className="text-xs">({comments.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="photos" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              {t("events.photos", { defaultValue: "Photos" })}
              {media && media.length > 0 && (
                <span className="text-xs">({media.length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="attendees" className="gap-2">
              <Users className="h-4 w-4" />
              {t("events.attendees", { defaultValue: "Attendees" })}
            </TabsTrigger>
          </TabsList>

          {/* About Tab */}
          <TabsContent value="about" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("events.aboutEvent", { defaultValue: "About this event" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {event.description ? (
                  <p className="whitespace-pre-wrap">{event.description}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    {t("events.noDescription", {
                      defaultValue: "No description provided",
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Discussion Tab */}
          <TabsContent value="discussion" className="mt-4 space-y-4">
            {/* Add comment */}
            {user && (
              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {user.email?.[0].toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                      <Textarea
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder={t("events.writeComment", {
                          defaultValue: "Write a comment...",
                        })}
                        rows={2}
                      />
                      <div className="flex justify-end">
                        <Button
                          size="sm"
                          onClick={handleAddComment}
                          disabled={
                            !commentText.trim() || addCommentMutation.isPending
                          }
                        >
                          {addCommentMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <Send className="h-4 w-4 mr-2" />
                              {t("common.send", { defaultValue: "Post" })}
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Comments list */}
            {comments && comments.length > 0 ? (
              <Card>
                <CardContent className="p-4 space-y-4">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage
                          src={comment.profile?.avatar_url || undefined}
                        />
                        <AvatarFallback>
                          {comment.profile?.display_name?.[0] || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-muted rounded-lg px-4 py-2">
                          <p className="font-medium text-sm">
                            {comment.profile?.display_name}
                          </p>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                          <span>
                            {format(new Date(comment.created_at), "MMM d, h:mm a")}
                          </span>
                          {comment.user_id === user?.id && (
                            <button
                              className="hover:text-destructive"
                              onClick={() =>
                                deleteCommentMutation.mutate({
                                  commentId: comment.id,
                                  eventId: event.id,
                                })
                              }
                            >
                              {t("common.delete", { defaultValue: "Delete" })}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            ) : (
              <Card className="p-8 text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {t("events.noComments", { defaultValue: "No comments yet" })}
                </h3>
                <p className="text-muted-foreground">
                  {t("events.beFirstToComment", {
                    defaultValue: "Be the first to start the conversation!",
                  })}
                </p>
              </Card>
            )}
          </TabsContent>

          {/* Photos Tab */}
          <TabsContent value="photos" className="mt-4">
            <Card>
              <CardContent className="p-4">
                {/* Upload button (only for attendees) */}
                {user && event.user_rsvp === "going" && (
                  <div className="mb-4">
                    <label>
                      <Button variant="outline" className="gap-2" asChild>
                        <span className="cursor-pointer">
                          <ImageIcon className="h-4 w-4" />
                          {t("events.uploadPhoto", { defaultValue: "Upload Photo" })}
                          <input
                            type="file"
                            accept="image/*,video/*"
                            className="hidden"
                            onChange={handleMediaUpload}
                            disabled={uploadMediaMutation.isPending}
                          />
                        </span>
                      </Button>
                    </label>
                  </div>
                )}

                {media && media.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {media.map((item) => (
                      <div
                        key={item.id}
                        className="aspect-square rounded-lg overflow-hidden bg-muted"
                      >
                        {item.media_type === "video" ? (
                          <video
                            src={item.media_url}
                            className="w-full h-full object-cover"
                            controls
                          />
                        ) : (
                          <img
                            src={item.media_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {t("events.noPhotos", { defaultValue: "No photos yet" })}
                    </h3>
                    <p className="text-muted-foreground">
                      {t("events.noPhotosDesc", {
                        defaultValue: "Photos from attendees will appear here",
                      })}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Attendees Tab */}
          <TabsContent value="attendees" className="mt-4 space-y-4">
            {/* Going */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Check className="h-5 w-5 text-green-500" />
                  {t("events.going", { defaultValue: "Going" })} ({goingRSVPs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {goingRSVPs.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {goingRSVPs.map((rsvp) => (
                      <div
                        key={rsvp.id}
                        className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5 cursor-pointer hover:bg-muted/80"
                        onClick={() =>
                          navigate(`/${rsvp.profile?.username}`)
                        }
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={rsvp.profile?.avatar_url || undefined}
                          />
                          <AvatarFallback className="text-xs">
                            {rsvp.profile?.display_name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {rsvp.profile?.display_name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("events.noOneGoing", {
                      defaultValue: "No one has RSVP'd yet",
                    })}
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Interested */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Star className="h-5 w-5 text-yellow-500" />
                  {t("events.interested", { defaultValue: "Interested" })} (
                  {interestedRSVPs.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {interestedRSVPs.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {interestedRSVPs.map((rsvp) => (
                      <div
                        key={rsvp.id}
                        className="flex items-center gap-2 bg-muted rounded-full px-3 py-1.5 cursor-pointer hover:bg-muted/80"
                        onClick={() =>
                          navigate(`/${rsvp.profile?.username}`)
                        }
                      >
                        <Avatar className="h-6 w-6">
                          <AvatarImage
                            src={rsvp.profile?.avatar_url || undefined}
                          />
                          <AvatarFallback className="text-xs">
                            {rsvp.profile?.display_name?.[0] || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">
                          {rsvp.profile?.display_name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-sm">
                    {t("events.noOneInterested", {
                      defaultValue: "No one is interested yet",
                    })}
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <InviteToEventDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        eventId={event.id}
      />

      <ShareEventDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        event={event}
      />
    </MainLayout>
  );
};

export default EventDetail;
