import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AISearchResult {
  id: string;
  name: string;
  slug: string;
  reason: string;
  tool: any;
}

export function useAISearch() {
  const [results, setResults] = useState<AISearchResult[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const search = async (query: string) => {
    if (!query.trim()) return;
    setLoading(true);
    setResults(null);
    setSummary(null);

    try {
      const { data, error } = await supabase.functions.invoke("ai-search", {
        body: { query },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResults(data.results || []);
      setSummary(data.summary || null);
    } catch (e: any) {
      toast({
        variant: "destructive",
        title: "Lỗi tìm kiếm AI",
        description: e.message || "Không thể thực hiện tìm kiếm",
      });
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setResults(null);
    setSummary(null);
  };

  return { results, summary, loading, search, clear };
}
