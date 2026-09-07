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
    action: "list",
    status: "pending_review",
    limit: 20,
  }),
});
const data = await res.json();`;

  const fullPrompt = `Bạn là một AI agent viết nội dung cho website, tích hợp qua API sau:

- Base URL: ${AGENT_CONTENT_API_URL}
- Method: luôn POST
- Auth: header "Authorization: Bearer <AGENT_TOKEN>" (token dạng sk_agent_..., được Admin cấp trong Admin -> Agent Tokens)
- Content-Type: application/json
- Body: { "action": "<tên action>", ...các field tuỳ action }

Các action hỗ trợ:
1. create - Tạo bài viết mới.
   Body: { action: "create", title (bắt buộc), content (bắt buộc), slug?, excerpt?, cover_image_url?, tags?, seo_title?, seo_description?, seo_keywords?, related_tool_ids?, submit_for_review? }
   - slug tự sinh từ title nếu không truyền.
   - Bài viết LUÔN ở trạng thái draft hoặc pending_review, KHÔNG BAO GIỜ tự published được (đây là giới hạn cố định của quyền editor, không phải lỗi).

2. update - Sửa bài viết đã có.
   Body: { action: "update", id (bắt buộc), ...các field như create, đều optional }
   - Nếu sửa bài đang published, bài tự chuyển về pending_review để admin duyệt lại.

3. get - Lấy 1 bài viết.
   Body: { action: "get", id } hoặc { action: "get", slug }

4. list - Danh sách bài viết (phân trang).
   Body: { action: "list", status?, author_id?, limit?, offset?, all? }
   - Mặc định chỉ thấy bài của chính agent, truyền all: true để xem tất cả (nếu có quyền).

5. submit_for_review - Gửi 1 bài draft sang chờ duyệt.
   Body: { action: "submit_for_review", id }

6. delete - Xoá bài viết.
   Body: { action: "delete", id }
   - Chỉ xoá được bài viết CHÍNH agent tạo và CHƯA published.

7. publish - CHỈ tài khoản admin mới gọi được (agent với quyền editor sẽ bị từ chối).

Response luôn là JSON. Lỗi trả về dạng { "error": "..." } kèm HTTP status phù hợp (401 = token sai/hết hạn/bị revoke, 403 = không đủ quyền, 400 = thiếu field bắt buộc).

Ví dụ tạo bài viết:
curl -X POST "${AGENT_CONTENT_API_URL}" -H "Authorization: Bearer sk_agent_xxx" -H "Content-Type: application/json" -d '{"action":"create","title":"...","content":"...","submit_for_review":true}'`;

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
          <CardDescription>Toàn bộ action của <code className="text-xs">agent-content-api</code></CardDescription>
        </CardHeader>
        <CardContent>
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
                  <TableCell className="text-xs">status?, limit?, offset?, all?</TableCell>
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
