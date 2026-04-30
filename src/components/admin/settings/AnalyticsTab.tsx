import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Save, Globe } from "lucide-react";

interface AnalyticsTabProps {
  gaId: string;
  setGaId: (v: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function AnalyticsTab({ gaId, setGaId, onSave, isSaving }: AnalyticsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Globe className="h-5 w-5" /> Google Analytics</CardTitle>
          <CardDescription>Nhập Measurement ID để theo dõi lượt truy cập (VD: G-XXXXXXXXXX)</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="ga-id">Measurement ID</Label>
          <Input id="ga-id" placeholder="G-XXXXXXXXXX" value={gaId} onChange={(e) => setGaId(e.target.value)} className="mt-1 max-w-md" />
        </CardContent>
      </Card>
      <Button onClick={onSave} disabled={isSaving}>
        <Save className="mr-2 h-4 w-4" /> Lưu
      </Button>
    </div>
  );
}
