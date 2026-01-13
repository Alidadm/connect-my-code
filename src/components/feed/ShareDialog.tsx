import { useState } from "react";
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
  Check, 
  Facebook, 
  Twitter, 
  Linkedin,
  Mail,
  MessageCircle
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId: string;
  postContent?: string | null;
  onShareComplete?: () => void;
}

export const ShareDialog = ({ 
  open, 
  onOpenChange, 
  postId, 
  postContent,
  onShareComplete 
}: ShareDialogProps) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  
  const postUrl = `${window.location.origin}/post/${postId}`;
  const shareText = postContent?.slice(0, 100) || t("feed.checkOutPost", "Check out this post!");

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      toast.success(t("feed.linkCopied", "Link copied to clipboard!"));
      setTimeout(() => setCopied(false), 2000);
      await incrementShareCount();
    } catch (err) {
      toast.error(t("feed.copyFailed", "Failed to copy link"));
    }
  };

  const incrementShareCount = async () => {
    try {
      // First get current share count, then increment
      const { data } = await supabase
        .from("posts")
        .select("shares_count")
        .eq("id", postId)
        .single();
      
      await supabase
        .from("posts")
        .update({ shares_count: (data?.shares_count || 0) + 1 })
        .eq("id", postId);
      
      onShareComplete?.();
    } catch (error) {
      console.error("Failed to increment share count:", error);
    }
  };

  const shareToSocial = async (platform: string) => {
    let url = "";
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(shareText);

    switch (platform) {
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedText}`;
        break;
      case "linkedin":
        url = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
        break;
      case "whatsapp":
        url = `https://wa.me/?text=${encodedText}%20${encodedUrl}`;
        break;
      case "email":
        url = `mailto:?subject=${encodedText}&body=${encodedUrl}`;
        break;
    }

    if (url) {
      window.open(url, "_blank", "width=600,height=400");
      await incrementShareCount();
      onOpenChange(false);
    }
  };

  const socialButtons = [
    { id: "facebook", icon: Facebook, label: "Facebook", color: "bg-[#1877F2] hover:bg-[#166FE5]" },
    { id: "twitter", icon: Twitter, label: "X / Twitter", color: "bg-[#1DA1F2] hover:bg-[#1A91DA]" },
    { id: "linkedin", icon: Linkedin, label: "LinkedIn", color: "bg-[#0A66C2] hover:bg-[#095196]" },
    { id: "whatsapp", icon: MessageCircle, label: "WhatsApp", color: "bg-[#25D366] hover:bg-[#20BD5A]" },
    { id: "email", icon: Mail, label: "Email", color: "bg-muted hover:bg-muted/80" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("feed.sharePost", "Share Post")}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Copy Link */}
          <div className="flex items-center gap-2">
            <Input
              value={postUrl}
              readOnly
              className="flex-1 text-sm"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={handleCopy}
              className="flex-shrink-0"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>

          {/* Social Share Buttons */}
          <div className="grid grid-cols-5 gap-2">
            {socialButtons.map((social) => (
              <Button
                key={social.id}
                variant="ghost"
                className={`flex flex-col items-center gap-1 h-auto py-3 ${social.color} text-white`}
                onClick={() => shareToSocial(social.id)}
              >
                <social.icon className="h-5 w-5" />
                <span className="text-xs">{social.label}</span>
              </Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
