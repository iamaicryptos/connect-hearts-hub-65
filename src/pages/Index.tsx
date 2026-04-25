import { Link } from "react-router-dom";
import Layout from "@/components/Layout";
import Composer from "@/components/Composer";
import PostCard from "@/components/PostCard";
import { useAuth } from "@/hooks/useAuth";
import { useFeed } from "@/hooks/usePosts";
import { Button } from "@/components/ui/button";

export default function Index() {
  const { user, loading } = useAuth();
  const feed = useFeed(user?.id);

  return (
    <Layout>
      <div className="mb-6 px-2">
        <h1 className="font-display text-4xl text-foreground">Feed</h1>
        <p className="text-muted-foreground text-sm mt-1">Latest murmurs from everyone.</p>
      </div>

      <div className="bg-card rounded-3xl border border-border overflow-hidden">
        {!loading && !user && (
          <div className="p-6 flex items-center justify-between gap-4 border-b border-border">
            <p className="text-sm text-muted-foreground">Sign in to share your thoughts.</p>
            <Button asChild className="rounded-full">
              <Link to="/auth">Get started</Link>
            </Button>
          </div>
        )}
        {user && <Composer />}

        {feed.isLoading ? (
          <div className="p-10 text-center text-muted-foreground text-sm">Loading…</div>
        ) : feed.data && feed.data.length > 0 ? (
          feed.data.map((post) => <PostCard key={post.id} post={post} />)
        ) : (
          <div className="p-12 text-center">
            <p className="font-display text-2xl text-foreground">It's quiet here.</p>
            <p className="text-muted-foreground text-sm mt-2">Be the first to murmur something.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}
