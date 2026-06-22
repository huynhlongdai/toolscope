import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3, Play, AlertTriangle, CheckCircle2, Star, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { SUPPORTED_LOCALES } from "@/lib/i18n";
import { Progress } from "@/components/ui/progress";

interface QualityStats {
  locale: string;
  entity_type: string;
  total_scored: number;
  avg_score: number;
  high_quality: number;
  medium_quality: number;
  low_quality: number;
  pending_review: number;
}

interface QualityLogEntry {
  id: string;
  locale: string;
  entity_type: string;
  field_name: string;
  quality_score: number;
  issues: Array<{ type: string; detail: string }>;
  suggestions: { improved_text?: string };
  auto_scored: boolean;
  created_at: string;
}

function ScoreBadge({ score }: { score: number }) {
  if (score >= 8) return <Badge className="bg-green-500/10 text-green-600 border-green-200">{score}/10</Badge>;
  if (score >= 5) return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-200">{score}/10</Badge>;
  return <Badge className="bg-red-500/10 text-red-600 border-red-200">{score}/10</Badge>;
}

export default function TranslationQualityDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedLocale, setSelectedLocale] = useState<string>("all");
  const [scoring, setScoring] = useState(false);

  // Fetch quality stats
  const { data: stats = [], isLoading: statsLoading } = useQuery({
    queryKey: ["translation-quality-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("translation_quality_stats")
        .select("*");
      if (error) throw error;
      return (data || []) as QualityStats[];
    },
  });

  // Fetch recent quality logs
  const { data: recentLogs = [], isLoading: logsLoading } = useQuery({
    queryKey: ["translation-quality-logs", selectedLocale],
    queryFn: async () => {
      let query = supabase
        .from("translation_quality_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (selectedLocale !== "all") query = query.eq("locale", selectedLocale);

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as QualityLogEntry[];
    },
  });

  // Run quality scoring
  const runScoring = useMutation({
    mutationFn: async (entityType: string) => {
      setScoring(true);
      const { data, error } = await supabase.functions.invoke("score-translation-quality", {
        body: {
          entity_type: entityType,
          locale: selectedLocale !== "all" ? selectedLocale : undefined,
          batch_size: 10,
        },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setScoring(false);
      queryClient.invalidateQueries({ queryKey: ["translation-quality"] });
      queryClient.invalidateQueries({ queryKey: ["translation-quality-stats"] });
      queryClient.invalidateQueries({ queryKey: ["translation-quality-logs"] });
      toast({
        title: "Scoring complete",
        description: `Scored ${data.scored} translations. Average: ${data.average_score}/10`,
      });
    },
    onError: (err: Error) => {
      setScoring(false);
      toast({ title: "Scoring failed", description: err.message, variant: "destructive" });
    },
  });

  // Aggregate stats by locale
  const localeAgg = stats.reduce<Record<string, { total: number; avg: number; high: number; medium: number; low: number; review: number }>>((acc, s) => {
    if (!acc[s.locale]) acc[s.locale] = { total: 0, avg: 0, high: 0, medium: 0, low: 0, review: 0 };
    acc[s.locale].total += s.total_scored;
    acc[s.locale].high += s.high_quality;
    acc[s.locale].medium += s.medium_quality;
    acc[s.locale].low += s.low_quality;
    acc[s.locale].review += s.pending_review;
    return acc;
  }, {});

  // Calculate weighted averages
  Object.keys(localeAgg).forEach((l) => {
    const matchingStats = stats.filter((s) => s.locale === l);
    const totalWeighted = matchingStats.reduce((s, st) => s + st.avg_score * st.total_scored, 0);
    localeAgg[l].avg = localeAgg[l].total > 0 ? parseFloat((totalWeighted / localeAgg[l].total).toFixed(1)) : 0;
  });

  const totalScored = Object.values(localeAgg).reduce((s, l) => s + l.total, 0);
  const totalHigh = Object.values(localeAgg).reduce((s, l) => s + l.high, 0);
  const totalLow = Object.values(localeAgg).reduce((s, l) => s + l.low, 0);
  const totalReview = Object.values(localeAgg).reduce((s, l) => s + l.review, 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BarChart3 className="h-6 w-6 mx-auto mb-1 text-blue-500" />
            <div className="text-2xl font-bold">{totalScored}</div>
            <div className="text-xs text-muted-foreground">Total Scored</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-green-500" />
            <div className="text-2xl font-bold">{totalHigh}</div>
            <div className="text-xs text-muted-foreground">High Quality (8+)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="h-6 w-6 mx-auto mb-1 text-red-500" />
            <div className="text-2xl font-bold">{totalLow}</div>
            <div className="text-xs text-muted-foreground">Low Quality (&lt;5)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Star className="h-6 w-6 mx-auto mb-1 text-yellow-500" />
            <div className="text-2xl font-bold">{totalReview}</div>
            <div className="text-xs text-muted-foreground">Needs Review</div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <Select value={selectedLocale} onValueChange={setSelectedLocale}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter locale" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locales</SelectItem>
            {Object.entries(SUPPORTED_LOCALES)
              .filter(([k]) => k !== "en")
              .map(([code, info]) => (
                <SelectItem key={code} value={code}>
                  {info.flag} {info.nativeName}
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => runScoring.mutate("tool")}
          disabled={scoring}
          variant="outline"
        >
          {scoring ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Score Tools
        </Button>
        <Button
          onClick={() => runScoring.mutate("blog_post")}
          disabled={scoring}
          variant="outline"
        >
          {scoring ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Score Blog Posts
        </Button>
        <Button
          onClick={() => runScoring.mutate("deal")}
          disabled={scoring}
          variant="outline"
        >
          {scoring ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
          Score Deals
        </Button>
      </div>

      {/* Per-locale quality overview */}
      {Object.keys(localeAgg).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quality by Locale</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Locale</TableHead>
                  <TableHead>Avg Score</TableHead>
                  <TableHead>Distribution</TableHead>
                  <TableHead className="text-center">High</TableHead>
                  <TableHead className="text-center">Medium</TableHead>
                  <TableHead className="text-center">Low</TableHead>
                  <TableHead className="text-center">Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(localeAgg)
                  .sort(([, a], [, b]) => b.avg - a.avg)
                  .map(([locale, data]) => {
                    const highPct = data.total > 0 ? (data.high / data.total) * 100 : 0;
                    return (
                      <TableRow key={locale}>
                        <TableCell className="font-medium">
                          {SUPPORTED_LOCALES[locale as keyof typeof SUPPORTED_LOCALES]?.flag}{" "}
                          {SUPPORTED_LOCALES[locale as keyof typeof SUPPORTED_LOCALES]?.nativeName || locale}
                        </TableCell>
                        <TableCell><ScoreBadge score={data.avg} /></TableCell>
                        <TableCell className="w-48">
                          <Progress value={highPct} className="h-2" />
                        </TableCell>
                        <TableCell className="text-center text-green-600">{data.high}</TableCell>
                        <TableCell className="text-center text-yellow-600">{data.medium}</TableCell>
                        <TableCell className="text-center text-red-600">{data.low}</TableCell>
                        <TableCell className="text-center">{data.review}</TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Quality Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Scoring Results</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Locale</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Field</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Issues</TableHead>
                <TableHead>Suggestion</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logsLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                </TableRow>
              ) : recentLogs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No scoring results yet. Click "Score Tools" to start.
                  </TableCell>
                </TableRow>
              ) : (
                recentLogs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {SUPPORTED_LOCALES[log.locale as keyof typeof SUPPORTED_LOCALES]?.flag} {log.locale}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.entity_type}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">{log.field_name}</TableCell>
                    <TableCell><ScoreBadge score={log.quality_score} /></TableCell>
                    <TableCell>
                      {log.issues.length > 0 ? (
                        <div className="flex gap-1 flex-wrap">
                          {log.issues.slice(0, 3).map((issue, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {issue.type}
                            </Badge>
                          ))}
                          {log.issues.length > 3 && (
                            <Badge variant="secondary" className="text-xs">+{log.issues.length - 3}</Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground">None</span>
                      )}
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                      {log.suggestions?.improved_text || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
