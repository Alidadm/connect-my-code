import { useState, useRef, useEffect } from "react";
import { MessageCircle, ArrowLeft, Send, Loader2, Store, Users, Check, CheckCheck, Image as ImageIcon, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useDirectMessages, useConversationMessages, useTypingIndicator, Conversation } from "@/hooks/useDirectMessages";
import { useMarketplaceMessages, useConversationThread, Conversation as MarketplaceConversation } from "@/hooks/useMarketplaceMessages";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface ConversationListProps {
  conversations: Conversation[];
  onSelect: (conv: Conversation) => void;
  loading: boolean;
}

const ConversationList = ({ conversations, onSelect, loading }: ConversationListProps) => {
  const { t } = useTranslation();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <MessageCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {t("messages.noConversations", { defaultValue: "No messages yet" })}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("messages.startConversation", { defaultValue: "Start a conversation with a friend!" })}
        </p>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {conversations.map((conv) => (
          <button
            key={conv.other_user_id}
            onClick={() => onSelect(conv)}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
          >
            <Avatar className="h-12 w-12">
              <AvatarImage src={conv.other_user.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {conv.other_user.display_name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium truncate">
                  {conv.other_user.display_name || conv.other_user.username}
                </span>
                {conv.unread_count > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5">
                    {conv.unread_count}
                  </Badge>
                )}
              </div>
              {conv.last_message && (
                <p className="text-sm text-muted-foreground truncate">
                  {conv.last_message.content}
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};

interface MarketplaceConversationListProps {
  conversations: MarketplaceConversation[];
  onSelect: (conv: MarketplaceConversation) => void;
  loading: boolean;
}

const MarketplaceConversationList = ({ conversations, onSelect, loading }: MarketplaceConversationListProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center px-4">
        <Store className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">
          {t("marketplace.noMessages", { defaultValue: "No marketplace messages" })}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {t("marketplace.startBuying", { defaultValue: "Browse listings and message sellers!" })}
        </p>
        <Button 
          variant="outline" 
          size="sm" 
          className="mt-4"
          onClick={() => navigate("/marketplace")}
        >
          <Store className="h-4 w-4 mr-2" />
          {t("marketplace.browse", { defaultValue: "Browse Marketplace" })}
        </Button>
      </div>
    );
  }

  return (
    <ScrollArea className="flex-1">
      <div className="space-y-1 p-2">
        {conversations.map((conv) => (
          <button
            key={`${conv.listing_id}-${conv.other_user_id}`}
            onClick={() => onSelect(conv)}
            className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent transition-colors text-left"
          >
            {/* Listing image */}
            <div className="relative">
              <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden">
                {conv.listing.images?.[0] ? (
                  <img
                    src={conv.listing.images[0]}
                    alt={conv.listing.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Store className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>
              {/* User avatar overlay */}
              <Avatar className="h-6 w-6 absolute -bottom-1 -right-1 border-2 border-background">
                <AvatarImage src={conv.other_user.avatar_url || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {conv.other_user.display_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-medium truncate text-sm">
                  {conv.listing.title}
                </span>
                {conv.unread_count > 0 && (
                  <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5">
                    {conv.unread_count}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">
                {conv.other_user.display_name || conv.other_user.username}
              </p>
              {conv.last_message && (
                <p className="text-sm text-muted-foreground truncate mt-0.5">
                  {conv.last_message.is_offer 
                    ? `💰 Offer: ${conv.listing.currency} ${conv.last_message.offer_amount}`
                    : conv.last_message.content
                  }
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </ScrollArea>
  );
};

interface ChatViewProps {
  conversation: Conversation;
  onBack: () => void;
}

const ChatView = ({ conversation, onBack }: ChatViewProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { messages, isLoading } = useConversationMessages(conversation.other_user_id);
  const { sendMessage, markAsRead } = useDirectMessages();
  const { isOtherTyping, setTyping } = useTypingIndicator(conversation.other_user_id);

  // Mark messages as read when viewing
  useEffect(() => {
    if (conversation.unread_count > 0) {
      markAsRead(conversation.other_user_id);
    }
  }, [conversation.other_user_id, conversation.unread_count, markAsRead]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOtherTyping]);

  const handleTyping = () => {
    setTyping(true);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => setTyping(false), 2000);
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("post-media")
        .getPublicUrl(path);

      setImagePreview(urlData.publicUrl);
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !imagePreview) return;

    try {
      await sendMessage.mutateAsync({
        receiverId: conversation.other_user_id,
        content: message.trim() || (imagePreview ? "📷 Image" : ""),
        imageUrl: imagePreview || undefined,
      });
      setMessage("");
      setImagePreview(null);
      setTyping(false);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <Avatar className="h-10 w-10">
          <AvatarImage src={conversation.other_user.avatar_url || ""} />
          <AvatarFallback className="bg-primary text-primary-foreground">
            {conversation.other_user.display_name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">
            {conversation.other_user.display_name || conversation.other_user.username}
          </p>
          <p className="text-xs text-muted-foreground">
            {isOtherTyping ? (
              <span className="text-primary animate-pulse">typing...</span>
            ) : (
              `@${conversation.other_user.username}`
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("messages.startChat", { defaultValue: "Start the conversation!" })}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg, idx) => {
              const isOwn = msg.sender_id === user?.id;
              const isLastOwnInGroup =
                isOwn &&
                (idx === messages.length - 1 || messages[idx + 1]?.sender_id !== user?.id);
              return (
                <div
                  key={msg.id}
                  className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2",
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    {/* Image */}
                    {msg.image_url && (
                      <img
                        src={msg.image_url}
                        alt="Shared image"
                        className="rounded-lg max-w-full mb-1 cursor-pointer"
                        onClick={() => window.open(msg.image_url!, "_blank")}
                      />
                    )}
                    {msg.content && msg.content !== "📷 Image" && (
                      <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                    <div className={cn(
                      "flex items-center gap-1 mt-1",
                      isOwn ? "justify-end" : ""
                    )}>
                      <span
                        className={cn(
                          "text-xs",
                          isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}
                      >
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </span>
                      {/* Read receipts */}
                      {isOwn && isLastOwnInGroup && (
                        msg.read_at ? (
                          <CheckCheck className="h-3.5 w-3.5 text-primary-foreground/70" />
                        ) : (
                          <Check className="h-3.5 w-3.5 text-primary-foreground/50" />
                        )
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            {/* Typing indicator bubble */}
            {isOtherTyping && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Image preview */}
      {imagePreview && (
        <div className="px-4 py-2 border-t">
          <div className="relative inline-block">
            <img src={imagePreview} alt="Preview" className="h-20 rounded-lg" />
            <Button
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={() => setImagePreview(null)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          <Button
            variant="ghost"
            size="icon"
            className="flex-shrink-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImageIcon className="h-4 w-4" />
            )}
          </Button>
          <Input
            value={message}
            onChange={(e) => {
              setMessage(e.target.value);
              handleTyping();
            }}
            onKeyPress={handleKeyPress}
            placeholder={t("messages.typePlaceholder", { defaultValue: "Type a message..." })}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={(!message.trim() && !imagePreview) || sendMessage.isPending}
            size="icon"
          >
            {sendMessage.isPending ? (
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

interface MarketplaceChatViewProps {
  conversation: MarketplaceConversation;
  onBack: () => void;
}

const MarketplaceChatView = ({ conversation, onBack }: MarketplaceChatViewProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const { messages, isLoading, isSending, sendMessage } = useConversationThread(
    conversation.listing_id,
    conversation.other_user_id
  );

  const handleSend = async () => {
    if (!message.trim()) return;
    const success = await sendMessage(message.trim());
    if (success) {
      setMessage("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div 
          className="flex items-center gap-3 flex-1 cursor-pointer hover:opacity-80"
          onClick={() => navigate(`/marketplace/${conversation.listing_id}`)}
        >
          <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden flex-shrink-0">
            {conversation.listing.images?.[0] ? (
              <img
                src={conversation.listing.images[0]}
                alt={conversation.listing.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Store className="h-4 w-4 text-muted-foreground" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{conversation.listing.title}</p>
            <p className="text-xs text-muted-foreground">
              {conversation.other_user.display_name || conversation.other_user.username}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {t("messages.startChat", { defaultValue: "Start the conversation!" })}
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isOwn = msg.sender_id === user?.id;
              return (
                <div
                  key={msg.id}
                  className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2",
                      msg.is_offer
                        ? "bg-emerald-100 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800"
                        : isOwn
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-muted rounded-bl-md"
                    )}
                  >
                    {msg.is_offer && (
                      <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mb-1">
                        💰 {t("marketplace.offer", { defaultValue: "Offer" })}: {conversation.listing.currency} {msg.offer_amount}
                      </p>
                    )}
                    <p className={cn(
                      "text-sm whitespace-pre-wrap break-words",
                      msg.is_offer ? "text-foreground" : ""
                    )}>{msg.content}</p>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        msg.is_offer 
                          ? "text-muted-foreground"
                          : isOwn 
                            ? "text-primary-foreground/70" 
                            : "text-muted-foreground"
                      )}
                    >
                      {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={t("messages.typePlaceholder", { defaultValue: "Type a message..." })}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isSending}
            size="icon"
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

interface MessagesSheetProps {
  children?: React.ReactNode;
  initialUserId?: string;
  initialUser?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
}

export const MessagesSheet = ({ children, initialUserId, initialUser }: MessagesSheetProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"direct" | "marketplace">("direct");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [selectedMarketplaceConversation, setSelectedMarketplaceConversation] = useState<MarketplaceConversation | null>(null);
  
  const { conversations, loadingConversations, totalUnreadCount: dmUnreadCount } = useDirectMessages();
  const { conversations: marketplaceConversations, isLoading: marketplaceLoading, unreadCount: marketplaceUnreadCount } = useMarketplaceMessages();
  
  const totalUnreadCount = dmUnreadCount + marketplaceUnreadCount;

  // If we have an initial user, set up the conversation view
  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && initialUserId && initialUser) {
      setSelectedConversation({
        other_user_id: initialUserId,
        other_user: initialUser,
        last_message: null,
        unread_count: 0,
      });
    } else if (!isOpen) {
      setSelectedConversation(null);
      setSelectedMarketplaceConversation(null);
    }
  };

  const handleBack = () => {
    setSelectedConversation(null);
    setSelectedMarketplaceConversation(null);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpen}>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="icon" className="relative">
            <MessageCircle className="h-5 w-5" />
            {totalUnreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1.5"
              >
                {totalUnreadCount}
              </Badge>
            )}
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md p-0 flex flex-col">
        {selectedConversation ? (
          <ChatView
            conversation={selectedConversation}
            onBack={handleBack}
          />
        ) : selectedMarketplaceConversation ? (
          <MarketplaceChatView
            conversation={selectedMarketplaceConversation}
            onBack={handleBack}
          />
        ) : (
          <>
            <SheetHeader className="p-4 border-b">
              <SheetTitle>{t("messages.title", { defaultValue: "Messages" })}</SheetTitle>
            </SheetHeader>
            
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "direct" | "marketplace")} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2 mx-4 mt-2" style={{ width: 'calc(100% - 2rem)' }}>
                <TabsTrigger value="direct" className="gap-2">
                  <Users className="h-4 w-4" />
                  {t("messages.direct", { defaultValue: "Friends" })}
                  {dmUnreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 ml-1">
                      {dmUnreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="marketplace" className="gap-2">
                  <Store className="h-4 w-4" />
                  {t("messages.marketplace", { defaultValue: "Marketplace" })}
                  {marketplaceUnreadCount > 0 && (
                    <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 ml-1">
                      {marketplaceUnreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="direct" className="flex-1 mt-0">
                <ConversationList
                  conversations={conversations}
                  onSelect={setSelectedConversation}
                  loading={loadingConversations}
                />
              </TabsContent>
              
              <TabsContent value="marketplace" className="flex-1 mt-0">
                <MarketplaceConversationList
                  conversations={marketplaceConversations}
                  onSelect={setSelectedMarketplaceConversation}
                  loading={marketplaceLoading}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};