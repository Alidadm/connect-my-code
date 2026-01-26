import { useTranslation } from "react-i18next";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Copy,
  Facebook,
  Twitter,
  Linkedin,
  Mail,
  Share2,
  Check,
} from "lucide-react";
import { toast } from "sonner";
import { Event } from "@/hooks/useEvents";
import { useState } from "react";

interface ShareEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: Event;
}

export const ShareEventDialog = ({
  open,
  onOpenChange,
  event,
}: ShareEventDialogProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const eventUrl = `${window.location.origin}/events/${event.id}`;
  const shareText = `${event.title} - ${format(new Date(event.start_date), "PPP")}`;

  const handleCopy = async () => {
    await navigator.clipboard.writeText(eventUrl);
    setCopied(true);
    toast.success(t("events.linkCopied", { defaultValue: "Link copied!" }));
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLinks = [
    {
      name: "Facebook",
      icon: Facebook,
      color: "#1877f2",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(eventUrl)}`,
    },
    {
      name: "Twitter",
      icon: Twitter,
      color: "#1da1f2",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(eventUrl)}`,
    },
    {
      name: "LinkedIn",
      icon: Linkedin,
      color: "#0a66c2",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(eventUrl)}`,
    },
    {
      name: "Email",
      icon: Mail,
      color: "#ea4335",
      url: `mailto:?subject=${encodeURIComponent(event.title)}&body=${encodeURIComponent(`Check out this event: ${eventUrl}`)}`,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            {t("events.shareEvent", { defaultValue: "Share Event" })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Event preview */}
          <div className="p-3 bg-muted rounded-lg">
            <h3 className="font-medium text-sm">{event.title}</h3>
            <p className="text-xs text-muted-foreground">
              {format(new Date(event.start_date), "EEEE, MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>

          {/* Copy link */}
          <div className="flex gap-2">
            <Input value={eventUrl} readOnly className="text-sm" />
            <Button variant="outline" size="icon" onClick={handleCopy}>
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Social share buttons */}
          <div className="grid grid-cols-4 gap-2">
            {shareLinks.map((platform) => (
              <Button
                key={platform.name}
                variant="outline"
                className="flex flex-col gap-1 h-auto py-3"
                onClick={() => window.open(platform.url, "_blank")}
              >
                <platform.icon
                  className="h-5 w-5"
                  style={{ color: platform.color }}
                />
                <span className="text-xs">{platform.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
