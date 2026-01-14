import { Image, Paperclip, Radio, Hash, AtSign, Globe, Smile, X, FileAudio, FileText, Film, Upload, Users, FileImage, Sparkles, Lock, UserCheck, List, Eye } from "lucide-react";
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
const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'gif' | 'audio' | 'document';
}

interface TaggedItem {
  id: string;
  type: 'user' | 'group' | 'page';
  name: string;
  avatar?: string;
}

interface SelectedTopic {
  id: string;
  name: string;
  icon: string;
  color: string;
}

interface CustomList {
  id: string;
  name: string;
  icon: string;
  color: string;
  member_count?: number;
}

export const PostCreator = ({ onPostCreated }: { onPostCreated?: () => void }) => {
  const { user, profile } = useAuth();
  const { t } = useTranslation();

  const searchUsers = async (query: string): Promise<Array<{id: string, username: string, display_name: string, avatar_url: string}>> => {
    if (!query || query.length < 2) return [];
    
    const { data, error } = await supabase
      .from('profiles')
      .select('user_id, username, display_name, avatar_url')
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(5);
    
    if (error) {
      console.error('Error searching users:', error);
      return [];
    }
    
    return data?.map(d => ({ id: d.user_id, username: d.username || '', display_name: d.display_name || '', avatar_url: d.avatar_url || '' })) || [];
  };

  const searchGroups = async (query: string): Promise<Array<{id: string, name: string, avatar_url: string, member_count: number}>> => {
    if (!query || query.length < 2) return [];
    
    const { data, error } = await supabase
      .from('groups')
      .select('id, name, avatar_url, member_count')
      .ilike('name', `%${query}%`)
      .limit(5);
    
    if (error) {
      console.error('Error searching groups:', error);
      return [];
    }
    
    return data || [];
  };

  const searchPages = async (query: string): Promise<Array<{id: string, name: string, avatar_url: string, category: string}>> => {
    if (!query || query.length < 2) return [];
    
    const { data, error } = await supabase
      .from('pages')
      .select('id, name, avatar_url, category')
      .ilike('name', `%${query}%`)
      .limit(5);
    
    if (error) {
      console.error('Error searching pages:', error);
      return [];
    }
    
    return data || [];
  };

  const fetchTopics = async (): Promise<Array<{id: string, name: string, slug: string, icon: string, color: string, is_trending: boolean}>> => {
    const { data, error } = await supabase
      .from('topics')
      .select('id, name, slug, icon, color, is_trending')
      .order('is_trending', { ascending: false })
      .limit(15);
    
    if (error) {
      console.error('Error fetching topics:', error);
      return [];
    }
    
    return data || [];
  };

  const fetchCustomLists = async (): Promise<CustomList[]> => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('custom_lists')
      .select('id, name, icon, color')
      .eq('user_id', user.id)
      .order('name');
    
    if (error) {
      console.error('Error fetching custom lists:', error);
      return [];
    }
    
    return data || [];
  };

  const getFileType = (file: File): MediaFile['type'] => {
    const mimeType = file.type;
    if (mimeType.startsWith('image/gif')) return 'gif';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const uploadFiles = async (files: MediaFile[]): Promise<string[]> => {
    if (!user) return [];
    
    const uploadedUrls: string[] = [];
    
    for (const mediaFile of files) {
      const fileExt = mediaFile.file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('post-media')
        .upload(fileName, mediaFile.file, {
          cacheControl: '3600',
          upsert: false
        });
      
      if (error) {
        console.error('Upload error:', error);
        throw error;
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('post-media')
        .getPublicUrl(data.path);
      
      uploadedUrls.push(publicUrl);
    }
    
    return uploadedUrls;
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

    // Track uploaded files, tags, and custom lists
    let mediaFiles: MediaFile[] = [];
    let taggedItems: TaggedItem[] = [];
    let selectedTopics: SelectedTopic[] = [];
    let selectedCustomLists: CustomList[] = [];

    // Fetch topics and custom lists for display
    const [topics, customLists] = await Promise.all([fetchTopics(), fetchCustomLists()]);
    
    const topicsHtml = topics.map(topic => 
      `<button type="button" class="topic-btn" data-topic-id="${topic.id}" data-topic-name="${topic.name}" data-topic-icon="${topic.icon}" data-topic-color="${topic.color}" style="display: inline-flex; align-items: center; gap: 6px; font-size: 13px; padding: 6px 12px; border: 1px solid #e5e7eb; background: #f8fafc; cursor: pointer; border-radius: 16px; transition: all 0.2s;">
        <span>${topic.icon}</span>
        <span style="color: ${topic.color};">${topic.name}</span>
        ${topic.is_trending ? '<span style="font-size: 10px; color: #ef4444;">🔥</span>' : ''}
      </button>`
    ).join('');

    const customListsHtml = customLists.length > 0 
      ? customLists.map(list => 
          `<button type="button" class="custom-list-btn" data-list-id="${list.id}" data-list-name="${list.name}" data-list-icon="${list.icon}" data-list-color="${list.color}" style="display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 12px; border: 1px solid #e5e7eb; background: white; cursor: pointer; border-radius: 8px; text-align: left; transition: all 0.2s;">
            <span style="font-size: 18px;">${list.icon}</span>
            <span style="font-weight: 500; color: #374151;">${list.name}</span>
          </button>`
        ).join('')
      : `<div style="text-align: center; padding: 20px; color: #666;">
          <p style="font-size: 14px; margin-bottom: 8px;">${t('feed.noCustomLists', 'No custom lists yet')}</p>
          <p style="font-size: 12px; color: #999;">${t('feed.createListsHint', 'Create lists to organize your friends')}</p>
        </div>`;

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
              <button type="button" id="visibility-btn" style="display: flex; align-items: center; gap: 6px; font-size: 13px; color: #666; background: #f1f5f9; border: none; border-radius: 16px; padding: 6px 12px; cursor: pointer; margin-top: 4px;">
                <span id="visibility-icon">🌍</span>
                <span id="visibility-label">${t('feed.public', 'Public')}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>
              </button>
              <input type="hidden" id="swal-visibility" value="public" />
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
              min-height: 120px;
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

          <!-- Tagged Items Preview -->
          <div id="tagged-preview" style="display: none; margin: 12px 0; padding: 8px 12px; background: #f0f9ff; border-radius: 8px; border: 1px solid #bae6fd;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 12px; color: #0369a1; font-weight: 600;">👥 ${t('feed.taggedWith', 'Tagged with')}:</span>
            </div>
            <div id="tagged-items-list" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
          </div>

          <!-- Selected Topics Preview -->
          <div id="topics-preview" style="display: none; margin: 12px 0; padding: 8px 12px; background: #f5f3ff; border-radius: 8px; border: 1px solid #c4b5fd;">
            <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 6px;">
              <span style="font-size: 12px; color: #6d28d9; font-weight: 600;">🏷️ ${t('feed.topics', 'Topics')}:</span>
            </div>
            <div id="topics-list" style="display: flex; flex-wrap: wrap; gap: 6px;"></div>
          </div>

          <!-- Media Preview Area -->
          <div id="media-preview" style="display: none; margin: 16px 0; padding: 12px; background: #f8fafc; border-radius: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 600; font-size: 14px; color: #374151;">📎 ${t('feed.attachedMedia', 'Attached Media')}</span>
              <span id="media-count" style="font-size: 12px; color: #666;">0/${MAX_FILES}</span>
            </div>
            <div id="media-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 8px;"></div>
          </div>

          <!-- Hidden file inputs -->
          <input type="file" id="file-image" accept="image/*" multiple style="display: none;" />
          <input type="file" id="file-video" accept="video/*" multiple style="display: none;" />
          <input type="file" id="file-gif" accept="image/gif" multiple style="display: none;" />
          <input type="file" id="file-audio" accept="audio/*" multiple style="display: none;" />
          <input type="file" id="file-document" accept=".pdf,.doc,.docx" multiple style="display: none;" />

          <!-- Emoji Panel -->
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

          <!-- Hashtag Panel -->
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

          <!-- Tag Panel (Friends, Groups, Pages) -->
          <div id="tag-panel" style="display: none; padding: 12px; background: #f8fafc; border-radius: 12px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: 600; font-size: 14px; color: #374151;">🏷️ ${t('feed.tagPeople', 'Tag People & Pages')}</span>
              <button type="button" id="close-tag" style="background: none; border: none; cursor: pointer; padding: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <!-- Tag Type Tabs -->
            <div style="display: flex; gap: 8px; margin-bottom: 12px;">
              <button type="button" id="tab-friends" class="tag-tab active-tab" style="flex: 1; padding: 8px; border: none; background: #1c76e6; color: white; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500;">
                👤 ${t('feed.friends', 'Friends')}
              </button>
              <button type="button" id="tab-groups" class="tag-tab" style="flex: 1; padding: 8px; border: 1px solid #e5e7eb; background: white; color: #374151; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500;">
                👥 ${t('feed.groups', 'Groups')}
              </button>
              <button type="button" id="tab-pages" class="tag-tab" style="flex: 1; padding: 8px; border: 1px solid #e5e7eb; background: white; color: #374151; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 500;">
                📄 ${t('feed.pages', 'Pages')}
              </button>
            </div>
            
            <input type="text" id="tag-search" placeholder="${t('feed.searchToTag', 'Search to tag...')}" style="width: 100%; padding: 10px 14px; border: 1px solid #e5e7eb; border-radius: 8px; font-size: 14px; outline: none; margin-bottom: 8px;" />
            <div id="tag-results" style="max-height: 200px; overflow-y: auto;"></div>
          </div>

          <!-- Topics Panel -->
          <div id="topics-panel" style="display: none; padding: 12px; background: #f8fafc; border-radius: 12px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
              <span style="font-weight: 600; font-size: 14px; color: #374151;">✨ ${t('feed.addTopics', 'Add Topics/Interests')}</span>
              <button type="button" id="close-topics" style="background: none; border: none; cursor: pointer; padding: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <p style="font-size: 12px; color: #666; margin-bottom: 12px;">${t('feed.selectTopicsHelp', 'Select topics that best describe your post')}</p>
            <div style="display: flex; flex-wrap: wrap; gap: 8px;">
              ${topicsHtml}
            </div>
          </div>

          <!-- Privacy/Visibility Panel -->
          <div id="privacy-panel" style="display: none; padding: 16px; background: #f8fafc; border-radius: 12px; margin-bottom: 12px; border: 1px solid #e5e7eb;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: 600; font-size: 14px; color: #374151;">👁️ ${t('feed.whoCanSee', 'Who can see this post?')}</span>
              <button type="button" id="close-privacy" style="background: none; border: none; cursor: pointer; padding: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <button type="button" class="privacy-option-btn" data-value="public" data-icon="🌍" data-label="${t('feed.public', 'Public')}" style="display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px; border: 2px solid #1c76e6; background: #eff6ff; cursor: pointer; border-radius: 10px; text-align: left;">
                <span style="font-size: 24px;">🌍</span>
                <div>
                  <div style="font-weight: 600; color: #1c76e6;">${t('feed.public', 'Public')}</div>
                  <div style="font-size: 12px; color: #666;">${t('feed.publicDesc', 'Anyone can see this post')}</div>
                </div>
              </button>
              
              <button type="button" class="privacy-option-btn" data-value="friends" data-icon="👥" data-label="${t('feed.friendsOnly', 'Friends Only')}" style="display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px; border: 1px solid #e5e7eb; background: white; cursor: pointer; border-radius: 10px; text-align: left;">
                <span style="font-size: 24px;">👥</span>
                <div>
                  <div style="font-weight: 600; color: #374151;">${t('feed.friendsOnly', 'Friends Only')}</div>
                  <div style="font-size: 12px; color: #666;">${t('feed.friendsDesc', 'Only your friends can see this')}</div>
                </div>
              </button>
              
              <button type="button" class="privacy-option-btn" data-value="followers" data-icon="👤" data-label="${t('feed.followersOnly', 'Followers Only')}" style="display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px; border: 1px solid #e5e7eb; background: white; cursor: pointer; border-radius: 10px; text-align: left;">
                <span style="font-size: 24px;">👤</span>
                <div>
                  <div style="font-weight: 600; color: #374151;">${t('feed.followersOnly', 'Followers Only')}</div>
                  <div style="font-size: 12px; color: #666;">${t('feed.followersDesc', 'Only people who follow you')}</div>
                </div>
              </button>
              
              <button type="button" class="privacy-option-btn" data-value="custom" data-icon="📋" data-label="${t('feed.customLists', 'Custom Lists')}" style="display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px; border: 1px solid #e5e7eb; background: white; cursor: pointer; border-radius: 10px; text-align: left;">
                <span style="font-size: 24px;">📋</span>
                <div>
                  <div style="font-weight: 600; color: #374151;">${t('feed.customLists', 'Custom Lists')}</div>
                  <div style="font-size: 12px; color: #666;">${t('feed.customDesc', 'Share with specific friend lists')}</div>
                </div>
              </button>
              
              <button type="button" class="privacy-option-btn" data-value="private" data-icon="🔒" data-label="${t('feed.private', 'Private')}" style="display: flex; align-items: center; gap: 12px; width: 100%; padding: 12px; border: 1px solid #e5e7eb; background: white; cursor: pointer; border-radius: 10px; text-align: left;">
                <span style="font-size: 24px;">🔒</span>
                <div>
                  <div style="font-weight: 600; color: #374151;">${t('feed.private', 'Private')}</div>
                  <div style="font-size: 12px; color: #666;">${t('feed.privateDesc', 'Only you can see this')}</div>
                </div>
              </button>
            </div>
          </div>

          <!-- Custom Lists Selection Panel -->
          <div id="custom-lists-panel" style="display: none; padding: 16px; background: #fef3c7; border-radius: 12px; margin-bottom: 12px; border: 1px solid #fbbf24;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: 600; font-size: 14px; color: #92400e;">📋 ${t('feed.selectLists', 'Select Custom Lists')}</span>
              <button type="button" id="close-custom-lists" style="background: none; border: none; cursor: pointer; padding: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <p style="font-size: 12px; color: #92400e; margin-bottom: 12px;">${t('feed.selectListsHelp', 'Choose which lists can see this post')}</p>
            <div id="custom-lists-container" style="display: flex; flex-direction: column; gap: 8px; max-height: 200px; overflow-y: auto;">
              ${customListsHtml}
            </div>
            <div id="selected-lists-preview" style="display: none; margin-top: 12px; padding-top: 12px; border-top: 1px solid #fbbf24;">
              <span style="font-size: 12px; color: #92400e; font-weight: 600;">${t('feed.selectedLists', 'Selected')}:</span>
              <div id="selected-lists-tags" style="display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px;"></div>
            </div>
          </div>

          <!-- Mention Panel -->
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

          <!-- Media Upload Panel -->
          <div id="media-panel" style="display: none; padding: 16px; background: #f8fafc; border-radius: 12px; margin-bottom: 12px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span style="font-weight: 600; font-size: 14px; color: #374151;">📁 ${t('feed.uploadMedia', 'Upload Media')}</span>
              <button type="button" id="close-media" style="background: none; border: none; cursor: pointer; padding: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </div>
            <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px;">
              <button type="button" id="upload-image" style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; border: 2px dashed #10b981; background: #ecfdf5; cursor: pointer; border-radius: 12px; transition: all 0.2s;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                <span style="font-size: 11px; color: #10b981; font-weight: 500;">${t('feed.photos', 'Photos')}</span>
              </button>
              <button type="button" id="upload-video" style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; border: 2px dashed #3b82f6; background: #eff6ff; cursor: pointer; border-radius: 12px; transition: all 0.2s;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><path d="m22 8-6 4 6 4V8Z"/><rect width="14" height="12" x="2" y="6" rx="2" ry="2"/></svg>
                <span style="font-size: 11px; color: #3b82f6; font-weight: 500;">${t('feed.videos', 'Videos')}</span>
              </button>
              <button type="button" id="upload-gif" style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; border: 2px dashed #8b5cf6; background: #f5f3ff; cursor: pointer; border-radius: 12px; transition: all 0.2s;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><text x="12" y="15" font-size="8" fill="#8b5cf6" text-anchor="middle" font-weight="bold">GIF</text></svg>
                <span style="font-size: 11px; color: #8b5cf6; font-weight: 500;">GIFs</span>
              </button>
              <button type="button" id="upload-audio" style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; border: 2px dashed #f59e0b; background: #fffbeb; cursor: pointer; border-radius: 12px; transition: all 0.2s;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                <span style="font-size: 11px; color: #f59e0b; font-weight: 500;">${t('feed.audio', 'Audio')}</span>
              </button>
              <button type="button" id="upload-document" style="display: flex; flex-direction: column; align-items: center; gap: 6px; padding: 16px 8px; border: 2px dashed #ef4444; background: #fef2f2; cursor: pointer; border-radius: 12px; transition: all 0.2s;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14,2 14,8 20,8"/></svg>
                <span style="font-size: 11px; color: #ef4444; font-weight: 500;">${t('feed.docs', 'Docs')}</span>
              </button>
            </div>
            <p style="margin-top: 12px; font-size: 12px; color: #666; text-align: center;">
              ${t('feed.maxFileSize', 'Max 50MB per file')} • ${t('feed.maxFiles', 'Up to 10 files')}
            </p>
          </div>
          
          <!-- Action buttons -->
          <div style="display: flex; align-items: center; gap: 4px; padding-top: 16px; border-top: 1px solid #e5e7eb; margin-top: 16px; flex-wrap: wrap;">
            <button type="button" id="btn-media" class="swal-action-btn" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <span style="color: #10b981;">${t('feed.media', 'Media')}</span>
            </button>
            <button type="button" id="btn-emoji" class="swal-action-btn" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" x2="9.01" y1="9" y2="9"/><line x1="15" x2="15.01" y1="9" y2="9"/></svg>
              <span style="color: #f59e0b;">${t('feed.emoji', 'Emoji')}</span>
            </button>
            <button type="button" id="btn-hashtag" class="swal-action-btn" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c76e6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="9" y2="9"/><line x1="4" x2="20" y1="15" y2="15"/><line x1="10" x2="8" y1="3" y2="21"/><line x1="16" x2="14" y1="3" y2="21"/></svg>
              <span style="color: #1c76e6;">${t('feed.hashtag', 'Hashtag')}</span>
            </button>
            <button type="button" id="btn-tag" class="swal-action-btn" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              <span style="color: #0ea5e9;">${t('feed.tag', 'Tag')}</span>
            </button>
            <button type="button" id="btn-topics" class="swal-action-btn" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span style="color: #a855f7;">${t('feed.topics', 'Topics')}</span>
            </button>
            <button type="button" id="btn-mention" class="swal-action-btn" style="display: flex; align-items: center; gap: 6px; padding: 8px 12px; border-radius: 8px; border: none; background: transparent; cursor: pointer; color: #666; font-size: 13px; transition: background 0.2s;">
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
      width: '600px',
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
        const mediaPanel = document.getElementById('media-panel') as HTMLDivElement;
        const mentionResults = document.getElementById('mention-results') as HTMLDivElement;
        const mentionSearch = document.getElementById('mention-search') as HTMLInputElement;
        const customHashtag = document.getElementById('custom-hashtag') as HTMLInputElement;
        const mediaPreview = document.getElementById('media-preview') as HTMLDivElement;
        const mediaGrid = document.getElementById('media-grid') as HTMLDivElement;
        const mediaCountSpan = document.getElementById('media-count') as HTMLSpanElement;

        // Update media preview
        const updateMediaPreview = () => {
          if (mediaFiles.length === 0) {
            mediaPreview.style.display = 'none';
            return;
          }
          
          mediaPreview.style.display = 'block';
          mediaCountSpan.textContent = `${mediaFiles.length}/${MAX_FILES}`;
          
          mediaGrid.innerHTML = mediaFiles.map((media, index) => {
            const typeIcons: Record<string, string> = {
              image: '🖼️',
              video: '🎬',
              gif: '✨',
              audio: '🎵',
              document: '📄'
            };
            
            let previewContent = '';
            if (media.type === 'image' || media.type === 'gif') {
              previewContent = `<img src="${media.preview}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 8px;" />`;
            } else if (media.type === 'video') {
              previewContent = `<video src="${media.preview}" style="width: 100%; height: 80px; object-fit: cover; border-radius: 8px;" />`;
            } else {
              previewContent = `<div style="width: 100%; height: 80px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #e5e7eb; border-radius: 8px;">
                <span style="font-size: 24px;">${typeIcons[media.type]}</span>
                <span style="font-size: 10px; color: #666; margin-top: 4px; max-width: 90%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${media.file.name}</span>
              </div>`;
            }
            
            return `
              <div style="position: relative;">
                ${previewContent}
                <button type="button" class="remove-media-btn" data-index="${index}" style="position: absolute; top: -6px; right: -6px; width: 20px; height: 20px; border-radius: 50%; background: #ef4444; border: 2px solid white; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </div>
            `;
          }).join('');
          
          // Add remove handlers
          document.querySelectorAll('.remove-media-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const index = parseInt((e.currentTarget as HTMLButtonElement).dataset.index || '0');
              URL.revokeObjectURL(mediaFiles[index].preview);
              mediaFiles.splice(index, 1);
              updateMediaPreview();
            });
          });
        };

        // Handle file selection
        const handleFileSelect = (files: FileList | null, type: MediaFile['type']) => {
          if (!files) return;
          
          const remainingSlots = MAX_FILES - mediaFiles.length;
          const filesToAdd = Array.from(files).slice(0, remainingSlots);
          
          for (const file of filesToAdd) {
            if (file.size > MAX_FILE_SIZE) {
              Swal.showValidationMessage(`${file.name} is too large (max 50MB)`);
              continue;
            }
            
            const preview = URL.createObjectURL(file);
            mediaFiles.push({
              file,
              preview,
              type: type === 'image' ? getFileType(file) : type
            });
          }
          
          updateMediaPreview();
          mediaPanel.style.display = 'none';
        };

        // File input handlers
        document.getElementById('file-image')?.addEventListener('change', (e) => {
          handleFileSelect((e.target as HTMLInputElement).files, 'image');
        });
        document.getElementById('file-video')?.addEventListener('change', (e) => {
          handleFileSelect((e.target as HTMLInputElement).files, 'video');
        });
        document.getElementById('file-gif')?.addEventListener('change', (e) => {
          handleFileSelect((e.target as HTMLInputElement).files, 'gif');
        });
        document.getElementById('file-audio')?.addEventListener('change', (e) => {
          handleFileSelect((e.target as HTMLInputElement).files, 'audio');
        });
        document.getElementById('file-document')?.addEventListener('change', (e) => {
          handleFileSelect((e.target as HTMLInputElement).files, 'document');
        });

        // Upload button handlers
        document.getElementById('upload-image')?.addEventListener('click', () => {
          document.getElementById('file-image')?.click();
        });
        document.getElementById('upload-video')?.addEventListener('click', () => {
          document.getElementById('file-video')?.click();
        });
        document.getElementById('upload-gif')?.addEventListener('click', () => {
          document.getElementById('file-gif')?.click();
        });
        document.getElementById('upload-audio')?.addEventListener('click', () => {
          document.getElementById('file-audio')?.click();
        });
        document.getElementById('upload-document')?.addEventListener('click', () => {
          document.getElementById('file-document')?.click();
        });

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
        const tagPanel = document.getElementById('tag-panel') as HTMLDivElement;
        const topicsPanel = document.getElementById('topics-panel') as HTMLDivElement;
        const privacyPanel = document.getElementById('privacy-panel') as HTMLDivElement;
        const customListsPanel = document.getElementById('custom-lists-panel') as HTMLDivElement;
        const tagSearch = document.getElementById('tag-search') as HTMLInputElement;
        const tagResults = document.getElementById('tag-results') as HTMLDivElement;
        const taggedPreview = document.getElementById('tagged-preview') as HTMLDivElement;
        const taggedItemsList = document.getElementById('tagged-items-list') as HTMLDivElement;
        const topicsPreview = document.getElementById('topics-preview') as HTMLDivElement;
        const topicsList = document.getElementById('topics-list') as HTMLDivElement;
        const visibilityInput = document.getElementById('swal-visibility') as HTMLInputElement;
        const visibilityBtn = document.getElementById('visibility-btn') as HTMLButtonElement;
        const visibilityIcon = document.getElementById('visibility-icon') as HTMLSpanElement;
        const visibilityLabel = document.getElementById('visibility-label') as HTMLSpanElement;
        const selectedListsPreview = document.getElementById('selected-lists-preview') as HTMLDivElement;
        const selectedListsTags = document.getElementById('selected-lists-tags') as HTMLDivElement;
        
        let currentTagType: 'user' | 'group' | 'page' = 'user';
        
        const closeAllPanels = () => {
          emojiPanel.style.display = 'none';
          hashtagPanel.style.display = 'none';
          mentionPanel.style.display = 'none';
          mediaPanel.style.display = 'none';
          tagPanel.style.display = 'none';
          topicsPanel.style.display = 'none';
          privacyPanel.style.display = 'none';
          customListsPanel.style.display = 'none';
        };

        // Update tagged items preview
        const updateTaggedPreview = () => {
          if (taggedItems.length === 0) {
            taggedPreview.style.display = 'none';
            return;
          }
          
          taggedPreview.style.display = 'block';
          taggedItemsList.innerHTML = taggedItems.map((item, index) => {
            const typeIcons = { user: '👤', group: '👥', page: '📄' };
            return `
              <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: white; border: 1px solid #bae6fd; border-radius: 16px; font-size: 12px;">
                <span>${typeIcons[item.type]}</span>
                <span style="color: #0369a1; font-weight: 500;">${item.name}</span>
                <button type="button" class="remove-tag-btn" data-index="${index}" style="background: none; border: none; cursor: pointer; padding: 0; margin-left: 2px;">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0369a1" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                </button>
              </span>
            `;
          }).join('');
          
          document.querySelectorAll('.remove-tag-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const index = parseInt((e.currentTarget as HTMLButtonElement).dataset.index || '0');
              taggedItems.splice(index, 1);
              updateTaggedPreview();
            });
          });
        };

        // Update topics preview
        const updateTopicsPreview = () => {
          if (selectedTopics.length === 0) {
            topicsPreview.style.display = 'none';
            return;
          }
          
          topicsPreview.style.display = 'block';
          topicsList.innerHTML = selectedTopics.map((topic, index) => `
            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: white; border: 1px solid #c4b5fd; border-radius: 16px; font-size: 12px;">
              <span>${topic.icon}</span>
              <span style="color: ${topic.color}; font-weight: 500;">${topic.name}</span>
              <button type="button" class="remove-topic-btn" data-index="${index}" style="background: none; border: none; cursor: pointer; padding: 0; margin-left: 2px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
          `).join('');
          
          document.querySelectorAll('.remove-topic-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const index = parseInt((e.currentTarget as HTMLButtonElement).dataset.index || '0');
              selectedTopics.splice(index, 1);
              updateTopicsPreview();
              // Update topic button state
              document.querySelectorAll('.topic-btn').forEach(topicBtn => {
                const btnElement = topicBtn as HTMLButtonElement;
                const isSelected = selectedTopics.some(t => t.id === btnElement.dataset.topicId);
                btnElement.style.background = isSelected ? '#8b5cf6' : '#f8fafc';
                btnElement.style.color = isSelected ? 'white' : '';
                btnElement.style.borderColor = isSelected ? '#8b5cf6' : '#e5e7eb';
              });
            });
          });
        };

        // Media panel toggle
        document.getElementById('btn-media')?.addEventListener('click', () => {
          const isVisible = mediaPanel.style.display === 'block';
          closeAllPanels();
          mediaPanel.style.display = isVisible ? 'none' : 'block';
        });

        document.getElementById('close-media')?.addEventListener('click', () => {
          mediaPanel.style.display = 'none';
        });

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

        // Tag panel functionality (Friends, Groups, Pages)
        document.getElementById('btn-tag')?.addEventListener('click', () => {
          const isVisible = tagPanel.style.display === 'block';
          closeAllPanels();
          tagPanel.style.display = isVisible ? 'none' : 'block';
          if (!isVisible) tagSearch?.focus();
        });

        document.getElementById('close-tag')?.addEventListener('click', () => {
          tagPanel.style.display = 'none';
        });

        // Tag type tabs
        document.querySelectorAll('.tag-tab').forEach(tab => {
          tab.addEventListener('click', (e) => {
            const tabId = (e.currentTarget as HTMLButtonElement).id;
            currentTagType = tabId === 'tab-groups' ? 'group' : tabId === 'tab-pages' ? 'page' : 'user';
            
            document.querySelectorAll('.tag-tab').forEach(t => {
              const el = t as HTMLButtonElement;
              el.style.background = el.id === tabId ? '#1c76e6' : 'white';
              el.style.color = el.id === tabId ? 'white' : '#374151';
              el.style.border = el.id === tabId ? 'none' : '1px solid #e5e7eb';
            });
            
            tagSearch.value = '';
            tagResults.innerHTML = '';
          });
        });

        // Tag search
        let tagSearchTimeout: number;
        tagSearch?.addEventListener('input', () => {
          clearTimeout(tagSearchTimeout);
          const query = tagSearch.value.trim();
          
          if (query.length < 2) {
            tagResults.innerHTML = '<div style="color: #666; font-size: 13px; padding: 8px;">Type at least 2 characters...</div>';
            return;
          }

          tagResults.innerHTML = '<div style="color: #666; font-size: 13px; padding: 8px;">Searching...</div>';
          
          tagSearchTimeout = window.setTimeout(async () => {
            let results: any[] = [];
            if (currentTagType === 'user') results = await searchUsers(query);
            else if (currentTagType === 'group') results = await searchGroups(query);
            else results = await searchPages(query);
            
            if (results.length === 0) {
              tagResults.innerHTML = '<div style="color: #666; font-size: 13px; padding: 8px;">No results found</div>';
              return;
            }

            tagResults.innerHTML = results.map(r => `
              <button type="button" class="tag-result-btn" data-id="${r.id || r.user_id}" data-name="${r.display_name || r.name}" data-avatar="${r.avatar_url || ''}" style="display: flex; align-items: center; gap: 10px; width: 100%; padding: 10px; border: none; background: transparent; cursor: pointer; border-radius: 8px; text-align: left;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: linear-gradient(135deg, #1c76e6, #8b5cf6); display: flex; align-items: center; justify-content: center;">
                  ${r.avatar_url ? `<img src="${r.avatar_url}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;" />` : `<span style="color: white; font-weight: 600;">${(r.display_name || r.name || 'U')[0].toUpperCase()}</span>`}
                </div>
                <div style="font-weight: 600; font-size: 14px; color: #1a1a2e;">${r.display_name || r.name}</div>
              </button>
            `).join('');

            document.querySelectorAll('.tag-result-btn').forEach(btn => {
              btn.addEventListener('click', (e) => {
                const el = e.currentTarget as HTMLButtonElement;
                const newTag = { id: el.dataset.id!, type: currentTagType, name: el.dataset.name!, avatar: el.dataset.avatar };
                if (!taggedItems.some(t => t.id === newTag.id)) {
                  taggedItems.push(newTag);
                  updateTaggedPreview();
                }
                tagPanel.style.display = 'none';
                tagSearch.value = '';
              });
            });
          }, 300);
        });

        // Topics panel functionality
        document.getElementById('btn-topics')?.addEventListener('click', () => {
          const isVisible = topicsPanel.style.display === 'block';
          closeAllPanels();
          topicsPanel.style.display = isVisible ? 'none' : 'block';
        });

        document.getElementById('close-topics')?.addEventListener('click', () => {
          topicsPanel.style.display = 'none';
        });

        document.querySelectorAll('.topic-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const el = e.currentTarget as HTMLButtonElement;
            const topicId = el.dataset.topicId!;
            const existingIndex = selectedTopics.findIndex(t => t.id === topicId);
            
            if (existingIndex >= 0) {
              selectedTopics.splice(existingIndex, 1);
              el.style.background = '#f8fafc';
              el.style.borderColor = '#e5e7eb';
            } else {
              selectedTopics.push({ id: topicId, name: el.dataset.topicName!, icon: el.dataset.topicIcon!, color: el.dataset.topicColor! });
              el.style.background = '#8b5cf6';
              el.style.color = 'white';
              el.style.borderColor = '#8b5cf6';
            }
            updateTopicsPreview();
          });
        });
        document.querySelectorAll('.swal-action-btn').forEach(btn => {
          btn.addEventListener('mouseenter', () => {
            (btn as HTMLElement).style.background = '#f1f5f9';
          });
          btn.addEventListener('mouseleave', () => {
            (btn as HTMLElement).style.background = 'transparent';
          });
        });

        // Privacy panel functionality
        const updateSelectedListsPreview = () => {
          if (selectedCustomLists.length === 0) {
            selectedListsPreview.style.display = 'none';
            return;
          }
          
          selectedListsPreview.style.display = 'block';
          selectedListsTags.innerHTML = selectedCustomLists.map((list, index) => `
            <span style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; background: white; border: 1px solid #fbbf24; border-radius: 16px; font-size: 12px;">
              <span>${list.icon}</span>
              <span style="color: #92400e; font-weight: 500;">${list.name}</span>
              <button type="button" class="remove-list-btn" data-index="${index}" style="background: none; border: none; cursor: pointer; padding: 0; margin-left: 2px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#92400e" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
          `).join('');
          
          document.querySelectorAll('.remove-list-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
              const index = parseInt((e.currentTarget as HTMLButtonElement).dataset.index || '0');
              const removedList = selectedCustomLists[index];
              selectedCustomLists.splice(index, 1);
              updateSelectedListsPreview();
              // Update button state
              document.querySelectorAll('.custom-list-btn').forEach(listBtn => {
                const btnElement = listBtn as HTMLButtonElement;
                if (btnElement.dataset.listId === removedList.id) {
                  btnElement.style.background = 'white';
                  btnElement.style.borderColor = '#e5e7eb';
                }
              });
            });
          });
        };

        visibilityBtn?.addEventListener('click', () => {
          const isVisible = privacyPanel.style.display === 'block';
          closeAllPanels();
          privacyPanel.style.display = isVisible ? 'none' : 'block';
        });

        document.getElementById('close-privacy')?.addEventListener('click', () => {
          privacyPanel.style.display = 'none';
        });

        document.getElementById('close-custom-lists')?.addEventListener('click', () => {
          customListsPanel.style.display = 'none';
        });

        document.querySelectorAll('.privacy-option-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const el = e.currentTarget as HTMLButtonElement;
            const value = el.dataset.value!;
            const icon = el.dataset.icon!;
            const label = el.dataset.label!;
            
            // Update hidden input
            visibilityInput.value = value;
            
            // Update button display
            visibilityIcon.textContent = icon;
            visibilityLabel.textContent = label;
            
            // Update button styles
            document.querySelectorAll('.privacy-option-btn').forEach(optBtn => {
              const optElement = optBtn as HTMLButtonElement;
              if (optElement === el) {
                optElement.style.border = '2px solid #1c76e6';
                optElement.style.background = '#eff6ff';
                optElement.querySelector('div > div:first-child')!.setAttribute('style', 'font-weight: 600; color: #1c76e6;');
              } else {
                optElement.style.border = '1px solid #e5e7eb';
                optElement.style.background = 'white';
                optElement.querySelector('div > div:first-child')!.setAttribute('style', 'font-weight: 600; color: #374151;');
              }
            });
            
            // Handle custom lists selection
            if (value === 'custom') {
              privacyPanel.style.display = 'none';
              customListsPanel.style.display = 'block';
            } else {
              privacyPanel.style.display = 'none';
              customListsPanel.style.display = 'none';
              selectedCustomLists.length = 0;
              updateSelectedListsPreview();
            }
          });
        });

        document.querySelectorAll('.custom-list-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            const el = e.currentTarget as HTMLButtonElement;
            const listId = el.dataset.listId!;
            const existingIndex = selectedCustomLists.findIndex(l => l.id === listId);
            
            if (existingIndex >= 0) {
              selectedCustomLists.splice(existingIndex, 1);
              el.style.background = 'white';
              el.style.borderColor = '#e5e7eb';
            } else {
              selectedCustomLists.push({
                id: listId,
                name: el.dataset.listName!,
                icon: el.dataset.listIcon!,
                color: el.dataset.listColor!
              });
              el.style.background = '#fef3c7';
              el.style.borderColor = '#fbbf24';
            }
            updateSelectedListsPreview();
          });
        });

        // Focus textarea
        textarea?.focus();
      },
      preConfirm: async () => {
        const content = (document.getElementById('swal-post-content') as HTMLTextAreaElement).value;
        const visibility = (document.getElementById('swal-visibility') as HTMLInputElement).value;
        
        if (!content.trim() && mediaFiles.length === 0) {
          Swal.showValidationMessage(t('feed.postCannotBeEmpty', 'Post cannot be empty'));
          return false;
        }

        // Validate custom lists selection
        if (visibility === 'custom' && selectedCustomLists.length === 0) {
          Swal.showValidationMessage(t('feed.selectAtLeastOneList', 'Please select at least one list'));
          return false;
        }
        
        // Upload media files if any
        let uploadedUrls: string[] = [];
        if (mediaFiles.length > 0) {
          try {
            Swal.showLoading();
            uploadedUrls = await uploadFiles(mediaFiles);
          } catch (error) {
            Swal.showValidationMessage(t('feed.uploadFailed', 'Failed to upload media'));
            return false;
          }
        }
        
        return { 
          content: content.trim(), 
          visibility, 
          mediaUrls: uploadedUrls,
          customListIds: selectedCustomLists.map(l => l.id)
        };
      }
    });

    if (formValues) {
      try {
        // Insert the post
        const { data: postData, error: postError } = await supabase.from("posts").insert({
          user_id: user.id,
          content: formValues.content || null,
          visibility: formValues.visibility,
          media_urls: formValues.mediaUrls.length > 0 ? formValues.mediaUrls : null,
        }).select('id').single();

        if (postError) throw postError;

        // If custom visibility, save the selected lists
        if (formValues.visibility === 'custom' && formValues.customListIds.length > 0 && postData) {
          const visibilityListEntries = formValues.customListIds.map((listId: string) => ({
            post_id: postData.id,
            list_id: listId,
          }));

          const { error: listError } = await supabase
            .from('post_visibility_lists')
            .insert(visibilityListEntries);

          if (listError) {
            console.error('Error saving visibility lists:', listError);
          }
        }

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
