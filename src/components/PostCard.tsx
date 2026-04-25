import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import Avatar from "./Avatar";
import type { Post } from "@/hooks/usePosts";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function timeAgo(iso: string) {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const d = Math.floor(hr / 24);
  if (d < 7) return `${d}d`;
  return new Date(iso).toLocaleDateString();
}

export default function PostCard({ post, clickable = true }: { post: Post; clickable?: boolean }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const navigate = useNavigate();

  const handleLike = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      navigate("/auth");
      return;
    }
    if (post.liked_by_me) {
      await supabase.from("likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("likes").insert({ post_id: post.id, user_id: user.id });
    }
    qc.invalidateQueries({ queryKey: ["posts"] });
    qc.invalidateQueries({ queryKey: ["post", post.id] });
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this post?")) return;
    const { error } = await supabase.from("posts").delete().eq("id", post.id);
    if (error) return toast.error(error.message);
    toast.success("Post deleted");
    qc.invalidateQueries({ queryKey: ["posts"] });
  };

  const goToPost = () => clickable && navigate(`/post/${post.id}`);

  const username = post.profile?.username ?? "unknown";
  const displayName = post.profile?.display_name ?? username;
  const isOwner = user?.id === post.user_id;

  return (
    <article
      onClick={goToPost}
      className={cn(
        "flex gap-3 p-4 border-b border-border transition",
        clickable && "cursor-pointer hover:bg-secondary/40"
      )}
    >
      <Link to={`/u/${username}`} onClick={(e) => e.stopPropagation()}>
        <Avatar name={displayName} src={post.profile?.avatar_url} />
      </Link>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm">
          <Link
            to={`/u/${username}`}
            onClick={(e) => e.stopPropagation()}
            className="font-semibold text-foreground hover:underline truncate"
          >
            {displayName}
          </Link>
          <span className="text-muted-foreground truncate">@{username}</span>
          <span className="text-muted-foreground">·</span>
          <span className="text-muted-foreground">{timeAgo(post.created_at)}</span>
          {isOwner && (
            <button
              onClick={handleDelete}
              className="ml-auto text-muted-foreground hover:text-destructive p-1 rounded-full"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        <p className="mt-1 whitespace-pre-wrap text-foreground leading-relaxed break-words">
          {post.content}
        </p>

        <div className="flex items-center gap-1 mt-3 -ml-2">
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm transition group",
              post.liked_by_me ? "text-like" : "text-muted-foreground hover:text-like"
            )}
          >
            <Heart
              className={cn(
                "w-4 h-4 transition group-hover:scale-110",
                post.liked_by_me && "fill-current"
              )}
            />
            {post.like_count > 0 && <span>{post.like_count}</span>}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/post/${post.id}`); }}
            className="flex items-center gap-1.5 px-2 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground transition"
          >
            <MessageCircle className="w-4 h-4" />
            {post.comment_count > 0 && <span>{post.comment_count}</span>}
          </button>
        </div>
      </div>
    </article>
  );
}
