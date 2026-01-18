import { useState, useRef, KeyboardEvent } from "react";
import { BlogBlock } from "@/hooks/useBlogEditor";
import { 
  Type, Heading1, Heading2, Heading3, Image, Quote, Code, List, 
  Minus, Link2, GripVertical, Trash2, ChevronUp, ChevronDown,
  Sparkles, Wand2, Expand, Check
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface BlogBlockEditorProps {
  block: BlogBlock;
  onUpdate: (content: Partial<BlogBlock["content"]>) => void;
  onDelete: () => void;
  onAddBlock: (type: BlogBlock["type"]) => void;
  onMove: (direction: "up" | "down") => void;
  onChangeType: (type: BlogBlock["type"]) => void;
  onImprove: () => void;
  onExpand: () => void;
  onFixGrammar: () => void;
  isAILoading: boolean;
  isFirst: boolean;
  isLast: boolean;
}

const blockTypes = [
  { type: "text" as const, icon: Type, label: "Text" },
  { type: "heading" as const, icon: Heading1, label: "Heading" },
  { type: "quote" as const, icon: Quote, label: "Quote" },
  { type: "list" as const, icon: List, label: "List" },
  { type: "code" as const, icon: Code, label: "Code" },
  { type: "image" as const, icon: Image, label: "Image" },
  { type: "divider" as const, icon: Minus, label: "Divider" },
  { type: "embed" as const, icon: Link2, label: "Embed" },
];

export const BlogBlockEditor = ({
  block,
  onUpdate,
  onDelete,
  onAddBlock,
  onMove,
  onChangeType,
  onImprove,
  onExpand,
  onFixGrammar,
  isAILoading,
  isFirst,
  isLast,
}: BlogBlockEditorProps) => {
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && block.type !== "code") {
      e.preventDefault();
      onAddBlock("text");
    }
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case "heading":
        const headingLevel = block.content.level || 1;
        const headingClass = headingLevel === 1 
          ? "text-3xl font-bold" 
          : headingLevel === 2 
          ? "text-2xl font-semibold" 
          : "text-xl font-medium";
        return (
          <div className="space-y-2">
            <div className="flex gap-2">
              {[1, 2, 3].map((level) => (
                <Button
                  key={level}
                  size="sm"
                  variant={headingLevel === level ? "default" : "outline"}
                  onClick={() => onUpdate({ level })}
                  className="h-7 w-7 p-0"
                >
                  H{level}
                </Button>
              ))}
            </div>
            <Input
              value={block.content.text || ""}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Heading..."
              className={cn("border-none bg-transparent focus-visible:ring-0 p-0", headingClass)}
            />
          </div>
        );

      case "text":
        return (
          <Textarea
            ref={textareaRef}
            value={block.content.text || ""}
            onChange={(e) => onUpdate({ text: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Write your content here..."
            className="min-h-[80px] border-none bg-transparent focus-visible:ring-0 resize-none"
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        );

      case "quote":
        return (
          <div className="border-l-4 border-primary pl-4">
            <Textarea
              value={block.content.text || ""}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="Enter quote..."
              className="min-h-[60px] border-none bg-transparent focus-visible:ring-0 resize-none italic text-muted-foreground"
            />
          </div>
        );

      case "code":
        return (
          <div className="space-y-2">
            <Input
              value={block.content.language || ""}
              onChange={(e) => onUpdate({ language: e.target.value })}
              placeholder="Language (e.g., javascript)"
              className="text-sm h-8"
            />
            <Textarea
              value={block.content.text || ""}
              onChange={(e) => onUpdate({ text: e.target.value })}
              placeholder="// Your code here..."
              className="min-h-[100px] font-mono text-sm bg-muted/50 rounded-lg"
            />
          </div>
        );

      case "list":
        const items = block.content.items || [""];
        return (
          <div className="space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="text-primary">•</span>
                <Input
                  value={item}
                  onChange={(e) => {
                    const newItems = [...items];
                    newItems[i] = e.target.value;
                    onUpdate({ items: newItems });
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const newItems = [...items];
                      newItems.splice(i + 1, 0, "");
                      onUpdate({ items: newItems });
                    } else if (e.key === "Backspace" && item === "" && items.length > 1) {
                      e.preventDefault();
                      const newItems = items.filter((_, idx) => idx !== i);
                      onUpdate({ items: newItems });
                    }
                  }}
                  placeholder="List item..."
                  className="border-none bg-transparent focus-visible:ring-0 p-0"
                />
              </div>
            ))}
          </div>
        );

      case "image":
        return (
          <div className="space-y-2">
            <Input
              value={block.content.url || ""}
              onChange={(e) => onUpdate({ url: e.target.value })}
              placeholder="Image URL..."
            />
            {block.content.url && (
              <img 
                src={block.content.url} 
                alt={block.content.caption || "Blog image"} 
                className="max-h-64 rounded-lg object-cover"
              />
            )}
            <Input
              value={block.content.caption || ""}
              onChange={(e) => onUpdate({ caption: e.target.value })}
              placeholder="Caption (optional)"
              className="text-sm"
            />
          </div>
        );

      case "divider":
        return <hr className="my-4 border-border" />;

      case "embed":
        return (
          <div className="space-y-2">
            <Input
              value={block.content.embedUrl || ""}
              onChange={(e) => onUpdate({ embedUrl: e.target.value })}
              placeholder="Embed URL (YouTube, Twitter, etc.)..."
            />
            {block.content.embedUrl && (
              <div className="aspect-video bg-muted rounded-lg flex items-center justify-center text-muted-foreground">
                <Link2 className="w-8 h-8 mr-2" />
                Embed preview
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  const hasText = block.content.text && block.content.text.length > 0;

  return (
    <div className="group relative flex gap-2 py-2 rounded-lg hover:bg-muted/30 transition-colors">
      {/* Left controls */}
      <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 cursor-grab"
          title="Drag to reorder"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </Button>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-6 w-6 p-0">
              {blockTypes.find((t) => t.type === block.type)?.icon && (
                <span className="text-muted-foreground">
                  {(() => {
                    const Icon = blockTypes.find((t) => t.type === block.type)?.icon;
                    return Icon ? <Icon className="h-4 w-4" /> : null;
                  })()}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            {blockTypes.map(({ type, icon: Icon, label }) => (
              <DropdownMenuItem key={type} onClick={() => onChangeType(type)}>
                <Icon className="h-4 w-4 mr-2" />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => onMove("up")}
          disabled={isFirst}
        >
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0"
          onClick={() => onMove("down")}
          disabled={isLast}
        >
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Block content */}
      <div className="flex-1 min-w-0">{renderBlockContent()}</div>

      {/* Right controls */}
      <div className="flex flex-col items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {hasText && (block.type === "text" || block.type === "quote") && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                size="sm" 
                variant="ghost" 
                className="h-7 w-7 p-0"
                disabled={isAILoading}
              >
                <Sparkles className="h-4 w-4 text-primary" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={onImprove} disabled={isAILoading}>
                <Wand2 className="h-4 w-4 mr-2" />
                Improve writing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onExpand} disabled={isAILoading}>
                <Expand className="h-4 w-4 mr-2" />
                Expand content
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onFixGrammar} disabled={isAILoading}>
                <Check className="h-4 w-4 mr-2" />
                Fix grammar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
