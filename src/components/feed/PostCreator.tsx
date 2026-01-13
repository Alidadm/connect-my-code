import { Image, Paperclip, Radio, Hash, AtSign, Globe, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";

export const PostCreator = ({ onPostCreated }: { onPostCreated?: () => void }) => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  const handleOpenPostModal = async () => {
    if (!user) return;

    const { value: formValues } = await Swal.fire({
      title: t('feed.whatsOnYourMind', "What's on your mind?"),
      html: `
        <textarea 
          id="swal-post-content" 
          class="swal2-textarea" 
          placeholder="${t('feed.shareYourThoughts', 'Share your thoughts...')}"
          style="min-height: 120px; resize: vertical;"
        ></textarea>
        <div style="margin-top: 12px; text-align: left;">
          <label style="font-size: 14px; color: #666; margin-bottom: 4px; display: block;">
            ${t('feed.visibility', 'Visibility')}
          </label>
          <select id="swal-visibility" class="swal2-select" style="width: 100%;">
            <option value="public">${t('feed.public', 'Public')}</option>
            <option value="friends">${t('feed.friendsOnly', 'Friends Only')}</option>
            <option value="private">${t('feed.private', 'Private')}</option>
          </select>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: t('feed.sharePost', 'Share Post'),
      cancelButtonText: t('common.cancel', 'Cancel'),
      confirmButtonColor: '#1c76e6',
      focusConfirm: false,
      customClass: {
        popup: 'rounded-xl',
        title: 'text-xl font-semibold',
      },
      preConfirm: () => {
        const content = (document.getElementById('swal-post-content') as HTMLTextAreaElement).value;
        const visibility = (document.getElementById('swal-visibility') as HTMLSelectElement).value;
        
        if (!content.trim()) {
          Swal.showValidationMessage(t('feed.postCannotBeEmpty', 'Post cannot be empty'));
          return false;
        }
        
        return { content: content.trim(), visibility };
      }
    });

    if (formValues) {
      try {
        const { error } = await supabase.from("posts").insert({
          user_id: user.id,
          content: formValues.content,
          visibility: formValues.visibility,
        });

        if (error) throw error;

        toast({
          title: t('feed.postShared', 'Post shared!'),
          description: t('feed.postPublished', 'Your post has been published successfully.'),
        });
        onPostCreated?.();
      } catch (error) {
        console.error("Error creating post:", error);
        toast({
          title: t('common.error', 'Error'),
          description: t('feed.failedToCreatePost', 'Failed to create post. Please try again.'),
          variant: "destructive",
        });
      }
    }
  };

  if (!user) return null;

  return (
    <div className="bg-card rounded-xl p-3 sm:p-4 border border-border mb-4">
      <div className="flex gap-2 sm:gap-3 items-center">
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
          <AvatarImage src={profile?.avatar_url || ""} />
          <AvatarFallback className="bg-primary text-primary-foreground text-sm">
            {profile?.display_name?.[0]?.toUpperCase() || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <Input
            placeholder={t('feed.whatsOnYourMind', "What's on your mind?")}
            className="bg-secondary border-0 focus-visible:ring-1 focus-visible:ring-primary rounded-full h-9 sm:h-10 text-sm cursor-pointer"
            readOnly
            onClick={handleOpenPostModal}
          />
        </div>
        <Button 
          onClick={handleOpenPostModal}
          className="bg-primary hover:bg-primary/90 flex-shrink-0 h-9 sm:h-10 text-xs sm:text-sm px-3 sm:px-4"
        >
          {t('feed.sharePost', 'Share Post')}
        </Button>
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-0 sm:gap-0.5 overflow-x-auto scrollbar-hide">
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 h-8 sm:h-9 flex-shrink-0"
            onClick={handleOpenPostModal}
          >
            <Image className="h-4 w-4 text-emerald-500" />
            <span className="text-[10px] sm:text-xs hidden xs:inline">{t('feed.imageVideo', 'Image/Video')}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 h-8 sm:h-9 flex-shrink-0"
            onClick={handleOpenPostModal}
          >
            <Paperclip className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] sm:text-xs hidden xs:inline">{t('feed.attachment', 'Attachment')}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 h-8 sm:h-9 flex-shrink-0"
            onClick={handleOpenPostModal}
          >
            <Radio className="h-4 w-4 text-red-500" />
            <span className="text-[10px] sm:text-xs hidden xs:inline">{t('feed.live', 'Live')}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 h-8 sm:h-9 flex-shrink-0 hidden sm:flex"
            onClick={handleOpenPostModal}
          >
            <Hash className="h-4 w-4 text-primary" />
            <span className="text-[10px] sm:text-xs hidden md:inline">{t('feed.hashtag', 'Hashtag')}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 h-8 sm:h-9 flex-shrink-0 hidden sm:flex"
            onClick={handleOpenPostModal}
          >
            <AtSign className="h-4 w-4 text-weshare-purple" />
            <span className="text-[10px] sm:text-xs hidden md:inline">{t('feed.mention', 'Mention')}</span>
          </Button>
        </div>

        <Button variant="ghost" size="sm" className="text-muted-foreground gap-1 h-8 sm:h-9 px-2 flex-shrink-0">
          <Globe className="h-4 w-4" />
          <span className="text-[10px] sm:text-xs">{t('feed.public', 'Public')}</span>
        </Button>
      </div>
    </div>
  );
};
