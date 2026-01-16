import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Camera, Upload, Users, Lock, Eye, EyeOff, UserPlus, Settings, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface Friend {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
}

interface Category {
  id: string;
  name: string;
  icon: string;
}

interface CreateGroupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGroupCreated?: (groupId: string) => void;
}

export const CreateGroupModal = ({ open, onOpenChange, onGroupCreated }: CreateGroupModalProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  
  // Form state
  const [groupName, setGroupName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Other");
  const [privacy, setPrivacy] = useState<"public" | "private_visible" | "private_hidden">("public");
  const [approvalSetting, setApprovalSetting] = useState<"anyone" | "admin_only" | "invite_only">("anyone");
  const [coverPhoto, setCoverPhoto] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [profileIcon, setProfileIcon] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  
  // Data state
  const [categories, setCategories] = useState<Category[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState(1);

  // Fetch categories and friends
  useEffect(() => {
    if (open && user) {
      fetchCategories();
      fetchFriends();
    }
  }, [open, user]);

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from("group_categories")
      .select("*")
      .order("name");
    
    if (!error && data) {
      setCategories(data);
    }
  };

  const fetchFriends = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("friendships")
      .select(`
        requester_id,
        addressee_id
      `)
      .eq("status", "accepted")
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    if (error) {
      console.error("Error fetching friends:", error);
      return;
    }

    // Get friend IDs
    const friendIds = data.map(f => 
      f.requester_id === user.id ? f.addressee_id : f.requester_id
    );

    if (friendIds.length === 0) {
      setFriends([]);
      return;
    }

    // Fetch friend profiles
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, username, display_name, avatar_url")
      .in("user_id", friendIds);

    if (!profileError && profiles) {
      setFriends(profiles.map(p => ({
        id: p.user_id,
        username: p.username || "",
        display_name: p.display_name || p.username || "User",
        avatar_url: p.avatar_url
      })));
    }
  };

  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCoverPhoto(file);
      setCoverPreview(URL.createObjectURL(file));
    }
  };

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileIcon(file);
      setIconPreview(URL.createObjectURL(file));
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends(prev => 
      prev.includes(friendId) 
        ? prev.filter(id => id !== friendId)
        : [...prev, friendId]
    );
  };

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    if (!user) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("group-media")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("group-media")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please log in to create a group");
      return;
    }

    if (!groupName.trim()) {
      toast.error("Please enter a group name");
      return;
    }

    setIsLoading(true);

    try {
      // Upload images if provided
      let coverUrl: string | null = null;
      let avatarUrl: string | null = null;

      if (coverPhoto) {
        coverUrl = await uploadFile(coverPhoto, "covers");
      }

      if (profileIcon) {
        avatarUrl = await uploadFile(profileIcon, "avatars");
      }

      // Create the group
      const { data: group, error: groupError } = await supabase
        .from("groups")
        .insert({
          name: groupName.trim(),
          description: description.trim() || null,
          category,
          privacy,
          approval_setting: approvalSetting,
          cover_url: coverUrl,
          avatar_url: avatarUrl,
          creator_id: user.id,
          member_count: 1
        })
        .select()
        .single();

      if (groupError) throw groupError;

      // Add creator as admin member
      const { error: memberError } = await supabase
        .from("group_members")
        .insert({
          group_id: group.id,
          user_id: user.id,
          role: "admin"
        });

      if (memberError) throw memberError;

      // Send invitations to selected friends
      if (selectedFriends.length > 0) {
        const invitations = selectedFriends.map(friendId => ({
          group_id: group.id,
          inviter_id: user.id,
          invitee_id: friendId,
          status: "pending"
        }));

        await supabase.from("group_invitations").insert(invitations);
      }

      toast.success("Group created successfully!");
      const createdGroupId = group.id;
      resetForm();
      onOpenChange(false);
      onGroupCreated?.(createdGroupId);
    } catch (error: any) {
      console.error("Error creating group:", error);
      toast.error(error.message || "Failed to create group");
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setGroupName("");
    setDescription("");
    setCategory("Other");
    setPrivacy("public");
    setApprovalSetting("anyone");
    setCoverPhoto(null);
    setCoverPreview(null);
    setProfileIcon(null);
    setIconPreview(null);
    setSelectedFriends([]);
    setStep(1);
  };

  const getCategoryIcon = (name: string) => {
    return categories.find(c => c.name === name)?.icon || "📁";
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Users className="h-6 w-6 text-primary" />
            {t("groups.createGroup", { defaultValue: "Create New Group" })}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2 mb-6">
              <div 
                className={`w-3 h-3 rounded-full transition-colors ${step >= 1 ? "bg-primary" : "bg-muted"}`} 
              />
              <div className="w-12 h-0.5 bg-muted" />
              <div 
                className={`w-3 h-3 rounded-full transition-colors ${step >= 2 ? "bg-primary" : "bg-muted"}`} 
              />
              <div className="w-12 h-0.5 bg-muted" />
              <div 
                className={`w-3 h-3 rounded-full transition-colors ${step >= 3 ? "bg-primary" : "bg-muted"}`} 
              />
            </div>

            {step === 1 && (
              <div className="space-y-6">
                {/* Cover Photo */}
                <div className="space-y-2">
                  <Label>{t("groups.coverPhoto", { defaultValue: "Cover Photo" })}</Label>
                  <div 
                    className="relative h-40 bg-muted rounded-lg overflow-hidden cursor-pointer group"
                    onClick={() => document.getElementById("cover-input")?.click()}
                  >
                    {coverPreview ? (
                      <img src={coverPreview} alt="Cover" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <Upload className="h-8 w-8 mb-2" />
                        <span className="text-sm">Click to upload cover photo</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="h-8 w-8 text-white" />
                    </div>
                    <input
                      id="cover-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCoverChange}
                    />
                  </div>
                </div>

                {/* Profile Icon */}
                <div className="space-y-2">
                  <Label>{t("groups.profileIcon", { defaultValue: "Group Profile Icon" })}</Label>
                  <div className="flex items-center gap-4">
                    <div 
                      className="relative cursor-pointer group"
                      onClick={() => document.getElementById("icon-input")?.click()}
                    >
                      <Avatar className="h-20 w-20">
                        {iconPreview ? (
                          <AvatarImage src={iconPreview} />
                        ) : (
                          <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                            {groupName ? groupName[0].toUpperCase() : "G"}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Camera className="h-6 w-6 text-white" />
                      </div>
                      <input
                        id="icon-input"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleIconChange}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">
                      Click to upload group icon
                    </span>
                  </div>
                </div>

                {/* Group Name */}
                <div className="space-y-2">
                  <Label htmlFor="group-name">
                    {t("groups.groupName", { defaultValue: "Group Name" })} *
                  </Label>
                  <Input
                    id="group-name"
                    placeholder="Enter group name..."
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    maxLength={100}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="description">
                    {t("groups.description", { defaultValue: "Description" })}
                  </Label>
                  <Textarea
                    id="description"
                    placeholder="Describe your group..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={500}
                    className="resize-none"
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {description.length}/500
                  </p>
                </div>

                {/* Category */}
                <div className="space-y-2">
                  <Label>{t("groups.category", { defaultValue: "Category" })}</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category">
                        <span className="flex items-center gap-2">
                          <span>{getCategoryIcon(category)}</span>
                          <span>{category}</span>
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent className="bg-background border">
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.name}>
                          <span className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span>{cat.name}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  className="w-full" 
                  onClick={() => setStep(2)}
                  disabled={!groupName.trim()}
                >
                  Next: Privacy Settings
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6">
                {/* Privacy Type */}
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {t("groups.privacyType", { defaultValue: "Privacy Type" })}
                  </Label>
                  <RadioGroup value={privacy} onValueChange={(v) => setPrivacy(v as typeof privacy)}>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                           onClick={() => setPrivacy("public")}>
                        <RadioGroupItem value="public" id="public" className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-green-500" />
                            <Label htmlFor="public" className="font-medium cursor-pointer">
                              {t("groups.public", { defaultValue: "Public" })}
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Anyone can find, see members, and view posts
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                           onClick={() => setPrivacy("private_visible")}>
                        <RadioGroupItem value="private_visible" id="private_visible" className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4 text-yellow-500" />
                            <Label htmlFor="private_visible" className="font-medium cursor-pointer">
                              {t("groups.privateVisible", { defaultValue: "Private (Visible)" })}
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Anyone can find the group, but only members can see posts
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                           onClick={() => setPrivacy("private_hidden")}>
                        <RadioGroupItem value="private_hidden" id="private_hidden" className="mt-1" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <EyeOff className="h-4 w-4 text-red-500" />
                            <Label htmlFor="private_hidden" className="font-medium cursor-pointer">
                              {t("groups.privateHidden", { defaultValue: "Private (Hidden)" })}
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Only members can find the group and see posts
                          </p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                {/* Approval Settings */}
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    {t("groups.approvalSettings", { defaultValue: "Who Can Join" })}
                  </Label>
                  <RadioGroup value={approvalSetting} onValueChange={(v) => setApprovalSetting(v as typeof approvalSetting)}>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                           onClick={() => setApprovalSetting("anyone")}>
                        <RadioGroupItem value="anyone" id="anyone" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="anyone" className="font-medium cursor-pointer">
                            Anyone
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Anyone can join without approval
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                           onClick={() => setApprovalSetting("admin_only")}>
                        <RadioGroupItem value="admin_only" id="admin_only" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="admin_only" className="font-medium cursor-pointer">
                            Admin Approval
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Requests must be approved by admins
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3 p-4 rounded-lg border hover:bg-muted/50 cursor-pointer"
                           onClick={() => setApprovalSetting("invite_only")}>
                        <RadioGroupItem value="invite_only" id="invite_only" className="mt-1" />
                        <div className="flex-1">
                          <Label htmlFor="invite_only" className="font-medium cursor-pointer">
                            Invite Only
                          </Label>
                          <p className="text-sm text-muted-foreground mt-1">
                            Only invited users can join
                          </p>
                        </div>
                      </div>
                    </div>
                  </RadioGroup>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button className="flex-1" onClick={() => setStep(3)}>
                    Next: Invite Members
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-6">
                {/* Invite Members */}
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    {t("groups.inviteMembers", { defaultValue: "Invite Members" })} (Optional)
                  </Label>
                  
                  {friends.length > 0 ? (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {friends.map((friend) => (
                        <div 
                          key={friend.id}
                          className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                          onClick={() => toggleFriend(friend.id)}
                        >
                          <Checkbox 
                            checked={selectedFriends.includes(friend.id)}
                            onCheckedChange={() => toggleFriend(friend.id)}
                          />
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={friend.avatar_url || undefined} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {friend.display_name[0].toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-medium">{friend.display_name}</p>
                            <p className="text-sm text-muted-foreground">@{friend.username}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No friends to invite yet. You can invite members after creating the group.
                    </p>
                  )}

                  {selectedFriends.length > 0 && (
                    <p className="text-sm text-primary">
                      {selectedFriends.length} friend(s) selected
                    </p>
                  )}
                </div>

                {/* Summary */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <h4 className="font-medium">Group Summary</h4>
                  <div className="text-sm space-y-1">
                    <p><span className="text-muted-foreground">Name:</span> {groupName}</p>
                    <p><span className="text-muted-foreground">Category:</span> {getCategoryIcon(category)} {category}</p>
                    <p><span className="text-muted-foreground">Privacy:</span> {privacy.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
                    <p><span className="text-muted-foreground">Approval:</span> {approvalSetting.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>
                    Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Group"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
