import { Image, Paperclip, Radio, Hash, AtSign, Globe, Smile } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";

const demoProfile = {
  avatar_url: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
};

export const DemoPostCreator = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleOpenPostModal = async () => {
    await Swal.fire({
      title: t('feed.whatsOnYourMind', "What's on your mind?"),
      text: t('auth.loginRequired', 'Please log in to share a post'),
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: t('common.logIn', 'Log In'),
      cancelButtonText: t('common.cancel', 'Cancel'),
      confirmButtonColor: '#1c76e6',
      customClass: {
        popup: 'rounded-xl',
      },
    }).then((result) => {
      if (result.isConfirmed) {
        navigate('/login');
      }
    });
  };

  return (
    <div className="bg-card rounded-xl p-3 sm:p-4 border border-border mb-4">
      <div className="flex gap-2 sm:gap-3 items-center">
        <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
          <AvatarImage src={demoProfile.avatar_url} />
          <AvatarFallback className="bg-gradient-to-br from-primary to-weshare-purple text-primary-foreground text-sm">
            JB
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
        <Button variant="ghost" size="icon" className="text-muted-foreground flex-shrink-0 h-9 w-9 sm:h-10 sm:w-10 hidden sm:flex">
          <Smile className="h-5 w-5" />
        </Button>
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
