import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, X, Loader2, Clock, Inbox } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { type PenPalRequest } from "@/hooks/usePenPalRequests";

interface PenPalRequestsTabProps {
  incomingRequests: PenPalRequest[];
  outgoingRequests: PenPalRequest[];
  loading: boolean;
  processing: string | null;
  onAccept: (requestId: string) => Promise<boolean>;
  onDecline: (requestId: string) => Promise<boolean>;
  onCancel: (requestId: string) => Promise<boolean>;
}

export const PenPalRequestsTab = ({
  incomingRequests,
  outgoingRequests,
  loading,
  processing,
  onAccept,
  onDecline,
  onCancel,
}: PenPalRequestsTabProps) => {
  const { t } = useTranslation();

  const getDisplayName = (profile?: PenPalRequest["sender_profile"]) => {
    if (!profile) return "Unknown";
    if (profile.display_name) return profile.display_name;
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    return profile.username || "Anonymous";
  };

  const getInitials = (profile?: PenPalRequest["sender_profile"]) => {
    const name = getDisplayName(profile);
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const pendingOutgoing = outgoingRequests.filter((r) => r.status === "pending");

  if (incomingRequests.length === 0 && pendingOutgoing.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-4">
        <Inbox className="h-16 w-16 text-muted-foreground" />
        <h3 className="text-lg font-medium">
          {t("penpal.noRequests", "No pending requests")}
        </h3>
        <p className="text-muted-foreground text-center max-w-md">
          {t("penpal.noRequestsDesc", "When someone sends you a connection request, it will appear here.")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Incoming Requests */}
      {incomingRequests.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
            <Inbox className="h-4 w-4" />
            {t("penpal.incomingRequests", "Incoming Requests")} ({incomingRequests.length})
          </h3>
          <div className="space-y-3">
            {incomingRequests.map((request) => (
              <Card key={request.id} className="border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Link to={`/${request.sender_profile?.username || request.sender_id}`}>
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={request.sender_profile?.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(request.sender_profile)}</AvatarFallback>
                      </Avatar>
                    </Link>
                    <div className="flex-1 min-w-0">
                      <Link 
                        to={`/${request.sender_profile?.username || request.sender_id}`}
                        className="font-medium hover:underline"
                      >
                        {getDisplayName(request.sender_profile)}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), "MMM d, yyyy")}
                      </p>
                      {request.message && (
                        <p className="text-sm mt-2 text-muted-foreground">
                          "{request.message}"
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => onAccept(request.id)}
                        disabled={processing === request.id}
                        className="gap-1"
                      >
                        {processing === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        {t("common.accept", "Accept")}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onDecline(request.id)}
                        disabled={processing === request.id}
                        className="gap-1"
                      >
                        <X className="h-4 w-4" />
                        {t("common.decline", "Decline")}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Pending Outgoing Requests */}
      {pendingOutgoing.length > 0 && (
        <div className="space-y-3">
          <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {t("penpal.pendingSent", "Pending Sent")} ({pendingOutgoing.length})
          </h3>
          <div className="space-y-3">
            {pendingOutgoing.map((request) => (
              <Card key={request.id} className="bg-muted/30">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Clock className="h-3 w-3" />
                        {t("penpal.awaitingResponse", "Awaiting response")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(request.created_at), "MMM d, yyyy")}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onCancel(request.id)}
                      disabled={processing === request.id}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      {processing === request.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <X className="h-4 w-4 mr-1" />
                          {t("common.cancel", "Cancel")}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
