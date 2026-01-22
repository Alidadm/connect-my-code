import { useState } from "react";
import { MessageCircle, ArrowLeft, Send, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDirectMessages, useConversationMessages, Conversation } from "@/hooks/useDirectMessages";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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

interface ChatViewProps {
  conversation: Conversation;
  onBack: () => void;
}

const ChatView = ({ conversation, onBack }: ChatViewProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const { messages, isLoading } = useConversationMessages(conversation.other_user_id);
  const { sendMessage, markAsRead } = useDirectMessages();

  // Mark messages as read when viewing
  useState(() => {
    if (conversation.unread_count > 0) {
      markAsRead(conversation.other_user_id);
    }
  });

  const handleSend = async () => {
    if (!message.trim()) return;

    try {
      await sendMessage.mutateAsync({
        receiverId: conversation.other_user_id,
        content: message.trim(),
      });
      setMessage("");
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
          <p className="text-xs text-muted-foreground">@{conversation.other_user.username}</p>
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
                      isOwn
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
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
            disabled={!message.trim() || sendMessage.isPending}
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
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const { conversations, loadingConversations, totalUnreadCount } = useDirectMessages();

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
    }
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
            onBack={() => setSelectedConversation(null)}
          />
        ) : (
          <>
            <SheetHeader className="p-4 border-b">
              <SheetTitle>{t("messages.title", { defaultValue: "Messages" })}</SheetTitle>
            </SheetHeader>
            <ConversationList
              conversations={conversations}
              onSelect={setSelectedConversation}
              loading={loadingConversations}
            />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
