import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, UserPlus, Heart } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface SearchResult {
  user_id: string;
  display_name: string | null;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  username: string | null;
}

interface AddFamilyMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingFamilyMemberIds: string[];
}

const RELATIONSHIP_TYPES = [
  { value: "parent", labelKey: "family.parent" },
  { value: "child", labelKey: "family.child" },
  { value: "sibling", labelKey: "family.sibling" },
  { value: "spouse", labelKey: "family.spouse" },
  { value: "grandparent", labelKey: "family.grandparent" },
  { value: "grandchild", labelKey: "family.grandchild" },
  { value: "aunt_uncle", labelKey: "family.auntUncle" },
  { value: "niece_nephew", labelKey: "family.nieceNephew" },
  { value: "cousin", labelKey: "family.cousin" },
  { value: "in_law", labelKey: "family.inLaw" },
  { value: "other", labelKey: "family.other" },
];

export const AddFamilyMemberDialog = ({
  open,
  onOpenChange,
  onSuccess,
  existingFamilyMemberIds,
}: AddFamilyMemberDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchResult | null>(null);
  const [relationship, setRelationship] = useState<string>("");
  const [adding, setAdding] = useState(false);

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .from("safe_profiles")
        .select("user_id, display_name, first_name, last_name, avatar_url, username")
        .neq("user_id", user?.id || "")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .limit(10);

      if (error) throw error;

      // Filter out existing family members
      const filtered = (data || []).filter(
        (p) => !existingFamilyMemberIds.includes(p.user_id)
      );
      setSearchResults(filtered);
    } catch (error) {
      console.error("Error searching users:", error);
    } finally {
      setSearching(false);
    }
  };

  const getDisplayName = (profile: SearchResult) => {
    if (profile.display_name) return profile.display_name;
    if (profile.first_name && profile.last_name) {
      return `${profile.first_name} ${profile.last_name}`;
    }
    if (profile.first_name) return profile.first_name;
    return profile.username || "Unknown User";
  };

  const getInitials = (profile: SearchResult) => {
    const name = getDisplayName(profile);
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const handleSelectUser = (profile: SearchResult) => {
    setSelectedUser(profile);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handleAddFamilyMember = async () => {
    if (!user || !selectedUser || !relationship) return;

    setAdding(true);
    try {
      const { error } = await supabase.from("family_members").insert({
        user_id: user.id,
        family_member_id: selectedUser.user_id,
        relationship,
      });

      if (error) throw error;

      toast.success(
        t("family.addedSuccess", {
          name: getDisplayName(selectedUser),
          defaultValue: `${getDisplayName(selectedUser)} added to your family!`,
        })
      );
      
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error adding family member:", error);
      if (error.code === "23505") {
        toast.error(t("family.alreadyAdded", { defaultValue: "This person is already in your family" }));
      } else {
        toast.error(t("family.addFailed", { defaultValue: "Failed to add family member" }));
      }
    } finally {
      setAdding(false);
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUser(null);
    setRelationship("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-rose-500" />
            {t("family.addFamilyMember", { defaultValue: "Add Family Member" })}
          </DialogTitle>
          <DialogDescription>
            {t("family.addDescription", {
              defaultValue: "Search for a member to add them as family",
            })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!selectedUser ? (
            <>
              {/* Search Input */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("family.searchPlaceholder", {
                    defaultValue: "Search by name or username...",
                  })}
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Search Results */}
              {searching ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 p-2">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchResults.length > 0 ? (
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {searchResults.map((result) => (
                    <button
                      key={result.user_id}
                      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                      onClick={() => handleSelectUser(result)}
                    >
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={result.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(result)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{getDisplayName(result)}</p>
                        {result.username && (
                          <p className="text-sm text-muted-foreground">
                            @{result.username}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim().length >= 2 ? (
                <p className="text-center text-muted-foreground py-4">
                  {t("common.noResults", { defaultValue: "No results found" })}
                </p>
              ) : null}
            </>
          ) : (
            <>
              {/* Selected User Display */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={selectedUser.avatar_url || undefined} />
                  <AvatarFallback>{getInitials(selectedUser)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{getDisplayName(selectedUser)}</p>
                  {selectedUser.username && (
                    <p className="text-sm text-muted-foreground">
                      @{selectedUser.username}
                    </p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                >
                  {t("common.change", { defaultValue: "Change" })}
                </Button>
              </div>

              {/* Relationship Selection */}
              <div className="space-y-2">
                <Label>{t("family.relationship", { defaultValue: "Relationship" })}</Label>
                <Select value={relationship} onValueChange={setRelationship}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t("family.selectRelationship", {
                        defaultValue: "Select relationship type",
                      })}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {t(type.labelKey, { defaultValue: type.value.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()) })}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Add Button */}
              <Button
                className="w-full"
                onClick={handleAddFamilyMember}
                disabled={!relationship || adding}
              >
                {adding ? (
                  <div className="animate-spin h-4 w-4 border-2 border-background border-t-transparent rounded-full mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                {t("family.addToFamily", { defaultValue: "Add to Family" })}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
