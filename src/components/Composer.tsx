import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/ui/button";
import Avatar from "./Avatar";
import { toast } from "sonner";

const MAX = 500;

export default function Composer() {
  const { user } = useAuth();
  const profile = useProfile(user?.id);
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!user) return null;

  const handlePost = async () => {
    const trimmed = content.trim();
    if (!trimmed) return;
    if (trimmed.length > MAX) {
      toast.error(`Keep it under ${MAX} characters`);
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("posts").insert({ user_id: user.id, content: trimmed });
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setContent("");
    qc.invalidateQueries({ queryKey: ["posts"] });
  };

  const remaining = MAX - content.length;

  return (
    <div className="flex gap-3 p-4 border-b border-border">
      <Avatar name={profile.data?.display_name ?? profile.data?.username} src={profile.data?.avatar_url} />
      <div className="flex-1">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind?"
          rows={2}
          maxLength={MAX}
          className="w-full bg-transparent resize-none outline-none placeholder:text-muted-foreground text-base"
        />
        <div className="flex items-center justify-between mt-2">
          <span className={`text-xs ${remaining < 50 ? "text-destructive" : "text-muted-foreground"}`}>
            {remaining}
          </span>
          <Button
            onClick={handlePost}
            disabled={submitting || !content.trim()}
            className="rounded-full px-5"
          >
            Post
          </Button>
        </div>
      </div>
    </div>
  );
}
