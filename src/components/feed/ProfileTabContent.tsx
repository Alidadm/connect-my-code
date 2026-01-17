import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useUserPhotos, useUserVideos, useUserFriends } from "@/hooks/useProfileTabs";
import { Video, ImageOff, VideoOff, UserX, BadgeCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { MasonryPhotoGrid } from "./MasonryPhotoGrid";
import { VideoLightbox } from "./VideoLightbox";
export interface ProfileTabContentProps {
  activeTab: string;
  userId?: string; // Optional - defaults to current auth user
}

interface PhotosGridProps {
  userId: string | undefined;
}

interface VideosGridProps {
  userId: string | undefined;
}

interface FriendsListProps {
  userId: string | undefined;
}

const PhotosGrid = ({ userId }: PhotosGridProps) => {
  const { t } = useTranslation();
  const { data: photos, isLoading } = useUserPhotos(userId, true);

  if (isLoading) {
    return (
      <div className="columns-2 sm:columns-3 md:columns-4 gap-2 p-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton 
            key={i} 
            className="mb-2 rounded-lg" 
            style={{ height: `${150 + Math.random() * 100}px` }}
          />
        ))}
      </div>
    );
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <ImageOff className="h-12 w-12 mb-3" />
        <p className="text-sm">{t("profile.noPhotos", "No photos yet")}</p>
      </div>
    );
  }

  const imageUrls = photos.map(photo => photo.url);

  return (
    <div className="p-4">
      <MasonryPhotoGrid 
        images={imageUrls} 
        variant="gallery" 
        maxDisplay={100}
      />
    </div>
  );
};

const VideosGrid = ({ userId }: VideosGridProps) => {
  const { t } = useTranslation();
  const { data: videos, isLoading } = useUserVideos(userId, true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0);

  const handleVideoClick = (index: number) => {
    setSelectedVideoIndex(index);
    setLightboxOpen(true);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
        {[...Array(4)].map((_, i) => (
          <Skeleton key={i} className="aspect-video rounded-lg" />
        ))}
      </div>
    );
  }

  if (!videos || videos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <VideoOff className="h-12 w-12 mb-3" />
        <p className="text-sm">{t("profile.noVideos", "No videos yet")}</p>
      </div>
    );
  }

  const videoUrls = videos.map((v) => v.url);

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4">
        {videos.map((video, index) => (
          <div
            key={video.id}
            onClick={() => handleVideoClick(index)}
            className="aspect-video rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity relative group"
          >
            <video
              src={video.url}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
              <Video className="h-8 w-8 text-white" />
            </div>
          </div>
        ))}
      </div>

      <VideoLightbox
        videos={videoUrls}
        initialIndex={selectedVideoIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  );
};

const FriendsList = ({ userId }: FriendsListProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const { data: friends, isLoading } = useUserFriends(userId, true);
  
  const isOwnProfile = user?.id === userId;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!friends || friends.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <UserX className="h-12 w-12 mb-3" />
        <p className="text-sm">{t("profile.noFriends", "No friends yet")}</p>
        {isOwnProfile && (
          <Link to="/friends" className="mt-3 text-primary text-sm hover:underline">
            {t("profile.findFriends", "Find friends")}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 p-4">
      {friends.map((friend) => (
        <Link
          key={friend.id}
          to={`/user/${friend.username || friend.userId}`}
          className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
        >
          <Avatar className="h-12 w-12">
            <AvatarImage src={friend.avatarUrl || undefined} alt={friend.displayName || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {(friend.displayName?.[0] || "U").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1">
              <span className="font-medium text-sm truncate">
                {friend.displayName || friend.username || "User"}
              </span>
              {friend.isVerified && (
                <BadgeCheck className="h-4 w-4 text-primary flex-shrink-0" />
              )}
            </div>
            {friend.username && (
              <span className="text-xs text-muted-foreground">@{friend.username}</span>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
};

export const ProfileTabContent = ({ activeTab, userId }: ProfileTabContentProps) => {
  const { user } = useAuth();
  const targetUserId = userId || user?.id;

  switch (activeTab) {
    case "photos":
      return <PhotosGrid userId={targetUserId} />;
    case "videos":
      return <VideosGrid userId={targetUserId} />;
    case "friends":
      return <FriendsList userId={targetUserId} />;
    default:
      return null; // Feed is handled separately
  }
};
