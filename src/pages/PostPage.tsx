import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import PostCard from "@/components/PostCard";
import Avatar from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { usePost } from "@/hooks/usePosts";
import { useProfile, type Profile } from "@/hooks/useProfile";
import { toast } from "sonner";

interface CommentRow {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: Profile | null;
}

function useComments(postId: string | undefined) {
  return useQuery({
    queryKey: ["comments", postId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("*")
        .eq("post_id", postId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      const userIds = [...new Set((data ?? []).map((c) => c.user_id))];
      const profiles = userIds.length
        ? (await supabase.from("profiles").select("*").in("user_id", userIds)).data ?? []
        : [];
      const pmap = new Map(profiles.map((p: any) => [p.user_id, p as Profile]));
      return (data ?? []).map((c: any) => ({ ...c, profile: pmap.get(c.user_id) ?? null })) as CommentRow[];
    },
  });
}

export default function PostPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const post = usePost(id, user?.id);
  const comments = useComments(id);
  const myProfile = useProfile(user?.id);
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleComment = async () => {
    if (!user || !id) return;
    const trimmed = text.trim();
    if (!trimmed || trimmed.length > 500) return;
    setSubmitting(true);
    const { error } = await supabase.from("comments").insert({ post_id: id, user_id: user.id, content: trimmed });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    setText("");
    qc.invalidateQueries({ queryKey: ["comments", id] });
    qc.invalidateQueries({ queryKey: ["post", id] });
    qc.invalidateQueries({ queryKey: ["posts"] });
  };

  const handleDeleteComment = async (cid: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", cid);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["comments", id] });
    qc.invalidateQueries({ queryKey: ["post", id] });
  };

  return (
    <Layout>
      <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-3 px-2">
        <ArrowLeft className="w-4 h-4" /> Back
      </Link>

      <div className="bg-card rounded-3xl border border-border overflow-hidden">
        {post.isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Loading…</div>
        ) : post.data ? (
          <PostCard post={post.data} clickable={false} />
        ) : (
          <div className="p-10 text-center text-muted-foreground text-sm">Post not found.</div>
        )}

        {user && post.data && (
          <div className="flex gap-3 p-4 border-b border-border">
            <Avatar name={myProfile.data?.display_name ?? myProfile.data?.username} src={myProfile.data?.avatar_url} />
            <div className="flex-1">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Add a reply…"
                rows={2}
                maxLength={500}
                className="w-full bg-transparent resize-none outline-none placeholder:text-muted-foreground text-sm"
              />
              <div className="flex justify-end mt-1">
                <Button onClick={handleComment} disabled={submitting || !text.trim()} size="sm" className="rounded-full">
                  Reply
                </Button>
              </div>
            </div>
          </div>
        )}

        <div>
          {comments.data && comments.data.length > 0 ? (
            comments.data.map((c) => {
              const username = c.profile?.username ?? "unknown";
              const displayName = c.profile?.display_name ?? username;
              return (
                <div key={c.id} className="flex gap-3 p-4 border-b border-border last:border-b-0">
                  <Link to={`/u/${username}`}>
                    <Avatar name={displayName} src={c.profile?.avatar_url} size="sm" />
                  </Link>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-sm">
                      <Link to={`/u/${username}`} className="font-semibold hover:underline">{displayName}</Link>
                      <span className="text-muted-foreground">@{username}</span>
                      {user?.id === c.user_id && (
                        <button onClick={() => handleDeleteComment(c.id)} className="ml-auto text-muted-foreground hover:text-destructive p-1 rounded-full">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm whitespace-pre-wrap mt-0.5 break-words">{c.content}</p>
                  </div>
                </div>
              );
            })
          ) : (
            !comments.isLoading && post.data && (
              <div className="p-8 text-center text-sm text-muted-foreground">No replies yet.</div>
            )
          )}
        </div>
      </div>
    </Layout>
  );
}
