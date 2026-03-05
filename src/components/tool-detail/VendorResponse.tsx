import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BadgeCheck, MessageSquareReply } from "lucide-react";
import { toast } from "sonner";

interface VendorResponseProps {
  reviewId: string;
  toolId: string;
}

export function VendorResponse({ reviewId, toolId }: VendorResponseProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: response } = useQuery({
    queryKey: ["vendor-response", reviewId],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_responses")
        .select("*, profiles:vendor_id(display_name)")
        .eq("review_id", reviewId)
        .maybeSingle();
      return data;
    },
  });

  const { data: isVendor } = useQuery({
    queryKey: ["is-vendor", toolId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_claims")
        .select("id")
        .eq("tool_id", toolId)
        .eq("user_id", user!.id)
        .eq("status", "approved")
        .maybeSingle();
      return !!data;
    },
    enabled: !!user,
  });

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("vendor_responses").upsert({
        review_id: reviewId,
        vendor_id: user.id,
        content: content.trim(),
      }, { onConflict: "review_id" });
      if (error) throw error;
      toast.success("Đã gửi phản hồi");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["vendor-response", reviewId] });
    } catch {
      toast.error("Lỗi khi gửi");
    }
    setSubmitting(false);
  };

  return (
    <>
      {response && (
        <div className="mt-3 ml-6 rounded-lg border border-primary/10 bg-primary/5 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <BadgeCheck className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-primary">
              Phản hồi từ nhà phát triển
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{response.content}</p>
        </div>
      )}
      {isVendor && !response && !editing && (
        <Button
          variant="ghost"
          size="sm"
          className="mt-2 ml-6 gap-1 text-xs"
          onClick={() => setEditing(true)}
        >
          <MessageSquareReply className="h-3 w-3" />
          Phản hồi review này
        </Button>
      )}
      {editing && (
        <div className="mt-2 ml-6 space-y-2">
          <Textarea
            placeholder="Phản hồi từ nhà phát triển..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={submitting || !content.trim()}>
              {submitting ? "Đang gửi..." : "Gửi phản hồi"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Hủy</Button>
          </div>
        </div>
      )}
    </>
  );
}
