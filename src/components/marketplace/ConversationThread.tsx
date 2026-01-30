import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useConversationThread } from "@/hooks/useMarketplaceMessages";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, isToday, isYesterday, isSameDay } from "date-fns";
import { ArrowLeft, Send, DollarSign, Loader2, ExternalLink } from "lucide-react";
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

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    return format(date, "h:mm a");
  };

  const formatDateDivider = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "EEEE, MMMM d");
  };

  const shouldShowDateDivider = (currentMsg: any, prevMsg: any) => {
    if (!prevMsg) return true;
    return !isSameDay(new Date(currentMsg.created_at), new Date(prevMsg.created_at));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col h-[calc(100vh-10rem)] bg-background rounded-xl border">
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
    <div className="flex flex-col h-[calc(100vh-10rem)] bg-background rounded-xl border overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b bg-card/50 backdrop-blur-sm">
        <Button variant="ghost" size="icon" onClick={onBack} className="flex-shrink-0">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10 ring-2 ring-background">
          <AvatarImage src={otherUser?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {otherUser?.display_name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">{otherUser?.display_name || "User"}</p>
          {otherUser?.username && (
            <Link
              to={`/${otherUser.username}`}
              className="text-xs text-primary hover:underline inline-flex items-center gap-1"
            >
              View Profile
              <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>

      {/* Listing preview */}
      {listing && (
        <Link
          to={`/marketplace/${listing.id}`}
          className="flex items-center gap-3 p-3 border-b bg-muted/30 hover:bg-muted/50 transition-colors"
        >
          <img
            src={listing.images?.[0] || "/placeholder.svg"}
            alt={listing.title}
            className="w-14 h-14 rounded-lg object-cover"
          />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{listing.title}</p>
            <p className="text-sm font-semibold text-primary">
              {formatPrice(listing.price, listing.currency)}
            </p>
          </div>
          {listing.status !== "active" && (
            <Badge variant="secondary" className="capitalize">{listing.status}</Badge>
          )}
        </Link>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {messages.map((message, index) => {
            const isOwn = message.sender_id === user?.id;
            const prevMessage = messages[index - 1];
            const showDivider = shouldShowDateDivider(message, prevMessage);

            return (
              <div key={message.id}>
                {showDivider && (
                  <div className="flex items-center justify-center my-4">
                    <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
                      {formatDateDivider(message.created_at)}
                    </span>
                  </div>
                )}
                <div className={cn("flex", isOwn ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[80%] sm:max-w-[70%] space-y-1",
                      isOwn ? "items-end" : "items-start"
                    )}
                  >
                    {/* Offer badge */}
                    {message.is_offer && message.offer_amount && (
                      <div className={cn(
                        "inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full mb-1",
                        isOwn 
                          ? "bg-primary/20 text-primary ml-auto" 
                          : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      )}>
                        <DollarSign className="h-3.5 w-3.5" />
                        Offer: {formatPrice(message.offer_amount, listing?.currency || "USD")}
                      </div>
                    )}
                    
                    {/* Message bubble */}
                    <div
                      className={cn(
                        "rounded-2xl px-4 py-2.5",
                        isOwn
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                      )}
                    >
                      <p className="text-sm whitespace-pre-wrap break-words leading-relaxed">
                        {message.content}
                      </p>
                    </div>
                    
                    {/* Timestamp */}
                    <p className={cn(
                      "text-[10px] px-1",
                      isOwn ? "text-right text-muted-foreground" : "text-muted-foreground"
                    )}>
                      {formatMessageTime(message.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input area */}
      <div className="p-4 border-t bg-card/50 backdrop-blur-sm space-y-3">
        {showOfferInput && (
          <div className="flex items-center gap-2 p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
            <DollarSign className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Your offer:
            </span>
            <Input
              type="number"
              value={offerAmount}
              onChange={(e) => setOfferAmount(e.target.value)}
              placeholder="0.00"
              className="w-28 h-9 bg-background"
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
              className="ml-auto"
            >
              Cancel
            </Button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Button
            variant={showOfferInput ? "default" : "outline"}
            size="icon"
            className={cn(
              "flex-shrink-0 h-11 w-11 rounded-full",
              showOfferInput && "bg-emerald-600 hover:bg-emerald-700"
            )}
            onClick={() => setShowOfferInput(!showOfferInput)}
          >
            <DollarSign className="h-5 w-5" />
          </Button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 h-11 rounded-full bg-muted border-0 px-4"
            disabled={isSending}
          />
          <Button
            size="icon"
            className="flex-shrink-0 h-11 w-11 rounded-full"
            onClick={handleSend}
            disabled={isSending || !newMessage.trim()}
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};
