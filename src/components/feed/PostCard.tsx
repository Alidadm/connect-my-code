import { useState, useEffect } from "react";
import { MessageCircle, Share2, MoreVertical, Bookmark, FileText, Music, Pencil, Trash2, Copy, Facebook, Twitter, Link2, Check, Ban, VolumeX, Volume2, UserX, Megaphone, Play, ThumbsUp, ThumbsDown, EyeOff, BookmarkPlus, Flag, Youtube, Eye } from "lucide-react";
import { extractYoutubeVideoId, getYoutubeThumbnailUrl, getYoutubeEmbedUrl } from "@/lib/youtube";
import { useViewedVideos } from "@/hooks/useViewedVideos";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
import { MasonryPhotoGrid } from "./MasonryPhotoGrid";
import { useBlockMute } from "@/hooks/useBlockMute";

import Swal from "sweetalert2";
import ReactDOMServer from "react-dom/server";

interface PostCardProps {
  post: {
    id: string;
    content: string | null;
    media_urls: string[] | null;
    youtube_urls?: string[] | null;
    likes_count: number;
    comments_count: number;
    shares_count: number;
    created_at: string;
    user_id: string;
    is_platform_post?: boolean;
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
  const [showComments, setShowComments] = useState(false);
  const [isHidden, setIsHidden] = useState(false);
  const [preference, setPreference] = useState<'interested' | 'not_interested' | null>(null);

  const isOwner = user?.id === post.user_id;
  const { isBlocked, isMuted, blockUser, muteUser, loading: blockMuteLoading } = useBlockMute(post.user_id);
  const { markAsViewed, isViewed } = useViewedVideos();
  
  const fullName = post.profiles?.display_name || post.profiles?.username || t('common.user', 'User');
  const authorFirstName = fullName.split(' ')[0];

  // Check if user has bookmarked this post and load preferences/hidden status
  useEffect(() => {
    const checkPostStatus = async () => {
      if (!user) return;
      
      const [bookmarkResult, preferenceResult, hiddenResult] = await Promise.all([
        supabase
          .from("bookmarks")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("post_preferences")
          .select("preference")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("hidden_posts")
          .select("id")
          .eq("post_id", post.id)
          .eq("user_id", user.id)
          .maybeSingle(),
      ]);
      
      setIsBookmarked(!!bookmarkResult.data);
      setPreference(preferenceResult.data?.preference as 'interested' | 'not_interested' | null);
      setIsHidden(!!hiddenResult.data);
    };

    checkPostStatus();
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

  const handleInterested = async () => {
    if (!user) return;

    try {
      if (preference === 'interested') {
        // Remove preference
        await supabase
          .from("post_preferences")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        
        setPreference(null);
        toast({
          title: t('feed.preferenceRemoved', 'Preference removed'),
        });
      } else {
        // Upsert interested preference
        await supabase
          .from("post_preferences")
          .upsert({
            post_id: post.id,
            user_id: user.id,
            preference: 'interested',
          }, { onConflict: 'user_id,post_id' });
        
        setPreference('interested');
        toast({
          title: t('feed.interested', 'Interested'),
          description: t('feed.interestedDesc', 'More of your posts will be like this.'),
        });
      }
    } catch (error) {
      console.error("Error setting preference:", error);
      toast({
        title: t('common.error', 'Error'),
        variant: 'destructive',
      });
    }
  };

  const handleNotInterested = async () => {
    if (!user) return;

    try {
      if (preference === 'not_interested') {
        // Remove preference
        await supabase
          .from("post_preferences")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", user.id);
        
        setPreference(null);
        toast({
          title: t('feed.preferenceRemoved', 'Preference removed'),
        });
      } else {
        // Upsert not interested preference
        await supabase
          .from("post_preferences")
          .upsert({
            post_id: post.id,
            user_id: user.id,
            preference: 'not_interested',
          }, { onConflict: 'user_id,post_id' });
        
        setPreference('not_interested');
        toast({
          title: t('feed.notInterested', 'Not interested'),
          description: t('feed.notInterestedDesc', 'You will see fewer posts like this.'),
        });
      }
    } catch (error) {
      console.error("Error setting preference:", error);
      toast({
        title: t('common.error', 'Error'),
        variant: 'destructive',
      });
    }
  };

  const handleHidePost = async () => {
    if (!user) return;

    try {
      await supabase.from("hidden_posts").insert({
        post_id: post.id,
        user_id: user.id,
      });
      
      setIsHidden(true);
      toast({
        title: t('feed.postHidden', 'Post hidden'),
        description: t('feed.postHiddenDesc', 'You won\'t see this post anymore.'),
      });
    } catch (error) {
      console.error("Error hiding post:", error);
      toast({
        title: t('common.error', 'Error'),
        variant: 'destructive',
      });
    }
  };

  const handleReportPost = async () => {
    if (!user) {
      toast({
        title: t('auth.loginRequired', 'Login required'),
        description: t('auth.loginToReport', 'Please log in to report this post.'),
        variant: 'destructive',
      });
      return;
    }

    const reportReasons = [
      { value: 'spam', label: t('feed.reportReasons.spam', 'Spam or misleading') },
      { value: 'harassment', label: t('feed.reportReasons.harassment', 'Harassment or bullying') },
      { value: 'hate_speech', label: t('feed.reportReasons.hateSpeech', 'Hate speech') },
      { value: 'violence', label: t('feed.reportReasons.violence', 'Violence or dangerous content') },
      { value: 'nudity', label: t('feed.reportReasons.nudity', 'Nudity or sexual content') },
      { value: 'false_info', label: t('feed.reportReasons.falseInfo', 'False information') },
      { value: 'intellectual_property', label: t('feed.reportReasons.intellectualProperty', 'Intellectual property violation') },
      { value: 'other', label: t('feed.reportReasons.other', 'Other') },
    ];

    const { value: reason } = await Swal.fire({
      title: t('feed.reportPostTitle', 'Report Post'),
      text: t('feed.reportPostDesc', 'Why are you reporting this post?'),
      input: 'select',
      inputOptions: Object.fromEntries(reportReasons.map(r => [r.value, r.label])),
      inputPlaceholder: t('feed.selectReason', 'Select a reason'),
      showCancelButton: true,
      confirmButtonText: t('common.next', 'Next'),
      cancelButtonText: t('common.cancel', 'Cancel'),
      confirmButtonColor: '#ef4444',
      inputValidator: (value) => {
        if (!value) {
          return t('feed.selectReasonRequired', 'Please select a reason');
        }
        return null;
      }
    });

    if (!reason) return;

    // Ask for additional details
    const { value: description } = await Swal.fire({
      title: t('feed.additionalDetails', 'Additional Details'),
      text: t('feed.additionalDetailsDesc', 'Provide any additional information (optional)'),
      input: 'textarea',
      inputPlaceholder: t('feed.describeIssue', 'Describe the issue...'),
      showCancelButton: true,
      confirmButtonText: t('feed.submitReport', 'Submit Report'),
      cancelButtonText: t('common.cancel', 'Cancel'),
      confirmButtonColor: '#ef4444',
    });

    if (description === undefined) return; // User cancelled

    try {
      const { error } = await supabase.from('post_reports').insert({
        user_id: user.id,
        post_id: post.id,
        reason,
        description: description?.trim() || null,
      });

      if (error) {
        if (error.code === '23505') {
          // Duplicate report
          toast({
            title: t('feed.alreadyReported', 'Already reported'),
            description: t('feed.alreadyReportedDesc', 'You have already reported this post.'),
          });
          return;
        }
        throw error;
      }

      toast({
        title: t('feed.reportSubmitted', 'Report submitted'),
        description: t('feed.reportSubmittedDesc', 'Thank you for helping keep our community safe.'),
      });
    } catch (error) {
      console.error('Error reporting post:', error);
      toast({
        title: t('common.error', 'Error'),
        description: t('feed.reportFailed', 'Failed to submit report. Please try again.'),
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
    let currentIndex = allImages.indexOf(imageUrl);
    
    const showImage = (index: number) => {
      currentIndex = index;
      const hasMultiple = allImages.length > 1;
      const hasPrev = currentIndex > 0;
      const hasNext = currentIndex < allImages.length - 1;
      
      Swal.fire({
        html: `
          <div class="relative flex items-center justify-center min-h-[50vh]">
            ${hasMultiple && hasPrev ? `
              <button id="swal-prev-btn" class="absolute left-2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7"/>
                </svg>
              </button>
            ` : ''}
            <img src="${allImages[currentIndex]}" alt="Post image" class="max-h-[80vh] max-w-[85vw] object-contain rounded-lg" />
            ${hasMultiple && hasNext ? `
              <button id="swal-next-btn" class="absolute right-2 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7"/>
                </svg>
              </button>
            ` : ''}
            ${hasMultiple ? `
              <div class="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 text-white text-sm">
                ${currentIndex + 1} / ${allImages.length}
              </div>
            ` : ''}
          </div>
        `,
        showConfirmButton: false,
        showCloseButton: true,
        width: 'auto',
        padding: '0.5rem',
        background: 'rgba(0, 0, 0, 0.9)',
        customClass: {
          popup: 'swal-image-popup',
          closeButton: 'text-white hover:text-gray-300',
        },
        showClass: {
          popup: 'animate__animated animate__fadeIn animate__faster'
        },
        hideClass: {
          popup: 'animate__animated animate__fadeOut animate__faster'
        },
        didOpen: () => {
          const prevBtn = document.getElementById('swal-prev-btn');
          const nextBtn = document.getElementById('swal-next-btn');
          
          prevBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentIndex > 0) {
              Swal.close();
              setTimeout(() => showImage(currentIndex - 1), 50);
            }
          });
          
          nextBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            if (currentIndex < allImages.length - 1) {
              Swal.close();
              setTimeout(() => showImage(currentIndex + 1), 50);
            }
          });

          // Keyboard navigation
          const handleKeydown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft' && currentIndex > 0) {
              Swal.close();
              setTimeout(() => showImage(currentIndex - 1), 50);
            } else if (e.key === 'ArrowRight' && currentIndex < allImages.length - 1) {
              Swal.close();
              setTimeout(() => showImage(currentIndex + 1), 50);
            }
          };
          document.addEventListener('keydown', handleKeydown);
          
          // Cleanup on close
          const popup = Swal.getPopup();
          if (popup) {
            const observer = new MutationObserver(() => {
              if (!document.body.contains(popup)) {
                document.removeEventListener('keydown', handleKeydown);
                observer.disconnect();
              }
            });
            observer.observe(document.body, { childList: true, subtree: true });
          }
        },
      });
    };
    
    showImage(currentIndex);
  };

  const handleCommentsClick = () => {
    setShowComments(!showComments);
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
  const isPlatformPost = post.is_platform_post;

  // Don't render if post is hidden
  if (isHidden) {
    return null;
  }

  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden mb-4">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {isPlatformPost ? (
            // Admin/Platform post - show blue "D" icon, no personal avatar
            <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
              <span className="text-primary-foreground font-bold text-lg">D</span>
            </div>
          ) : (
            <Avatar className="h-10 w-10 flex-shrink-0">
              <AvatarImage src={profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {profile?.display_name?.[0]?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
          )}
          {/* Speech bubble with arrow pointing to avatar */}
          <div className="relative bg-secondary rounded-lg px-3 py-2 before:content-[''] before:absolute before:left-[-8px] before:top-3 before:border-[8px] before:border-transparent before:border-r-secondary">
            <div className="flex items-center gap-1.5 font-semibold text-foreground">
              {isPlatformPost ? (
                // Platform posts show badge only, no personal name
                <Badge variant="secondary" className="text-xs gap-1 bg-primary/10 text-primary border-primary/20">
                  <Megaphone className="h-3 w-3" />
                  Platform
                </Badge>
              ) : (
                <>
                  {profile?.display_name || "Unknown User"}
                  {isMuted && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-muted text-muted-foreground" title={t('privacy.mutedUser', 'Muted user')}>
                      <VolumeX className="h-3 w-3" />
                    </span>
                  )}
                </>
              )}
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
            {!isOwner && user && (
              <>
                <DropdownMenuItem 
                  onClick={handleInterested}
                  className={`cursor-pointer ${preference === 'interested' ? 'text-primary' : ''}`}
                >
                  <ThumbsUp className={`h-4 w-4 mr-2 ${preference === 'interested' ? 'fill-current' : ''}`} />
                  {preference === 'interested' 
                    ? t('feed.removeInterested', 'Remove interested')
                    : t('feed.interested', 'Interested')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleNotInterested}
                  className={`cursor-pointer ${preference === 'not_interested' ? 'text-muted-foreground' : ''}`}
                >
                  <ThumbsDown className={`h-4 w-4 mr-2 ${preference === 'not_interested' ? 'fill-current' : ''}`} />
                  {preference === 'not_interested'
                    ? t('feed.removeNotInterested', 'Remove not interested')
                    : t('feed.notInterested', 'Not interested')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleHidePost}
                  className="cursor-pointer"
                >
                  <EyeOff className="h-4 w-4 mr-2" />
                  {t('feed.hidePost', 'Hide post')}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleBookmark}
                  className={`cursor-pointer ${isBookmarked ? 'text-primary' : ''}`}
                >
                  <BookmarkPlus className={`h-4 w-4 mr-2 ${isBookmarked ? 'fill-current' : ''}`} />
                  {isBookmarked 
                    ? t('feed.removeFromSaved', 'Remove from saved')
                    : t('feed.savePost', 'Save post')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={blockUser} 
                  className="cursor-pointer text-destructive focus:text-destructive"
                  disabled={blockMuteLoading}
                >
                  {isBlocked ? (
                    <>
                      <UserX className="h-4 w-4 mr-2" />
                      {t('privacy.unblockUser', 'Unblock')} {authorFirstName}
                    </>
                  ) : (
                    <>
                      <Ban className="h-4 w-4 mr-2" />
                      {t('privacy.blockUser', 'Block')} {authorFirstName}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={muteUser} 
                  className="cursor-pointer"
                  disabled={blockMuteLoading}
                >
                  {isMuted ? (
                    <>
                      <Volume2 className="h-4 w-4 mr-2" />
                      {t('privacy.unmute', 'Unmute user')}
                    </>
                  ) : (
                    <>
                      <VolumeX className="h-4 w-4 mr-2" />
                      {t('privacy.mute', 'Mute user')}
                    </>
                  )}
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={handleReportPost}
                  className="cursor-pointer text-muted-foreground"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  {t('feed.reportPost', 'Report post')}
                </DropdownMenuItem>
              </>
            )}
            {!isOwner && !user && (
              <DropdownMenuItem 
                onClick={handleReportPost}
                className="cursor-pointer text-muted-foreground"
              >
                <Flag className="h-4 w-4 mr-2" />
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
          {/* Images - Masonry Grid */}
          {allImages.length > 0 && (
            <MasonryPhotoGrid 
              images={allImages} 
              variant="feed" 
              maxDisplay={5}
            />
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

      {/* YouTube Videos */}
      {post.youtube_urls && post.youtube_urls.length > 0 && (
        <div className="space-y-2 px-4 pb-3">
          {post.youtube_urls.map((url, index) => {
            const videoId = extractYoutubeVideoId(url);
            if (!videoId) return null;
            const viewed = isViewed(videoId);
            
            return (
              <div 
                key={index} 
                className="relative aspect-video bg-secondary rounded-lg overflow-hidden cursor-pointer group"
                onClick={() => {
                  markAsViewed(videoId);
                  Swal.fire({
                    html: `<iframe 
                      src="${getYoutubeEmbedUrl(videoId)}?autoplay=1" 
                      class="w-full aspect-video" 
                      style="border-radius: 4px;"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                      allowfullscreen
                    ></iframe>`,
                    width: 'min(900px, 98vw)',
                    padding: 0,
                    background: 'hsl(var(--card))',
                    showConfirmButton: false,
                    showCloseButton: true,
                    customClass: {
                      popup: 'youtube-preview-popup'
                    }
                  });
                }}
              >
                <img
                  src={getYoutubeThumbnailUrl(videoId)}
                  alt="YouTube video thumbnail"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center group-hover:bg-black/40 transition-colors">
                  <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg">
                    <Play className="h-8 w-8 text-white fill-white ml-1" />
                  </div>
                </div>
                {viewed && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded bg-black/60 text-white text-xs">
                    <Eye className="h-3 w-3" />
                    Watched
                  </div>
                )}
                <div className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded bg-black/60">
                  <Youtube className="h-4 w-4 text-red-500" />
                  <span className="text-white text-xs">YouTube</span>
                </div>
              </div>
            );
          })}
        </div>
      )}


      {/* Actions */}
      <div className="flex items-center justify-between p-4 border-t border-border">
        <div className="flex items-center gap-2 sm:gap-4">
          <ReactionPicker postId={post.id} onReactionChange={onLikeChange} />
          <Button 
            variant="ghost" 
            size="sm" 
            className={`gap-1 sm:gap-2 ${showComments ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
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

      {/* Comment Section */}
      {showComments && (
        <CommentSection 
          postId={post.id} 
          onCommentCountChange={(count) => setCommentsCount(count)} 
        />
      )}
    </div>
  );
};
