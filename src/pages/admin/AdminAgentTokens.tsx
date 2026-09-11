import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { logAuditAction } from "@/hooks/useAuditLog";
import {
  KeyRound, Plus, Trash2, Ban, Copy, Loader2, BookOpen, Bot, ShieldAlert, Check,
} from "lucide-react";

interface EditorOption {
  user_id: string;
  email: string | null;
  display_name: string | null;
  roles: string[];
}

interface AgentTokenRow {
  id: string;
  name: string;
  token_prefix: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
  last_used_at: string | null;
  owner_email: string | null;
  owner_display_name: string | null;
}

const SUPABASE_FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;
const AGENT_CONTENT_API_URL = `${SUPABASE_FUNCTIONS_URL}/agent-content-api`;

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("vi-VN");
}

function tokenStatus(row: AgentTokenRow): { label: string; variant: "default" | "secondary" | "destructive" } {
  if (row.revoked_at) return { label: "Đã revoke", variant: "destructive" };
  if (row.expires_at && new Date(row.expires_at) < new Date()) return { label: "Đã hết hạn", variant: "secondary" };
  return { label: "Hoạt động", variant: "default" };
}

// ── "Copy" helper - many small copy buttons throughout this page share it ──
function CopyButton({ text, label }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        toast.success("Đã copy");
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
      {label && <span className="ml-1.5">{label}</span>}
    </Button>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
      <code>{children}</code>
    </pre>
  );
}

// ── Tab 1: Token management ─────────────────────────────────────────────
function TokensTab() {
  const queryClient = useQueryClient();

  const [createOpen, setCreateOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">("new");
  const [tokenName, setTokenName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newAccountEmail, setNewAccountEmail] = useState("");
  const [expiresInDays, setExpiresInDays] = useState("");
  const [createdToken, setCreatedToken] = useState<string | null>(null);

  const { data: tokensData, isLoading: tokensLoading } = useQuery({
    queryKey: ["admin-agent-tokens"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-agent-tokens", { body: { action: "list_tokens" } });
      if (error) throw error;
      return data as { tokens: AgentTokenRow[] };
    },
  });

  const { data: editorsData } = useQuery({
    queryKey: ["admin-agent-token-editors"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("manage-agent-tokens", { body: { action: "list_editors" } });
      if (error) throw error;
      return data as { editors: EditorOption[] };
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        action: "create_token",
        name: tokenName.trim(),
        expires_in_days: expiresInDays ? Number(expiresInDays) : undefined,
      };
      if (mode === "existing") body.user_id = selectedUserId;
      else body.new_account_email = newAccountEmail.trim();

      const { data, error } = await supabase.functions.invoke("manage-agent-tokens", { body });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as { token: string; id: string };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin-agent-tokens"] });
      queryClient.invalidateQueries({ queryKey: ["admin-agent-token-editors"] });
      logAuditAction("agent_token_create", "agent_api_key", data.id, { name: tokenName });
      setCreatedToken(data.token);
      toast.success("Đã tạo token - nhớ copy ngay, sẽ không hiện lại!");
    },
    onError: (e: any) => toast.error(e?.message || "Lỗi khi tạo token"),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("manage-agent-tokens", { body: { action: "revoke_token", id } });
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-agent-tokens"] });
      logAuditAction("agent_token_revoke", "agent_api_key", id);
      toast.success("Đã revoke token");
    },
    onError: () => toast.error("Lỗi khi revoke token"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("manage-agent-tokens", { body: { action: "delete_token", id } });
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ["admin-agent-tokens"] });
      logAuditAction("agent_token_delete", "agent_api_key", id);
      toast.success("Đã xoá token khỏi danh sách");
    },
    onError: () => toast.error("Lỗi khi xoá token"),
  });

  function resetCreateForm() {
    setTokenName("");
    setSelectedUserId("");
    setNewAccountEmail("");
    setExpiresInDays("");
    setMode("new");
    setCreatedToken(null);
  }

  const tokens = tokensData?.tokens || [];
  const editors = editorsData?.editors || [];

  return (
    <div className="space-y-6">
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <ShieldAlert className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Agent Token = quyền editor cho máy/AI agent</p>
              <p>
                Token này thay thế cho việc mời editor qua email khi bên nhận là một AI agent tự động (không có hộp mail để bấm link).
                Token có quyền tương đương tài khoản <strong>editor</strong> gắn với nó: tạo/sửa/gửi duyệt bài viết qua{" "}
                <code className="text-xs bg-muted px-1 rounded">agent-content-api</code>, nhưng{" "}
                <strong>không bao giờ tự publish được</strong>. Giữ token bí mật như một password - ai có token đều gọi API được.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Danh sách Agent Tokens</h2>
          <p className="text-sm text-muted-foreground">Tạo, xem, thu hồi token cấp cho AI agent</p>
        </div>
        <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) resetCreateForm(); }}>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Tạo Token
          </Button>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Tạo Agent Token mới</DialogTitle>
              <DialogDescription>Token sẽ chỉ hiển thị đúng 1 lần sau khi tạo - hãy copy ngay.</DialogDescription>
            </DialogHeader>

            {createdToken ? (
              <div className="space-y-4">
                <div className="rounded-md border border-green-500/30 bg-green-500/5 p-4 space-y-2">
                  <p className="text-sm font-medium">Token đã tạo thành công. Copy ngay - sẽ KHÔNG hiện lại:</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 text-xs bg-muted p-2 rounded break-all">{createdToken}</code>
                    <CopyButton text={createdToken} />
                  </div>
                </div>
                <Button className="w-full" onClick={() => { setCreateOpen(false); resetCreateForm(); }}>Đóng</Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Tên token (để dễ nhận diện)</Label>
                  <Input placeholder="VD: Content Agent - Blog Writer" value={tokenName} onChange={(e) => setTokenName(e.target.value)} />
                </div>

                <div className="space-y-1.5">
                  <Label>Gắn token vào</Label>
                  <Select value={mode} onValueChange={(v) => setMode(v as "existing" | "new")}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Tài khoản agent mới (không gửi email)</SelectItem>
                      <SelectItem value="existing">Tài khoản editor/admin đã có</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {mode === "new" ? (
                  <div className="space-y-1.5">
                    <Label>Email định danh cho tài khoản agent</Label>
                    <Input
                      type="email"
                      placeholder="agent-content-writer@yourdomain.com"
                      value={newAccountEmail}
                      onChange={(e) => setNewAccountEmail(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Chỉ dùng để định danh, KHÔNG gửi email/mật khẩu. Tài khoản này được gán role editor và chỉ truy cập được qua token.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label>Chọn tài khoản editor/admin</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger><SelectValue placeholder="Chọn tài khoản..." /></SelectTrigger>
                      <SelectContent>
                        {editors.map((ed) => (
                          <SelectItem key={ed.user_id} value={ed.user_id}>
                            {ed.display_name || ed.email || ed.user_id} ({ed.roles.join(", ")})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Hết hạn sau (ngày, bỏ trống = không hết hạn)</Label>
                  <Input type="number" min={1} placeholder="VD: 90" value={expiresInDays} onChange={(e) => setExpiresInDays(e.target.value)} />
                </div>

                <Button
                  className="w-full"
                  disabled={createMutation.isPending || !tokenName.trim() || (mode === "existing" ? !selectedUserId : !newAccountEmail.trim())}
                  onClick={() => createMutation.mutate()}
                >
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <KeyRound className="h-4 w-4 mr-1.5" />}
                  Tạo Token
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          {tokensLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : tokens.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">Chưa có token nào. Bấm "Tạo Token" để bắt đầu.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Prefix</TableHead>
                    <TableHead>Tài khoản gắn</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead>Tạo lúc</TableHead>
                    <TableHead>Hết hạn</TableHead>
                    <TableHead>Dùng lần cuối</TableHead>
                    <TableHead className="text-right">Hành động</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tokens.map((t) => {
                    const status = tokenStatus(t);
                    return (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.name}</TableCell>
                        <TableCell><code className="text-xs">{t.token_prefix}...</code></TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.owner_display_name || t.owner_email || "-"}</TableCell>
                        <TableCell><Badge variant={status.variant}>{status.label}</Badge></TableCell>
                        <TableCell className="text-sm">{formatDate(t.created_at)}</TableCell>
                        <TableCell className="text-sm">{formatDate(t.expires_at)}</TableCell>
                        <TableCell className="text-sm">{formatDate(t.last_used_at)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          {!t.revoked_at && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="outline" size="sm"><Ban className="h-3.5 w-3.5" /></Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Revoke token "{t.name}"?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Token sẽ bị vô hiệu ngay lập tức. Mọi request từ agent dùng token này sẽ bị từ chối (401). Không thể hoàn tác.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Huỷ</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => revokeMutation.mutate(t.id)}>Revoke</AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm"><Trash2 className="h-3.5 w-3.5" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Xoá token "{t.name}" khỏi danh sách?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Chỉ xoá bản ghi hiển thị (dọn dẹp danh sách). Nếu token chưa revoke, hãy revoke trước.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Huỷ</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteMutation.mutate(t.id)}>Xoá</AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Tab 2: Integration docs for AI agents ───────────────────────────────
function DocsTab() {
  const curlExample = `curl -X POST "${AGENT_CONTENT_API_URL}" \\
  -H "Authorization: Bearer sk_agent_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "resource": "blog_posts",
    "action": "create",
    "title": "Bài viết đầu tiên của agent",
    "content": "<p>Nội dung bài viết...</p>",
    "excerpt": "Tóm tắt ngắn",
    "submit_for_review": true
  }'`;

  const jsExample = `const res = await fetch("${AGENT_CONTENT_API_URL}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer " + AGENT_TOKEN, // sk_agent_...
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    resource: "tools",       // "blog_posts" (mặc định) | "tools" | "deals" | "translations"
    action: "list",
    status: "pending_review",
    limit: 20,
  }),
});
const data = await res.json();`;

  const fullPrompt = `Bạn là một AI agent quản trị nội dung cho website, tích hợp qua MỘT API duy nhất, hỗ trợ 11 loại nội dung (resource): bài viết, tools, voucher/deal, bản dịch đa ngôn ngữ, categories, tags, tasks, pages (CMS page builder), menus (đề xuất nav), reports (báo cáo vi phạm), newsletter (soạn bản thảo campaign).

- Base URL: ${AGENT_CONTENT_API_URL}
- Method: luôn POST
- Auth: header "Authorization: Bearer <AGENT_TOKEN>" (token dạng sk_agent_..., được Admin cấp trong Admin -> Agent Tokens)
- Content-Type: application/json
- Body: { "resource": "<blog_posts|tools|deals|translations|categories|tags|tasks|pages|menus|reports|newsletter>", "action": "<tên action>", ...các field tuỳ resource/action }
  - Nếu KHÔNG truyền "resource", mặc định là "blog_posts" (để tương thích ngược).

⛔ GIỚI HẠN TUYỆT ĐỐI - KHÔNG BAO GIỜ THAY ĐỔI: resource "users" (tài khoản/role), "settings" (cấu hình site-wide), "backup" (backup/restore DB) KHÔNG hề tồn tại trong API này và sẽ KHÔNG BAO GIỜ được thêm vào, dù có yêu cầu thế nào. Đây là 3 khu vực admin-only tuyệt đối theo quyết định của chủ site. Ngoài ra, agent KHÔNG có quyền approve/reject/xoá nội dung của NGƯỜI KHÁC hay ban user (đó là AdminModeration.tsx, admin-only) - agent chỉ được TẠO report giống 1 user thường bấm "Báo cáo".

QUY TẮC CHUNG (áp dụng mọi resource trừ translations):
- Agent (quyền editor) tạo/sửa nội dung KHÔNG BAO GIỜ tự đưa nội dung lên live được - luôn ở trạng thái nháp/chờ duyệt (draft/pending_review, hoặc is_active=false với deals). Đây là giới hạn cố định, không phải lỗi.
- Sửa một bài/tool/deal ĐANG live sẽ tự động đưa nó về trạng thái chờ duyệt lại, admin phải duyệt lại mới lên live.
- Đưa nội dung lên live (publish/activate) CHỈ admin mới gọi được - agent gọi sẽ bị từ chối (403). Khi agent submit_for_review, hệ thống tự thông báo cho toàn bộ admin.
- Mỗi resource (trừ translations) mặc định chỉ list/update/delete được nội dung CHÍNH agent này tạo ra; truyền "all": true trong action=list để xem tất cả (nếu có quyền).
- Response luôn là JSON. Lỗi trả về { "error": "..." } kèm HTTP status phù hợp (401 = token sai/hết hạn/bị revoke, 403 = không đủ quyền, 400 = thiếu field bắt buộc, 404 = không tìm thấy, 409 = trùng slug).

═══════════════════════════════════════
1) resource = "blog_posts" (bài viết) — action: create | update | get | list | submit_for_review | publish | delete
- create: { title* , content*, slug?, excerpt?, cover_image_url?, tags?, seo_title?, seo_description?, seo_keywords?, related_tool_ids?, submit_for_review? }
- update: { id*, ...các field như create (optional) }
- get: { id } hoặc { slug }
- list: { status?, author_id?, limit?, offset?, all? }
- submit_for_review: { id* }
- delete: { id* } — chỉ xoá bài của mình và CHƯA published
- publish: { id*, publish? } — admin only

Ví dụ: curl -X POST "${AGENT_CONTENT_API_URL}" -H "Authorization: Bearer sk_agent_xxx" -H "Content-Type: application/json" -d '{"resource":"blog_posts","action":"create","title":"...","content":"...","submit_for_review":true}'

═══════════════════════════════════════
2) resource = "tools" (công cụ AI trong thư mục) — action: create | update | get | list | submit_for_review | publish | delete
- create: { name*, slug?, description?, short_description?, website_url?, logo_url?, affiliate_url?, pricing_type? (free|freemium|paid|open_source|contact), category_id?, platforms? (mảng hoặc chuỗi phân cách bởi dấu phẩy), features?, pricing_details?, faq? (mảng {question,answer}), has_free_trial?, trial_days?, requires_card?, signup_options?, related_tool_ids?, submit_for_review? }
- update: { id*, ...các field như create (optional) }
- get: { id } hoặc { slug } — trả kèm categories(name)
- list: { status?, category_id?, submitted_by?, limit?, offset?, all? }
- submit_for_review: { id* }
- delete: { id* } — chỉ xoá tool của mình và CHƯA published
- publish: { id*, publish? } — admin only

Ví dụ: curl -X POST "${AGENT_CONTENT_API_URL}" -H "Authorization: Bearer sk_agent_xxx" -H "Content-Type: application/json" -d '{"resource":"tools","action":"create","name":"ChatGPT","description":"...","pricing_type":"freemium","submit_for_review":true}'

═══════════════════════════════════════
3) resource = "deals" (voucher / mã giảm giá) — action: create | update | get | list | activate_deal | verify_deal | delete
- Deals KHÔNG dùng status - dùng cờ is_active (true/false). Agent tạo/sửa deal LUÔN ra is_active=false, không có action publish/submit_for_review riêng - dùng "activate_deal" (admin only) để kích hoạt.
- create: { tool_id* (uuid của tool), title*, description?, coupon_code?, discount_type? (percentage|fixed...), discount_value?, deal_url?, original_price?, deal_price?, currency? (mặc định USD), starts_at?, expires_at?, is_verified?, is_exclusive?, slug? (tự sinh nếu bỏ trống, luôn kèm 8 ký tự random tránh trùng), deal_type? (coupon_code|lifetime_deal|free_trial_extended|student_discount|referral|bundle|flash_sale|no_code_auto — mặc định coupon_code; khác discount_type - discount_type chỉ mô tả CÁCH tính giảm giá, deal_type mô tả LOẠI ưu đãi), redemption_type? (code|auto_apply|manual_contact — mặc định code), eligibility? (jsonb, vd {"new_users_only":true}), terms_conditions?, usage_limit?, banner_image_url? }
- update: { id*, ...các field như create (optional) } — nếu deal đang active, sửa sẽ tự tắt is_active để admin duyệt lại
- get: { id hoặc slug* } — trả kèm tools(name, slug, logo_url)
- list: { is_active?, tool_id?, deal_type?, created_by?, limit?, offset?, all? } — trả kèm slug/deal_type/redemption_type/savings_percent (tự tính từ original_price/deal_price)/usage_limit/current_uses
- delete: { id* } — chỉ xoá deal của mình và ĐANG KHÔNG active
- activate_deal: { id*, activate? } — admin only, tương đương "publish" cho deals
- verify_deal: { id*, still_works? (mặc định true) } — KHÔNG cần quyền admin, ai gọi cũng được (giống người dùng thường bấm nút "còn dùng được"/"báo lỗi" trên site) - tín hiệu cộng đồng, tách biệt với activate_deal (admin-only publish gate). still_works=false sẽ tự set is_verified=false và tạo notification cho mọi admin.

Ví dụ: curl -X POST "${AGENT_CONTENT_API_URL}" -H "Authorization: Bearer sk_agent_xxx" -H "Content-Type: application/json" -d '{"resource":"deals","action":"create","tool_id":"<uuid>","title":"Giảm 20% năm đầu","coupon_code":"SAVE20","discount_type":"percentage","discount_value":20,"deal_type":"coupon_code","redemption_type":"code","usage_limit":100}'

═══════════════════════════════════════
4) resource = "translations" (bản dịch đa ngôn ngữ cho blog/tool/deal/workflow) — action: create | get | list | delete
- KHÔNG có publish/update riêng và KHÔNG bị chặn tự động lên live - translations chỉ là lớp phủ hiển thị theo locale, không có rủi ro "nội dung chưa duyệt bị public", nên agent được TỰ DO ghi/sửa/xoá.
- action "create" cũng đóng vai trò "update" (upsert theo entity_type+entity_id+locale+field_name).
- create: { entity_type* (blog|tool|deal|workflow), entity_id* (uuid), locale* (vd: en, ja, ko, zh), is_auto? (mặc định true), và MỘT trong hai cách:
    (a) { field_name*, translated_text* } — ghi 1 field
    (b) { fields: { title: "...", content: "...", ... } } — ghi nhiều field trong 1 lần gọi
- get: { entity_type*, entity_id*, locale? }
- list: { entity_type?, entity_id?, locale?, limit?, offset? }
- delete: { entity_type*, entity_id*, locale?, field_name? } — không truyền locale/field_name thì xoá TOÀN BỘ bản dịch của entity đó

Ví dụ: curl -X POST "${AGENT_CONTENT_API_URL}" -H "Authorization: Bearer sk_agent_xxx" -H "Content-Type: application/json" -d '{"resource":"translations","action":"create","entity_type":"blog","entity_id":"<uuid>","locale":"en","fields":{"title":"...","excerpt":"..."}}'

═══════════════════════════════════════
5) resource = "categories" | "tags" | "tasks" (taxonomy đơn giản) — action: create | update | get | list | delete
- KHÔNG có draft/pending_review - ghi là LÊN NGAY công khai (khác hẳn blog/tools/deals/pages). Admin đã chủ động cho phép editor/agent insert/update trực tiếp.
- create: { name*, slug?, description? (không áp dụng cho tags), icon? (không áp dụng cho tags), parent_id? (chỉ categories), sort_order? (không áp dụng cho tags) }
- update: { id*, ...các field như create }
- get: { id } hoặc { slug }
- list: { parent_id? (chỉ categories), limit?, offset? }
- delete: ADMIN ONLY - editor/agent gọi sẽ bị 403 (tránh xoá nhầm taxonomy đang được nhiều tools/tasks tham chiếu)

Ví dụ: curl -X POST "${AGENT_CONTENT_API_URL}" -H "Authorization: Bearer sk_agent_xxx" -H "Content-Type: application/json" -d '{"resource":"categories","action":"create","name":"Video AI","icon":"🎬"}'

═══════════════════════════════════════
6) resource = "pages" (CMS page builder) — action: create | update | get | list | submit_for_review | publish | delete
- Y HỆT pattern blog_posts/tools: editor/agent chỉ tạo được draft/pending_review, publish CHỈ admin.
- create: { title*, slug?, blocks? (mảng block jsonb, mặc định []), seo_title?, seo_description?, template? (mặc định "blank"), submit_for_review? }
- update: { id*, ...các field như create }
- get: { id } hoặc { slug }
- list: { status?, created_by?, limit?, offset?, all? }
- submit_for_review: { id* }
- publish: { id*, publish? } — admin only
- delete: { id* } — chỉ xoá trang của mình và CHƯA published

Ví dụ: curl -X POST "${AGENT_CONTENT_API_URL}" -H "Authorization: Bearer sk_agent_xxx" -H "Content-Type: application/json" -d '{"resource":"pages","action":"create","title":"Về chúng tôi","submit_for_review":true}'

═══════════════════════════════════════
7) resource = "menus" (đề xuất header/footer navigation) — action: propose | publish | get | list
- Menu KHÔNG có khái niệm status nên KHÔNG BAO GIỜ ghi trực tiếp vào nav đang hiển thị công khai (cột "items") - action "propose" LUÔN LUÔN ghi vào "draft_items" (đề xuất chờ duyệt), dù caller là editor hay admin.
- propose: { location* ("header"|"footer"), items* (mảng {label, url, icon?, open_new_tab, children?}) } — lưu vào draft_items, thông báo mọi admin
- publish: { location* } — ADMIN ONLY - copy draft_items → items (nav LIVE thay đổi ngay)
- get: { location } — trả cả items (live) và draft_items (đang chờ)
- list: {} — trả tất cả menu (header + footer)

Ví dụ: curl -X POST "${AGENT_CONTENT_API_URL}" -H "Authorization: Bearer sk_agent_xxx" -H "Content-Type: application/json" -d '{"resource":"menus","action":"propose","location":"header","items":[{"label":"Blog","url":"/blog","open_new_tab":false}]}'

═══════════════════════════════════════
8) resource = "reports" (báo cáo vi phạm - KHÔNG phải hành động kiểm duyệt thật) — action: create | get | list
- Agent CHỈ được tạo report mới, giống hệt 1 user thường bấm nút "Báo cáo" trên site. KHÔNG có action approve/reject/resolve/dismiss/ban - những hành động đó 100% admin-only, nằm trong AdminReports.tsx/AdminModeration.tsx, KHÔNG expose qua API này.
- create: { target_type* (comment|review|tool|user|question), target_id* (uuid), reason*, details? }
- get: { id* } — chỉ xem được report do chính mình tạo (hoặc admin xem tất cả)
- list: { status?, target_type?, limit?, offset? } — editor/agent chỉ thấy report do chính mình tạo

Ví dụ: curl -X POST "${AGENT_CONTENT_API_URL}" -H "Authorization: Bearer sk_agent_xxx" -H "Content-Type: application/json" -d '{"resource":"reports","action":"create","target_type":"comment","target_id":"<uuid>","reason":"Spam"}'

═══════════════════════════════════════
9) resource = "newsletter" (soạn NỘI DUNG bản thảo campaign - KHÔNG phải quản lý subscriber) — action: draft_campaign | list_campaigns
- Agent KHÔNG có quyền đọc danh sách subscriber (email PII của user thật) và KHÔNG có khả năng gửi email thật - đó vẫn là admin-only trong AdminNewsletter.tsx (hiện tại còn là placeholder chưa nối email provider thật).
- draft_campaign: { subject*, content* } — lưu bản thảo riêng biệt, KHÔNG đụng tới config/blacklist khác cũng nằm trong site_settings
- list_campaigns: {} — editor/agent chỉ thấy bản thảo do chính mình tạo, admin thấy hết

Ví dụ: curl -X POST "${AGENT_CONTENT_API_URL}" -H "Authorization: Bearer sk_agent_xxx" -H "Content-Type: application/json" -d '{"resource":"newsletter","action":"draft_campaign","subject":"Bản tin tháng 9","content":"..."}'`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5" /> Cách AI Agent kết nối</CardTitle>
          <CardDescription>Toàn bộ thông tin cần để đưa cho một AI agent bên ngoài tích hợp vào hệ thống này.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Phương thức xác thực</Label>
              <p className="text-sm mt-1">
                <Badge variant="outline" className="mr-1">Bearer Token</Badge>
                header <code className="text-xs bg-muted px-1 rounded">Authorization: Bearer sk_agent_...</code>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Token tạo tại tab "Agent Tokens" - KHÔNG cần đăng nhập email/password.
              </p>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Endpoint duy nhất</Label>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all">{AGENT_CONTENT_API_URL}</code>
                <CopyButton text={AGENT_CONTENT_API_URL} />
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs text-muted-foreground">Ví dụ curl</Label>
              <CopyButton text={curlExample} label="Copy" />
            </div>
            <CodeBlock>{curlExample}</CodeBlock>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <Label className="text-xs text-muted-foreground">Ví dụ JavaScript (fetch)</Label>
              <CopyButton text={jsExample} label="Copy" />
            </div>
            <CodeBlock>{jsExample}</CodeBlock>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bảng action hỗ trợ</CardTitle>
          <CardDescription>Toàn bộ resource/action của <code className="text-xs">agent-content-api</code>. Mỗi request cần kèm <code className="text-xs">"resource"</code> (mặc định <code className="text-xs">blog_posts</code> nếu bỏ trống).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <p className="text-sm font-medium mb-2">resource = <code className="text-xs bg-muted px-1 rounded">blog_posts</code> (bài viết)</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Ai gọi được</TableHead>
                    <TableHead>Field chính</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><code className="text-xs">create</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">title*, content*, slug?, excerpt?, tags?, submit_for_review?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Luôn ra draft/pending_review, không published</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">update</code></TableCell>
                    <TableCell>editor (bài của mình), admin</TableCell>
                    <TableCell className="text-xs">id*, ...các field như create</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Sửa bài published → tự về pending_review</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">get</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">id hoặc slug</TableCell>
                    <TableCell className="text-xs text-muted-foreground">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">list</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">status?, author_id?, limit?, offset?, all?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Editor mặc định chỉ thấy bài của mình</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">submit_for_review</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">id*</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Tạo notification cho admin</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">publish</code></TableCell>
                    <TableCell>admin only</TableCell>
                    <TableCell className="text-xs">id*, publish?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Editor gọi sẽ bị 403</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">delete</code></TableCell>
                    <TableCell>editor (bài của mình, chưa published), admin</TableCell>
                    <TableCell className="text-xs">id*</TableCell>
                    <TableCell className="text-xs text-muted-foreground">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">resource = <code className="text-xs bg-muted px-1 rounded">tools</code> (công cụ AI trong thư mục)</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Ai gọi được</TableHead>
                    <TableHead>Field chính</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><code className="text-xs">create</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">name*, slug?, description?, pricing_type?, category_id?, platforms?, faq?, submit_for_review?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Luôn ra draft/pending_review, không published</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">update</code></TableCell>
                    <TableCell>editor (tool của mình), admin</TableCell>
                    <TableCell className="text-xs">id*, ...các field như create</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Sửa tool published → tự về pending_review</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">get</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">id hoặc slug</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Trả kèm categories(name)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">list</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">status?, category_id?, submitted_by?, limit?, offset?, all?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Editor mặc định chỉ thấy tool của mình</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">submit_for_review</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">id*</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Tạo notification cho admin</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">publish</code></TableCell>
                    <TableCell>admin only</TableCell>
                    <TableCell className="text-xs">id*, publish?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Editor gọi sẽ bị 403</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">delete</code></TableCell>
                    <TableCell>editor (tool của mình, chưa published), admin</TableCell>
                    <TableCell className="text-xs">id*</TableCell>
                    <TableCell className="text-xs text-muted-foreground">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">resource = <code className="text-xs bg-muted px-1 rounded">deals</code> (voucher / mã giảm giá)</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Ai gọi được</TableHead>
                    <TableHead>Field chính</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><code className="text-xs">create</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">tool_id*, title*, coupon_code?, discount_type?, discount_value?, expires_at?, deal_type?, redemption_type?, usage_limit?, eligibility?, terms_conditions?, banner_image_url?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Editor tạo LUÔN is_active=false; slug tự sinh nếu bỏ trống</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">update</code></TableCell>
                    <TableCell>editor (deal của mình), admin</TableCell>
                    <TableCell className="text-xs">id*, ...các field như create</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Sửa deal active → tự tắt is_active, admin duyệt lại</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">get</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">id hoặc slug*</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Trả kèm tools(name, slug, logo_url)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">list</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">is_active?, tool_id?, deal_type?, created_by?, limit?, offset?, all?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Editor mặc định chỉ thấy deal của mình; trả kèm slug/savings_percent/usage_limit</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">activate_deal</code></TableCell>
                    <TableCell>admin only</TableCell>
                    <TableCell className="text-xs">id*, activate?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Tương đương "publish" - editor gọi sẽ bị 403</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">verify_deal</code></TableCell>
                    <TableCell>editor, admin (ai cũng gọi được)</TableCell>
                    <TableCell className="text-xs">id*, still_works? (mặc định true)</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Tín hiệu cộng đồng, KHÔNG cần quyền admin; still_works=false báo admin</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">delete</code></TableCell>
                    <TableCell>editor (deal của mình, chưa active), admin</TableCell>
                    <TableCell className="text-xs">id*</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Không xoá được deal đang active</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">resource = <code className="text-xs bg-muted px-1 rounded">translations</code> (bản dịch đa ngôn ngữ)</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Ai gọi được</TableHead>
                    <TableHead>Field chính</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><code className="text-xs">create</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">entity_type*, entity_id*, locale*, fields{"{}"} hoặc field_name+translated_text</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Upsert - vừa tạo vừa sửa, KHÔNG cần duyệt</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">get</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">entity_type*, entity_id*, locale?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">list</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">entity_type?, entity_id?, locale?, limit?, offset?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Không lọc theo người tạo (không có ownership)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">delete</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">entity_type*, entity_id*, locale?, field_name?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Bỏ trống locale/field_name → xoá toàn bộ bản dịch của entity</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">resource = <code className="text-xs bg-muted px-1 rounded">categories</code> / <code className="text-xs bg-muted px-1 rounded">tags</code> / <code className="text-xs bg-muted px-1 rounded">tasks</code> (taxonomy đơn giản)</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Ai gọi được</TableHead>
                    <TableHead>Field chính</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><code className="text-xs">create</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">name*, slug?, description?, icon?, parent_id? (categories), sort_order?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">LÊN NGAY công khai - không có draft/pending_review</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">update</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">id*, ...các field như create</TableCell>
                    <TableCell className="text-xs text-muted-foreground">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">get</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">id hoặc slug</TableCell>
                    <TableCell className="text-xs text-muted-foreground">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">list</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">parent_id? (categories), limit?, offset?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">delete</code></TableCell>
                    <TableCell>admin only</TableCell>
                    <TableCell className="text-xs">id*</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Editor/agent gọi sẽ bị 403 - tránh xoá nhầm taxonomy đang dùng chung</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">resource = <code className="text-xs bg-muted px-1 rounded">pages</code> (CMS page builder)</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Ai gọi được</TableHead>
                    <TableHead>Field chính</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><code className="text-xs">create</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">title*, slug?, blocks?, seo_title?, seo_description?, template?, submit_for_review?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Luôn ra draft/pending_review, không published</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">update</code></TableCell>
                    <TableCell>editor (trang của mình), admin</TableCell>
                    <TableCell className="text-xs">id*, ...các field như create</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Sửa trang published → tự về pending_review</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">get</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">id hoặc slug</TableCell>
                    <TableCell className="text-xs text-muted-foreground">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">list</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">status?, created_by?, limit?, offset?, all?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Editor mặc định chỉ thấy trang của mình</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">submit_for_review</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">id*</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Tạo notification cho admin</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">publish</code></TableCell>
                    <TableCell>admin only</TableCell>
                    <TableCell className="text-xs">id*, publish?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Editor gọi sẽ bị 403</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">delete</code></TableCell>
                    <TableCell>editor (trang của mình, chưa published), admin</TableCell>
                    <TableCell className="text-xs">id*</TableCell>
                    <TableCell className="text-xs text-muted-foreground">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">resource = <code className="text-xs bg-muted px-1 rounded">menus</code> (đề xuất header/footer navigation)</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Ai gọi được</TableHead>
                    <TableHead>Field chính</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><code className="text-xs">propose</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">location* (header|footer), items* (mảng MenuItem)</TableCell>
                    <TableCell className="text-xs text-muted-foreground">LUÔN ghi vào draft_items - nav LIVE không đổi cho tới khi publish</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">publish</code></TableCell>
                    <TableCell>admin only</TableCell>
                    <TableCell className="text-xs">location*</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Copy draft_items → items (nav LIVE đổi ngay) - editor gọi sẽ bị 403</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">get</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">location</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Trả cả items (live) và draft_items (đang chờ)</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">list</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">(không cần field)</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Trả tất cả menu (header + footer)</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">resource = <code className="text-xs bg-muted px-1 rounded">reports</code> (báo cáo vi phạm - KHÔNG phải hành động kiểm duyệt)</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Ai gọi được</TableHead>
                    <TableHead>Field chính</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><code className="text-xs">create</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">target_type* (comment|review|tool|user|question), target_id*, reason*, details?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Giống 1 user thường bấm "Báo cáo" - KHÔNG phải approve/reject/ban</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">get</code></TableCell>
                    <TableCell>editor (report của mình), admin</TableCell>
                    <TableCell className="text-xs">id*</TableCell>
                    <TableCell className="text-xs text-muted-foreground">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">list</code></TableCell>
                    <TableCell>editor (report của mình), admin</TableCell>
                    <TableCell className="text-xs">status?, target_type?, limit?, offset?</TableCell>
                    <TableCell className="text-xs text-muted-foreground">Không có approve/reject/resolve/dismiss/ban - admin-only trong AdminReports.tsx</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div>
            <p className="text-sm font-medium mb-2">resource = <code className="text-xs bg-muted px-1 rounded">newsletter</code> (soạn bản thảo campaign - KHÔNG quản lý subscriber)</p>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Action</TableHead>
                    <TableHead>Ai gọi được</TableHead>
                    <TableHead>Field chính</TableHead>
                    <TableHead>Ghi chú</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell><code className="text-xs">draft_campaign</code></TableCell>
                    <TableCell>editor, admin</TableCell>
                    <TableCell className="text-xs">subject*, content*</TableCell>
                    <TableCell className="text-xs text-muted-foreground">KHÔNG có quyền gửi email hoặc đọc subscriber (PII) - admin xem/gửi trong AdminNewsletter.tsx</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell><code className="text-xs">list_campaigns</code></TableCell>
                    <TableCell>editor (bản thảo của mình), admin</TableCell>
                    <TableCell className="text-xs">(không cần field)</TableCell>
                    <TableCell className="text-xs text-muted-foreground">-</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BookOpen className="h-5 w-5" /> Prompt đầy đủ để dán cho AI Agent</CardTitle>
          <CardDescription>Copy toàn bộ đoạn này và dán vào system prompt / hướng dẫn của AI agent (nhớ thay <code className="text-xs">sk_agent_xxx</code> bằng token thật lấy ở tab Agent Tokens).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <CopyButton text={fullPrompt} label="Copy toàn bộ hướng dẫn" />
          <CodeBlock>{fullPrompt}</CodeBlock>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminAgentTokens() {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2"><KeyRound className="h-7 w-7" /> Agent Tokens</h1>
          <p className="text-muted-foreground mt-1">Cấp quyền và hướng dẫn tích hợp cho AI agent - không cần email/password.</p>
        </div>

        <Tabs defaultValue="tokens">
          <TabsList>
            <TabsTrigger value="tokens">Quản lý Token</TabsTrigger>
            <TabsTrigger value="docs">Hướng dẫn tích hợp</TabsTrigger>
          </TabsList>
          <TabsContent value="tokens" className="mt-4">
            <TokensTab />
          </TabsContent>
          <TabsContent value="docs" className="mt-4">
            <DocsTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
