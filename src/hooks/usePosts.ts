import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "./useProfile";

export interface Post {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: Profile | null;
  like_count: number;
  comment_count: number;
  liked_by_me: boolean;
}

async function enrichPosts(rawPosts: any[], currentUserId: string | undefined): Promise<Post[]> {
  if (rawPosts.length === 0) return [];
  const userIds = [...new Set(rawPosts.map((p) => p.user_id))];
  const postIds = rawPosts.map((p) => p.id);

  const [profilesRes, likesRes, commentsRes, myLikesRes] = await Promise.all([
    supabase.from("profiles").select("*").in("user_id", userIds),
    supabase.from("likes").select("post_id").in("post_id", postIds),
    supabase.from("comments").select("post_id").in("post_id", postIds),
    currentUserId
      ? supabase.from("likes").select("post_id").in("post_id", postIds).eq("user_id", currentUserId)
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.user_id, p as Profile]));
  const likeCounts = new Map<string, number>();
  (likesRes.data ?? []).forEach((l: any) => likeCounts.set(l.post_id, (likeCounts.get(l.post_id) ?? 0) + 1));
  const commentCounts = new Map<string, number>();
  (commentsRes.data ?? []).forEach((c: any) =>
    commentCounts.set(c.post_id, (commentCounts.get(c.post_id) ?? 0) + 1)
  );
  const myLikes = new Set((myLikesRes.data ?? []).map((l: any) => l.post_id));

  return rawPosts.map((p) => ({
    id: p.id,
    user_id: p.user_id,
    content: p.content,
    created_at: p.created_at,
    profile: profileMap.get(p.user_id) ?? null,
    like_count: likeCounts.get(p.id) ?? 0,
    comment_count: commentCounts.get(p.id) ?? 0,
    liked_by_me: myLikes.has(p.id),
  }));
}

export function useFeed(currentUserId: string | undefined) {
  return useQuery({
    queryKey: ["posts", "feed", currentUserId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return enrichPosts(data ?? [], currentUserId);
    },
  });
}

export function useUserPosts(userId: string | undefined, currentUserId: string | undefined) {
  return useQuery({
    queryKey: ["posts", "user", userId, currentUserId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return enrichPosts(data ?? [], currentUserId);
    },
  });
}

export function usePost(postId: string | undefined, currentUserId: string | undefined) {
  return useQuery({
    queryKey: ["post", postId, currentUserId],
    enabled: !!postId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("posts")
        .select("*")
        .eq("id", postId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const [enriched] = await enrichPosts([data], currentUserId);
      return enriched;
    },
  });
}
