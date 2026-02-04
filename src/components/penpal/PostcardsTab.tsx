import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Inbox } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { type VirtualPostcard, POSTCARD_TEMPLATES } from "@/hooks/useVirtualPostcards";

interface PostcardsTabProps {
  receivedPostcards: VirtualPostcard[];
  sentPostcards: VirtualPostcard[];
  loading: boolean;
  onMarkAsRead: (postcardId: string) => void;
}

export const PostcardsTab = ({
  receivedPostcards,
  sentPostcards,
  loading,
  onMarkAsRead,
}: PostcardsTabProps) => {
  const { t } = useTranslation();

  const getTemplate = (templateId: string) => {
    return POSTCARD_TEMPLATES.find((t) => t.id === templateId) || POSTCARD_TEMPLATES[0];
  };

  const getDisplayName = (profile?: VirtualPostcard["sender_profile"]) => {
    if (!profile) return "Unknown";
    if (profile.display_name) return profile.display_name;
    return profile.username || "Anonymous";
  };

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const PostcardCard = ({ 
    postcard, 
    showSender = false 
  }: { 
    postcard: VirtualPostcard; 
    showSender?: boolean;
  }) => {
    const template = getTemplate(postcard.template);
    
    return (
      <Card 
        className={cn(
          "overflow-hidden cursor-pointer transition-all hover:shadow-lg",
          !postcard.is_read && showSender && "ring-2 ring-primary"
        )}
        onClick={() => {
          if (!postcard.is_read && showSender) {
            onMarkAsRead(postcard.id);
          }
        }}
      >
        <div className={cn("p-4 bg-gradient-to-br min-h-[100px] flex flex-col items-center justify-center", template.gradient)}>
          <span className="text-3xl mb-2">{template.emoji}</span>
          {postcard.message && (
            <p className="text-xs text-gray-700 text-center line-clamp-2">
              {postcard.message}
            </p>
          )}
        </div>
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            {showSender && postcard.sender_profile ? (
              <>
                <Link to={`/${postcard.sender_profile.username || postcard.sender_id}`}>
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={postcard.sender_profile.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">
                      {getDisplayName(postcard.sender_profile).charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {getDisplayName(postcard.sender_profile)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {format(new Date(postcard.created_at), "MMM d")}
                  </p>
                </div>
                {!postcard.is_read && (
                  <Badge variant="default" className="text-[10px] px-1.5 py-0">
                    New
                  </Badge>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {format(new Date(postcard.created_at), "MMM d, yyyy")}
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Tabs defaultValue="received" className="w-full">
      <TabsList className="grid w-full max-w-xs grid-cols-2 mb-4">
        <TabsTrigger value="received" className="gap-2">
          <Inbox className="h-4 w-4" />
          {t("penpal.received", "Received")}
          {receivedPostcards.filter((p) => !p.is_read).length > 0 && (
            <Badge variant="destructive" className="ml-1 h-4 min-w-[16px] px-1 text-[10px]">
              {receivedPostcards.filter((p) => !p.is_read).length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="sent" className="gap-2">
          <Send className="h-4 w-4" />
          {t("penpal.sent", "Sent")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="received">
        {receivedPostcards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Mail className="h-16 w-16 text-muted-foreground" />
            <h3 className="text-lg font-medium">
              {t("penpal.noPostcardsReceived", "No postcards yet")}
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {t("penpal.noPostcardsReceivedDesc", "When your pen pals send you postcards, they'll appear here.")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {receivedPostcards.map((postcard) => (
              <PostcardCard key={postcard.id} postcard={postcard} showSender />
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="sent">
        {sentPostcards.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 space-y-4">
            <Send className="h-16 w-16 text-muted-foreground" />
            <h3 className="text-lg font-medium">
              {t("penpal.noPostcardsSent", "No postcards sent")}
            </h3>
            <p className="text-muted-foreground text-center max-w-md">
              {t("penpal.noPostcardsSentDesc", "Send a postcard to your pen pals from their profile!")}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {sentPostcards.map((postcard) => (
              <PostcardCard key={postcard.id} postcard={postcard} />
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};
