import { Image, Paperclip, Radio, Hash, AtSign, Globe } from "lucide-react";
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

    const avatarUrl = profile?.avatar_url || "";
    const displayName = profile?.display_name || user?.email?.split("@")[0] || "U";
    const initial = displayName[0]?.toUpperCase() || "U";

    const { value: formValues } = await Swal.fire({
      html: `
        <div style="text-align: left;">
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #1c76e6, #8b5cf6); display: flex; align-items: center; justify-content: center;">
              ${avatarUrl 
                ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` 
                : `<span style="color: white; font-weight: 600; font-size: 18px;">${initial}</span>`
              }
            </div>
            <div>
              <div style="font-weight: 600; font-size: 16px; color: #1a1a2e;">${displayName}</div>
              <select id="swal-visibility" style="font-size: 13px; color: #666; background: #f1f5f9; border: none; border-radius: 16px; padding: 4px 12px; cursor: pointer; margin-top: 4px;">
                <option value="public">🌍 ${t('feed.public', 'Public')}</option>
                <option value="friends">👥 ${t('feed.friendsOnly', 'Friends Only')}</option>
                <option value="private">🔒 ${t('feed.private', 'Private')}</option>
              </select>
            </div>
          </div>
          
          <textarea 
            id="swal-post-content" 
            placeholder="${t('feed.whatsOnYourMind', "What's on your mind?")}, ${displayName}?"
            style="
              width: 100%;
              min-height: 180px;
              resize: vertical;
              border: none;
              outline: none;
              font-size: 18px;
              line-height: 1.5;
              color: #1a1a2e;
              background: transparent;
              padding: 0;
            "
          ></textarea>
          
          <div style="display: flex; align-items: center; gap: 4px; padding-top: 16px; border-top: 1px solid #e5e7eb; margin-top: 16px; flex-wrap: wrap;">
            <button type="button" class="swal-action-btn" data-action="image" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <span style="color: #10b981;">${t('feed.imageVideo', 'Image/Video')}</span>
            </button>
            <button type="button" class="swal-action-btn" data-action="attachment" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
              <span style="color: #f59e0b;">${t('feed.attachment', 'Attachment')}</span>
            </button>
            <button type="button" class="swal-action-btn" data-action="live" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/><path d="M7.76 16.24a6 6 0 0 1 0-8.48"/><path d="M16.24 7.76a6 6 0 0 1 0 8.48"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
              <span style="color: #ef4444;">${t('feed.live', 'Live')}</span>
            </button>
            <button type="button" class="swal-action-btn" data-action="hashtag" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c76e6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
              <span style="color: #1c76e6;">${t('feed.hashtag', 'Hashtag')}</span>
            </button>
            <button type="button" class="swal-action-btn" data-action="mention" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>
              <span style="color: #8b5cf6;">${t('feed.mention', 'Mention')}</span>
            </button>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `<span style="display: flex; align-items: center; gap: 8px;">📤 ${t('feed.sharePost', 'Share Post')}</span>`,
      cancelButtonText: t('common.cancel', 'Cancel'),
      confirmButtonColor: '#1c76e6',
      cancelButtonColor: '#6b7280',
      width: '560px',
      padding: '24px',
      showClass: {
        popup: 'animate__animated animate__fadeInUp animate__faster'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutDown animate__faster'
      },
      customClass: {
        popup: 'rounded-2xl shadow-2xl',
        confirmButton: 'rounded-full px-6 py-2 font-semibold',
        cancelButton: 'rounded-full px-6 py-2 font-semibold',
      },
      didOpen: () => {
        // Add hover effects
        const buttons = document.querySelectorAll('.swal-action-btn');
        buttons.forEach(btn => {
          btn.addEventListener('mouseenter', () => {
            (btn as HTMLElement).style.background = '#f1f5f9';
          });
          btn.addEventListener('mouseleave', () => {
            (btn as HTMLElement).style.background = 'transparent';
          });
        });
        
        // Focus textarea
        const textarea = document.getElementById('swal-post-content') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
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
