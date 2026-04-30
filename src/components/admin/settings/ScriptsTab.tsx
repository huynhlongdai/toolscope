import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Save, Code } from "lucide-react";

interface ScriptsTabProps {
  headScripts: string;
  setHeadScripts: (v: string) => void;
  bodyScripts: string;
  setBodyScripts: (v: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function ScriptsTab({ headScripts, setHeadScripts, bodyScripts, setBodyScripts, onSave, isSaving }: ScriptsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Code className="h-5 w-5" /> Custom Scripts</CardTitle>
          <CardDescription>Thêm mã tracking tùy chỉnh (Microsoft Clarity, Facebook Pixel, Hotjar...)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="head-scripts">Scripts trong &lt;head&gt;</Label>
            <Textarea id="head-scripts" placeholder={'<script>...</script>'} value={headScripts} onChange={(e) => setHeadScripts(e.target.value)} rows={6} className="mt-1 font-mono text-xs" />
          </div>
          <div>
            <Label htmlFor="body-scripts">Scripts trong &lt;body&gt; (cuối trang)</Label>
            <Textarea id="body-scripts" placeholder={'<script>...</script>'} value={bodyScripts} onChange={(e) => setBodyScripts(e.target.value)} rows={6} className="mt-1 font-mono text-xs" />
          </div>
        </CardContent>
      </Card>
      <Button onClick={onSave} disabled={isSaving}>
        <Save className="mr-2 h-4 w-4" /> Lưu
      </Button>
    </div>
  );
}
