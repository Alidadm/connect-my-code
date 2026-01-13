import { Image, Paperclip, Radio, Hash, AtSign, Globe, Smile, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import Swal from "sweetalert2";

// Common emojis organized by category
const EMOJI_CATEGORIES = {
  smileys: ['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '😉', '😍', '🥰', '😘', '😋', '😛', '🤪', '😎', '🤩', '🥳', '😏', '😒', '🙄', '😬', '🤔', '🤫', '🤭', '😴', '🤤', '😷'],
  gestures: ['👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '🤙', '👋', '🤚', '✋', '🖐️', '👏', '🙌', '🤲', '🙏', '💪', '🦾', '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '💯', '💥', '✨', '🔥'],
  objects: ['🎉', '🎊', '🎁', '🎈', '🏆', '🥇', '⚽', '🏀', '🎮', '🎬', '📸', '💻', '📱', '⌚', '💡', '📚', '✏️', '📝', '💰', '💎', '🚀', '✈️', '🚗', '🏠', '🌍', '🌙', '⭐', '☀️', '🌈', '🍕'],
  nature: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🦁', '🌸', '🌺', '🌻', '🌹', '🌴', '🌲', '🍀', '🌊', '🌋', '⛰️'],
};

const MAX_CHARACTERS = 500;

export const PostCreator = ({ onPostCreated }: { onPostCreated?: () => void }) => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  const searchUsers = async (query: string): Promise<Array<{username: string, display_name: string, avatar_url: string}>> => {
    if (!query || query.length < 2) return [];
    
    const { data, error } = await supabase
      .from('profiles')
      .select('username, display_name, avatar_url')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(5);
    
    if (error) {
      console.error('Error searching users:', error);
      return [];
    }
    
    return data || [];
  };

  const handleOpenPostModal = async () => {
    if (!user) return;

    const avatarUrl = profile?.avatar_url || "";
    const displayName = profile?.display_name || user?.email?.split("@")[0] || "U";
    const initial = displayName[0]?.toUpperCase() || "U";

    const allEmojis = Object.values(EMOJI_CATEGORIES).flat();
    const emojiGridHtml = allEmojis.map(emoji => 
      `<button type="button" class="emoji-btn" style="font-size: 24px; padding: 6px; border: none; background: transparent; cursor: pointer; border-radius: 8px; transition: background 0.2s;" data-emoji="${emoji}">${emoji}</button>`
    ).join('');

    const trendingHashtags = ['#trending', '#viral', '#fyp', '#explore', '#community', '#lifestyle', '#motivation', '#inspiration', '#love', '#happy'];
    const hashtagsHtml = trendingHashtags.map(tag => 
      `<button type="button" class="hashtag-btn" style="font-size: 13px; padding: 6px 12px; border: 1px solid #e5e7eb; background: #f8fafc; cursor: pointer; border-radius: 16px; color: #1c76e6; transition: all 0.2s;" data-hashtag="${tag}">${tag}</button>`
    ).join('');

    const { value: formValues } = await Swal.fire({
      html: `
        <div style="text-align: left;">
          <!-- Header with user info -->
          <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 16px;">
            <div style="width: 48px; height: 48px; border-radius: 50%; overflow: hidden; flex-shrink: 0; background: linear-gradient(135deg, #1c76e6, #8b5cf6); display: flex; align-items: center; justify-content: center;">
              ${avatarUrl 
                ? `<img src="${avatarUrl}" style="width: 100%; height: 100%; object-fit: cover;" />` 
                : `<span style="color: white; font-weight: 600; font-size: 18px;">${initial}</span>`
              }
            </div>
            <div style="flex: 1;">
              <div style="font-weight: 600; font-size: 16px; color: #1a1a2e;">${displayName}</div>
              <select id="swal-visibility" style="font-size: 13px; color: #666; background: #f1f5f9; border: none; border-radius: 16px; padding: 4px 12px; cursor: pointer; margin-top: 4px;">
                <option value="public">🌍 ${t('feed.public', 'Public')}</option>
                <option value="friends">👥 ${t('feed.friendsOnly', 'Friends Only')}</option>
                <option value="private">🔒 ${t('feed.private', 'Private')}</option>
              </select>
            </div>
            <div id="char-counter" style="font-size: 14px; color: #666; font-weight: 500;">
              <span id="char-count">0</span>/<span>${MAX_CHARACTERS}</span>
            </div>
          </div>
          
          <!-- Textarea -->
          <textarea 
            id="swal-post-content" 
            placeholder="${t('feed.whatsOnYourMind', "What's on your mind?")}, ${displayName}?"
            maxlength="${MAX_CHARACTERS}"
            style="
              width: 100%;
              min-height: 160px;
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

          <!-- Mention suggestions dropdown (hidden by default) -->
          <div id="mention-dropdown" style="display: none; position: absolute; background: white; border: 1px solid #e5e7eb; border-radius: 12px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); max-height: 200px; overflow-y: auto; z-index: 1000; width: calc(100% - 48px); margin-top: -8px;">
          </div>

          <!-- Emoji Panel (hidden by default) -->
          <div id="emoji-panel" style="display: none; padding: 12px; background: #f8fafc; border-radius: 12px; margin-bottom: 12px; max-height: 200px; overflow-y: auto;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 600; font-size: 14px; color: #374151;">😊 ${t('feed.emojis', 'Emojis')}</span>
              <button type="button" id="close-emoji" style="background: none; border: none; cursor: pointer; padding: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(10, 1fr); gap: 4px;">
              ${emojiGridHtml}
            </div>
          </div>

          <!-- Hashtag Panel (hidden by default) -->
          <div id="hashtag-panel" style="display: none; padding: 12px; background: #f8fafc; border-radius: 12px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 600; font-size: 14px; color: #374151;"># ${t('feed.trendingHashtags', 'Trending Hashtags')}</span>
              <button type="button" id="close-hashtag" style="background: none; border: none; cursor: pointer; padding: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${hashtagsHtml}
            </div>
            <div style="margin-top: 12px;">
              <input type="text" id="custom-hashtag" placeholder="${t('feed.addCustomHashtag', 'Add custom hashtag...')}" style="width: 100%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none;" />
            </div>
          </div>

          <!-- Mention Panel (hidden by default) -->
          <div id="mention-panel" style="display: none; padding: 12px; background: #f8fafc; border-radius: 12px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 600; font-size: 14px; color: #374151;">@ ${t('feed.mentionUser', 'Mention User')}</span>
              <button type="button" id="close-mention" style="background: none; border: none; cursor: pointer; padding: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <input type="text" id="mention-search" placeholder="${t('feed.searchUsers', 'Search users...')}" style="width: 100%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none;" />
            <div id="mention-results" style="margin-top: 8px;"></div>
          </div>
          
          <!-- Action buttons -->
          <div style="display: flex; align-items: center; gap: 4px; padding-top: 16px; border-top: 1px solid #e5e7eb; margin-top: 16px; flex-wrap: wrap;">
            <button type="button" id="btn-emoji" class="swal-action-btn" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
              <span style="color: #f59e0b;">${t('feed.emoji', 'Emoji')}</span>
            </button>
            <button type="button" id="btn-hashtag" class="swal-action-btn" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c76e6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
              <span style="color: #1c76e6;">${t('feed.hashtag', 'Hashtag')}</span>
            </button>
            <button type="button" id="btn-mention" class="swal-action-btn" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/></svg>
              <span style="color: #8b5cf6;">${t('feed.mention', 'Mention')}</span>
            </button>
            <div style="flex: 1;"></div>
            <button type="button" id="btn-image" class="swal-action-btn" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            </button>
            <button type="button" id="btn-live" class="swal-action-btn" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="2"/><path d="M4.93 19.07a10 10 0 0 1 0-14.14"/><path d="M7.76 16.24a6 6 0 0 1 0-8.48"/><path d="M16.24 7.76a6 6 0 0 1 0 8.48"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
            </button>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: `<span style="display: flex; align-items: center; gap: 8px;">📤 ${t('feed.sharePost', 'Share Post')}</span>`,
      cancelButtonText: t('common.cancel', 'Cancel'),
      confirmButtonColor: '#1c76e6',
      cancelButtonColor: '#6b7280',
      width: '580px',
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
        const textarea = document.getElementById('swal-post-content') as HTMLTextAreaElement;
        const charCount = document.getElementById('char-count') as HTMLSpanElement;
        const charCounter = document.getElementById('char-counter') as HTMLDivElement;
        const emojiPanel = document.getElementById('emoji-panel') as HTMLDivElement;
        const hashtagPanel = document.getElementById('hashtag-panel') as HTMLDivElement;
        const mentionPanel = document.getElementById('mention-panel') as HTMLDivElement;
        const mentionResults = document.getElementById('mention-results') as HTMLDivElement;
        const mentionSearch = document.getElementById('mention-search') as HTMLInputElement;
        const customHashtag = document.getElementById('custom-hashtag') as HTMLInputElement;

        // Character counter
        const updateCharCount = () => {
          const count = textarea.value.length;
          charCount.textContent = count.toString();
          if (count > MAX_CHARACTERS * 0.9) {
            charCounter.style.color = '#ef4444';
          } else if (count > MAX_CHARACTERS * 0.7) {
            charCounter.style.color = '#f59e0b';
          } else {
            charCounter.style.color = '#666';
          }
        };
        textarea.addEventListener('input', updateCharCount);

        // Insert text at cursor
        const insertAtCursor = (text: string) => {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const before = textarea.value.substring(0, start);
          const after = textarea.value.substring(end);
          textarea.value = before + text + after;
          textarea.selectionStart = textarea.selectionEnd = start + text.length;
          textarea.focus();
          updateCharCount();
        };

        // Panel toggle helpers
        const closeAllPanels = () => {
          emojiPanel.style.display = 'none';
          hashtagPanel.style.display = 'none';
          mentionPanel.style.display = 'none';
        };

        // Emoji functionality
        document.getElementById('btn-emoji')?.addEventListener('click', () => {
          const isVisible = emojiPanel.style.display === 'block';
          closeAllPanels();
          emojiPanel.style.display = isVisible ? 'none' : 'block';
        });

        document.getElementById('close-emoji')?.addEventListener('click', () => {
          emojiPanel.style.display = 'none';
        });

        document.querySelectorAll('.emoji-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const emoji = (e.currentTarget as HTMLButtonElement).dataset.emoji;
            if (emoji) insertAtCursor(emoji);
          });
          btn.addEventListener('mouseenter', (e) => {
            (e.currentTarget as HTMLElement).style.background = '#e5e7eb';
          });
          btn.addEventListener('mouseleave', (e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
          });
        });

        // Hashtag functionality
        document.getElementById('btn-hashtag')?.addEventListener('click', () => {
          const isVisible = hashtagPanel.style.display === 'block';
          closeAllPanels();
          hashtagPanel.style.display = isVisible ? 'none' : 'block';
        });

        document.getElementById('close-hashtag')?.addEventListener('click', () => {
          hashtagPanel.style.display = 'none';
        });

        document.querySelectorAll('.hashtag-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const hashtag = (e.currentTarget as HTMLButtonElement).dataset.hashtag;
            if (hashtag) insertAtCursor(' ' + hashtag + ' ');
          });
          btn.addEventListener('mouseenter', (e) => {
            (e.currentTarget as HTMLElement).style.background = '#1c76e6';
            (e.currentTarget as HTMLElement).style.color = 'white';
            (e.currentTarget as HTMLElement).style.borderColor = '#1c76e6';
          });
          btn.addEventListener('mouseleave', (e) => {
            (e.currentTarget as HTMLElement).style.background = '#f8fafc';
            (e.currentTarget as HTMLElement).style.color = '#1c76e6';
            (e.currentTarget as HTMLElement).style.borderColor = '#e5e7eb';
          });
        });

        customHashtag?.addEventListener('keydown', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            let tag = customHashtag.value.trim();
            if (tag) {
              if (!tag.startsWith('#')) tag = '#' + tag;
              insertAtCursor(' ' + tag + ' ');
              customHashtag.value = '';
            }
          }
        });

        // Mention functionality
        document.getElementById('btn-mention')?.addEventListener('click', () => {
          const isVisible = mentionPanel.style.display === 'block';
          closeAllPanels();
          mentionPanel.style.display = isVisible ? 'none' : 'block';
          if (!isVisible) mentionSearch?.focus();
        });

        document.getElementById('close-mention')?.addEventListener('click', () => {
          mentionPanel.style.display = 'none';
        });

        let searchTimeout: number;
        mentionSearch?.addEventListener('input', () => {
          clearTimeout(searchTimeout);
          const query = mentionSearch.value.trim();
          
          if (query.length < 2) {
            mentionResults.innerHTML = '<div style="color: #666; font-size: 13px; padding: 8px;">Type at least 2 characters to search...</div>';
            return;
          }

          mentionResults.innerHTML = '<div style="color: #666; font-size: 13px; padding: 8px;">Searching...</div>';
          
          searchTimeout = window.setTimeout(async () => {
            const users = await searchUsers(query);
            
            if (users.length === 0) {
              mentionResults.innerHTML = '<div style="color: #666; font-size: 13px; padding: 8px;">No users found</div>';
              return;
            }

            mentionResults.innerHTML = users.map(u => `
              <button type="button" class="mention-user-btn" data-username="${u.username}" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px; border: none; background: transparent; cursor: pointer; border-radius: 8px; transition: background 0.2s; text-align: left;">
                <div style="width: 36px; height: 36px; border-radius: 50%; overflow: hidden; background: linear-gradient(135deg, #1c76e6, #8b5cf6); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                  ${u.avatar_url 
                    ? `<img src="${u.avatar_url}" style="width: 100%; height: 100%; object-fit: cover;" />` 
                    : `<span style="color: white; font-weight: 600; font-size: 14px;">${(u.display_name || u.username || 'U')[0].toUpperCase()}</span>`
                  }
                </div>
                <div>
                  <div style="font-weight: 600; font-size: 14px; color: #1a1a2e;">${u.display_name || u.username}</div>
                  <div style="font-size: 12px; color: #666;">@${u.username}</div>
                </div>
              </button>
            `).join('');

            document.querySelectorAll('.mention-user-btn').forEach(btn => {
              btn.addEventListener('click', (e) => {
                const username = (e.currentTarget as HTMLButtonElement).dataset.username;
                if (username) {
                  insertAtCursor('@' + username + ' ');
                  mentionPanel.style.display = 'none';
                  mentionSearch.value = '';
                  mentionResults.innerHTML = '';
                }
              });
              btn.addEventListener('mouseenter', (e) => {
                (e.currentTarget as HTMLElement).style.background = '#f1f5f9';
              });
              btn.addEventListener('mouseleave', (e) => {
                (e.currentTarget as HTMLElement).style.background = 'transparent';
              });
            });
          }, 300);
        });

        // Add hover effects to action buttons
        document.querySelectorAll('.swal-action-btn').forEach(btn => {
          btn.addEventListener('mouseenter', () => {
            (btn as HTMLElement).style.background = '#f1f5f9';
          });
          btn.addEventListener('mouseleave', () => {
            (btn as HTMLElement).style.background = 'transparent';
          });
        });

        // Focus textarea
        textarea?.focus();
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
            <Smile className="h-4 w-4 text-amber-500" />
            <span className="text-[10px] sm:text-xs hidden xs:inline">{t('feed.emoji', 'Emoji')}</span>
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-muted-foreground hover:text-foreground gap-1 sm:gap-1.5 px-1.5 sm:px-2.5 h-8 sm:h-9 flex-shrink-0"
            onClick={handleOpenPostModal}
          >
            <Hash className="h-4 w-4 text-primary" />
            <span className="text-[10px] sm:text-xs hidden xs:inline">{t('feed.hashtag', 'Hashtag')}</span>
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
