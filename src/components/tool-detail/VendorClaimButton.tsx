import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BadgeCheck, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

interface VendorClaimButtonProps {
  toolId: string;
  toolName: string;
}

export function VendorClaimBadge({ toolId }: { toolId: string }) {
  const { data: claim } = useQuery({
    queryKey: ["vendor-claim", toolId],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_claims")
        .select("*, profiles:user_id(display_name)")
        .eq("tool_id", toolId)
        .eq("status", "approved")
        .maybeSingle();
      return data;
    },
  });

  if (!claim) return null;

  return (
    <Badge variant="secondary" className="gap-1 text-[11px]">
      <BadgeCheck className="h-3 w-3 text-primary" />
      Claimed by Vendor
    </Badge>
  );
}

export function VendorClaimButton({ toolId, toolName }: VendorClaimButtonProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ proofUrl: "", notes: "" });

  const { data: existingClaim } = useQuery({
    queryKey: ["vendor-claim-status", toolId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_claims")
        .select("status")
        .eq("tool_id", toolId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: isAlreadyClaimed } = useQuery({
    queryKey: ["vendor-claim", toolId],
    queryFn: async () => {
      const { data } = await supabase
        .from("vendor_claims")
        .select("id")
        .eq("tool_id", toolId)
        .eq("status", "approved")
        .maybeSingle();
      return !!data;
    },
  });

  if (isAlreadyClaimed) return null;

  const handleSubmit = async () => {
    if (!user) { toast.error("Vui lòng đăng nhập"); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("vendor_claims").insert({
        tool_id: toolId,
        user_id: user.id,
        proof_url: form.proofUrl.trim() || null,
        notes: form.notes.trim() || null,
        status: "pending",
      });
      if (error) throw error;
      toast.success("Đã gửi yêu cầu claim! Chờ admin duyệt.");
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["vendor-claim-status", toolId] });
    } catch {
      toast.error("Lỗi khi gửi yêu cầu");
    }
    setSubmitting(false);
  };

  if (existingClaim) {
    const statusMap: Record<string, string> = {
      pending: "⏳ Đang chờ duyệt",
      approved: "✅ Đã được duyệt",
      rejected: "❌ Bị từ chối",
    };
    return (
      <Badge variant="outline" className="text-xs">
        {statusMap[existingClaim.status] || existingClaim.status}
      </Badge>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <ShieldCheck className="h-3.5 w-3.5" />
          Claim profile
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>🏢 Claim "{toolName}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <p className="text-sm text-muted-foreground">
            Nếu bạn là chủ sở hữu hoặc đại diện của {toolName}, hãy xác minh để quản lý profile.
          </p>
          <div>
            <label className="mb-1.5 block text-sm font-medium">URL xác minh</label>
            <Input
              placeholder="https://yourwebsite.com hoặc LinkedIn profile..."
              value={form.proofUrl}
              onChange={(e) => setForm({ ...form, proofUrl: e.target.value })}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Ghi chú</label>
            <Textarea
              placeholder="Mô tả vai trò của bạn với sản phẩm..."
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
          </div>
          <Button onClick={handleSubmit} disabled={submitting} className="w-full">
            {submitting ? "Đang gửi..." : "Gửi yêu cầu Claim"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
