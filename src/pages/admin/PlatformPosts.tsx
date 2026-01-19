import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, Plus, Trash2, Loader2, Image as ImageIcon, 
  Send, Megaphone, X, Calendar
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import AdminRouteGuard from "@/components/admin/AdminRouteGuard";

interface PlatformPost {
  id: string;
  content: string | null;
  media_urls: string[] | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  user_id: string;
  profiles?: {
    display_name: string | null;
    avatar_url: string | null;
  };
}

const PlatformPosts = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState<PlatformPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [newMediaUrl, setNewMediaUrl] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fetchPlatformPosts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("is_platform_post", true)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles for each post
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

  const handleCreatePost = async () => {
    if (!newContent.trim() && mediaUrls.length === 0) {
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

      const { error } = await supabase.from("posts").insert({
        content: newContent.trim() || null,
        media_urls: mediaUrls.length > 0 ? mediaUrls : null,
        user_id: user.id,
        is_platform_post: true,
        visibility: "public"
      });

      if (error) throw error;

      toast.success("Platform post created successfully!");
      setNewContent("");
      setMediaUrls([]);
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

  const addMediaUrl = () => {
    if (newMediaUrl.trim() && !mediaUrls.includes(newMediaUrl.trim())) {
      setMediaUrls([...mediaUrls, newMediaUrl.trim()]);
      setNewMediaUrl("");
    }
  };

  const removeMediaUrl = (url: string) => {
    setMediaUrls(mediaUrls.filter(u => u !== url));
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

                {/* Media URLs */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700 flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    Media URLs (optional)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="https://example.com/image.jpg"
                      value={newMediaUrl}
                      onChange={(e) => setNewMediaUrl(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addMediaUrl())}
                    />
                    <Button type="button" variant="outline" onClick={addMediaUrl}>
                      Add
                    </Button>
                  </div>
                  {mediaUrls.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {mediaUrls.map((url, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={url}
                            alt={`Media ${index + 1}`}
                            className="h-20 w-20 object-cover rounded-lg border"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
                          <button
                            onClick={() => removeMediaUrl(url)}
                            className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreatePost} disabled={creating} className="gap-2">
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Publish Post
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Posts List */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : posts.length === 0 ? (
            <Card className="py-12 text-center">
              <Megaphone className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-700">No platform posts yet</h3>
              <p className="text-sm text-slate-500 mt-1">
                Create your first post to welcome all members!
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {posts.map((post) => (
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
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-slate-400 hover:text-destructive"
                        onClick={() => handleDeletePost(post.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {post.content && (
                      <p className="mt-3 text-slate-700 whitespace-pre-wrap">
                        {post.content}
                      </p>
                    )}

                    {post.media_urls && post.media_urls.length > 0 && (
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {post.media_urls.slice(0, 4).map((url, index) => (
                          <img
                            key={index}
                            src={url}
                            alt={`Media ${index + 1}`}
                            className="rounded-lg object-cover w-full h-32"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "/placeholder.svg";
                            }}
                          />
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
        </div>
      </div>
    </AdminRouteGuard>
  );
};

export default PlatformPosts;
