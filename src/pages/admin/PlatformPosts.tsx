import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  ArrowLeft, Plus, Trash2, Loader2, Image as ImageIcon, 
  Send, Megaphone, X, Calendar, Film, FileAudio, FileText,
  Upload, Clock, Pencil, FileX, FileEdit, RotateCcw
} from "lucide-react";
import { formatDistanceToNow, format, isPast, isFuture } from "date-fns";
import AdminRouteGuard from "@/components/admin/AdminRouteGuard";

interface PlatformPost {
  id: string;
  content: string | null;
  media_urls: string[] | null;
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
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PlatformPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [activeTab, setActiveTab] = useState("published");
  
  // Edit state
  const [editingPost, setEditingPost] = useState<PlatformPost | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editScheduledDate, setEditScheduledDate] = useState("");
  const [editScheduledTime, setEditScheduledTime] = useState("");
  const [editIsScheduled, setEditIsScheduled] = useState(false);
  const [saving, setSaving] = useState(false);
  
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
  };

  const handleSaveEdit = async () => {
    if (!editingPost) return;
    if (!editContent.trim() && (!editingPost.media_urls || editingPost.media_urls.length === 0)) {
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

  const handleRestoreFromDrafts = async (postId: string) => {
    if (!confirm("Publish this draft immediately?")) return;

    try {
      const { error } = await supabase
        .from("posts")
        .update({
          visibility: "public",
          scheduled_at: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", postId)
        .eq("is_platform_post", true);

      if (error) throw error;

      toast.success("Draft published successfully");
      fetchPlatformPosts();
    } catch (error) {
      console.error("Error publishing draft:", error);
      toast.error("Failed to publish draft");
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

  return (
    <AdminRouteGuard>
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/admin")}
              >
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                  <Megaphone className="h-6 w-6 text-primary" />
                  Platform Posts
                </h1>
                <p className="text-sm text-slate-500">
                  Create posts visible to all members
                </p>
              </div>
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
                                className="text-slate-400 hover:text-primary"
                                onClick={() => openEditDialog(post)}
                                title="Edit post"
                              >
                                <Pencil className="h-4 w-4" />
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
                                onClick={() => handleRestoreFromDrafts(post.id)}
                                title="Publish now"
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
      </div>
    </AdminRouteGuard>
  );
};

export default PlatformPosts;