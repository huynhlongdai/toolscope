import { useState, useEffect, useRef } from "react";
import { Search, Sparkles, Loader2, Bot, TrendingUp, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAISearch } from "@/hooks/useAISearch";
import { usePopularKeywords } from "@/hooks/usePopularKeywords";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

const QUICK_TAGS = [
  { label: "🔥 AI Writing", query: "AI Writing" },
  { label: "🎨 Design", query: "Design" },
  { label: "💻 Development", query: "Development" },
  { label: "📊 Analytics", query: "Analytics" },
  { label: "🎬 Video", query: "Video" },
  { label: "🚀 No-Code", query: "No-Code" },
  { label: "📈 Marketing", query: "Marketing" },
];

export function HeroSection() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { results, summary, loading, search, clear } = useAISearch();
  const { data: popularKeywords } = usePopularKeywords();
  const { t } = useI18n();

  const showDropdown = loading || (results !== null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) search(query.trim());
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
        inputRef.current && !inputRef.current.contains(e.target as Node)
      ) {
        clear();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [clear]);

  return (
    <section className="relative overflow-hidden bg-mesh-hero py-16 md:py-28">
      <div className="container text-center relative z-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-8 animate-fade-in">
          <Sparkles className="h-3.5 w-3.5" />
          {t("hero.badge")}
        </div>

        {/* Static gradient headline — no typewriter */}
        <h1 className="mx-auto max-w-4xl text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl leading-[1.1] animate-slide-up">
          {t("hero.title")}{" "}
          <span className="text-gradient">{t("hero.titleHighlight") || "Perfect AI Tool"}</span>
          <br className="hidden sm:block" />
          {" "}{t("hero.titleEnd")}
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl leading-relaxed">
          {t("hero.subtitle")}
        </p>

        {/* Large search box */}
        <div className="mx-auto mt-10 max-w-2xl relative">
          <form onSubmit={handleSearch}>
            <div className="relative flex items-center rounded-2xl border-2 border-border/60 bg-card shadow-card hover:shadow-card-hover hover:border-primary/20 transition-all duration-300 focus-within:border-primary/40 focus-within:shadow-glow-sm">
              <Search className="absolute left-5 h-5 w-5 text-muted-foreground" />
              <Input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("hero.placeholder")}
                className="h-14 pl-14 pr-32 text-base border-0 bg-transparent shadow-none focus-visible:ring-0 rounded-2xl"
              />
              <Button
                type="submit"
                size="lg"
                className="absolute right-2 h-10 rounded-xl px-6 bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-700 hover:to-indigo-600 shadow-sm"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("hero.search")}
              </Button>
            </div>
          </form>

          {/* Floating Dropdown */}
          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-xl border border-border bg-card shadow-xl overflow-hidden"
            >
              {loading && (
                <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>{t("hero.aiSearching")}</span>
                </div>
              )}

              {results && results.length > 0 && (
                <>
                  {summary && (
                    <div className="flex items-start gap-2 border-b border-border bg-primary/5 px-4 py-3">
                      <Bot className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-xs text-foreground leading-relaxed">{summary}</p>
                    </div>
                  )}
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {results.map((r: any) => (
                      <Link
                        key={r.id}
                        to={`/tool/${r.slug || r.tool?.slug}`}
                        onClick={clear}
                        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-muted/60"
                      >
                        {r.tool?.logo_url ? (
                          <img src={r.tool.logo_url} alt={r.name} className="h-9 w-9 rounded-lg object-contain flex-shrink-0" />
                        ) : (
                          <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center text-sm font-bold flex-shrink-0">
                            {(r.name || r.tool?.name || "?").charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm">{r.name || r.tool?.name}</span>
                            {r.tool?.ai_scores?.is_recommended && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">AI Pick</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{r.reason}</p>
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      </Link>
                    ))}
                  </div>
                  <div className="border-t border-border px-4 py-2">
                    <button onClick={clear} className="text-xs text-muted-foreground hover:text-foreground">
                      {t("hero.closeResults")}
                    </button>
                  </div>
                </>
              )}

              {results && results.length === 0 && !loading && (
                <div className="p-4 text-center">
                  <p className="text-sm text-muted-foreground">{t("hero.noResults")}</p>
                  <button onClick={clear} className="mt-1 text-xs text-muted-foreground hover:text-foreground">{t("hero.close")}</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick tag pills */}
        {!results && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {QUICK_TAGS.map((tag) => (
              <button
                key={tag.label}
                onClick={() => { setQuery(tag.query); search(tag.query); }}
                className="rounded-full border border-border/60 bg-card/80 px-4 py-2 text-sm font-medium transition-all duration-200 hover:border-primary/30 hover:bg-primary/5 hover:text-primary hover:shadow-sm"
              >
                {tag.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
