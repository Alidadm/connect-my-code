import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MarketplaceListing } from "@/hooks/useMarketplace";
import { Loader2, DollarSign } from "lucide-react";

interface ContactSellerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: MarketplaceListing;
}

const QUICK_MESSAGES = [
  "Is this still available?",
  "What's the lowest price you'd accept?",
  "Can you deliver?",
  "When can I pick this up?",
];

export const ContactSellerDialog = ({
  open,
  onOpenChange,
  listing,
}: ContactSellerDialogProps) => {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const [isOffer, setIsOffer] = useState(false);
  const [offerAmount, setOfferAmount] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleQuickMessage = (msg: string) => {
    setMessage(msg);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !message.trim()) return;

    setIsSending(true);

    try {
      const { error } = await supabase.from("marketplace_messages").insert({
        listing_id: listing.id,
        sender_id: user.id,
        receiver_id: listing.user_id,
        content: message.trim(),
        is_offer: isOffer,
        offer_amount: isOffer && offerAmount ? parseFloat(offerAmount) : null,
      });

      if (error) throw error;

      toast.success("Message sent to seller!");
      setMessage("");
      setIsOffer(false);
      setOfferAmount("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Contact Seller</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
          <img
            src={listing.images?.[0] || "/placeholder.svg"}
            alt={listing.title}
            className="w-16 h-16 rounded-md object-cover"
          />
          <div className="min-w-0 flex-1">
            <p className="font-medium truncate">{listing.title}</p>
            <p className="text-sm text-muted-foreground">
              {listing.price === 0
                ? "Free"
                : new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: listing.currency,
                  }).format(listing.price)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8">
            <AvatarImage src={listing.seller?.avatar_url || ""} />
            <AvatarFallback>
              {listing.seller?.display_name?.[0] || "?"}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">
            Messaging {listing.seller?.display_name || "Seller"}
          </span>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Quick replies */}
          <div className="flex flex-wrap gap-2">
            {QUICK_MESSAGES.map((msg) => (
              <Button
                key={msg}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleQuickMessage(msg)}
              >
                {msg}
              </Button>
            ))}
          </div>

          {/* Message input */}
          <div className="space-y-2">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message..."
              rows={3}
            />
          </div>

          {/* Make an offer */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant={isOffer ? "default" : "outline"}
                size="sm"
                onClick={() => setIsOffer(!isOffer)}
              >
                <DollarSign className="h-4 w-4 mr-1" />
                Make an Offer
              </Button>
            </div>
            {isOffer && (
              <div className="flex items-center gap-2">
                <Label htmlFor="offer">Your offer:</Label>
                <Input
                  id="offer"
                  type="number"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-32"
                  min="0"
                  step="0.01"
                />
              </div>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isSending || !message.trim()}
          >
            {isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              "Send Message"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
