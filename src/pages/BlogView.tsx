import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow, format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  Clock,
  Eye,
  Calendar,
  ArrowLeft,
  Edit,
  Trash2,
  Send,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface BlogBlock {
  id: string;
  type: string;
  content: any;
  order_index: number;
}

interface Blog {
  id: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category_id: string | null;
  user_id: string;
  status: string;
  published_at: string | null;
  created_at: string;
  reading_time_minutes: number;
  likes_count: number;
  comments_count: number;
  views_count: number;
}

interface Comment {
  id: string;
  content: string;
  user_id: string;
  created_at: string;
  author?: {
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
}

export default function BlogView() {
  const { blogId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [blog, setBlog] = useState<Blog | null>(null);
  const [blocks, setBlocks] = useState<BlogBlock[]>([]);
  const [author, setAuthor] = useState<any>(null);
  const [category, setCategory] = useState<any>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  useEffect(() => {
    if (blogId) {
      loadBlog();
      incrementViews();
    }
  }, [blogId]);

  useEffect(() => {
    if (blogId && user) {
      checkIfLiked();
    }
  }, [blogId, user]);

  const loadBlog = async () => {
    try {
      // Load blog
      const { data: blogData, error } = await supabase
        .from("blogs")
        .select("*")
        .eq("id", blogId)
        .single();

      if (error) throw error;
      setBlog(blogData);
      setLikesCount(blogData.likes_count || 0);

      // Load blocks
      const { data: blocksData } = await supabase
        .from("blog_blocks")
        .select("*")
        .eq("blog_id", blogId)
        .order("order_index");

      setBlocks(blocksData || []);

      // Load author
      const { data: authorData } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url, bio")
        .eq("user_id", blogData.user_id)
        .single();

      setAuthor(authorData);

      // Load category
      if (blogData.category_id) {
        const { data: categoryData } = await supabase
          .from("blog_categories")
          .select("*")
          .eq("id", blogData.category_id)
          .single();
        setCategory(categoryData);
      }

      // Load comments
      await loadComments();
    } catch (error) {
      console.error("Error loading blog:", error);
      toast.error("Failed to load blog");
    } finally {
      setIsLoading(false);
    }
  };

  const loadComments = async () => {
    const { data: commentsData } = await supabase
      .from("blog_comments")
      .select("*")
      .eq("blog_id", blogId)
      .order("created_at", { ascending: false });

    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, username, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

      setComments(
        commentsData.map((c) => ({
          ...c,
          author: profileMap.get(c.user_id),
        }))
      );
    } else {
      setComments([]);
    }
  };

  const incrementViews = async () => {
    // Simple view increment - just update directly
    if (blogId) {
      await supabase
        .from("blogs")
        .update({ views_count: (blog?.views_count || 0) + 1 })
        .eq("id", blogId);
    }
  };

  const checkIfLiked = async () => {
    const { data } = await supabase
      .from("blog_likes")
      .select("id")
      .eq("blog_id", blogId)
      .eq("user_id", user!.id)
      .single();

    setIsLiked(!!data);
  };

  const handleLike = async () => {
    if (!user) {
      toast.error("Please login to like");
      return;
    }

    try {
      if (isLiked) {
        await supabase
          .from("blog_likes")
          .delete()
          .eq("blog_id", blogId)
          .eq("user_id", user.id);

        setIsLiked(false);
        setLikesCount((prev) => prev - 1);
      } else {
        await supabase.from("blog_likes").insert({
          blog_id: blogId,
          user_id: user.id,
        });

        setIsLiked(true);
        setLikesCount((prev) => prev + 1);
      }

      // Update blog likes count
      await supabase
        .from("blogs")
        .update({ likes_count: likesCount + (isLiked ? -1 : 1) })
        .eq("id", blogId);
    } catch (error) {
      console.error("Error toggling like:", error);
    }
  };

  const handleComment = async () => {
    if (!user) {
      toast.error("Please login to comment");
      return;
    }
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const { error } = await supabase.from("blog_comments").insert({
        blog_id: blogId,
        user_id: user.id,
        content: newComment.trim(),
      });

      if (error) throw error;

      setNewComment("");
      await loadComments();

      // Update comments count
      await supabase
        .from("blogs")
        .update({ comments_count: (blog?.comments_count || 0) + 1 })
        .eq("id", blogId);

      toast.success("Comment added!");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error("Failed to add comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleDelete = async () => {
    try {
      await supabase.from("blogs").delete().eq("id", blogId);
      toast.success("Blog deleted");
      navigate("/blogs");
    } catch (error) {
      toast.error("Failed to delete blog");
    }
  };

  const renderBlock = (block: BlogBlock) => {
    switch (block.type) {
      case "heading":
        const HeadingTag = `h${block.content.level || 2}` as keyof JSX.IntrinsicElements;
        const headingClass =
          block.content.level === 1
            ? "text-3xl font-bold mt-8 mb-4"
            : block.content.level === 2
            ? "text-2xl font-semibold mt-6 mb-3"
            : "text-xl font-medium mt-4 mb-2";
        return (
          <HeadingTag key={block.id} className={headingClass}>
            {block.content.text}
          </HeadingTag>
        );

      case "text":
        return (
          <p key={block.id} className="text-foreground leading-relaxed mb-4">
            {block.content.text}
          </p>
        );

      case "quote":
        return (
          <blockquote
            key={block.id}
            className="border-l-4 border-primary pl-4 my-6 italic text-muted-foreground"
          >
            {block.content.text}
          </blockquote>
        );

      case "code":
        return (
          <pre
            key={block.id}
            className="bg-muted rounded-lg p-4 my-4 overflow-x-auto"
          >
            <code className="text-sm font-mono">{block.content.text}</code>
          </pre>
        );

      case "list":
        return (
          <ul key={block.id} className="list-disc list-inside space-y-2 my-4">
            {block.content.items?.map((item: string, i: number) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        );

      case "image":
        return (
          <figure key={block.id} className="my-6">
            <img
              src={block.content.url}
              alt={block.content.caption || "Blog image"}
              className="rounded-lg w-full"
            />
            {block.content.caption && (
              <figcaption className="text-center text-sm text-muted-foreground mt-2">
                {block.content.caption}
              </figcaption>
            )}
          </figure>
        );

      case "divider":
        return <Separator key={block.id} className="my-8" />;

      default:
        return null;
    }
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!blog) {
    return (
      <MainLayout>
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold mb-4">Blog not found</h2>
          <Button onClick={() => navigate("/blogs")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Blogs
          </Button>
        </div>
      </MainLayout>
    );
  }

  const isAuthor = user?.id === blog.user_id;
  const authorName = author?.display_name || author?.username || "Anonymous";

  return (
    <MainLayout>
      <article className="max-w-3xl mx-auto">
        {/* Back button */}
        <Button variant="ghost" className="mb-6" onClick={() => navigate("/blogs")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Blogs
        </Button>

        {/* Cover Image */}
        {blog.cover_image_url && (
          <div className="aspect-video rounded-xl overflow-hidden mb-8">
            <img
              src={blog.cover_image_url}
              alt={blog.title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Header */}
        <header className="mb-8">
          {category && (
            <Badge
              className="mb-4"
              style={{ backgroundColor: `${category.color}20`, color: category.color }}
            >
              {category.name}
            </Badge>
          )}

          <h1 className="text-4xl font-bold mb-4">{blog.title}</h1>

          {blog.excerpt && (
            <p className="text-xl text-muted-foreground mb-6">{blog.excerpt}</p>
          )}

          <div className="flex items-center justify-between flex-wrap gap-4">
            <Link
              to={`/${author?.username}`}
              className="flex items-center gap-3 hover:opacity-80"
            >
              <Avatar className="h-12 w-12">
                <AvatarImage src={author?.avatar_url} />
                <AvatarFallback>{authorName.slice(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-semibold">{authorName}</p>
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {blog.published_at
                      ? format(new Date(blog.published_at), "MMM d, yyyy")
                      : "Draft"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {blog.reading_time_minutes} min read
                  </span>
                  <span className="flex items-center gap-1">
                    <Eye className="w-3 h-3" />
                    {blog.views_count} views
                  </span>
                </div>
              </div>
            </Link>

            {isAuthor && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => navigate(`/blogs/edit/${blog.id}`)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this blog?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This action cannot be undone. This will permanently delete your blog.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </header>

        <Separator className="mb-8" />

        {/* Content */}
        <div className="prose prose-lg dark:prose-invert max-w-none">
          {blocks.map(renderBlock)}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 py-6 border-t border-b my-8">
          <Button
            variant={isLiked ? "default" : "outline"}
            onClick={handleLike}
            className="gap-2"
          >
            <Heart className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
            {likesCount}
          </Button>
          <Button variant="outline" className="gap-2">
            <MessageCircle className="w-4 h-4" />
            {comments.length}
          </Button>
          <Button variant="outline" className="gap-2">
            <Share2 className="w-4 h-4" />
            Share
          </Button>
          <Button variant="outline" className="gap-2">
            <Bookmark className="w-4 h-4" />
            Save
          </Button>
        </div>

        {/* Comments */}
        <section className="mt-8">
          <h2 className="text-2xl font-bold mb-6">
            Comments ({comments.length})
          </h2>

          {/* Add comment */}
          {user ? (
            <div className="flex gap-4 mb-8">
              <Avatar className="h-10 w-10 flex-shrink-0">
                <AvatarFallback>You</AvatarFallback>
              </Avatar>
              <div className="flex-1 space-y-2">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={3}
                />
                <Button
                  onClick={handleComment}
                  disabled={!newComment.trim() || isSubmittingComment}
                >
                  {isSubmittingComment ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 mr-2" />
                  )}
                  Comment
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground mb-8">
              <Link to="/login" className="text-primary hover:underline">
                Login
              </Link>{" "}
              to leave a comment
            </p>
          )}

          {/* Comments list */}
          <div className="space-y-6">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-4">
                <Avatar className="h-10 w-10 flex-shrink-0">
                  <AvatarImage src={comment.author?.avatar_url || undefined} />
                  <AvatarFallback>
                    {(comment.author?.display_name || comment.author?.username || "U")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold">
                      {comment.author?.display_name || comment.author?.username || "Anonymous"}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-foreground">{comment.content}</p>
                </div>
              </div>
            ))}

            {comments.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                No comments yet. Be the first to comment!
              </p>
            )}
          </div>
        </section>
      </article>
    </MainLayout>
  );
}
