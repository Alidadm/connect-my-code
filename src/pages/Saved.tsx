import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { SavedItemCard } from "@/components/saved/SavedItemCard";
import { SavedRedditSection } from "@/components/saved/SavedRedditSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "@/hooks/use-toast";
import { 
  Bookmark, 
  Loader2, 
  ArrowLeft, 
  FolderPlus, 
  MoreVertical,
  Pencil,
  Trash2,
  FolderOpen
} from "lucide-react";
import Swal from "sweetalert2";

interface BookmarkCollection {
  id: string;
  name: string;
  icon: string;
  color: string;
  bookmark_count?: number;
}

interface BookmarkedPost {
  id: string;
  bookmark_id: string;
  collection_id: string | null;
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
}

const COLLECTION_ICONS = ['📁', '❤️', '⭐', '🔖', '📚', '🎯', '💡', '🎨', '🎬', '🎵', '📸', '✨', '🔥', '💎', '🏆'];
const COLLECTION_COLORS = ['#6b7280', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];

const Saved = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<BookmarkedPost[]>([]);
  const [collections, setCollections] = useState<BookmarkCollection[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [newCollectionIcon, setNewCollectionIcon] = useState("📁");
  const [newCollectionColor, setNewCollectionColor] = useState("#6b7280");
  const [editingCollection, setEditingCollection] = useState<BookmarkCollection | null>(null);

  const fetchCollections = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("bookmark_collections")
      .select("*")
      .eq("user_id", user.id)
      .order("name");

    if (error) {
      console.error("Error fetching collections:", error);
      return;
    }

    // Get bookmark counts for each collection
    const { data: bookmarkCounts } = await supabase
      .from("bookmarks")
      .select("collection_id")
      .eq("user_id", user.id);

    const countsMap = new Map<string, number>();
    bookmarkCounts?.forEach(b => {
      const key = b.collection_id || "uncategorized";
      countsMap.set(key, (countsMap.get(key) || 0) + 1);
    });

    const collectionsWithCounts = data?.map(c => ({
      ...c,
      bookmark_count: countsMap.get(c.id) || 0
    })) || [];

    setCollections(collectionsWithCounts);
  };

  const fetchBookmarkedPosts = async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      let query = supabase
        .from("bookmarks")
        .select("id, post_id, collection_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (selectedCollection) {
        query = query.eq("collection_id", selectedCollection);
      }

      const { data: bookmarks, error: bookmarksError } = await query;

      if (bookmarksError) throw bookmarksError;

      if (!bookmarks || bookmarks.length === 0) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const postIds = bookmarks.map(b => b.post_id);

      const { data: postsData, error: postsError } = await supabase
        .from("posts")
        .select("*")
        .in("id", postIds);

      if (postsError) throw postsError;

      const userIds = [...new Set(postsData?.map(p => p.user_id) || [])];
      
      let profilesMap = new Map();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url, username, is_verified")
          .in("user_id", userIds);
        
        profilesMap = new Map(profilesData?.map(p => [p.user_id, p]) || []);
      }

      const postsWithProfiles = bookmarks
        .map(bookmark => {
          const post = postsData?.find(p => p.id === bookmark.post_id);
          if (!post) return null;
          return {
            ...post,
            bookmark_id: bookmark.id,
            collection_id: bookmark.collection_id,
            profiles: profilesMap.get(post.user_id) || undefined
          };
        })
        .filter(Boolean) as BookmarkedPost[];

      setPosts(postsWithProfiles);
    } catch (error) {
      console.error("Error fetching bookmarked posts:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCollections();
  }, [user]);

  useEffect(() => {
    setLoading(true);
    fetchBookmarkedPosts();
  }, [user, selectedCollection]);

  const handleCreateCollection = async () => {
    if (!user || !newCollectionName.trim()) return;

    try {
      const { error } = await supabase.from("bookmark_collections").insert({
        user_id: user.id,
        name: newCollectionName.trim(),
        icon: newCollectionIcon,
        color: newCollectionColor,
      });

      if (error) throw error;

      toast({
        title: t('saved.collectionCreated', 'Collection created'),
        description: t('saved.collectionCreatedDesc', 'Your new collection is ready to use.'),
      });

      setShowCreateDialog(false);
      setNewCollectionName("");
      setNewCollectionIcon("📁");
      setNewCollectionColor("#6b7280");
      fetchCollections();
    } catch (error) {
      console.error("Error creating collection:", error);
      toast({
        title: t('common.error', 'Error'),
        description: t('saved.createFailed', 'Failed to create collection.'),
        variant: 'destructive',
      });
    }
  };

  const handleEditCollection = async () => {
    if (!editingCollection || !newCollectionName.trim()) return;

    try {
      const { error } = await supabase
        .from("bookmark_collections")
        .update({
          name: newCollectionName.trim(),
          icon: newCollectionIcon,
          color: newCollectionColor,
        })
        .eq("id", editingCollection.id);

      if (error) throw error;

      toast({
        title: t('saved.collectionUpdated', 'Collection updated'),
      });

      setEditingCollection(null);
      setNewCollectionName("");
      fetchCollections();
    } catch (error) {
      console.error("Error updating collection:", error);
      toast({
        title: t('common.error', 'Error'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteCollection = async (collection: BookmarkCollection) => {
    const result = await Swal.fire({
      title: t('saved.deleteCollection', 'Delete Collection?'),
      text: t('saved.deleteCollectionConfirm', 'Bookmarks in this collection will be moved to "All Saved". This cannot be undone.'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
      confirmButtonText: t('common.delete', 'Delete'),
      cancelButtonText: t('common.cancel', 'Cancel'),
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from("bookmark_collections")
          .delete()
          .eq("id", collection.id);

        if (error) throw error;

        toast({
          title: t('saved.collectionDeleted', 'Collection deleted'),
        });

        if (selectedCollection === collection.id) {
          setSelectedCollection(null);
        }
        fetchCollections();
        fetchBookmarkedPosts();
      } catch (error) {
        console.error("Error deleting collection:", error);
        toast({
          title: t('common.error', 'Error'),
          variant: 'destructive',
        });
      }
    }
  };

  const handleMoveToCollection = async (bookmarkId: string, collectionId: string | null) => {
    try {
      const { error } = await supabase
        .from("bookmarks")
        .update({ collection_id: collectionId })
        .eq("id", bookmarkId);

      if (error) throw error;

      toast({
        title: collectionId 
          ? t('saved.movedToCollection', 'Moved to collection')
          : t('saved.removedFromCollection', 'Removed from collection'),
      });

      fetchBookmarkedPosts();
      fetchCollections();
    } catch (error) {
      console.error("Error moving bookmark:", error);
    }
  };

  const handleRemoveBookmark = async (bookmarkId: string) => {
    try {
      const { error } = await supabase
        .from("bookmarks")
        .delete()
        .eq("id", bookmarkId);

      if (error) throw error;

      toast({
        title: t('saved.unsaved', 'Post unsaved'),
      });

      fetchBookmarkedPosts();
      fetchCollections();
    } catch (error) {
      console.error("Error removing bookmark:", error);
    }
  };

  const openEditDialog = (collection: BookmarkCollection) => {
    setEditingCollection(collection);
    setNewCollectionName(collection.name);
    setNewCollectionIcon(collection.icon);
    setNewCollectionColor(collection.color);
  };

  const getSelectedCollectionName = () => {
    if (!selectedCollection) return t('saved.allSaved', 'All Saved');
    return collections.find(c => c.id === selectedCollection)?.name || '';
  };

  if (!user) {
    return (
      <MainLayout>
        <div className="max-w-2xl mx-auto py-12 text-center">
          <Bookmark className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {t('saved.loginRequired', 'Login Required')}
          </h1>
          <p className="text-muted-foreground mb-6">
            {t('saved.loginToView', 'Please log in to view your saved posts.')}
          </p>
          <Button onClick={() => navigate("/login")}>
            {t('common.login', 'Log In')}
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="lg:hidden"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bookmark className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {t('saved.title', 'Saved Posts')}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {getSelectedCollectionName()}
                </p>
              </div>
            </div>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="gap-2"
          >
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('saved.newCollection', 'New Collection')}</span>
          </Button>
        </div>

        {/* Collections Bar */}
        <div className="bg-card rounded-xl border border-border p-3 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Button
              variant={selectedCollection === null ? "default" : "ghost"}
              size="sm"
              onClick={() => setSelectedCollection(null)}
              className="flex-shrink-0"
            >
              <Bookmark className="h-4 w-4 mr-2" />
              {t('saved.allSaved', 'All Saved')}
            </Button>
            {collections.map((collection) => (
              <div key={collection.id} className="flex-shrink-0 group relative">
                <Button
                  variant={selectedCollection === collection.id ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setSelectedCollection(collection.id)}
                  className="pr-8"
                >
                  <span className="mr-2">{collection.icon}</span>
                  {collection.name}
                  {collection.bookmark_count ? (
                    <span className="ml-2 text-xs opacity-70">({collection.bookmark_count})</span>
                  ) : null}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVertical className="h-3 w-3" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="bg-popover">
                    <DropdownMenuItem onClick={() => openEditDialog(collection)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      {t('common.edit', 'Edit')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteCollection(collection)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t('common.delete', 'Delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-card rounded-xl border border-border p-12 text-center">
            <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              {selectedCollection 
                ? t('saved.emptyCollection', 'This collection is empty')
                : t('saved.noSavedPosts', 'No saved posts yet')}
            </h2>
            <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
              {selectedCollection
                ? t('saved.emptyCollectionDesc', 'Move saved posts here to organize them.')
                : t('saved.noSavedPostsDesc', 'When you save posts, they\'ll appear here for easy access later.')}
            </p>
            <Button onClick={() => navigate("/")}>
              {t('saved.browseFeed', 'Browse Feed')}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {posts.map((post) => (
              <SavedItemCard
                key={post.id}
                post={post}
                collections={collections}
                currentCollectionId={selectedCollection}
                onMoveToCollection={handleMoveToCollection}
                onRemoveBookmark={handleRemoveBookmark}
              />
            ))}
          </div>
        )}

        {/* Saved Reddit Items */}
        {!selectedCollection && <SavedRedditSection />}

        {/* Create/Edit Collection Dialog */}
        <Dialog 
          open={showCreateDialog || !!editingCollection} 
          onOpenChange={(open) => {
            if (!open) {
              setShowCreateDialog(false);
              setEditingCollection(null);
              setNewCollectionName("");
              setNewCollectionIcon("📁");
              setNewCollectionColor("#6b7280");
            }
          }}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingCollection 
                  ? t('saved.editCollection', 'Edit Collection')
                  : t('saved.createCollection', 'Create Collection')}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t('saved.collectionName', 'Collection Name')}
                </label>
                <Input
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder={t('saved.collectionNamePlaceholder', 'e.g., Recipes, Travel, Work')}
                  maxLength={50}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t('saved.icon', 'Icon')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLLECTION_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewCollectionIcon(icon)}
                      className={`w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-all ${
                        newCollectionIcon === icon 
                          ? 'bg-primary text-primary-foreground ring-2 ring-primary ring-offset-2' 
                          : 'bg-secondary hover:bg-secondary/80'
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  {t('saved.color', 'Color')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {COLLECTION_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewCollectionColor(color)}
                      className={`w-8 h-8 rounded-full transition-all ${
                        newCollectionColor === color 
                          ? 'ring-2 ring-primary ring-offset-2' 
                          : ''
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowCreateDialog(false);
                  setEditingCollection(null);
                }}
              >
                {t('common.cancel', 'Cancel')}
              </Button>
              <Button 
                onClick={editingCollection ? handleEditCollection : handleCreateCollection}
                disabled={!newCollectionName.trim()}
              >
                {editingCollection ? t('common.save', 'Save') : t('common.create', 'Create')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
};

export default Saved;
