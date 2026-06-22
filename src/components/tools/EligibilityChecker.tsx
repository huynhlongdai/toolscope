import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, Filter, Sparkles, ArrowRight, Tag } from "lucide-react";
import { Link } from "react-router-dom";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type UserProfile = {
  role: string;       // student | developer | startup | enterprise | individual
  budget: string;     // free | low | medium | high
  needsTrial: boolean;
};

export function EligibilityChecker() {
  const { t } = useI18n();
  const [profile, setProfile] = useState<UserProfile>({
    role: "",
    budget: "",
    needsTrial: false,
  });
  const [checked, setChecked] = useState(false);

  const { data: allTools = [] } = useQuery({
    queryKey: ["eligibility-tools"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tools")
        .select("id, name, slug, short_description, logo_url, website_url, pricing_type, avg_rating, has_free_trial, is_featured")
        .eq("status", "published")
        .order("avg_rating", { ascending: false })
        .limit(500);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: activeDeals = [] } = useQuery({
    queryKey: ["eligibility-deals"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data } = await supabase
        .from("deals")
        .select("id, title, tool_id, discount_type, discount_value, currency, tools:tool_id(name, slug)")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${now}`);
      return data || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const matchedTools = useMemo(() => {
    if (!checked || !profile.role) return [];

    return allTools.filter((tool: any) => {
      // Budget filtering
      if (profile.budget === "free" && tool.pricing_type !== "free" && tool.pricing_type !== "open_source") {
        if (!(tool as any).has_free_trial) return false;
      }

      // Trial filter
      if (profile.needsTrial && !(tool as any).has_free_trial) return false;

      // Role-based: students prefer free/freemium
      if (profile.role === "student" && tool.pricing_type === "paid" && !(tool as any).has_free_trial) return false;

      return true;
    }).slice(0, 12);
  }, [allTools, profile, checked]);

  const matchedDeals = useMemo(() => {
    if (!checked) return [];
    const toolIds = new Set(matchedTools.map((t: any) => t.id));
    return activeDeals.filter((d: any) => toolIds.has(d.tool_id));
  }, [activeDeals, matchedTools, checked]);

  const handleCheck = () => {
    if (!profile.role) return;
    setChecked(true);
  };

  const roles = [
    { value: "student", label: "🎓 Sinh viên / Học sinh" },
    { value: "developer", label: "💻 Lập trình viên" },
    { value: "startup", label: "🚀 Startup" },
    { value: "enterprise", label: "🏢 Doanh nghiệp" },
    { value: "individual", label: "👤 Cá nhân" },
  ];

  const budgets = [
    { value: "free", label: "Miễn phí" },
    { value: "low", label: "< $20/tháng" },
    { value: "medium", label: "$20-100/tháng" },
    { value: "high", label: "> $100/tháng" },
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.03] to-accent/[0.03]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Sparkles className="h-5 w-5 text-primary" />
          {t("eligibility.title") || "Kiểm tra ưu đãi phù hợp"}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {t("eligibility.subtitle") || "Cho chúng tôi biết bạn là ai để tìm tools và deals phù hợp nhất."}
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Bạn là...</Label>
            <Select value={profile.role} onValueChange={(v) => { setProfile((p) => ({ ...p, role: v })); setChecked(false); }}>
              <SelectTrigger><SelectValue placeholder="Chọn vai trò..." /></SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ngân sách</Label>
            <Select value={profile.budget} onValueChange={(v) => { setProfile((p) => ({ ...p, budget: v })); setChecked(false); }}>
              <SelectTrigger><SelectValue placeholder="Ngân sách..." /></SelectTrigger>
              <SelectContent>
                {budgets.map((b) => (
                  <SelectItem key={b.value} value={b.value}>{b.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={profile.needsTrial}
            onCheckedChange={(v) => { setProfile((p) => ({ ...p, needsTrial: v })); setChecked(false); }}
          />
          <Label className="cursor-pointer text-sm">Chỉ hiển thị tools có dùng thử miễn phí</Label>
        </div>

        <Button onClick={handleCheck} disabled={!profile.role} className="w-full">
          <Filter className="h-4 w-4 mr-2" />
          Kiểm tra ngay
        </Button>

        {checked && (
          <>
            <Separator />
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-medium">
                  Tìm thấy {matchedTools.length} tools phù hợp
                  {matchedDeals.length > 0 && `, ${matchedDeals.length} deals`}
                </span>
              </div>

              {matchedDeals.length > 0 && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-800 bg-emerald-50/50 dark:bg-emerald-950/20 p-3">
                  <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400 mb-2 flex items-center gap-1">
                    <Tag className="h-3 w-3" /> Deals khả dụng:
                  </p>
                  <div className="space-y-1">
                    {matchedDeals.slice(0, 5).map((deal: any) => (
                      <Link
                        key={deal.id}
                        to={`/tool/${(deal.tools as any)?.slug || ""}`}
                        className="flex items-center gap-2 text-xs hover:text-primary transition-colors"
                      >
                        <ArrowRight className="h-3 w-3" />
                        <span className="font-medium">{(deal.tools as any)?.name}</span>
                        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                          {deal.discount_type === "percentage" ? `-${deal.discount_value}%` :
                           deal.discount_type === "free_trial" ? "Free Trial" :
                           `-${deal.discount_value} ${deal.currency}`}
                        </Badge>
                        <span className="text-muted-foreground truncate">{deal.title}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                {matchedTools.slice(0, 6).map((tool: any) => (
                  <Link
                    key={tool.id}
                    to={`/tool/${tool.slug}`}
                    className="flex items-center gap-2.5 rounded-lg border bg-card p-2.5 hover:border-primary/30 transition-colors"
                  >
                    <div className="h-8 w-8 shrink-0 rounded-lg bg-muted flex items-center justify-center text-xs font-bold">
                      {tool.logo_url ? (
                        <img src={tool.logo_url} alt="" className="h-full w-full rounded-lg object-contain" />
                      ) : (
                        tool.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tool.name}</p>
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">{tool.pricing_type}</Badge>
                        {(tool as any).has_free_trial && (
                          <Badge variant="outline" className="text-[9px] px-1 py-0 border-emerald-300 text-emerald-600">Trial</Badge>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>

              {matchedTools.length > 6 && (
                <Link to={`/tools?pricing=${profile.budget === "free" ? "free" : ""}`} className="block text-center text-sm text-primary hover:underline">
                  Xem tất cả {matchedTools.length} tools →
                </Link>
              )}

              {matchedTools.length === 0 && (
                <div className="text-center py-4">
                  <XCircle className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Không tìm thấy tool phù hợp. Thử thay đổi tiêu chí.</p>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
