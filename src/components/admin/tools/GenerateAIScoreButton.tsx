import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function GenerateAIScoreButton({ toolId, toolName }: { toolId: string; toolName: string }) {
  const [generating, setGenerating] = useState(false);
  const queryClient = useQueryClient();

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ai-score", {
        body: { tool_id: toolId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Đã tạo AI Score cho ${toolName}`);
      queryClient.invalidateQueries({ queryKey: ["tool"] });
    } catch (e: any) {
      toast.error(e.message || "Lỗi tạo AI Score");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Button variant="ghost" size="icon" onClick={handleGenerate} disabled={generating} title="Tạo AI Score">
      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
    </Button>
  );
}
