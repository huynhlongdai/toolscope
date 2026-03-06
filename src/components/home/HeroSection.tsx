import { useState } from "react";
import { Search, Sparkles, Loader2, Bot, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAISearch } from "@/hooks/useAISearch";
import { usePopularKeywords } from "@/hooks/usePopularKeywords";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

export function HeroSection() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const { results, summary, loading, search, clear } = useAISearch();
  const { data: popularKeywords } = usePopularKeywords();
  const { t } = useI18n();
  const fallbackTags = ["AI Writing", "Design Tools", "Project Management", "No-Code", "Analytics"];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      search(query.trim());
    }
  };

  return (
    <section className="relative overflow-hidden py-12 md:py-20">
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[300px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="container text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-4">
          <Sparkles className="h-3.5 w-3.5" />
          {t("hero.badge")}
        </div>
        
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          {t("hero.title")}{" "}
          <span className="text-primary">{t("hero.titleHighlight")}</span>{" "}
          {t("hero.titleEnd")}
        </h1>
        
        <p className="mx-auto mt-3 max-w-xl text-lg text-muted-foreground">
          {t("hero.subtitle")}
        </p>

        <form onSubmit={handleSearch} className="mx-auto mt-6 max-w-xl">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("hero.placeholder")}
                className="h-12 pl-10 text-base rounded-xl border-border/60 bg-card shadow-sm"
              />
            </div>
            <Button type="submit" size="lg" className="h-12 rounded-xl px-6">
              <Search className="h-4 w-4 mr-2" />
              {t("hero.search")}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium">{t("hero.trySearch")}</span>
            <span className="italic">"{t("hero.example1")}"</span>
            <span>•</span>
            <span className="italic">"{t("hero.example2")}"</span>
            <span>•</span>
            <span className="italic">"{t("hero.example3")}"</span>
          </div>
        </form>

        {loading && (
          <div className="mx-auto mt-6 flex max-w-xl items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>{t("hero.aiSearching")}</span>
          </div>
        )}

        {results && results.length > 0 && (
          <div className="mx-auto mt-6 max-w-2xl text-left">
            {summary && (
              <div className="mb-4 flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <p className="text-sm text-foreground">{summary}</p>
              </div>
            )}
            <div className="space-y-2">
              {results.map((r: any) => (
                <Link
                  key={r.id}
                  to={`/tool/${r.slug}`}
                  onClick={clear}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/30 hover:bg-primary/5"
                >
                  {r.tool?.logo_url && (
                    <img src={r.tool.logo_url} alt={r.name} className="h-10 w-10 rounded-lg object-contain" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{r.name}</span>
                      {r.tool?.ai_scores?.is_recommended && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">AI Pick</Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{r.reason}</p>
                  </div>
                </Link>
              ))}
            </div>
            <button onClick={clear} className="mt-3 text-xs text-muted-foreground hover:text-foreground">
              {t("hero.closeResults")}
            </button>
          </div>
        )}

        {results && results.length === 0 && !loading && (
          <div className="mx-auto mt-6 max-w-xl text-center">
            <p className="text-sm text-muted-foreground">{t("hero.noResults")}</p>
            <button onClick={clear} className="mt-2 text-xs text-muted-foreground hover:text-foreground">{t("hero.close")}</button>
          </div>
        )}

        {!results && (
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{t("hero.popular")}</span>
            {(popularKeywords && popularKeywords.length > 0
              ? popularKeywords.map(k => k.keyword)
              : fallbackTags
            ).map((tag) => (
              <button
                key={tag}
                onClick={() => { setQuery(tag); search(tag); }}
                className="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
