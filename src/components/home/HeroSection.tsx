import { useState, useEffect, useRef } from "react";
import { Search, Sparkles, Loader2, Bot, TrendingUp, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useAISearch } from "@/hooks/useAISearch";
import { usePopularKeywords } from "@/hooks/usePopularKeywords";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n";

const TYPEWRITER_WORDS = ["AI Writing", "Design", "Analytics", "No-Code", "Marketing", "Productivity"];

function useTypewriter(words: string[], speed = 80, pause = 1800) {
  const [display, setDisplay] = useState("");
  const [wordIdx, setWordIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const current = words[wordIdx];
    const delay = deleting ? speed / 2 : charIdx === current.length ? pause : speed;

    const timer = setTimeout(() => {
      if (!deleting && charIdx === current.length) {
        setDeleting(true);
      } else if (deleting && charIdx === 0) {
        setDeleting(false);
        setWordIdx((i) => (i + 1) % words.length);
      } else {
        setCharIdx((i) => i + (deleting ? -1 : 1));
        setDisplay(current.slice(0, charIdx + (deleting ? -1 : 1)));
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [charIdx, deleting, wordIdx, words, speed, pause]);

  return display;
}

export function HeroSection() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { results, summary, loading, search, clear } = useAISearch();
  const { data: popularKeywords } = usePopularKeywords();
  const { t } = useI18n();
  const typeword = useTypewriter(TYPEWRITER_WORDS);
  const fallbackTags = ["AI Writing", "Design Tools", "Project Management", "No-Code", "Analytics"];

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
    <section className="relative overflow-hidden py-12 md:py-24">
      {/* Background glows */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[300px] w-[500px] rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -left-20 bottom-0 h-[300px] w-[400px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      <div className="container text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6 animate-fade-in">
          <Sparkles className="h-3.5 w-3.5" />
          {t("hero.badge")}
        </div>

        {/* Title with typewriter */}
        <h1
          className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl leading-tight animate-slide-up"
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {t("hero.title")}{" "}
          <span className="text-primary relative">
            {typeword}
            <span className="ml-0.5 inline-block w-[2px] h-[1em] align-middle bg-primary animate-pulse" />
          </span>{" "}
          {t("hero.titleEnd")}
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          {t("hero.subtitle")}
        </p>

        {/* Search box with floating dropdown */}
        <div className="mx-auto mt-8 max-w-xl relative">
          <form onSubmit={handleSearch}>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("hero.placeholder")}
                  className="h-12 pl-10 text-base rounded-xl border-border/60 bg-card shadow-sm focus-visible:ring-primary/30"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 rounded-xl px-6 gap-2" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                {t("hero.search")}
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

          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
            <span className="font-medium">{t("hero.trySearch")}</span>
            <span className="italic">"{t("hero.example1")}"</span>
            <span>•</span>
            <span className="italic">"{t("hero.example2")}"</span>
            <span>•</span>
            <span className="italic">"{t("hero.example3")}"</span>
          </div>
        </div>

        {/* Popular tags */}
        {!results && (
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
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
