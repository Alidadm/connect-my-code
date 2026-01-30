import { useState } from "react";
import { useMarketplaceMessages, Conversation } from "@/hooks/useMarketplaceMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { 
  MessageSquare, 
  DollarSign, 
  Search, 
  Inbox, 
  ArrowRight,
  Package 
} from "lucide-react";
import { Link } from "react-router-dom";
import { ConversationThread } from "./ConversationThread";

export const MarketplaceInbox = () => {
  const { conversations, isLoading, unreadCount } = useMarketplaceMessages();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const filteredConversations = conversations.filter((convo) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      convo.listing?.title?.toLowerCase().includes(query) ||
      convo.other_user?.display_name?.toLowerCase().includes(query)
    );
  });

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
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-64" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            Messages
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {conversations.length} conversation{conversations.length !== 1 ? "s" : ""}
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount} unread
              </Badge>
            )}
          </p>
        </div>
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search messages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-11 bg-muted/50 border-0"
          />
        </div>
      </div>

      {/* Conversations list */}
      {filteredConversations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-muted/50 rounded-full p-5 mb-4">
            <Inbox className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg">
            {searchQuery ? "No results found" : "No messages yet"}
          </h3>
          <p className="text-muted-foreground mt-1 max-w-sm">
            {searchQuery 
              ? "Try a different search term"
              : "When you message sellers about their listings, your conversations will appear here."
            }
          </p>
          {!searchQuery && (
            <Link to="/marketplace">
              <Button className="mt-6 gap-2">
                Browse Listings
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <ScrollArea className="h-[calc(100vh-14rem)]">
          <div className="space-y-2 pr-4">
            {filteredConversations.map((conversation) => (
              <ConversationCard
                key={`${conversation.listing_id}-${conversation.other_user_id}`}
                conversation={conversation}
                onClick={() => setSelectedConversation(conversation)}
              />
            ))}
          </div>
        </ScrollArea>
      )}
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
        "w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all",
        "hover:bg-muted/70 active:scale-[0.99]",
        hasUnread ? "bg-primary/5 hover:bg-primary/10" : "bg-muted/40"
      )}
    >
      {/* Listing thumbnail */}
      <div className="relative flex-shrink-0">
        <img
          src={listing.images?.[0] || "/placeholder.svg"}
          alt={listing.title}
          className="w-16 h-16 rounded-lg object-cover"
        />
        <Avatar className="absolute -bottom-1 -right-1 h-7 w-7 border-2 border-background">
          <AvatarImage src={other_user.avatar_url || undefined} />
          <AvatarFallback className="text-xs bg-muted">
            {other_user.display_name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={cn(
              "font-medium truncate",
              hasUnread && "text-foreground"
            )}>
              {other_user.display_name || "Unknown User"}
            </p>
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <Package className="h-3 w-3" />
              {listing.title} • {formatPrice(listing.price, listing.currency)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(last_message.created_at), {
                addSuffix: false,
              })}
            </span>
            {hasUnread && (
              <Badge className="h-5 min-w-[20px] px-1.5 text-xs">
                {unread_count}
              </Badge>
            )}
          </div>
        </div>

        {/* Last message preview */}
        <p className={cn(
          "text-sm truncate",
          hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
        )}>
          {last_message.is_offer && (
            <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 mr-1">
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
