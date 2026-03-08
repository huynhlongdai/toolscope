import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useState } from "react";
import { Search, Pencil, Trash2, Ban, Eye, ShieldCheck, Download, ChevronLeft, ChevronRight, Clock, MessageSquare, Star, HelpCircle, Users, UserCheck, UserX, AlertTriangle, Bell, Send } from "lucide-react";
import { logAuditAction } from "@/hooks/useAuditLog";
import { useAuth } from "@/lib/auth";

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { user: adminUser } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [banFilter, setBanFilter] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");
  const [editUser, setEditUser] = useState<any>(null);
  const [viewUser, setViewUser] = useState<any>(null);
  const [activityUser, setActivityUser] = useState<any>(null);
  const [warnUser, setWarnUser] = useState<any>(null);
  const [warnReason, setWarnReason] = useState("");
  const [notifyUser, setNotifyUser] = useState<any>(null);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      const { data: roles } = await supabase.from("user_roles").select("*");
      const { data: warnings } = await supabase.from("user_warnings").select("user_id");
      const [reviewsRes, commentsRes, questionsRes] = await Promise.all([
        supabase.from("reviews").select("author_id"),
        supabase.from("comments").select("user_id"),
        supabase.from("questions").select("user_id"),
      ]);
      return profiles.map((p: any) => ({
        ...p,
        roles: roles?.filter((r: any) => r.user_id === p.id).map((r: any) => r.role) ?? [],
        reviewCount: reviewsRes.data?.filter((r: any) => r.author_id === p.id).length ?? 0,
        commentCount: commentsRes.data?.filter((c: any) => c.user_id === p.id).length ?? 0,
        questionCount: questionsRes.data?.filter((q: any) => q.user_id === p.id).length ?? 0,
        warningCount: warnings?.filter((w: any) => w.user_id === p.id).length ?? 0,
      }));
    },
  });

  // Stats
  const totalUsers = users.length;
  const activeUsers = users.filter((u: any) => !u.is_banned).length;
  const bannedUsers = users.filter((u: any) => u.is_banned).length;
  const newThisMonth = users.filter((u: any) => {
    const d = new Date(u.created_at);
    const now = new Date();
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }).length;

  // Activity timeline for selected user
  const { data: userActivity = [], isLoading: activityLoading } = useQuery({
    queryKey: ["user-activity", activityUser?.id],
    queryFn: async () => {
      if (!activityUser?.id) return [];
      const [reviews, comments, questions] = await Promise.all([
        supabase.from("reviews").select("id, title, created_at, tools!reviews_tool_id_fkey(name)").eq("author_id", activityUser.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("comments").select("id, content, created_at, tools!comments_tool_id_fkey(name)").eq("user_id", activityUser.id).order("created_at", { ascending: false }).limit(20),
        supabase.from("questions").select("id, title, created_at, tools!questions_tool_id_fkey(name)").eq("user_id", activityUser.id).order("created_at", { ascending: false }).limit(20),
      ]);
      const items: any[] = [];
      reviews.data?.forEach((r: any) => items.push({ type: "review", icon: "⭐", text: r.title, tool: r.tools?.name, time: r.created_at }));
      comments.data?.forEach((c: any) => items.push({ type: "comment", icon: "💬", text: c.content?.slice(0, 80), tool: c.tools?.name, time: c.created_at }));
      questions.data?.forEach((q: any) => items.push({ type: "question", icon: "❓", text: q.title, tool: q.tools?.name, time: q.created_at }));
      return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
    },
    enabled: !!activityUser?.id,
  });

  // Warnings for activity dialog
  const { data: userWarnings = [] } = useQuery({
    queryKey: ["user-warnings", activityUser?.id],
    queryFn: async () => {
      if (!activityUser?.id) return [];
      const { data } = await supabase.from("user_warnings").select("*").eq("user_id", activityUser.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!activityUser?.id,
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      logAuditAction("user_role_change", "user", vars.userId, { role: vars.newRole });
      toast.success("Đã cập nhật role");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profile: any) => {
      const { error } = await supabase.from("profiles").update({
        display_name: profile.display_name, username: profile.username, bio: profile.bio,
        website: profile.website, avatar_url: profile.avatar_url,
        reputation_score: profile.reputation_score, is_banned: profile.is_banned,
      }).eq("id", profile.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Đã cập nhật profile");
      setEditUser(null);
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("profiles").delete().eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, userId) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      logAuditAction("user_delete", "user", userId);
      toast.success("Đã xóa user");
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, banned }: { userId: string; banned: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_banned: banned } as any).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      logAuditAction("user_ban_toggle", "user", vars.userId, { banned: vars.banned });
      toast.success("Đã cập nhật trạng thái");
    },
  });

  const submitWarning = async () => {
    if (!warnUser || !warnReason.trim() || !adminUser?.id) return;
    const { error } = await supabase.from("user_warnings").insert({
      user_id: warnUser.id, warned_by: adminUser.id, reason: warnReason.trim(),
    });
    if (error) { toast.error(error.message); return; }
    // Also send notification
    await supabase.from("notifications").insert({
      user_id: warnUser.id, type: "warning", title: "⚠️ Cảnh báo từ Admin",
      message: warnReason.trim(),
    });
    logAuditAction("user_warn", "user", warnUser.id, { reason: warnReason });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    toast.success("Đã gửi cảnh báo");
    setWarnUser(null); setWarnReason("");
  };

  const submitNotification = async () => {
    if (!notifyUser || !notifyTitle.trim()) return;
    const { error } = await supabase.from("notifications").insert({
      user_id: notifyUser.id, type: "admin_message", title: notifyTitle.trim(),
      message: notifyMessage.trim() || null,
    });
    if (error) { toast.error(error.message); return; }
    logAuditAction("user_notify", "user", notifyUser.id, { title: notifyTitle });
    toast.success("Đã gửi thông báo");
    setNotifyUser(null); setNotifyTitle(""); setNotifyMessage("");
  };

  const bulkBan = async (banned: boolean) => {
    if (!confirm(`${banned ? "Ban" : "Unban"} ${selectedIds.length} users?`)) return;
    for (const userId of selectedIds) {
      await supabase.from("profiles").update({ is_banned: banned } as any).eq("id", userId);
    }
    logAuditAction(`user_bulk_${banned ? "ban" : "unban"}`, "user", undefined, { count: selectedIds.length });
    queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    setSelectedIds([]);
    toast.success(`Đã ${banned ? "ban" : "unban"} ${selectedIds.length} users`);
  };

  const bulkRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      for (const userId of selectedIds) {
        await supabase.from("user_roles").delete().eq("user_id", userId);
        await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      logAuditAction("user_bulk_role_change", "user", undefined, { count: selectedIds.length });
      toast.success(`Đã cập nhật ${selectedIds.length} users`);
      setSelectedIds([]);
    },
  });

  const filtered = users.filter((u: any) => {
    const matchSearch = (u.display_name ?? "").toLowerCase().includes(search.toLowerCase()) || (u.username ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.roles.includes(roleFilter);
    const matchBan = banFilter === "all" || (banFilter === "banned" ? u.is_banned : !u.is_banned);
    const totalActivity = u.reviewCount + u.commentCount + u.questionCount;
    const matchActivity = activityFilter === "all" || (activityFilter === "active" ? totalActivity > 0 : totalActivity === 0);
    return matchSearch && matchRole && matchBan && matchActivity;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const exportCSV = () => {
    const headers = ["Display Name", "Username", "Role", "Reputation", "Reviews", "Comments", "Warnings", "Banned", "Created"];
    const rows = filtered.map((u: any) => [u.display_name || "", u.username || "", u.roles[0] || "user", u.reputation_score, u.reviewCount, u.commentCount, u.warningCount, u.is_banned ? "Yes" : "No", new Date(u.created_at).toLocaleDateString()]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => {
    if (selectedIds.length === paged.length) setSelectedIds([]);
    else setSelectedIds(paged.map((u: any) => u.id));
  };

  return (
    <AdminLayout>
      <div className="space-y-4 md:space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Quản lý Users</h1>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-1 h-3.5 w-3.5" /> CSV</Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2"><Users className="h-4 w-4 text-muted-foreground" /><span className="text-xs text-muted-foreground">Tổng users</span></div>
            <p className="text-2xl font-bold mt-1">{totalUsers}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2"><UserCheck className="h-4 w-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Active</span></div>
            <p className="text-2xl font-bold mt-1">{activeUsers}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2"><UserX className="h-4 w-4 text-destructive" /><span className="text-xs text-muted-foreground">Banned</span></div>
            <p className="text-2xl font-bold mt-1">{bannedUsers}</p>
          </CardContent></Card>
          <Card><CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2"><Star className="h-4 w-4 text-primary" /><span className="text-xs text-muted-foreground">Mới tháng này</span></div>
            <p className="text-2xl font-bold mt-1">{newThisMonth}</p>
          </CardContent></Card>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-[130px]"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả role</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          <Select value={banFilter} onValueChange={setBanFilter}>
            <SelectTrigger className="w-full sm:w-[130px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>
          <Select value={activityFilter} onValueChange={setActivityFilter}>
            <SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mọi hoạt động</SelectItem>
              <SelectItem value="active">Có đóng góp</SelectItem>
              <SelectItem value="inactive">Chưa đóng góp</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Bulk actions */}
        {selectedIds.length > 0 && (
          <Card>
            <CardContent className="py-3 flex flex-wrap items-center gap-3">
              <span className="text-sm font-medium">{selectedIds.length} đã chọn</span>
              <Select onValueChange={(v) => bulkRoleMutation.mutate(v)}>
                <SelectTrigger className="w-[130px] h-8"><SelectValue placeholder="Đổi role..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" variant="destructive" onClick={() => bulkBan(true)}><Ban className="mr-1 h-3.5 w-3.5" /> Ban</Button>
              <Button size="sm" variant="outline" onClick={() => bulkBan(false)}><ShieldCheck className="mr-1 h-3.5 w-3.5" /> Unban</Button>
              <Button size="sm" variant="ghost" onClick={() => setSelectedIds([])}>Bỏ chọn</Button>
            </CardContent>
          </Card>
        )}

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"><Checkbox checked={paged.length > 0 && selectedIds.length === paged.length} onCheckedChange={toggleAll} /></TableHead>
                <TableHead>User</TableHead>
                <TableHead>Username</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Hoạt động</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Ngày tham gia</TableHead>
                <TableHead className="text-right">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8">Đang tải...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Không có user</TableCell></TableRow>
              ) : (
                paged.map((user: any) => (
                  <TableRow key={user.id} className={user.is_banned ? "opacity-50" : ""}>
                    <TableCell><Checkbox checked={selectedIds.includes(user.id)} onCheckedChange={() => toggleSelect(user.id)} /></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8"><AvatarImage src={user.avatar_url} /><AvatarFallback>{(user.display_name ?? "U")[0]}</AvatarFallback></Avatar>
                        <div>
                          <span className="font-medium">{user.display_name ?? "—"}</span>
                          {user.warningCount > 0 && <Badge variant="outline" className="ml-1.5 text-[10px] border-amber-400 text-amber-600">⚠ {user.warningCount}</Badge>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.username ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={user.roles[0] ?? "user"} onValueChange={(v) => updateRoleMutation.mutate({ userId: user.id, newRole: v })}>
                        <SelectTrigger className="h-7 w-[110px]">
                          <Badge variant={user.roles.includes("admin") ? "default" : user.roles.includes("editor") ? "secondary" : "outline"} className="text-xs">{user.roles[0] ?? "user"}</Badge>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        <span>{user.reviewCount}R</span>
                        <span>{user.commentCount}C</span>
                        <span>{user.questionCount}Q</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={user.is_banned ? "destructive" : "outline"} className="text-xs">{user.is_banned ? "Banned" : "Active"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-xs">{new Date(user.created_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setActivityUser(user)} title="Timeline"><Clock className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setWarnUser(user)} title="Cảnh báo"><AlertTriangle className="h-4 w-4 text-amber-500" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setNotifyUser(user)} title="Gửi thông báo"><Bell className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditUser({ ...user })} title="Sửa"><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => banUserMutation.mutate({ userId: user.id, banned: !user.is_banned })} title={user.is_banned ? "Unban" : "Ban"}>
                          {user.is_banned ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <Ban className="h-4 w-4 text-destructive" />}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => { if (confirm("Xóa user này?")) deleteUserMutation.mutate(user.id); }} title="Xóa">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm text-muted-foreground">Trang {page + 1} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {/* Activity Timeline Dialog with Warnings tab */}
      <Dialog open={!!activityUser} onOpenChange={(v) => !v && setActivityUser(null)}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Lịch sử — {activityUser?.display_name}</DialogTitle></DialogHeader>
          <Tabs defaultValue="activity">
            <TabsList className="w-full">
              <TabsTrigger value="activity" className="flex-1">Hoạt động</TabsTrigger>
              <TabsTrigger value="warnings" className="flex-1">Cảnh báo ({userWarnings.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="activity" className="mt-3">
              {activityLoading ? (
                <p className="text-center py-8 text-muted-foreground">Đang tải...</p>
              ) : userActivity.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Chưa có hoạt động</p>
              ) : (
                <div className="space-y-3">
                  {userActivity.map((item: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 border-b border-border/50 pb-3 last:border-0">
                      <span className="text-lg mt-0.5">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.text}</p>
                        <p className="text-xs text-muted-foreground">
                          {item.type} • {item.tool ?? "—"} • {new Date(item.time).toLocaleDateString("vi-VN")}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="warnings" className="mt-3">
              {userWarnings.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">Chưa có cảnh báo nào</p>
              ) : (
                <div className="space-y-3">
                  {userWarnings.map((w: any) => (
                    <div key={w.id} className="border rounded-lg p-3">
                      <p className="text-sm">{w.reason}</p>
                      <p className="text-xs text-muted-foreground mt-1">{new Date(w.created_at).toLocaleString("vi-VN")}</p>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Warn User Dialog */}
      <Dialog open={!!warnUser} onOpenChange={(v) => !v && setWarnUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cảnh báo — {warnUser?.display_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Textarea placeholder="Lý do cảnh báo..." value={warnReason} onChange={(e) => setWarnReason(e.target.value)} rows={3} />
            <Button className="w-full" onClick={submitWarning} disabled={!warnReason.trim()}>
              <AlertTriangle className="mr-1 h-4 w-4" /> Gửi cảnh báo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Send Notification Dialog */}
      <Dialog open={!!notifyUser} onOpenChange={(v) => !v && setNotifyUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Gửi thông báo — {notifyUser?.display_name}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input placeholder="Tiêu đề..." value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} />
            <Textarea placeholder="Nội dung (tùy chọn)..." value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} rows={3} />
            <Button className="w-full" onClick={submitNotification} disabled={!notifyTitle.trim()}>
              <Send className="mr-1 h-4 w-4" /> Gửi thông báo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View User Dialog */}
      <Dialog open={!!viewUser} onOpenChange={(v) => !v && setViewUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chi tiết User</DialogTitle></DialogHeader>
          {viewUser && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12"><AvatarImage src={viewUser.avatar_url} /><AvatarFallback>{(viewUser.display_name ?? "U")[0]}</AvatarFallback></Avatar>
                <div>
                  <p className="font-medium">{viewUser.display_name}</p>
                  <p className="text-sm text-muted-foreground">@{viewUser.username ?? "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <Card><CardContent className="pt-3 text-center"><p className="text-2xl font-bold">{viewUser.reviewCount}</p><p className="text-xs text-muted-foreground">Reviews</p></CardContent></Card>
                <Card><CardContent className="pt-3 text-center"><p className="text-2xl font-bold">{viewUser.commentCount}</p><p className="text-xs text-muted-foreground">Comments</p></CardContent></Card>
                <Card><CardContent className="pt-3 text-center"><p className="text-2xl font-bold">{viewUser.questionCount}</p><p className="text-xs text-muted-foreground">Questions</p></CardContent></Card>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Bio:</span> {viewUser.bio || "—"}</div>
                <div><span className="text-muted-foreground">Website:</span> {viewUser.website || "—"}</div>
                <div><span className="text-muted-foreground">Reputation:</span> <Badge variant="secondary">{viewUser.reputation_score}</Badge></div>
                <div><span className="text-muted-foreground">Trạng thái:</span> <Badge variant={viewUser.is_banned ? "destructive" : "outline"}>{viewUser.is_banned ? "Banned" : "Active"}</Badge></div>
                <div><span className="text-muted-foreground">Role:</span> <Badge>{viewUser.roles[0] ?? "user"}</Badge></div>
                <div><span className="text-muted-foreground">Ngày tạo:</span> {new Date(viewUser.created_at).toLocaleDateString("vi-VN")}</div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(v) => !v && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chỉnh sửa User</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Display Name</Label><Input value={editUser.display_name ?? ""} onChange={(e) => setEditUser({ ...editUser, display_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Username</Label><Input value={editUser.username ?? ""} onChange={(e) => setEditUser({ ...editUser, username: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Bio</Label><Textarea value={editUser.bio ?? ""} onChange={(e) => setEditUser({ ...editUser, bio: e.target.value })} rows={2} /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Website</Label><Input value={editUser.website ?? ""} onChange={(e) => setEditUser({ ...editUser, website: e.target.value })} /></div>
                <div className="space-y-2"><Label>Avatar URL</Label><Input value={editUser.avatar_url ?? ""} onChange={(e) => setEditUser({ ...editUser, avatar_url: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><Label>Reputation Score</Label><Input type="number" value={editUser.reputation_score} onChange={(e) => setEditUser({ ...editUser, reputation_score: parseInt(e.target.value) || 0 })} /></div>
                <div className="flex items-center gap-2 pt-6"><Checkbox checked={editUser.is_banned} onCheckedChange={(v) => setEditUser({ ...editUser, is_banned: !!v })} /><Label>Banned</Label></div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditUser(null)}>Hủy</Button>
                <Button onClick={() => updateProfileMutation.mutate(editUser)}>Lưu</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}