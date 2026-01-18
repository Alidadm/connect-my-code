import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { Heart, MessageCircle, Eye, Clock, User } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface BlogCardProps {
  id: string;
  title: string;
  excerpt?: string | null;
  coverImage?: string | null;
  category?: { name: string; color: string } | null;
  author: {
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
  publishedAt?: string | null;
  readingTime?: number;
  likesCount?: number;
  commentsCount?: number;
  viewsCount?: number;
}

export const BlogCard = ({
  id,
  title,
  excerpt,
  coverImage,
  category,
  author,
  publishedAt,
  readingTime = 1,
  likesCount = 0,
  commentsCount = 0,
  viewsCount = 0,
}: BlogCardProps) => {
  const authorName = author.displayName || author.username || "Anonymous";
  const initials = authorName.slice(0, 2).toUpperCase();

  return (
    <Link
      to={`/blogs/${id}`}
      className="group block bg-card rounded-xl overflow-hidden border border-border hover:border-primary/50 transition-all hover:shadow-lg"
    >
      {/* Cover Image */}
      {coverImage ? (
        <div className="aspect-video overflow-hidden">
          <img
            src={coverImage}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-video bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
          <span className="text-4xl font-bold text-primary/30">{title[0]}</span>
        </div>
      )}

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Category */}
        {category && (
          <Badge
            variant="secondary"
            className="text-xs"
            style={{ backgroundColor: `${category.color}20`, color: category.color }}
          >
            {category.name}
          </Badge>
        )}

        {/* Title */}
        <h3 className="font-semibold text-lg line-clamp-2 group-hover:text-primary transition-colors">
          {title}
        </h3>

        {/* Excerpt */}
        {excerpt && (
          <p className="text-muted-foreground text-sm line-clamp-2">{excerpt}</p>
        )}

        {/* Author & Meta */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={author.avatarUrl || undefined} />
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{authorName}</p>
              {publishedAt && (
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(publishedAt), { addSuffix: true })}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 text-muted-foreground text-xs">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readingTime} min
            </span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" />
              {viewsCount}
            </span>
          </div>
        </div>

        {/* Engagement */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Heart className="w-4 h-4" />
            {likesCount}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="w-4 h-4" />
            {commentsCount}
          </span>
        </div>
      </div>
    </Link>
  );
};
