import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import PostCard from "@/components/PostCard";
import Avatar from "@/components/Avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useProfileByUsername } from "@/hooks/useProfile";
import { useUserPosts } from "@/hooks/usePosts";
import { toast } from "sonner";
import { z } from "zod";

const editSchema = z.object({
  display_name: z.string().trim().max(50, "Max 50 characters"),
  bio: z.string().trim().max(200, "Max 200 characters"),
});

function useFollowState(profileUserId: string | undefined, currentUserId: string | undefined) {
  return useQuery({
    queryKey: ["follow", profileUserId, currentUserId],
    enabled: !!profileUserId,
    queryFn: async () => {
      const [followers, following, mine] = await Promise.all([
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("following_id", profileUserId!),
        supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", profileUserId!),
        currentUserId
          ? supabase.from("follows").select("id").eq("follower_id", currentUserId).eq("following_id", profileUserId!).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      return {
        followers: followers.count ?? 0,
        following: following.count ?? 0,
        isFollowing: !!mine.data,
      };
    },
  });
}

export default function Profile() {
  const { username } = useParams();
  const { user } = useAuth();
  const profile = useProfileByUsername(username);
  const posts = useUserPosts(profile.data?.user_id, user?.id);
  const follow = useFollowState(profile.data?.user_id, user?.id);
  const qc = useQueryClient();

  const [editOpen, setEditOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (profile.data) {
      setDisplayName(profile.data.display_name ?? "");
      setBio(profile.data.bio ?? "");
    }
  }, [profile.data]);

  const isOwn = user && profile.data && user.id === profile.data.user_id;

  const handleFollow = async () => {
    if (!user || !profile.data) return;
    if (follow.data?.isFollowing) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.data.user_id);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: profile.data.user_id });
    }
    qc.invalidateQueries({ queryKey: ["follow", profile.data.user_id] });
  };

  const handleSave = async () => {
    if (!user) return;
    const parsed = editSchema.safeParse({ display_name: displayName, bio });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: parsed.data.display_name || null, bio: parsed.data.bio || null })
      .eq("user_id", user.id);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    setEditOpen(false);
    qc.invalidateQueries({ queryKey: ["profile"] });
    qc.invalidateQueries({ queryKey: ["profile-username"] });
    qc.invalidateQueries({ queryKey: ["posts"] });
  };

  if (profile.isLoading) {
    return <Layout><div className="p-10 text-center text-muted-foreground text-sm">Loading…</div></Layout>;
  }

  if (!profile.data) {
    return (
      <Layout>
        <div className="p-12 text-center">
          <p className="font-display text-2xl">User not found</p>
        </div>
      </Layout>
    );
  }

  const p = profile.data;

  return (
    <Layout>
      <div className="bg-card rounded-3xl border border-border overflow-hidden">
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <Avatar name={p.display_name ?? p.username} src={p.avatar_url} size="lg" />
            {isOwn ? (
              <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="rounded-full">Edit profile</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader><DialogTitle>Edit profile</DialogTitle></DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="dn">Display name</Label>
                      <Input id="dn" value={displayName} maxLength={50} onChange={(e) => setDisplayName(e.target.value)} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="bio">Bio</Label>
                      <Textarea id="bio" value={bio} maxLength={200} rows={3} onChange={(e) => setBio(e.target.value)} />
                    </div>
                    <Button onClick={handleSave} className="w-full rounded-full">Save</Button>
                  </div>
                </DialogContent>
              </Dialog>
            ) : user ? (
              <Button onClick={handleFollow} variant={follow.data?.isFollowing ? "outline" : "default"} className="rounded-full">
                {follow.data?.isFollowing ? "Following" : "Follow"}
              </Button>
            ) : null}
          </div>

          <div className="mt-4">
            <h1 className="font-display text-3xl text-foreground">{p.display_name ?? p.username}</h1>
            <p className="text-muted-foreground">@{p.username}</p>
            {p.bio && <p className="mt-3 text-foreground whitespace-pre-wrap">{p.bio}</p>}
            <div className="flex gap-4 mt-4 text-sm">
              <span><strong className="text-foreground">{follow.data?.followers ?? 0}</strong> <span className="text-muted-foreground">followers</span></span>
              <span><strong className="text-foreground">{follow.data?.following ?? 0}</strong> <span className="text-muted-foreground">following</span></span>
            </div>
          </div>
        </div>

        <div className="border-t border-border">
          {posts.isLoading ? (
            <div className="p-10 text-center text-muted-foreground text-sm">Loading…</div>
          ) : posts.data && posts.data.length > 0 ? (
            posts.data.map((post) => <PostCard key={post.id} post={post} />)
          ) : (
            <div className="p-10 text-center text-muted-foreground text-sm">No posts yet.</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
