import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Save, Settings2, Share2, FolderCog } from "lucide-react";

interface SiteInfo {
  site_name: string;
  site_description: string;
  site_logo_url: string;
  default_language: string;
  contact_email: string;
  footer_copyright: string;
  maintenance_mode: boolean;
  social_facebook: string;
  social_twitter: string;
  social_youtube: string;
}

interface SiteInfoTabProps {
  siteInfo: SiteInfo;
  setSiteInfo: React.Dispatch<React.SetStateAction<SiteInfo>>;
  defaultCategoryId: string;
  setDefaultCategoryId: (v: string) => void;
  categories: any[];
  onSave: () => void;
  isSaving: boolean;
}

export function SiteInfoTab({ siteInfo, setSiteInfo, defaultCategoryId, setDefaultCategoryId, categories, onSave, isSaving }: SiteInfoTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings2 className="h-5 w-5" /> Thông tin website</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Tên website</Label>
              <Input value={siteInfo.site_name} onChange={(e) => setSiteInfo(p => ({ ...p, site_name: e.target.value }))} placeholder="ToolScope" />
            </div>
            <div className="space-y-2">
              <Label>Contact Email</Label>
              <Input type="email" value={siteInfo.contact_email} onChange={(e) => setSiteInfo(p => ({ ...p, contact_email: e.target.value }))} placeholder="contact@example.com" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Mô tả website</Label>
            <Textarea value={siteInfo.site_description} onChange={(e) => setSiteInfo(p => ({ ...p, site_description: e.target.value }))} rows={2} placeholder="Nền tảng khám phá công cụ AI hàng đầu..." />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Logo URL</Label>
              <Input value={siteInfo.site_logo_url} onChange={(e) => setSiteInfo(p => ({ ...p, site_logo_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <Label>Ngôn ngữ mặc định</Label>
              <Select value={siteInfo.default_language} onValueChange={(v) => setSiteInfo(p => ({ ...p, default_language: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vi">Tiếng Việt</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Footer Copyright</Label>
            <Input value={siteInfo.footer_copyright} onChange={(e) => setSiteInfo(p => ({ ...p, footer_copyright: e.target.value }))} placeholder="© 2025 ToolScope. All rights reserved." />
          </div>
          <div className="flex items-center gap-3">
            <Switch checked={siteInfo.maintenance_mode} onCheckedChange={(v) => setSiteInfo(p => ({ ...p, maintenance_mode: v }))} />
            <Label>Chế độ bảo trì</Label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Share2 className="h-5 w-5" /> Mạng xã hội</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Facebook</Label>
            <Input value={siteInfo.social_facebook} onChange={(e) => setSiteInfo(p => ({ ...p, social_facebook: e.target.value }))} placeholder="https://facebook.com/..." />
          </div>
          <div className="space-y-2">
            <Label>Twitter / X</Label>
            <Input value={siteInfo.social_twitter} onChange={(e) => setSiteInfo(p => ({ ...p, social_twitter: e.target.value }))} placeholder="https://x.com/..." />
          </div>
          <div className="space-y-2">
            <Label>YouTube</Label>
            <Input value={siteInfo.social_youtube} onChange={(e) => setSiteInfo(p => ({ ...p, social_youtube: e.target.value }))} placeholder="https://youtube.com/@..." />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><FolderCog className="h-5 w-5" /> Danh mục mặc định</CardTitle>
          <CardDescription>Danh mục được gán tự động cho các công cụ chưa được phân loại</CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={defaultCategoryId || "__none"} onValueChange={(v) => setDefaultCategoryId(v === "__none" ? "" : v)}>
            <SelectTrigger className="max-w-md"><SelectValue placeholder="Chọn danh mục..." /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">Không đặt mặc định</SelectItem>
              {categories.map((c: any) => (
                <SelectItem key={c.id} value={c.id}>{c.icon} {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Button onClick={onSave} disabled={isSaving}>
        <Save className="mr-2 h-4 w-4" /> {isSaving ? "Đang lưu..." : "Lưu tất cả"}
      </Button>
    </div>
  );
}
