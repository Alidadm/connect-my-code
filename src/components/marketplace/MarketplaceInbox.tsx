import { useState } from "react";
import { useMarketplaceMessages, Conversation } from "@/hooks/useMarketplaceMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, DollarSign, ArrowLeft } from "lucide-react";
import { ConversationThread } from "./ConversationThread";

export const MarketplaceInbox = () => {
  const { conversations, isLoading, unreadCount } = useMarketplaceMessages();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);

  if (selectedConversation) {
    return (
      <ConversationThread
        listingId={selectedConversation.listing_id}
        otherUserId={selectedConversation.other_user_id}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <MessageSquare className="h-5 w-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Inbox</h2>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3 p-4 border rounded-lg">
            <Skeleton className="h-12 w-12 rounded-md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold mb-1">No messages yet</h2>
        <p className="text-muted-foreground">
          When you contact sellers or buyers message you, conversations will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <MessageSquare className="h-5 w-5 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Inbox</h2>
        {unreadCount > 0 && (
          <Badge variant="destructive" className="ml-2">
            {unreadCount} unread
          </Badge>
        )}
      </div>

      {conversations.map((conversation) => (
        <ConversationCard
          key={`${conversation.listing_id}-${conversation.other_user_id}`}
          conversation={conversation}
          onClick={() => setSelectedConversation(conversation)}
        />
      ))}
    </div>
  );
};

interface ConversationCardProps {
  conversation: Conversation;
  onClick: () => void;
}

const ConversationCard = ({ conversation, onClick }: ConversationCardProps) => {
  const { listing, other_user, last_message, unread_count } = conversation;
  const hasUnread = unread_count > 0;

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-start gap-3 p-4 rounded-lg border transition-colors text-left",
        "hover:bg-accent hover:border-accent",
        hasUnread && "bg-primary/5 border-primary/20"
      )}
    >
      {/* Listing image */}
      <div className="relative">
        <img
          src={listing.images?.[0] || "/placeholder.svg"}
          alt={listing.title}
          className="w-14 h-14 rounded-md object-cover"
        />
        <Avatar className="absolute -bottom-1 -right-1 h-6 w-6 border-2 border-background">
          <AvatarImage src={other_user.avatar_url || undefined} />
          <AvatarFallback className="text-xs">
            {other_user.display_name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn("font-medium truncate", hasUnread && "text-primary")}>
              {other_user.display_name || "User"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {listing.title} • {formatPrice(listing.price, listing.currency)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(last_message.created_at), { addSuffix: true })}
            </span>
            {hasUnread && (
              <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                {unread_count}
              </Badge>
            )}
          </div>
        </div>
        <p className={cn(
          "text-sm mt-1 line-clamp-1",
          hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
        )}>
          {last_message.is_offer && (
            <span className="inline-flex items-center gap-1 text-green-600 mr-1">
              <DollarSign className="h-3 w-3" />
              Offer:
            </span>
          )}
          {last_message.content}
        </p>
      </div>
    </button>
  );
};
