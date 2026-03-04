import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePopularKeywords(limit = 8) {
  return useQuery({
    queryKey: ["popular-keywords", limit],
    queryFn: async () => {
      // Use raw query via RPC or direct select with grouping
      // Since we can't GROUP BY via JS client, fetch recent logs and aggregate client-side
      const { data, error } = await supabase
        .from("search_logs")
        .select("normalized_query")
        .order("created_at", { ascending: false })
        .limit(500);

      if (error) throw error;
      if (!data?.length) return [];

      const counts: Record<string, number> = {};
      for (const row of data) {
        const q = row.normalized_query;
        counts[q] = (counts[q] || 0) + 1;
      }

      return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([keyword, count]) => ({ keyword, count }));
    },
    staleTime: 5 * 60 * 1000, // 5 min
  });
}
