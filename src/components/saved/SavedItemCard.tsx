import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Play, FolderPlus, ChevronRight, MoreHorizontal, Trash2, ExternalLink } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatDistanceToNow } from "date-fns";

interface BookmarkCollection {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface SavedItemCardProps {
  post: {
    id: string;
    bookmark_id: string;
    collection_id: string | null;
    content: string | null;
    media_urls: string[] | null;
    created_at: string;
    user_id: string;
    profiles?: {
      display_name: string | null;
      avatar_url: string | null;
      username: string | null;
      is_verified: boolean | null;
    };
  };
  collections: BookmarkCollection[];
  currentCollectionId: string | null;
  onMoveToCollection: (bookmarkId: string, collectionId: string | null) => void;
  onRemoveBookmark: (bookmarkId: string) => void;
}

export const SavedItemCard = ({
  post,
  collections,
  currentCollectionId,
  onMoveToCollection,
  onRemoveBookmark,
}: SavedItemCardProps) => {
  const { t } = useTranslation();

  // Get the first media URL for thumbnail
  const thumbnailUrl = post.media_urls?.[0];
  const isVideo = thumbnailUrl?.includes('.mp4') || thumbnailUrl?.includes('.webm') || thumbnailUrl?.includes('.mov');
  
  // Get post title/content preview
  const contentPreview = post.content?.slice(0, 100) || t('saved.noContent', 'No content');
  
  // Get current collection name
  const currentCollection = collections.find(c => c.id === post.collection_id);

  return (
    <div className="bg-card rounded-xl border border-border p-3 hover:bg-accent/30 transition-colors">
      <div className="flex gap-3">
        {/* Thumbnail */}
        <Link to={`/post/${post.id}`} className="flex-shrink-0">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 rounded-lg overflow-hidden bg-muted">
            {thumbnailUrl ? (
              <>
                <img
                  src={thumbnailUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                {isVideo && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                    <div className="w-10 h-10 rounded-full bg-black/60 flex items-center justify-center">
                      <Play className="h-5 w-5 text-white fill-white" />
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <span className="text-3xl">📄</span>
              </div>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          {/* Title/Content */}
          <Link to={`/post/${post.id}`} className="hover:underline">
            <h3 className="font-medium text-foreground line-clamp-2 text-sm sm:text-base">
              {contentPreview}
            </h3>
          </Link>

          {/* Collection Badge */}
          {currentCollection && (
            <span className="text-xs text-muted-foreground mt-1">
              {t('saved.savedTo', 'Saved to')} <span className="text-primary font-medium">{currentCollection.icon} {currentCollection.name}</span>
            </span>
          )}

          {/* Author */}
          <div className="flex items-center gap-2 mt-2">
            <Avatar className="h-5 w-5">
              <AvatarImage src={post.profiles?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {post.profiles?.display_name?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {t('saved.savedFrom', 'Saved from')}{" "}
              <Link 
                to={`/${post.profiles?.username || post.user_id}`}
                className="text-primary hover:underline font-medium"
              >
                {post.profiles?.display_name || t('common.unknownUser', 'Unknown User')}'s post
              </Link>
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 mt-auto pt-2">
            {collections.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 text-xs gap-1">
                    <FolderPlus className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">{t('saved.addToCollection', 'Add to Collection')}</span>
                    <span className="sm:hidden">{t('saved.collection', 'Collection')}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="bg-popover w-48">
                  {post.collection_id && (
                    <>
                      <DropdownMenuItem onClick={() => onMoveToCollection(post.bookmark_id, null)}>
                        {t('saved.removeFromCollection', 'Remove from collection')}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  {collections
                    .filter(c => c.id !== post.collection_id)
                    .map((collection) => (
                      <DropdownMenuItem
                        key={collection.id}
                        onClick={() => onMoveToCollection(post.bookmark_id, collection.id)}
                      >
                        <span className="mr-2">{collection.icon}</span>
                        {collection.name}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            <Link to={`/post/${post.id}`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </Link>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover">
                <DropdownMenuItem
                  onClick={() => onRemoveBookmark(post.bookmark_id)}
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('saved.unsave', 'Unsave')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </div>
  );
};
