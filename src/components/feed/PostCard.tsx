import { useState, useEffect } from "react";
import { MessageCircle, Share2, MoreVertical, Bookmark, FileText, Music, Pencil, Trash2, Copy, Facebook, Twitter, Link2, Check } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { toast } from "@/hooks/use-toast";
import { CommentSection } from "./CommentSection";
import { ReactionPicker } from "./ReactionPicker";
import Swal from "sweetalert2";
import ReactDOMServer from "react-dom/server";

interface PostCardProps {
  post: {
    id: string;
    content: string | null;
    media_urls: string[] | null;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    created_at: string;
    user_id: string;
    profiles?: {
      display_name: string | null;
      avatar_url: string | null;
      username: string | null;
      is_verified: boolean | null;
    };
  };
  onLikeChange?: () => void;
}

export const PostCard = ({ post, onLikeChange }: PostCardProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [commentsCount, setCommentsCount] = useState(post.comments_count || 0);
  const [sharesCount, setSharesCount] = useState(post.shares_count || 0);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [postContent, setPostContent] = useState(post.content);
  const [isDeleting, setIsDeleting] = useState(false);

  const isOwner = user?.id === post.user_id;

  // Check if user has bookmarked this post
  useEffect(() => {
    const checkBookmarkStatus = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("bookmarks")
        .select("id")
        .eq("post_id", post.id)
        .eq("user_id", user.id)
        .maybeSingle();
      
      setIsBookmarked(!!data);
    };

    checkBookmarkStatus();
  }, [post.id, user]);

  const handleBookmark = async () => {
    if (!user) return;

    try {
      if (isBookmarked) {
        await supabase
          .from("bookmarks")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        
        toast({
          title: t('feed.bookmarkRemoved', 'Bookmark removed'),
          description: t('feed.bookmarkRemovedDesc', 'Post removed from your saved items.'),
        });
      } else {
        await supabase.from("bookmarks").insert({
          post_id: post.id,
          user_id: user.id,
        });
        
        toast({
          title: t('feed.bookmarkAdded', 'Bookmark saved'),
          description: t('feed.bookmarkAddedDesc', 'Post added to your saved items.'),
        });
      }
      
      setIsBookmarked(!isBookmarked);
    } catch (error) {
      console.error("Error toggling bookmark:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('feed.bookmarkFailed', 'Failed to update bookmark. Please try again.'),
        variant: 'destructive',
      });
    }
  };

  const handleEdit = async () => {
    const { value: newContent } = await Swal.fire({
      title: t('feed.editPost', 'Edit Post'),
      input: 'textarea',
      inputValue: postContent || '',
      inputPlaceholder: t('feed.whatsOnYourMind', "What's on your mind?"),
      showCancelButton: true,
      confirmButtonText: t('common.save', 'Save'),
      cancelButtonText: t('common.cancel', 'Cancel'),
      confirmButtonColor: '#1c76e6',
      inputAttributes: {
        'aria-label': 'Post content',
        style: 'min-height: 120px; resize: vertical;'
      },
      inputValidator: (value) => {
        if (!value?.trim() && (!post.media_urls || post.media_urls.length === 0)) {
          return t('feed.postCannotBeEmpty', 'Post cannot be empty');
        }
        return null;
      }
    });

    if (newContent !== undefined) {
      try {
        const { error } = await supabase
          .from('posts')
          .update({ content: newContent.trim() || null, updated_at: new Date().toISOString() })
          .eq('id', post.id)
          .eq('user_id', user?.id);

        if (error) throw error;

        setPostContent(newContent.trim() || null);
        toast({
          title: t('feed.postUpdated', 'Post updated'),
          description: t('feed.postUpdatedDesc', 'Your post has been updated successfully.'),
        });
      } catch (error) {
        console.error('Error updating post:', error);
        toast({
          title: t('common.error', 'Error'),
          description: t('feed.updateFailed', 'Failed to update post. Please try again.'),
          variant: 'destructive',
        });
      }
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: t('feed.deletePost', 'Delete Post?'),
      text: t('feed.deletePostConfirm', 'This action cannot be undone. All likes and comments will also be deleted.'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('common.delete', 'Delete'),
      cancelButtonText: t('common.cancel', 'Cancel'),
    });

    if (result.isConfirmed) {
      setIsDeleting(true);
      try {
        // Delete related data first
        await supabase.from('post_likes').delete().eq('post_id', post.id);
        await supabase.from('post_comments').delete().eq('post_id', post.id);
        await supabase.from('post_tags').delete().eq('post_id', post.id);
        await supabase.from('post_topics').delete().eq('post_id', post.id);
        await supabase.from('post_visibility_lists').delete().eq('post_id', post.id);

        // Delete the post
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', post.id)
          .eq('user_id', user?.id);

        if (error) throw error;

        toast({
          title: t('feed.postDeleted', 'Post deleted'),
          description: t('feed.postDeletedDesc', 'Your post has been removed.'),
        });

        onLikeChange?.(); // Refresh the feed
      } catch (error) {
        console.error('Error deleting post:', error);
        toast({
          title: t('common.error', 'Error'),
          description: t('feed.deleteFailed', 'Failed to delete post. Please try again.'),
          variant: 'destructive',
        });
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleImageClick = (imageUrl: string, allImages: string[]) => {
    const currentIndex = allImages.indexOf(imageUrl);
    
    Swal.fire({
      imageUrl: imageUrl,
      imageAlt: 'Post image',
      showConfirmButton: false,
      showCloseButton: true,
      width: 'auto',
      padding: '0',
      background: 'transparent',
      customClass: {
        popup: 'swal-image-popup',
        image: 'max-h-[80vh] max-w-[90vw] object-contain rounded-lg',
        closeButton: 'text-white hover:text-gray-300',
      },
      showClass: {
        popup: 'animate__animated animate__fadeIn animate__faster'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOut animate__faster'
      },
    });
  };

  const handleCommentsClick = async () => {
    const { value: newComment } = await Swal.fire({
      title: t('feed.comments', 'Comments'),
      html: `
        <div id="swal-comments-container" class="max-h-[400px] overflow-y-auto text-left mb-4">
          <p class="text-gray-500 text-center py-4">${t('feed.loadingComments', 'Loading comments...')}</p>
        </div>
      `,
      input: 'textarea',
      inputPlaceholder: t('feed.writeComment', 'Write a comment...'),
      inputAttributes: {
        'aria-label': 'Comment',
        style: 'min-height: 60px; resize: vertical;'
      },
      showCancelButton: true,
      confirmButtonText: t('feed.postComment', 'Post Comment'),
      cancelButtonText: t('common.close', 'Close'),
      confirmButtonColor: '#1c76e6',
      width: '500px',
      didOpen: async () => {
        const container = document.getElementById('swal-comments-container');
        if (container) {
          const { data: comments } = await supabase
            .from('post_comments')
            .select(`
              id, content, created_at, user_id,
              profiles:user_id (display_name, avatar_url)
            `)
            .eq('post_id', post.id)
            .is('parent_comment_id', null)
            .order('created_at', { ascending: false })
            .limit(20);

          if (comments && comments.length > 0) {
            container.innerHTML = comments.map((c: any) => `
              <div class="flex gap-3 p-3 border-b border-gray-200 dark:border-gray-700">
                <div class="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-sm font-medium">
                  ${c.profiles?.display_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2">
                    <span class="font-medium text-sm">${c.profiles?.display_name || 'User'}</span>
                    <span class="text-xs text-gray-500">${formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}</span>
                  </div>
                  <p class="text-sm mt-1">${c.content}</p>
                </div>
              </div>
            `).join('');
          } else {
            container.innerHTML = `<p class="text-gray-500 text-center py-4">${t('feed.noComments', 'No comments yet. Be the first to comment!')}</p>`;
          }
        }
      },
      preConfirm: (comment) => {
        if (!comment?.trim()) {
          Swal.showValidationMessage(t('feed.commentRequired', 'Please enter a comment'));
          return false;
        }
        return comment.trim();
      }
    });

    if (newComment && user) {
      try {
        await supabase.from('post_comments').insert({
          post_id: post.id,
          user_id: user.id,
          content: newComment,
        });
        setCommentsCount(prev => prev + 1);
        toast({
          title: t('feed.commentAdded', 'Comment added'),
          description: t('feed.commentAddedDesc', 'Your comment has been posted.'),
        });
      } catch (error) {
        console.error('Error adding comment:', error);
        toast({
          title: t('common.error', 'Error'),
          description: t('feed.commentFailed', 'Failed to add comment.'),
          variant: 'destructive',
        });
      }
    }
  };

  const handleShareClick = async () => {
    const postUrl = `${window.location.origin}/post/${post.id}`;
    
    const result = await Swal.fire({
      title: t('feed.sharePost', 'Share Post'),
      html: `
        <div class="space-y-4 text-left">
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">
            ${post.content ? `"${post.content.substring(0, 100)}${post.content.length > 100 ? '...' : ''}"` : t('feed.shareThisPost', 'Share this post with your friends')}
          </p>
          <div class="flex gap-3 justify-center mb-4">
            <button id="share-facebook" class="p-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white transition-colors" title="Facebook">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            </button>
            <button id="share-twitter" class="p-3 rounded-full bg-black hover:bg-gray-800 text-white transition-colors" title="X (Twitter)">
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </button>
            <button id="share-copy" class="p-3 rounded-full bg-gray-600 hover:bg-gray-700 text-white transition-colors" title="Copy Link">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.9-9.9l1.757-1.757a4.5 4.5 0 016.364 6.364l-4.5 4.5a4.5 4.5 0 01-7.244-1.242M12 12H9.75"/></svg>
            </button>
          </div>
          <div class="flex items-center gap-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg">
            <input id="share-url" type="text" value="${postUrl}" class="flex-1 bg-transparent text-sm outline-none" readonly />
            <button id="copy-url-btn" class="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
              ${t('common.copy', 'Copy')}
            </button>
          </div>
        </div>
      `,
      showConfirmButton: false,
      showCloseButton: true,
      width: '400px',
      didOpen: () => {
        const facebookBtn = document.getElementById('share-facebook');
        const twitterBtn = document.getElementById('share-twitter');
        const copyBtn = document.getElementById('share-copy');
        const copyUrlBtn = document.getElementById('copy-url-btn');

        facebookBtn?.addEventListener('click', () => {
          window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`, '_blank');
          incrementShareCount();
          Swal.close();
        });

        twitterBtn?.addEventListener('click', () => {
          window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.content || '')}`, '_blank');
          incrementShareCount();
          Swal.close();
        });

        const copyToClipboard = async () => {
          await navigator.clipboard.writeText(postUrl);
          toast({
            title: t('feed.linkCopied', 'Link copied!'),
            description: t('feed.linkCopiedDesc', 'Post link has been copied to clipboard.'),
          });
          incrementShareCount();
          Swal.close();
        };

        copyBtn?.addEventListener('click', copyToClipboard);
        copyUrlBtn?.addEventListener('click', copyToClipboard);
      }
    });
  };

  const incrementShareCount = async () => {
    try {
      await supabase
        .from('posts')
        .update({ shares_count: sharesCount + 1 })
        .eq('id', post.id);
      setSharesCount(prev => prev + 1);
    } catch (error) {
      console.error('Error updating share count:', error);
    }
  };

  const getMediaType = (url: string): "image" | "video" | "audio" | "document" => {
    const ext = url.split(".").pop()?.toLowerCase() || "";
    if (["jpg", "jpeg", "png", "gif", "webp", "svg"].includes(ext)) return "image";
    if (["mp4", "webm", "mov", "avi"].includes(ext)) return "video";
    if (["mp3", "wav", "ogg", "m4a"].includes(ext)) return "audio";
    return "document";
  };

  const allImages = post.media_urls?.filter(url => getMediaType(url) === "image") || [];

  const renderMedia = (url: string, index: number) => {
    const type = getMediaType(url);
    
    switch (type) {
      case "video":
        return (
          <div key={index} className="relative aspect-video bg-secondary rounded-lg overflow-hidden">
            <video
              src={url}
              controls
              className="w-full h-full object-cover"
              preload="metadata"
            />
          </div>
        );
      case "audio":
        return (
          <div key={index} className="flex items-center gap-3 p-3 bg-secondary rounded-lg">
            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
              <Music className="h-5 w-5 text-primary" />
            </div>
            <audio src={url} controls className="flex-1 h-8" />
          </div>
        );
      case "document":
        const fileName = url.split("/").pop() || "Document";
        return (
          <a
            key={index}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-3 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors"
          >
            <div className="h-10 w-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <span className="text-sm text-foreground truncate">{fileName}</span>
          </a>
        );
      default:
        return (
          <div 
            key={index} 
            className="relative aspect-square bg-secondary overflow-hidden cursor-pointer"
            onClick={() => handleImageClick(url, allImages)}
          >
            <img
              src={url}
              alt={`Post media ${index + 1}`}
              className="w-full h-full object-cover hover:opacity-95 transition-opacity"
              loading="lazy"
            />
          </div>
        );
    }
  };

  const profile = post.profiles;
  const timeAgo = formatDistanceToNow(new Date(post.created_at), { addSuffix: true });

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary text-primary-foreground">
              {profile?.display_name?.[0]?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold text-foreground">
              {profile?.display_name || "Unknown User"}
            </div>
            <div className="text-xs text-muted-foreground">{timeAgo}</div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="text-muted-foreground">
              <MoreVertical className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 bg-popover">
            {isOwner && (
              <>
                <DropdownMenuItem onClick={handleEdit} className="cursor-pointer">
                  <Pencil className="h-4 w-4 mr-2" />
                  {t('common.edit', 'Edit')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete} 
                  className="cursor-pointer text-destructive focus:text-destructive"
                  disabled={isDeleting}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
                </DropdownMenuItem>
              </>
            )}
            {!isOwner && (
              <DropdownMenuItem className="cursor-pointer text-muted-foreground">
                {t('feed.reportPost', 'Report post')}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      {postContent && (
        <div className="px-4 pb-3">
          <p className="text-foreground whitespace-pre-wrap">{postContent}</p>
        </div>
      )}

      {/* Media */}
      {post.media_urls && post.media_urls.length > 0 && (
        <div className="space-y-2 px-4 pb-3">
          {/* Images Grid */}
          {post.media_urls.filter(url => getMediaType(url) === "image").length > 0 && (
            <div className={`grid gap-1 rounded-lg overflow-hidden ${
              post.media_urls.filter(url => getMediaType(url) === "image").length === 1 
                ? 'grid-cols-1' 
                : 'grid-cols-2'
            }`}>
              {post.media_urls
                .filter(url => getMediaType(url) === "image")
                .slice(0, 4)
                .map((url, index) => renderMedia(url, index))}
            </div>
          )}
          
          {/* Videos */}
          {post.media_urls
            .filter(url => getMediaType(url) === "video")
            .map((url, index) => renderMedia(url, index))}
          
          {/* Audio */}
          {post.media_urls
            .filter(url => getMediaType(url) === "audio")
            .map((url, index) => renderMedia(url, index))}
          
          {/* Documents */}
          <div className="space-y-2">
            {post.media_urls
              .filter(url => getMediaType(url) === "document")
              .map((url, index) => renderMedia(url, index))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between p-4 border-t border-border">
        <div className="flex items-center gap-2 sm:gap-4">
          <ReactionPicker postId={post.id} onReactionChange={onLikeChange} />
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 sm:gap-2 text-muted-foreground hover:text-primary"
            onClick={handleCommentsClick}
          >
            <MessageCircle className="h-5 w-5" />
            <span className="hidden sm:inline">{commentsCount}</span>
            <span className="sm:hidden">{commentsCount}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1 sm:gap-2 text-muted-foreground hover:text-primary"
            onClick={handleShareClick}
          >
            <Share2 className="h-5 w-5" />
            <span className="hidden sm:inline">{sharesCount}</span>
            <span className="sm:hidden">{sharesCount}</span>
          </Button>
        </div>
        <Button 
          variant="ghost" 
          size="icon" 
          className={isBookmarked ? 'text-primary' : 'text-muted-foreground'}
          onClick={handleBookmark}
        >
          <Bookmark className={`h-5 w-5 ${isBookmarked ? 'fill-current' : ''}`} />
        </Button>
      </div>
    </div>
  );
};
