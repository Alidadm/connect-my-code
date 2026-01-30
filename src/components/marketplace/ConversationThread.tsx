import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConversationThread } from "@/hooks/useMarketplaceMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { ArrowLeft, Send, DollarSign, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";

interface ConversationThreadProps {
  listingId: string;
  otherUserId: string;
  onBack: () => void;
}

export const ConversationThread = ({ listingId, otherUserId, onBack }: ConversationThreadProps) => {
  const { user } = useAuth();
  const { messages, listing, otherUser, isLoading, isSending, sendMessage } = useConversationThread(
    listingId,
    otherUserId
  );
  const [newMessage, setNewMessage] = useState("");
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const success = await sendMessage(
      newMessage,
      showOfferInput && !!offerAmount,
      showOfferInput ? parseFloat(offerAmount) : undefined
    );

    if (success) {
      setNewMessage("");
      setOfferAmount("");
      setShowOfferInput(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatPrice = (price: number, currency: string) => {
    if (price === 0) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatMessageDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) {
      return format(date, "h:mm a");
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, "h:mm a")}`;
    }
    return format(date, "MMM d, h:mm a");
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[600px]">
        <div className="flex items-center gap-3 p-4 border-b">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
        <div className="flex-1 p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-3/4" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[600px] border rounded-lg overflow-hidden bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={otherUser?.avatar_url || undefined} />
          <AvatarFallback>{otherUser?.display_name?.[0] || "?"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{otherUser?.display_name || "User"}</p>
          {otherUser?.username && (
            <Link
              to={`/${otherUser.username}`}
              className="text-xs text-primary hover:underline"
            >
              View Profile
            </Link>
          )}
        </div>
      </div>

      {/* Listing preview */}
      {listing && (
        <Link
          to={`/marketplace/${listing.id}`}
          className="flex items-center gap-3 p-3 border-b bg-muted/50 hover:bg-muted transition-colors"
        >
          <img
            src={listing.images?.[0] || "/placeholder.svg"}
            alt={listing.title}
            className="w-12 h-12 rounded-md object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{listing.title}</p>
            <p className="text-sm text-muted-foreground">
              {formatPrice(listing.price, listing.currency)}
            </p>
          </div>
          {listing.status !== "active" && (
            <Badge variant="secondary">{listing.status}</Badge>
          )}
        </Link>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((message) => {
          const isOwn = message.sender_id === user?.id;
          return (
            <div
              key={message.id}
              className={cn("flex", isOwn ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[75%] rounded-2xl px-4 py-2 space-y-1",
                  isOwn
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-muted rounded-bl-md"
                )}
              >
                {message.is_offer && message.offer_amount && (
                  <div className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    isOwn ? "text-primary-foreground/80" : "text-emerald-600 dark:text-emerald-500"
                  )}>
                    <DollarSign className="h-3 w-3" />
                    Offer: {formatPrice(message.offer_amount, listing?.currency || "USD")}
                  </div>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                <p className={cn(
                  "text-xs",
                  isOwn ? "text-primary-foreground/60" : "text-muted-foreground"
                )}>
                  {formatMessageDate(message.created_at)}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="p-3 border-t bg-card space-y-2">
        {showOfferInput && (
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg">
            <DollarSign className="h-4 w-4 text-emerald-600 dark:text-emerald-500" />
            <span className="text-sm text-muted-foreground">Your offer:</span>
            <Input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="0.00"
              className="w-28 h-8"
              min="0"
              step="0.01"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowOfferInput(false);
                setOfferAmount("");
              }}
            >
              Cancel
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant={showOfferInput ? "default" : "outline"}
            size="icon"
            className="flex-shrink-0"
            onClick={() => setShowOfferInput(!showOfferInput)}
          >
            <DollarSign className="h-4 w-4" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1"
            disabled={isSending}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={isSending || !newMessage.trim()}
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
