import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { BlogCard } from "@/components/blog/BlogCard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  PenSquare, Search, TrendingUp, Clock, Sparkles, Filter,
  Loader2
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Blog {
  id: string;
  title: string;
  excerpt: string | null;
  cover_image_url: string | null;
  category_id: string | null;
  published_at: string | null;
  reading_time_minutes: number;
  likes_count: number;
  comments_count: number;
  views_count: number;
  user_id: string;
}

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  color: string;
}

interface Profile {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
}

export default function Blogs() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  
  const [blogs, setBlogs] = useState<Blog[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"recent" | "trending" | "featured">("recent");

  const activeTab = searchParams.get("tab") || "discover";

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    loadBlogs();
  }, [activeTab, selectedCategory, sortBy, user]);

  const loadCategories = async () => {
    const { data } = await supabase
      .from("blog_categories")
      .select("id, name, slug, color")
      .order("name");
    if (data) setCategories(data);
  };

  const loadBlogs = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("blogs")
        .select("*")
        .eq("status", "published");

      // Filter by tab
      if (activeTab === "my-blogs" && user) {
        query = supabase
          .from("blogs")
          .select("*")
          .eq("user_id", user.id);
      }

      // Filter by category
      if (selectedCategory !== "all") {
        query = query.eq("category_id", selectedCategory);
      }

      // Sort
      if (sortBy === "recent") {
        query = query.order("published_at", { ascending: false, nullsFirst: false });
      } else if (sortBy === "trending") {
        query = query.order("views_count", { ascending: false });
      } else if (sortBy === "featured") {
        query = query.eq("is_featured", true).order("published_at", { ascending: false });
      }

      query = query.limit(20);

      const { data: blogsData, error } = await query;
      if (error) throw error;

      setBlogs(blogsData || []);

      // Load author profiles
      if (blogsData && blogsData.length > 0) {
        const userIds = [...new Set(blogsData.map((b) => b.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, username, display_name, avatar_url")
          .in("user_id", userIds);

        if (profilesData) {
          const profileMap = new Map<string, Profile>();
          profilesData.forEach((p) => profileMap.set(p.user_id, p));
          setProfiles(profileMap);
        }
      }
    } catch (error) {
      console.error("Error loading blogs:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBlogs = blogs.filter((blog) =>
    blog.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    blog.excerpt?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getCategoryById = (id: string | null) => {
    if (!id) return null;
    return categories.find((c) => c.id === id) || null;
  };

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">Blogs</h1>
            <p className="text-muted-foreground">
              Discover stories, ideas, and expertise
            </p>
          </div>
          {user && (
            <Button onClick={() => navigate("/blogs/new")}>
              <PenSquare className="w-4 h-4 mr-2" />
              Write Blog
            </Button>
          )}
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(v) => setSearchParams({ tab: v })}
          className="mb-6"
        >
          <TabsList>
            <TabsTrigger value="discover">Discover</TabsTrigger>
            {user && <TabsTrigger value="my-blogs">My Blogs</TabsTrigger>}
            <TabsTrigger value="following">Following</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search blogs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">
                <span className="flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Recent
                </span>
              </SelectItem>
              <SelectItem value="trending">
                <span className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Trending
                </span>
              </SelectItem>
              <SelectItem value="featured">
                <span className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Featured
                </span>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Categories Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 scrollbar-hide">
          <Button
            variant={selectedCategory === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory("all")}
          >
            All
          </Button>
          {categories.map((cat) => (
            <Button
              key={cat.id}
              variant={selectedCategory === cat.id ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat.id)}
              style={
                selectedCategory === cat.id
                  ? { backgroundColor: cat.color, borderColor: cat.color }
                  : {}
              }
            >
              {cat.name}
            </Button>
          ))}
        </div>

        {/* Blog Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-20">
            <PenSquare className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No blogs found</h3>
            <p className="text-muted-foreground mb-4">
              {activeTab === "my-blogs"
                ? "You haven't written any blogs yet."
                : "Be the first to write about this topic!"}
            </p>
            {user && (
              <Button onClick={() => navigate("/blogs/new")}>
                <PenSquare className="w-4 h-4 mr-2" />
                Write Your First Blog
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredBlogs.map((blog) => {
              const author = profiles.get(blog.user_id);
              const category = getCategoryById(blog.category_id);
              return (
                <BlogCard
                  key={blog.id}
                  id={blog.id}
                  title={blog.title}
                  excerpt={blog.excerpt}
                  coverImage={blog.cover_image_url}
                  category={category ? { name: category.name, color: category.color } : null}
                  author={{
                    username: author?.username,
                    displayName: author?.display_name,
                    avatarUrl: author?.avatar_url,
                  }}
                  publishedAt={blog.published_at}
                  readingTime={blog.reading_time_minutes}
                  likesCount={blog.likes_count}
                  commentsCount={blog.comments_count}
                  viewsCount={blog.views_count}
                />
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
