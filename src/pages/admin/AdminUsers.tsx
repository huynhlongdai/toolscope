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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { useState } from "react";
import { Search, Pencil, Trash2, Ban, Eye, ShieldCheck, Download, ChevronLeft, ChevronRight } from "lucide-react";

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editUser, setEditUser] = useState<any>(null);
  const [viewUser, setViewUser] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: roles } = await supabase.from("user_roles").select("*");

      // Get stats
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
      }));
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, newRole }: { userId: string; newRole: string }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Đã cập nhật role");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profile: any) => {
      const { error } = await supabase.from("profiles").update({
        display_name: profile.display_name,
        username: profile.username,
        bio: profile.bio,
        website: profile.website,
        avatar_url: profile.avatar_url,
        reputation_score: profile.reputation_score,
        is_banned: profile.is_banned,
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Đã xóa user");
    },
  });

  const banUserMutation = useMutation({
    mutationFn: async ({ userId, banned }: { userId: string; banned: boolean }) => {
      const { error } = await supabase.from("profiles").update({ is_banned: banned } as any).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success("Đã cập nhật trạng thái");
    },
  });

  const bulkRoleMutation = useMutation({
    mutationFn: async (newRole: string) => {
      for (const userId of selectedIds) {
        await supabase.from("user_roles").delete().eq("user_id", userId);
        await supabase.from("user_roles").insert({ user_id: userId, role: newRole as any });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      toast.success(`Đã cập nhật ${selectedIds.length} users`);
      setSelectedIds([]);
    },
  });

  const [page, setPage] = useState(0);
  const pageSize = 50;

  const filtered = users.filter((u: any) => {
    const matchSearch = (u.display_name ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (u.username ?? "").toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.roles.includes(roleFilter);
    return matchSearch && matchRole;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice(page * pageSize, (page + 1) * pageSize);

  const exportCSV = () => {
    const headers = ["Display Name", "Username", "Role", "Reputation", "Reviews", "Comments", "Banned", "Created"];
    const rows = filtered.map((u: any) => [u.display_name || "", u.username || "", u.roles[0] || "user", u.reputation_score, u.reviewCount, u.commentCount, u.is_banned ? "Yes" : "No", new Date(u.created_at).toLocaleDateString()]);
    const csv = [headers, ...rows].map(r => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selectedIds.length === filtered.length) setSelectedIds([]);
    else setSelectedIds(filtered.map((u: any) => u.id));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Quản lý Users</h1>
          <Button variant="outline" size="sm" onClick={exportCSV}><Download className="mr-2 h-4 w-4" /> Export CSV</Button>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Tìm kiếm user..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{selectedIds.length} đã chọn</span>
              <Select onValueChange={(v) => bulkRoleMutation.mutate(v)}>
                <SelectTrigger className="w-[140px] h-9"><SelectValue placeholder="Đổi role..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox checked={selectedIds.length === filtered.length && filtered.length > 0} onCheckedChange={toggleAll} />
                </TableHead>
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
                    <TableCell>
                      <Checkbox checked={selectedIds.includes(user.id)} onCheckedChange={() => toggleSelect(user.id)} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>{(user.display_name ?? "U")[0]}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{user.display_name ?? "—"}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{user.username ?? "—"}</TableCell>
                    <TableCell>
                      <Select value={user.roles[0] ?? "user"} onValueChange={(v) => updateRoleMutation.mutate({ userId: user.id, newRole: v })}>
                        <SelectTrigger className="h-7 w-[120px]">
                          <Badge variant={user.roles.includes("admin") ? "default" : user.roles.includes("editor") ? "secondary" : "outline"} className="text-xs">
                            {user.roles[0] ?? "user"}
                          </Badge>
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
                        <span>{user.reviewCount} reviews</span>
                        <span>{user.commentCount} comments</span>
                        <span>{user.questionCount} Q&A</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {user.is_banned ? (
                        <Badge variant="destructive" className="text-xs">Banned</Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs">Active</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{new Date(user.created_at).toLocaleDateString("vi-VN")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewUser(user)} title="Xem">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setEditUser({ ...user })} title="Sửa">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => banUserMutation.mutate({ userId: user.id, banned: !user.is_banned })} title={user.is_banned ? "Unban" : "Ban"}>
                          {user.is_banned ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <Ban className="h-4 w-4 text-destructive" />}
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

      {/* View User Dialog */}
      <Dialog open={!!viewUser} onOpenChange={(v) => !v && setViewUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Chi tiết User</DialogTitle></DialogHeader>
          {viewUser && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12"><AvatarImage src={viewUser.avatar_url} /><AvatarFallback>{(viewUser.display_name ?? "U")[0]}</AvatarFallback></Avatar>
                <div>
                  <p className="font-medium">{viewUser.display_name}</p>
                  <p className="text-sm text-muted-foreground">@{viewUser.username ?? "—"}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Bio:</span> {viewUser.bio || "—"}</div>
                <div><span className="text-muted-foreground">Website:</span> {viewUser.website || "—"}</div>
                <div><span className="text-muted-foreground">Reputation:</span> {viewUser.reputation_score}</div>
                <div><span className="text-muted-foreground">Ngày tạo:</span> {new Date(viewUser.created_at).toLocaleDateString("vi-VN")}</div>
                <div><span className="text-muted-foreground">Reviews:</span> {viewUser.reviewCount}</div>
                <div><span className="text-muted-foreground">Comments:</span> {viewUser.commentCount}</div>
                <div><span className="text-muted-foreground">Questions:</span> {viewUser.questionCount}</div>
                <div><span className="text-muted-foreground">Trạng thái:</span> {viewUser.is_banned ? "Banned" : "Active"}</div>
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
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input value={editUser.display_name ?? ""} onChange={(e) => setEditUser({ ...editUser, display_name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={editUser.username ?? ""} onChange={(e) => setEditUser({ ...editUser, username: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={editUser.bio ?? ""} onChange={(e) => setEditUser({ ...editUser, bio: e.target.value })} rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Website</Label>
                  <Input value={editUser.website ?? ""} onChange={(e) => setEditUser({ ...editUser, website: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Avatar URL</Label>
                  <Input value={editUser.avatar_url ?? ""} onChange={(e) => setEditUser({ ...editUser, avatar_url: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Reputation Score</Label>
                  <Input type="number" value={editUser.reputation_score} onChange={(e) => setEditUser({ ...editUser, reputation_score: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex items-center gap-2 pt-6">
                  <Checkbox checked={editUser.is_banned} onCheckedChange={(v) => setEditUser({ ...editUser, is_banned: !!v })} />
                  <Label>Banned</Label>
                </div>
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
