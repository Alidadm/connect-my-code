import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useBlogEditor, BlogBlock } from "@/hooks/useBlogEditor";
import { BlogBlockEditor } from "./BlogBlockEditor";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { 
  Save, Eye, Sparkles, Plus, ImagePlus, Loader2, 
  ArrowLeft, Send, Wand2, RefreshCw
} from "lucide-react";

interface BlogCategory {
  id: string;
  name: string;
  slug: string;
}

interface BlogEditorProps {
  blogId?: string;
  onSave?: () => void;
}

export const BlogEditor = ({ blogId, onSave }: BlogEditorProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
    blocks,
    setBlocks,
    addBlock,
    updateBlock,
    deleteBlock,
    moveBlock,
    changeBlockType,
    isAILoading,
    generateBlog,
    improveBlock,
    expandBlock,
    fixGrammar,
    generateTitles,
    generateExcerpt,
    getContentAsText,
  } = useBlogEditor();

  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [categoryId, setCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [status, setStatus] = useState<"draft" | "published">("draft");
  const [isSaving, setIsSaving] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [showAiDialog, setShowAiDialog] = useState(false);
  const [suggestedTitles, setSuggestedTitles] = useState<string[]>([]);
  const [isGeneratingTitles, setIsGeneratingTitles] = useState(false);

  // Load categories
  useEffect(() => {
    const loadCategories = async () => {
      const { data } = await supabase
        .from("blog_categories")
        .select("id, name, slug")
        .order("name");
      if (data) setCategories(data);
    };
    loadCategories();
  }, []);

  // Load existing blog
  useEffect(() => {
    if (!blogId) return;

    const loadBlog = async () => {
      const { data: blog } = await supabase
        .from("blogs")
        .select("*")
        .eq("id", blogId)
        .single();

      if (blog) {
        setTitle(blog.title);
        setSlug(blog.slug);
        setExcerpt(blog.excerpt || "");
        setCoverImage(blog.cover_image_url || "");
        setCategoryId(blog.category_id || "");
        setStatus(blog.status as "draft" | "published");

        // Load blocks
        const { data: blogBlocks } = await supabase
          .from("blog_blocks")
          .select("*")
          .eq("blog_id", blogId)
          .order("order_index");

        if (blogBlocks && blogBlocks.length > 0) {
          setBlocks(blogBlocks.map((b) => ({
            id: b.id,
            type: b.type as BlogBlock["type"],
            content: b.content as BlogBlock["content"],
            order_index: b.order_index,
          })));
        }
      }
    };
    loadBlog();
  }, [blogId, setBlocks]);

  // Auto-generate slug from title
  useEffect(() => {
    if (!blogId && title) {
      const newSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .replace(/\s+/g, "-")
        .slice(0, 100);
      setSlug(newSlug);
    }
  }, [title, blogId]);

  const calculateReadingTime = () => {
    const text = getContentAsText();
    const wordsPerMinute = 200;
    const words = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / wordsPerMinute));
  };

  const handleSave = async (publish = false) => {
    if (!user) return;
    if (!title.trim()) {
      toast.error("Please add a title");
      return;
    }

    setIsSaving(true);
    try {
      // Auto-capitalize first letter of title
      const trimmedTitle = title.trim();
      const capitalizedTitle = trimmedTitle.length > 0 
        ? trimmedTitle.charAt(0).toUpperCase() + trimmedTitle.slice(1)
        : trimmedTitle;

      const blogData = {
        user_id: user.id,
        title: capitalizedTitle,
        slug: slug.trim() || capitalizedTitle.toLowerCase().replace(/\s+/g, "-"),
        excerpt: excerpt.trim() || null,
        cover_image_url: coverImage.trim() || null,
        category_id: categoryId || null,
        status: publish ? "published" : status,
        reading_time_minutes: calculateReadingTime(),
        published_at: publish ? new Date().toISOString() : null,
      };

      let savedBlogId = blogId;

      if (blogId) {
        // Update existing blog
        const { error } = await supabase
          .from("blogs")
          .update(blogData)
          .eq("id", blogId);
        if (error) throw error;

        // Delete existing blocks and re-insert
        await supabase.from("blog_blocks").delete().eq("blog_id", blogId);
      } else {
        // Create new blog
        const { data, error } = await supabase
          .from("blogs")
          .insert(blogData)
          .select("id")
          .single();
        if (error) throw error;
        savedBlogId = data.id;
      }

      // Insert blocks
      if (savedBlogId) {
        const blocksToInsert = blocks.map((b) => ({
          blog_id: savedBlogId,
          type: b.type,
          content: b.content,
          order_index: b.order_index,
        }));

        const { error: blocksError } = await supabase
          .from("blog_blocks")
          .insert(blocksToInsert);
        if (blocksError) throw blocksError;
      }

      toast.success(publish ? "Blog published!" : "Draft saved!");
      if (!blogId && savedBlogId) {
        navigate(`/blogs/edit/${savedBlogId}`);
      }
      onSave?.();
    } catch (error: any) {
      console.error("Save error:", error);
      toast.error(error.message || "Failed to save blog");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) return;
    setShowAiDialog(false);
    await generateBlog(aiPrompt, categories.find((c) => c.id === categoryId)?.name);
  };

  const handleGenerateTitles = async () => {
    setIsGeneratingTitles(true);
    const content = getContentAsText();
    if (!content) {
      toast.error("Add some content first to generate titles");
      setIsGeneratingTitles(false);
      return;
    }
    const titles = await generateTitles(content);
    setSuggestedTitles(titles);
    setIsGeneratingTitles(false);
  };

  const handleGenerateExcerpt = async () => {
    const content = getContentAsText();
    if (!content || !title) {
      toast.error("Add title and content first");
      return;
    }
    const generatedExcerpt = await generateExcerpt(title, content);
    if (generatedExcerpt) {
      setExcerpt(generatedExcerpt);
      toast.success("Excerpt generated!");
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={() => navigate("/blogs")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Blogs
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave(false)}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Save Draft
          </Button>
          <Button onClick={() => handleSave(true)} disabled={isSaving}>
            {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
            Publish
          </Button>
        </div>
      </div>

      {/* AI Generate Dialog */}
      <Dialog open={showAiDialog} onOpenChange={setShowAiDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Generate Blog with AI
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>What would you like to write about?</Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="e.g., A beginner's guide to sustainable living..."
                className="mt-2"
                rows={4}
              />
            </div>
            <Button
              onClick={handleGenerateWithAI}
              disabled={!aiPrompt.trim() || isAILoading}
              className="w-full"
            >
              {isAILoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Blog
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cover Image */}
      <div className="mb-6">
        {coverImage ? (
          <div className="relative rounded-xl overflow-hidden h-64">
            <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
            <Button
              size="sm"
              variant="secondary"
              className="absolute bottom-4 right-4"
              onClick={() => setCoverImage("")}
            >
              Remove
            </Button>
          </div>
        ) : (
          <div className="border-2 border-dashed border-muted rounded-xl h-40 flex items-center justify-center">
            <div className="text-center">
              <ImagePlus className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <Input
                type="url"
                placeholder="Paste cover image URL..."
                className="max-w-xs"
                onChange={(e) => setCoverImage(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>

      {/* Title & Meta */}
      <div className="space-y-4 mb-6">
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Blog title..."
              className="text-3xl font-bold border-none focus-visible:ring-0 p-0 h-auto"
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleGenerateTitles}
            disabled={isGeneratingTitles}
            title="Suggest titles with AI"
          >
            {isGeneratingTitles ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
        </div>

        {suggestedTitles.length > 0 && (
          <div className="bg-muted/50 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Suggested titles:</p>
            {suggestedTitles.map((t, i) => (
              <Button
                key={i}
                variant="ghost"
                size="sm"
                className="w-full justify-start text-left h-auto py-2"
                onClick={() => {
                  setTitle(t);
                  setSuggestedTitles([]);
                }}
              >
                {t}
              </Button>
            ))}
          </div>
        )}

        <div className="flex gap-4">
          <div className="flex-1">
            <Label className="text-sm text-muted-foreground">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label className="text-sm text-muted-foreground">URL Slug</Label>
            <Input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="url-friendly-slug"
            />
          </div>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <Label className="text-sm text-muted-foreground">Excerpt</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerateExcerpt}
              disabled={isAILoading}
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Generate
            </Button>
          </div>
          <Textarea
            value={excerpt}
            onChange={(e) => setExcerpt(e.target.value)}
            placeholder="A brief summary of your blog post..."
            rows={2}
          />
        </div>
      </div>

      {/* AI Generate Button */}
      <div className="mb-6">
        <Button
          variant="outline"
          className="w-full border-dashed"
          onClick={() => setShowAiDialog(true)}
          disabled={isAILoading}
        >
          {isAILoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating content...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generate entire blog with AI
            </>
          )}
        </Button>
      </div>

      {/* Content Blocks */}
      <div className="space-y-2 mb-6">
        {blocks.map((block, index) => (
          <BlogBlockEditor
            key={block.id}
            block={block}
            onUpdate={(content) => updateBlock(block.id, content)}
            onDelete={() => deleteBlock(block.id)}
            onAddBlock={(type) => addBlock(type, index)}
            onMove={(dir) => moveBlock(block.id, dir)}
            onChangeType={(type) => changeBlockType(block.id, type)}
            onImprove={() => improveBlock(block.id)}
            onExpand={() => expandBlock(block.id)}
            onFixGrammar={() => fixGrammar(block.id)}
            isAILoading={isAILoading}
            isFirst={index === 0}
            isLast={index === blocks.length - 1}
          />
        ))}
      </div>

      {/* Add Block Button */}
      <Button
        variant="ghost"
        className="w-full border-2 border-dashed border-muted hover:border-primary/50"
        onClick={() => addBlock("text", blocks.length - 1)}
      >
        <Plus className="w-4 h-4 mr-2" />
        Add Block
      </Button>
    </div>
  );
};
