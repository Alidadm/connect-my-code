import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, Plus, Image, Send } from "lucide-react";
import { useTranslation } from "react-i18next";

// Temporary demo groups data
const demoGroups = [
  {
    id: "1",
    name: "Tech Enthusiasts",
    avatar: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=100&h=100&fit=crop",
    memberCount: 1234,
    description: "A community for technology lovers",
  },
  {
    id: "2",
    name: "Photography Hub",
    avatar: "https://images.unsplash.com/photo-1452587925148-ce544e77e70d?w=100&h=100&fit=crop",
    memberCount: 856,
    description: "Share your best shots with fellow photographers",
  },
  {
    id: "3",
    name: "Fitness & Wellness",
    avatar: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=100&h=100&fit=crop",
    memberCount: 2100,
    description: "Tips and motivation for a healthy lifestyle",
  },
];

const Groups = () => {
  const { t } = useTranslation();
  const [postContent, setPostContent] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(demoGroups[0]);

  const handlePost = () => {
    if (!postContent.trim()) return;
    // Placeholder for posting functionality
    console.log("Posting to group:", selectedGroup.name, postContent);
    setPostContent("");
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Users className="h-7 w-7 text-primary" />
              {t("nav.groups")}
            </h1>
            <p className="text-muted-foreground mt-1">
              Connect with communities that share your interests
            </p>
          </div>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Create Group
          </Button>
        </div>

        {/* Selected Group Post Box */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Avatar className="h-12 w-12">
                <AvatarImage src={selectedGroup.avatar} />
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {selectedGroup.name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">{selectedGroup.name}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {selectedGroup.memberCount.toLocaleString()} members
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              placeholder={`Share something with ${selectedGroup.name}...`}
              value={postContent}
              onChange={(e) => setPostContent(e.target.value)}
              className="min-h-[100px] resize-none"
            />
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" className="gap-2">
                <Image className="h-4 w-4" />
                Add Media
              </Button>
              <Button onClick={handlePost} disabled={!postContent.trim()} className="gap-2">
                <Send className="h-4 w-4" />
                Post
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Groups List */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Your Groups</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {demoGroups.map((group) => (
              <Card
                key={group.id}
                className={`cursor-pointer transition-all hover:border-primary/50 ${
                  selectedGroup.id === group.id ? "border-primary ring-1 ring-primary" : ""
                }`}
                onClick={() => setSelectedGroup(group)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={group.avatar} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {group.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{group.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {group.memberCount.toLocaleString()} members
                      </p>
                      <p className="text-xs text-muted-foreground truncate mt-1">
                        {group.description}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
};

export default Groups;
