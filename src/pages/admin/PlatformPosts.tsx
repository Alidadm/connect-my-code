import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Plus, Trash2, Loader2, Image as ImageIcon, 
  Send, Megaphone, X, Calendar, Film, FileAudio, FileText,
  Upload, Clock, Pencil, FileX, FileEdit, RotateCcw, Copy,
  Eye, Heart, MessageCircle, Share2, MoreVertical, Bookmark, Youtube
} from "lucide-react";
import { formatDistanceToNow, format, isPast, isFuture } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";

interface PlatformPost {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  youtube_urls: string[] | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  scheduled_at: string | null;
  visibility: string | null;
  user_id: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

interface MediaFile {
  file: File;
  preview: string;
  type: 'image' | 'video' | 'gif' | 'audio' | 'document';
}

const MAX_FILES = 10;
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

const PlatformPosts = () => {
  const [posts, setPosts] = useState<PlatformPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeUrls, setYoutubeUrls] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("published");
  
  // Edit state
  const [editingPost, setEditingPost] = useState<PlatformPost | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editScheduledDate, setEditScheduledDate] = useState("");
  const [editScheduledTime, setEditScheduledTime] = useState("");
  const [editIsScheduled, setEditIsScheduled] = useState(false);
  const [editYoutubeUrl, setEditYoutubeUrl] = useState("");
  const [editYoutubeUrls, setEditYoutubeUrls] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  
  // Restore draft state
  const [restoringPost, setRestoringPost] = useState<PlatformPost | null>(null);
  const [restoreIsScheduled, setRestoreIsScheduled] = useState(false);
  const [restoreScheduledDate, setRestoreScheduledDate] = useState("");
  const [restoreScheduledTime, setRestoreScheduledTime] = useState("");
  const [restoring, setRestoring] = useState(false);
  
  // Preview state
  const [previewPost, setPreviewPost] = useState<PlatformPost | null>(null);
  
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);

  // Filter posts by category
  const now = new Date();
  const publishedPosts = posts.filter(p => 
    p.visibility === "public" && (!p.scheduled_at || isPast(new Date(p.scheduled_at)))
  );
  const scheduledPosts = posts.filter(p => 
    p.scheduled_at && isFuture(new Date(p.scheduled_at)) && p.visibility === "public"
  );
  const draftPosts = posts.filter(p => p.visibility === "private");

  const fetchPlatformPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("is_platform_post", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(p => p.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        const profilesMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
        const postsWithProfiles = data.map(post => ({
          ...post,
          profiles: profilesMap.get(post.user_id)
        }));
        setPosts(postsWithProfiles);
      } else {
        setPosts([]);
      }
    } catch (error) {
      console.error("Error fetching platform posts:", error);
      toast.error("Failed to load platform posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlatformPosts();
  }, []);

  const getFileType = (file: File): MediaFile['type'] => {
    const mimeType = file.type;
    if (mimeType.startsWith('image/gif')) return 'gif';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const newFiles: MediaFile[] = [];
    const remainingSlots = MAX_FILES - mediaFiles.length;

    for (let i = 0; i < Math.min(files.length, remainingSlots); i++) {
      const file = files[i];
      
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`${file.name} is too large. Max size is 50MB.`);
        continue;
      }

      const type = getFileType(file);
      const preview = type === 'image' || type === 'gif' || type === 'video' 
        ? URL.createObjectURL(file) 
        : '';

      newFiles.push({ file, preview, type });
    }

    if (files.length > remainingSlots) {
      toast.warning(`Only ${remainingSlots} more files can be added. Max is ${MAX_FILES}.`);
    }

    setMediaFiles([...mediaFiles, ...newFiles]);
    event.target.value = '';
  };

  const removeMediaFile = (index: number) => {
    const file = mediaFiles[index];
    if (file.preview) {
      URL.revokeObjectURL(file.preview);
    }
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const uploadFiles = async (files: MediaFile[]): Promise<string[]> => {
    const { data: { user } } = await supabase.auth.getUser();
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

  const handleCreatePost = async () => {
    if (!newContent.trim() && mediaFiles.length === 0) {
      toast.error("Please add some content or media");
      return;
    }

    try {
      setCreating(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      // Upload media files
      let mediaUrls: string[] = [];
      if (mediaFiles.length > 0) {
        toast.info("Uploading media files...");
        mediaUrls = await uploadFiles(mediaFiles);
      }

      // Build scheduled_at timestamp if scheduling is enabled
      let scheduledAt: string | null = null;
      if (isScheduled && scheduledDate && scheduledTime) {
        const scheduledDateTime = new Date(`${scheduledDate}T${scheduledTime}`);
        if (isPast(scheduledDateTime)) {
          toast.error("Scheduled time must be in the future");
          setCreating(false);
          return;
        }
        scheduledAt = scheduledDateTime.toISOString();
      }

      const { error } = await supabase.from("posts").insert({
        content: newContent.trim() || null,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        youtube_urls: youtubeUrls.length > 0 ? youtubeUrls : null,
        user_id: user.id,
        is_platform_post: true,
        visibility: "public",
        scheduled_at: scheduledAt
      });

      if (error) throw error;

      toast.success(scheduledAt ? "Post scheduled successfully!" : "Platform post created successfully!");
      setNewContent("");
      // Cleanup previews
      mediaFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
      setMediaFiles([]);
      setIsScheduled(false);
      setScheduledDate("");
      setScheduledTime("");
      setYoutubeUrl("");
      setYoutubeUrls([]);
      setShowCreateForm(false);
      fetchPlatformPosts();
    } catch (error) {
      console.error("Error creating post:", error);
      toast.error("Failed to create platform post");
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this platform post?")) return;

    try {
      const { error } = await supabase
        .from("posts")
        .delete()
        .eq("id", postId)
        .eq("is_platform_post", true);

      if (error) throw error;

      toast.success("Post deleted successfully");
      fetchPlatformPosts();
    } catch (error) {
      console.error("Error deleting post:", error);
      toast.error("Failed to delete post");
    }
  };

  const openEditDialog = (post: PlatformPost) => {
    setEditingPost(post);
    setEditContent(post.content || "");
    setEditYoutubeUrls(post.youtube_urls || []);
    setEditYoutubeUrl("");
    if (post.scheduled_at && isFuture(new Date(post.scheduled_at))) {
      setEditIsScheduled(true);
      const date = new Date(post.scheduled_at);
      setEditScheduledDate(format(date, 'yyyy-MM-dd'));
      setEditScheduledTime(format(date, 'HH:mm'));
    } else {
      setEditIsScheduled(false);
      setEditScheduledDate("");
      setEditScheduledTime("");
    }
  };

  const closeEditDialog = () => {
    setEditingPost(null);
    setEditContent("");
    setEditScheduledDate("");
    setEditScheduledTime("");
    setEditIsScheduled(false);
    setEditYoutubeUrl("");
    setEditYoutubeUrls([]);
  };

  const handleAddEditYoutubeUrl = () => {
    const videoId = extractYoutubeVideoId(editYoutubeUrl);
    if (!videoId) {
      toast.error("Invalid YouTube URL");
      return;
    }
    if (editYoutubeUrls.includes(editYoutubeUrl)) {
      toast.error("This YouTube video is already added");
      return;
    }
    setEditYoutubeUrls([...editYoutubeUrls, editYoutubeUrl]);
    setEditYoutubeUrl("");
    toast.success("YouTube video added");
  };

  const removeEditYoutubeUrl = (index: number) => {
    setEditYoutubeUrls(editYoutubeUrls.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    if (!editContent.trim() && (!editingPost.media_urls || editingPost.media_urls.length === 0) && editYoutubeUrls.length === 0) {
      toast.error("Please add some content");
      return;
    }

    try {
      setSaving(true);

      let scheduledAt: string | null = null;
      if (editIsScheduled && editScheduledDate && editScheduledTime) {
        const scheduledDateTime = new Date(`${editScheduledDate}T${editScheduledTime}`);
        if (isPast(scheduledDateTime)) {
          toast.error("Scheduled time must be in the future");
          setSaving(false);
          return;
        }
        scheduledAt = scheduledDateTime.toISOString();
      }

      const { error } = await supabase
        .from("posts")
        .update({
          content: editContent.trim() || null,
          youtube_urls: editYoutubeUrls.length > 0 ? editYoutubeUrls : null,
          scheduled_at: scheduledAt,
          updated_at: new Date().toISOString()
        })
        .eq("id", editingPost.id)
        .eq("is_platform_post", true);

      if (error) throw error;

      toast.success("Post updated successfully!");
      closeEditDialog();
      fetchPlatformPosts();
    } catch (error) {
      console.error("Error updating post:", error);
      toast.error("Failed to update post");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveToDrafts = async (postId: string) => {
    if (!confirm("Move this post to drafts? It will no longer be visible to members.")) return;

    try {
      const { error } = await supabase
        .from("posts")
        .update({
          scheduled_at: null,
          visibility: "private",
          updated_at: new Date().toISOString()
        })
        .eq("id", postId)
        .eq("is_platform_post", true);

      if (error) throw error;

      toast.success("Post moved to drafts");
      fetchPlatformPosts();
    } catch (error) {
      console.error("Error moving post to drafts:", error);
      toast.error("Failed to move post to drafts");
    }
  };

  const openRestoreDialog = (post: PlatformPost) => {
    setRestoringPost(post);
    setRestoreIsScheduled(false);
    setRestoreScheduledDate("");
    setRestoreScheduledTime("");
  };

  const closeRestoreDialog = () => {
    setRestoringPost(null);
    setRestoreIsScheduled(false);
    setRestoreScheduledDate("");
    setRestoreScheduledTime("");
  };

  const handleRestoreFromDrafts = async () => {
    if (!restoringPost) return;

    try {
      setRestoring(true);

      let scheduledAt: string | null = null;
      if (restoreIsScheduled && restoreScheduledDate && restoreScheduledTime) {
        const scheduledDateTime = new Date(`${restoreScheduledDate}T${restoreScheduledTime}`);
        if (isPast(scheduledDateTime)) {
          toast.error("Scheduled time must be in the future");
          setRestoring(false);
          return;
        }
        scheduledAt = scheduledDateTime.toISOString();
      }

      const { error } = await supabase
        .from("posts")
        .update({
          visibility: "public",
          scheduled_at: scheduledAt,
          updated_at: new Date().toISOString()
        })
        .eq("id", restoringPost.id)
        .eq("is_platform_post", true);

      if (error) throw error;

      toast.success(scheduledAt ? "Draft scheduled successfully" : "Draft published successfully");
      closeRestoreDialog();
      fetchPlatformPosts();
    } catch (error) {
      console.error("Error restoring draft:", error);
      toast.error("Failed to restore draft");
    } finally {
      setRestoring(false);
    }
  };

  const handleDuplicatePost = async (post: PlatformPost) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("You must be logged in");
        return;
      }

      const { error } = await supabase.from("posts").insert({
        content: post.content,
        media_urls: post.media_urls,
        youtube_urls: post.youtube_urls || null,
        user_id: user.id,
        is_platform_post: true,
        visibility: "private", // Create as draft
        scheduled_at: null
      });

      if (error) throw error;

      toast.success("Post duplicated as draft");
      setActiveTab("drafts");
      fetchPlatformPosts();
    } catch (error) {
      console.error("Error duplicating post:", error);
      toast.error("Failed to duplicate post");
    }
  };

  const getMediaIcon = (type: MediaFile['type']) => {
    switch (type) {
      case 'video': return <Film className="h-4 w-4" />;
      case 'audio': return <FileAudio className="h-4 w-4" />;
      case 'document': return <FileText className="h-4 w-4" />;
      default: return <ImageIcon className="h-4 w-4" />;
    }
  };

  const isVideoUrl = (url: string) => {
    return url.match(/\.(mp4|webm|ogg|mov)$/i);
  };

  const isAudioUrl = (url: string) => {
    return url.match(/\.(mp3|wav|ogg|m4a)$/i);
  };

  // YouTube URL helpers
  const extractYoutubeVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\s?]+)/,
      /youtube\.com\/shorts\/([^&\s?]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const isYoutubeUrl = (url: string): boolean => {
    return extractYoutubeVideoId(url) !== null;
  };

  const handleAddYoutubeUrl = () => {
    const videoId = extractYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      toast.error("Invalid YouTube URL");
      return;
    }
    if (youtubeUrls.includes(youtubeUrl)) {
      toast.error("This YouTube video is already added");
      return;
    }
    setYoutubeUrls([...youtubeUrls, youtubeUrl]);
    setYoutubeUrl("");
    toast.success("YouTube video added");
  };

  const removeYoutubeUrl = (index: number) => {
    setYoutubeUrls(youtubeUrls.filter((_, i) => i !== index));
  };

  const previewYoutubeVideo = (url: string) => {
    const videoId = extractYoutubeVideoId(url);
    if (!videoId) return;
    
    Swal.fire({
      html: `<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
        <iframe 
          src="https://www.youtube.com/embed/${videoId}?autoplay=1" 
          style="position:absolute;top:0;left:0;width:100%;height:100%;border:0;"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
          allowfullscreen
        ></iframe>
      </div>`,
      width: '80%',
      showCloseButton: true,
      showConfirmButton: false,
      background: '#000',
      customClass: {
        popup: 'youtube-preview-popup',
        closeButton: 'youtube-close-button'
      }
    });
  };

  const openPreviewModal = (post: PlatformPost) => {
    setPreviewPost(post);
  };

  const closePreviewModal = () => {
    setPreviewPost(null);
  };

  return (
    <AdminLayout title="Platform Posts">
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Megaphone className="h-6 w-6 text-primary" />
                Platform Posts
              </h1>
              <p className="text-sm text-muted-foreground">
                Create posts visible to all members
              </p>
            </div>
            <Button onClick={() => setShowCreateForm(!showCreateForm)} className="gap-2">
              <Plus className="h-4 w-4" />
              New Post
            </Button>
          </div>

          {/* Create Post Form */}
          {showCreateForm && (
            <Card className="mb-6 border-primary/20 shadow-lg">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Send className="h-5 w-5 text-primary" />
                  Create Platform Post
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="Write a message for all members..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="min-h-[120px] resize-none"
                />

                {/* Media Upload Buttons */}
                <div className="flex flex-wrap gap-2">
                  <input
                    ref={imageInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <input
                    ref={audioInputRef}
                    type="file"
                    accept="audio/*"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />
                  <input
                    ref={documentInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx,.txt"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={mediaFiles.length >= MAX_FILES}
                    className="gap-2"
                  >
                    <ImageIcon className="h-4 w-4 text-green-600" />
                    Photo
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => videoInputRef.current?.click()}
                    disabled={mediaFiles.length >= MAX_FILES}
                    className="gap-2"
                  >
                    <Film className="h-4 w-4 text-blue-600" />
                    Video
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => audioInputRef.current?.click()}
                    disabled={mediaFiles.length >= MAX_FILES}
                    className="gap-2"
                  >
                    <FileAudio className="h-4 w-4 text-purple-600" />
                    Audio
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => documentInputRef.current?.click()}
                    disabled={mediaFiles.length >= MAX_FILES}
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4 text-orange-600" />
                    Document
                  </Button>
                  <span className="text-xs text-slate-500 self-center ml-2">
                    {mediaFiles.length}/{MAX_FILES} files (max 50MB each)
                  </span>
                </div>

                {/* Media Preview */}
                {mediaFiles.length > 0 && (
                  <div className="p-3 bg-slate-100 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700 flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Attached Media
                      </span>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {mediaFiles.map((media, index) => (
                        <div key={index} className="relative group">
                          {media.type === 'image' || media.type === 'gif' ? (
                            <img
                              src={media.preview}
                              alt={`Media ${index + 1}`}
                              className="h-24 w-full object-cover rounded-lg border"
                            />
                          ) : media.type === 'video' ? (
                            <div className="h-24 w-full bg-slate-200 rounded-lg border flex items-center justify-center">
                              <video
                                src={media.preview}
                                className="h-full w-full object-cover rounded-lg"
                              />
                            </div>
                          ) : (
                            <div className="h-24 w-full bg-slate-200 rounded-lg border flex flex-col items-center justify-center p-2">
                              {getMediaIcon(media.type)}
                              <span className="text-xs text-slate-600 mt-1 truncate max-w-full">
                                {media.file.name}
                              </span>
                            </div>
                          )}
                          <button
                            onClick={() => removeMediaFile(index)}
                            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <Badge 
                            variant="secondary" 
                            className="absolute bottom-1 left-1 text-[10px] px-1 py-0"
                          >
                            {media.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* YouTube URL Input */}
                <div className="p-4 bg-muted/30 rounded-lg space-y-3 border border-muted">
                  <div className="flex items-center gap-2 mb-2">
                    <Youtube className="h-5 w-5 text-destructive" />
                    <span className="text-sm font-medium text-foreground">Add YouTube Video</span>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Paste YouTube URL (e.g., https://youtube.com/watch?v=...)"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddYoutubeUrl();
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleAddYoutubeUrl}
                      disabled={!youtubeUrl.trim()}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Add
                    </Button>
                  </div>
                  
                  {/* Added YouTube Videos */}
                  {youtubeUrls.length > 0 && (
                    <div className="space-y-2 mt-3">
                      <span className="text-xs text-muted-foreground">Added Videos ({youtubeUrls.length})</span>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {youtubeUrls.map((url, index) => {
                          const videoId = extractYoutubeVideoId(url);
                          return (
                            <div key={index} className="relative group">
                              <div 
                                className="h-24 w-full rounded-lg border overflow-hidden cursor-pointer bg-background"
                                onClick={() => previewYoutubeVideo(url)}
                              >
                                <img
                                  src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                  alt="YouTube thumbnail"
                                  className="h-full w-full object-cover"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Eye className="h-6 w-6 text-white" />
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeYoutubeUrl(index);
                                }}
                                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                              >
                                <X className="h-3 w-3" />
                              </button>
                              <Badge 
                                variant="secondary" 
                                className="absolute bottom-1 left-1 text-[10px] px-1 py-0 bg-destructive/90 text-destructive-foreground"
                              >
                                <Youtube className="h-2.5 w-2.5 mr-0.5" />
                                YouTube
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule Post */}
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-600" />
                      <Label htmlFor="schedule-toggle" className="text-sm font-medium text-slate-700">
                        Schedule for later
                      </Label>
                    </div>
                    <Switch
                      id="schedule-toggle"
                      checked={isScheduled}
                      onCheckedChange={setIsScheduled}
                    />
                  </div>
                  
                  {isScheduled && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="schedule-date" className="text-xs text-slate-500">
                          Date
                        </Label>
                        <Input
                          id="schedule-date"
                          type="date"
                          value={scheduledDate}
                          onChange={(e) => setScheduledDate(e.target.value)}
                          min={format(new Date(), 'yyyy-MM-dd')}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="schedule-time" className="text-xs text-slate-500">
                          Time
                        </Label>
                        <Input
                          id="schedule-time"
                          type="time"
                          value={scheduledTime}
                          onChange={(e) => setScheduledTime(e.target.value)}
                          className="mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setShowCreateForm(false);
                    setNewContent("");
                    mediaFiles.forEach(f => f.preview && URL.revokeObjectURL(f.preview));
                    setMediaFiles([]);
                    setIsScheduled(false);
                    setScheduledDate("");
                    setScheduledTime("");
                    setYoutubeUrl("");
                    setYoutubeUrls([]);
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleCreatePost} 
                    disabled={creating || (isScheduled && (!scheduledDate || !scheduledTime))} 
                    className="gap-2"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isScheduled ? (
                      <Clock className="h-4 w-4" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    {isScheduled ? "Schedule Post" : "Publish Post"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts Tabs */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="published" className="gap-2">
                  <Send className="h-4 w-4" />
                  Published ({publishedPosts.length})
                </TabsTrigger>
                <TabsTrigger value="scheduled" className="gap-2">
                  <Clock className="h-4 w-4" />
                  Scheduled ({scheduledPosts.length})
                </TabsTrigger>
                <TabsTrigger value="drafts" className="gap-2">
                  <FileEdit className="h-4 w-4" />
                  Drafts ({draftPosts.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="published">
                {publishedPosts.length === 0 ? (
                  <Card className="py-12 text-center">
                    <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700">No published posts yet</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Create your first post to welcome all members!
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {publishedPosts.map((post) => (
                      <Card key={post.id} className="overflow-hidden">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={post.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {post.profiles?.display_name?.[0] || "A"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900">
                                    {post.profiles?.display_name || "Admin"}
                                  </span>
                                  <Badge variant="secondary" className="text-xs">
                                    Platform
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Calendar className="h-3 w-3" />
                                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-green-600"
                                onClick={() => openPreviewModal(post)}
                                title="Preview post"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-blue-600"
                                onClick={() => handleDuplicatePost(post)}
                                title="Duplicate as draft"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-amber-600"
                                onClick={() => handleMoveToDrafts(post.id)}
                                title="Move to drafts"
                              >
                                <FileX className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-destructive"
                                onClick={() => handleDeletePost(post.id)}
                                title="Delete post"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {post.content && (
                            <p className="mt-3 text-slate-700 whitespace-pre-wrap">
                              {post.content}
                            </p>
                          )}

                          {post.media_urls && post.media_urls.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {post.media_urls.slice(0, 4).map((url, index) => (
                                isVideoUrl(url) ? (
                                  <video
                                    key={index}
                                    src={url}
                                    controls
                                    className="rounded-lg w-full h-32 object-cover"
                                  />
                                ) : isAudioUrl(url) ? (
                                  <div key={index} className="rounded-lg bg-slate-100 p-3 flex items-center gap-2">
                                    <FileAudio className="h-6 w-6 text-purple-600" />
                                    <audio src={url} controls className="w-full h-8" />
                                  </div>
                                ) : (
                                  <img
                                    key={index}
                                    src={url}
                                    alt={`Media ${index + 1}`}
                                    className="rounded-lg object-cover w-full h-32"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                                    }}
                                  />
                                )
                              ))}
                            </div>
                          )}

                          {/* YouTube Videos */}
                          {post.youtube_urls && post.youtube_urls.length > 0 && (
                            <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-muted">
                              <div className="flex items-center gap-2 mb-2">
                                <Youtube className="h-4 w-4 text-destructive" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  YouTube Videos ({post.youtube_urls.length})
                                </span>
                              </div>
                              <div className={`grid gap-2 ${post.youtube_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                                {post.youtube_urls.map((url, index) => {
                                  const videoId = extractYoutubeVideoId(url);
                                  return (
                                    <div 
                                      key={index} 
                                      className="relative group cursor-pointer rounded-lg overflow-hidden border bg-background"
                                      onClick={() => previewYoutubeVideo(url)}
                                    >
                                      <img
                                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                        alt={`YouTube video ${index + 1}`}
                                        className={`w-full object-cover ${post.youtube_urls!.length === 1 ? 'h-48' : 'h-24'}`}
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-destructive/90 rounded-full p-2">
                                          <Eye className="h-5 w-5 text-white" />
                                        </div>
                                      </div>
                                      <Badge 
                                        variant="secondary" 
                                        className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 bg-destructive/90 text-destructive-foreground gap-0.5"
                                      >
                                        <Youtube className="h-2.5 w-2.5" />
                                        YouTube
                                      </Badge>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div className="mt-3 flex items-center gap-4 text-sm text-slate-500">
                            <span>{post.likes_count || 0} likes</span>
                            <span>{post.comments_count || 0} comments</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="scheduled">
                {scheduledPosts.length === 0 ? (
                  <Card className="py-12 text-center">
                    <Clock className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700">No scheduled posts</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Schedule a post to publish it later.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {scheduledPosts.map((post) => (
                      <Card key={post.id} className="overflow-hidden border-amber-200 bg-amber-50/30">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={post.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {post.profiles?.display_name?.[0] || "A"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900">
                                    {post.profiles?.display_name || "Admin"}
                                  </span>
                                  <Badge variant="outline" className="text-xs gap-1 text-amber-600 border-amber-300 bg-amber-50">
                                    <Clock className="h-3 w-3" />
                                    Scheduled
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-amber-600">
                                  <Calendar className="h-3 w-3" />
                                  Publishes {format(new Date(post.scheduled_at!), 'MMM d, yyyy h:mm a')}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-green-600"
                                onClick={() => openPreviewModal(post)}
                                title="Preview post"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-primary"
                                onClick={() => openEditDialog(post)}
                                title="Edit post"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-blue-600"
                                onClick={() => handleDuplicatePost(post)}
                                title="Duplicate as draft"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-amber-600"
                                onClick={() => handleMoveToDrafts(post.id)}
                                title="Move to drafts"
                              >
                                <FileX className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-destructive"
                                onClick={() => handleDeletePost(post.id)}
                                title="Delete post"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {post.content && (
                            <p className="mt-3 text-slate-700 whitespace-pre-wrap">
                              {post.content}
                            </p>
                          )}

                          {post.media_urls && post.media_urls.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {post.media_urls.slice(0, 4).map((url, index) => (
                                isVideoUrl(url) ? (
                                  <video
                                    key={index}
                                    src={url}
                                    controls
                                    className="rounded-lg w-full h-32 object-cover"
                                  />
                                ) : isAudioUrl(url) ? (
                                  <div key={index} className="rounded-lg bg-slate-100 p-3 flex items-center gap-2">
                                    <FileAudio className="h-6 w-6 text-purple-600" />
                                    <audio src={url} controls className="w-full h-8" />
                                  </div>
                                ) : (
                                  <img
                                    key={index}
                                    src={url}
                                    alt={`Media ${index + 1}`}
                                    className="rounded-lg object-cover w-full h-32"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                                    }}
                                  />
                                )
                              ))}
                            </div>
                          )}

                          {/* YouTube Videos */}
                          {post.youtube_urls && post.youtube_urls.length > 0 && (
                            <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-muted">
                              <div className="flex items-center gap-2 mb-2">
                                <Youtube className="h-4 w-4 text-destructive" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  YouTube Videos ({post.youtube_urls.length})
                                </span>
                              </div>
                              <div className={`grid gap-2 ${post.youtube_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                                {post.youtube_urls.map((url, index) => {
                                  const videoId = extractYoutubeVideoId(url);
                                  return (
                                    <div 
                                      key={index} 
                                      className="relative group cursor-pointer rounded-lg overflow-hidden border bg-background"
                                      onClick={() => previewYoutubeVideo(url)}
                                    >
                                      <img
                                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                        alt={`YouTube video ${index + 1}`}
                                        className={`w-full object-cover ${post.youtube_urls!.length === 1 ? 'h-48' : 'h-24'}`}
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-destructive/90 rounded-full p-2">
                                          <Eye className="h-5 w-5 text-white" />
                                        </div>
                                      </div>
                                      <Badge 
                                        variant="secondary" 
                                        className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 bg-destructive/90 text-destructive-foreground gap-0.5"
                                      >
                                        <Youtube className="h-2.5 w-2.5" />
                                        YouTube
                                      </Badge>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="drafts">
                {draftPosts.length === 0 ? (
                  <Card className="py-12 text-center">
                    <FileEdit className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-700">No drafts</h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Cancelled or unpublished posts will appear here.
                    </p>
                  </Card>
                ) : (
                  <div className="space-y-4">
                    {draftPosts.map((post) => (
                      <Card key={post.id} className="overflow-hidden border-slate-200 bg-slate-50/50">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={post.profiles?.avatar_url || undefined} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {post.profiles?.display_name?.[0] || "A"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-slate-900">
                                    {post.profiles?.display_name || "Admin"}
                                  </span>
                                  <Badge variant="outline" className="text-xs gap-1 text-slate-500 border-slate-300">
                                    <FileEdit className="h-3 w-3" />
                                    Draft
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                  <Calendar className="h-3 w-3" />
                                  Created {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-green-600"
                                onClick={() => openPreviewModal(post)}
                                title="Preview post"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-green-600"
                                onClick={() => openRestoreDialog(post)}
                                title="Publish or schedule"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-primary"
                                onClick={() => openEditDialog(post)}
                                title="Edit and schedule"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-blue-600"
                                onClick={() => handleDuplicatePost(post)}
                                title="Duplicate as draft"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-400 hover:text-destructive"
                                onClick={() => handleDeletePost(post.id)}
                                title="Delete post"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {post.content && (
                            <p className="mt-3 text-slate-700 whitespace-pre-wrap">
                              {post.content}
                            </p>
                          )}

                          {post.media_urls && post.media_urls.length > 0 && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {post.media_urls.slice(0, 4).map((url, index) => (
                                isVideoUrl(url) ? (
                                  <video
                                    key={index}
                                    src={url}
                                    controls
                                    className="rounded-lg w-full h-32 object-cover"
                                  />
                                ) : isAudioUrl(url) ? (
                                  <div key={index} className="rounded-lg bg-slate-100 p-3 flex items-center gap-2">
                                    <FileAudio className="h-6 w-6 text-purple-600" />
                                    <audio src={url} controls className="w-full h-8" />
                                  </div>
                                ) : (
                                  <img
                                    key={index}
                                    src={url}
                                    alt={`Media ${index + 1}`}
                                    className="rounded-lg object-cover w-full h-32"
                                    onError={(e) => {
                                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                                    }}
                                  />
                                )
                              ))}
                            </div>
                          )}

                          {/* YouTube Videos */}
                          {post.youtube_urls && post.youtube_urls.length > 0 && (
                            <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-muted">
                              <div className="flex items-center gap-2 mb-2">
                                <Youtube className="h-4 w-4 text-destructive" />
                                <span className="text-xs font-medium text-muted-foreground">
                                  YouTube Videos ({post.youtube_urls.length})
                                </span>
                              </div>
                              <div className={`grid gap-2 ${post.youtube_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-3'}`}>
                                {post.youtube_urls.map((url, index) => {
                                  const videoId = extractYoutubeVideoId(url);
                                  return (
                                    <div 
                                      key={index} 
                                      className="relative group cursor-pointer rounded-lg overflow-hidden border bg-background"
                                      onClick={() => previewYoutubeVideo(url)}
                                    >
                                      <img
                                        src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                        alt={`YouTube video ${index + 1}`}
                                        className={`w-full object-cover ${post.youtube_urls!.length === 1 ? 'h-48' : 'h-24'}`}
                                      />
                                      <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="bg-destructive/90 rounded-full p-2">
                                          <Eye className="h-5 w-5 text-white" />
                                        </div>
                                      </div>
                                      <Badge 
                                        variant="secondary" 
                                        className="absolute bottom-1 left-1 text-[10px] px-1.5 py-0.5 bg-destructive/90 text-destructive-foreground gap-0.5"
                                      >
                                        <Youtube className="h-2.5 w-2.5" />
                                        YouTube
                                      </Badge>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingPost} onOpenChange={(open) => !open && closeEditDialog()}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Pencil className="h-5 w-5 text-primary" />
                Edit Scheduled Post
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <Textarea
                placeholder="Write a message for all members..."
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[120px] resize-none"
              />

              {/* Existing media preview */}
              {editingPost?.media_urls && editingPost.media_urls.length > 0 && (
                <div className="p-3 bg-slate-100 rounded-lg">
                  <span className="text-sm font-medium text-slate-700 mb-2 block">
                    Attached Media ({editingPost.media_urls.length} files)
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {editingPost.media_urls.slice(0, 4).map((url, index) => (
                      <img
                        key={index}
                        src={url}
                        alt={`Media ${index + 1}`}
                        className="h-16 w-full object-cover rounded-lg border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "/placeholder.svg";
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* YouTube URL Editor */}
              <div className="p-4 bg-muted/30 rounded-lg space-y-3 border border-muted">
                <div className="flex items-center gap-2 mb-2">
                  <Youtube className="h-5 w-5 text-destructive" />
                  <span className="text-sm font-medium text-foreground">YouTube Videos</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Paste YouTube URL..."
                    value={editYoutubeUrl}
                    onChange={(e) => setEditYoutubeUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddEditYoutubeUrl();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAddEditYoutubeUrl}
                    disabled={!editYoutubeUrl.trim()}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add
                  </Button>
                </div>
                
                {/* Added YouTube Videos */}
                {editYoutubeUrls.length > 0 && (
                  <div className="space-y-2 mt-3">
                    <span className="text-xs text-muted-foreground">Added Videos ({editYoutubeUrls.length})</span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {editYoutubeUrls.map((url, index) => {
                        const videoId = extractYoutubeVideoId(url);
                        return (
                          <div key={index} className="relative group">
                            <div 
                              className="h-20 w-full rounded-lg border overflow-hidden cursor-pointer bg-background"
                              onClick={() => previewYoutubeVideo(url)}
                            >
                              <img
                                src={`https://img.youtube.com/vi/${videoId}/mqdefault.jpg`}
                                alt="YouTube thumbnail"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Eye className="h-5 w-5 text-white" />
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                removeEditYoutubeUrl(index);
                              }}
                              className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                            >
                              <X className="h-3 w-3" />
                            </button>
                            <Badge 
                              variant="secondary" 
                              className="absolute bottom-1 left-1 text-[10px] px-1 py-0 bg-destructive/90 text-destructive-foreground"
                            >
                              <Youtube className="h-2.5 w-2.5 mr-0.5" />
                              YouTube
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Schedule Settings */}
              <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-600" />
                    <Label htmlFor="edit-schedule-toggle" className="text-sm font-medium text-slate-700">
                      Schedule for later
                    </Label>
                  </div>
                  <Switch
                    id="edit-schedule-toggle"
                    checked={editIsScheduled}
                    onCheckedChange={setEditIsScheduled}
                  />
                </div>
                
                {editIsScheduled && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="edit-schedule-date" className="text-xs text-slate-500">
                        Date
                      </Label>
                      <Input
                        id="edit-schedule-date"
                        type="date"
                        value={editScheduledDate}
                        onChange={(e) => setEditScheduledDate(e.target.value)}
                        min={format(new Date(), 'yyyy-MM-dd')}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="edit-schedule-time" className="text-xs text-slate-500">
                        Time
                      </Label>
                      <Input
                        id="edit-schedule-time"
                        type="time"
                        value={editScheduledTime}
                        onChange={(e) => setEditScheduledTime(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}

                {!editIsScheduled && (
                  <p className="text-xs text-amber-600">
                    Removing the schedule will publish this post immediately.
                  </p>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={closeEditDialog}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveEdit} 
                  disabled={saving || (editIsScheduled && (!editScheduledDate || !editScheduledTime))} 
                  className="gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {editIsScheduled ? "Update Schedule" : "Publish Now"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Restore Draft Dialog */}
        <Dialog open={!!restoringPost} onOpenChange={(open) => !open && closeRestoreDialog()}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <RotateCcw className="h-5 w-5 text-green-600" />
                Publish Draft
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              {/* Preview */}
              {restoringPost?.content && (
                <div className="p-3 bg-slate-100 rounded-lg">
                  <p className="text-sm text-slate-700 line-clamp-3">
                    {restoringPost.content}
                  </p>
                </div>
              )}

              {/* Schedule toggle */}
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-slate-500" />
                  <span className="text-sm font-medium">Schedule for later</span>
                </div>
                <Switch
                  checked={restoreIsScheduled}
                  onCheckedChange={setRestoreIsScheduled}
                />
              </div>

              {restoreIsScheduled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="restore-schedule-date" className="text-xs text-slate-500">
                      Date
                    </Label>
                    <Input
                      id="restore-schedule-date"
                      type="date"
                      value={restoreScheduledDate}
                      onChange={(e) => setRestoreScheduledDate(e.target.value)}
                      min={format(new Date(), 'yyyy-MM-dd')}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="restore-schedule-time" className="text-xs text-slate-500">
                      Time
                    </Label>
                    <Input
                      id="restore-schedule-time"
                      type="time"
                      value={restoreScheduledTime}
                      onChange={(e) => setRestoreScheduledTime(e.target.value)}
                      className="mt-1"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={closeRestoreDialog}>
                  Cancel
                </Button>
                <Button 
                  onClick={handleRestoreFromDrafts} 
                  disabled={restoring || (restoreIsScheduled && (!restoreScheduledDate || !restoreScheduledTime))} 
                  className="gap-2"
                >
                  {restoring ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : restoreIsScheduled ? (
                    <Calendar className="h-4 w-4" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {restoreIsScheduled ? "Schedule Post" : "Publish Now"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Post Preview Modal */}
        <Dialog open={!!previewPost} onOpenChange={(open) => !open && closePreviewModal()}>
          <DialogContent className="max-w-lg p-0 overflow-hidden">
            <DialogHeader className="sr-only">
              <DialogTitle>Post Preview</DialogTitle>
            </DialogHeader>
            
            {previewPost && (
              <div className="bg-card rounded-xl overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-3 sm:p-4">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <Avatar className="h-9 w-9 sm:h-10 sm:w-10 flex-shrink-0">
                      <AvatarImage src={previewPost.profiles?.avatar_url || undefined} />
                      <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-sm">
                        {previewPost.profiles?.display_name?.[0] || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm sm:text-base truncate">
                          {previewPost.profiles?.display_name || "Admin"}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          Platform
                        </Badge>
                      </div>
                      <div className="text-[10px] sm:text-xs text-muted-foreground">
                        {previewPost.scheduled_at 
                          ? `Scheduled for ${format(new Date(previewPost.scheduled_at), 'MMM d, yyyy h:mm a')}`
                          : formatDistanceToNow(new Date(previewPost.created_at), { addSuffix: true })}
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground h-8 w-8 sm:h-9 sm:w-9 flex-shrink-0">
                    <MoreVertical className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>

                {/* Media Grid */}
                {previewPost.media_urls && previewPost.media_urls.length > 0 && (
                  <div className={`grid gap-0.5 ${previewPost.media_urls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                    {previewPost.media_urls.slice(0, 4).map((url, index) => (
                      <div 
                        key={index} 
                        className={`relative bg-secondary ${previewPost.media_urls!.length === 1 ? 'aspect-[16/10] sm:aspect-[16/9]' : 'aspect-square'}`}
                      >
                        {isVideoUrl(url) ? (
                          <video
                            src={url}
                            controls
                            className="w-full h-full object-cover"
                          />
                        ) : isAudioUrl(url) ? (
                          <div className="w-full h-full flex items-center justify-center bg-slate-100 p-3">
                            <FileAudio className="h-8 w-8 text-purple-600 mr-2" />
                            <audio src={url} controls className="w-full" />
                          </div>
                        ) : (
                          <img
                            src={url}
                            alt={`Post media ${index + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        )}
                        {index === 3 && previewPost.media_urls!.length > 4 && (
                          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <span className="text-white font-semibold text-lg">
                              +{previewPost.media_urls!.length - 4}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Content */}
                {previewPost.content && (
                  <div className="px-3 sm:px-4 py-2 sm:py-3">
                    <p className="text-foreground whitespace-pre-wrap text-sm sm:text-base">
                      {previewPost.content}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between px-2 sm:px-4 py-2 sm:py-3 border-t border-border">
                  <div className="flex items-center gap-1 sm:gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 sm:gap-1.5 text-muted-foreground px-2 sm:px-3 h-8 sm:h-9 cursor-default"
                    >
                      <Heart className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-xs sm:text-sm">{previewPost.likes_count || 0}</span>
                      <span className="hidden xs:inline text-xs sm:text-sm">Like</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 sm:gap-1.5 text-muted-foreground px-2 sm:px-3 h-8 sm:h-9 cursor-default"
                    >
                      <MessageCircle className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-xs sm:text-sm">{previewPost.comments_count || 0}</span>
                      <span className="hidden sm:inline text-xs sm:text-sm">Comment</span>
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="gap-1 sm:gap-1.5 text-muted-foreground px-2 sm:px-3 h-8 sm:h-9 cursor-default"
                    >
                      <Share2 className="h-4 w-4 sm:h-5 sm:w-5" />
                      <span className="text-xs sm:text-sm">0</span>
                      <span className="hidden sm:inline text-xs sm:text-sm">Share</span>
                    </Button>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="text-muted-foreground h-8 w-8 sm:h-9 sm:w-9 cursor-default"
                  >
                    <Bookmark className="h-4 w-4 sm:h-5 sm:w-5" />
                  </Button>
                </div>
              </div>
            )}

            <div className="p-4 border-t bg-muted/30">
              <p className="text-center text-sm text-muted-foreground">
                <Eye className="h-4 w-4 inline-block mr-1" />
                This is how the post will appear to members
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
};

export default PlatformPosts;