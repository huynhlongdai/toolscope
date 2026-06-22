import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Search, Tag, Folder, FileText, TrendingUp, Sparkles, Clock, Wrench, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
import { useI18n } from "@/lib/i18n";
import { getToolLogoUrl } from "@/lib/favicon";

interface SearchResult {
  id: string;
  name: string;
  slug: string;
  type: "tool" | "category" | "blog" | "collection";
  description?: string;
  logoUrl?: string;
  websiteUrl?: string;
  icon?: string;
}

const RECENT_SEARCHES_KEY = "toolscope_recent_searches";
const MAX_RECENT = 5;

function getRecentSearches(): string[] {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecentSearch(q: string) {
  const recent = getRecentSearches().filter((s) => s !== q);
  recent.unshift(q);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
}

function clearRecentSearches() {
  localStorage.removeItem(RECENT_SEARCHES_KEY);
}

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(getRecentSearches());
  const navigate = useNavigate();
  const { t } = useI18n();
  const debouncedQuery = useDebounce(query, 300);

  // ⌘K / Ctrl+K to toggle
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Refresh recent searches when dialog opens
  useEffect(() => {
    if (open) setRecentSearches(getRecentSearches());
  }, [open]);

  // Search on debounced query
  useEffect(() => {
    if (!debouncedQuery || debouncedQuery.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);

      try {
        const searchTerm = `%${debouncedQuery}%`;

        const [toolsRes, categoriesRes, blogRes] = await Promise.all([
          supabase
            .from("tools")
            .select("id, name, slug, short_description, logo_url, website_url")
            .eq("status", "published")
            .or(`name.ilike.${searchTerm},short_description.ilike.${searchTerm}`)
            .limit(6),
          supabase
            .from("categories")
            .select("id, name, slug, icon")
            .ilike("name", searchTerm)
            .limit(3),
          supabase
            .from("blog_posts")
            .select("id, title, slug")
            .eq("status", "published")
            .ilike("title", searchTerm)
            .limit(3),
        ]);

        const items: SearchResult[] = [];

        toolsRes.data?.forEach((t) =>
          items.push({
            id: t.id,
            name: t.name,
            slug: t.slug,
            type: "tool",
            description: t.short_description ?? undefined,
            logoUrl: t.logo_url ?? undefined,
            websiteUrl: t.website_url ?? undefined,
          })
        );

        categoriesRes.data?.forEach((c) =>
          items.push({
            id: c.id,
            name: c.name,
            slug: c.slug,
            type: "category",
            icon: c.icon ?? undefined,
          })
        );

        blogRes.data?.forEach((b) =>
          items.push({
            id: b.id,
            name: b.title,
            slug: b.slug,
            type: "blog",
          })
        );

        setResults(items);
      } catch (e) {
        console.error("Search error:", e);
      } finally {
        setLoading(false);
      }
    };

    search();
  }, [debouncedQuery]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      addRecentSearch(result.name);
      setOpen(false);
      setQuery("");

      switch (result.type) {
        case "tool":
          navigate(`/tool/${result.slug}`);
          break;
        case "category":
          navigate(`/category/${result.slug}`);
          break;
        case "blog":
          navigate(`/blog/${result.slug}`);
          break;
        case "collection":
          navigate(`/collection/${result.slug}`);
          break;
      }
    },
    [navigate]
  );

  const handleRecentClick = (q: string) => {
    setQuery(q);
  };

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  const typeIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "tool": return <Wrench className="h-4 w-4 text-muted-foreground" />;
      case "category": return <Folder className="h-4 w-4 text-muted-foreground" />;
      case "blog": return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "collection": return <Tag className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const typeLabel = (type: SearchResult["type"]) => {
    switch (type) {
      case "tool": return "Tool";
      case "category": return "Danh mục";
      case "blog": return "Blog";
      case "collection": return "Collection";
    }
  };

  const toolResults = results.filter((r) => r.type === "tool");
  const categoryResults = results.filter((r) => r.type === "category");
  const blogResults = results.filter((r) => r.type === "blog");

  return (
    <>
      {/* Trigger button in header */}
      <button
        onClick={() => setOpen(true)}
        className="hidden md:flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Search className="h-3.5 w-3.5" />
        <span>Tìm kiếm...</span>
        <kbd className="ml-2 inline-flex h-5 items-center gap-0.5 rounded border border-border bg-background px-1.5 text-[10px] font-medium text-muted-foreground">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      {/* Command Dialog */}
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Tìm tools, categories, blog..."
        />
        <CommandList>
          {loading && (
            <div className="flex items-center gap-2 px-4 py-6 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              Đang tìm kiếm...
            </div>
          )}

          {!query && !loading && (
            <>
              {recentSearches.length > 0 && (
                <CommandGroup heading="Tìm kiếm gần đây">
                  {recentSearches.map((s) => (
                    <CommandItem key={s} onSelect={() => handleRecentClick(s)} className="gap-2 cursor-pointer">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>{s}</span>
                    </CommandItem>
                  ))}
                  <CommandItem onSelect={handleClearRecent} className="gap-2 cursor-pointer text-muted-foreground text-xs justify-center">
                    Xóa lịch sử
                  </CommandItem>
                </CommandGroup>
              )}

              <CommandGroup heading="Truy cập nhanh">
                <CommandItem onSelect={() => { navigate("/tools"); setOpen(false); }} className="gap-2 cursor-pointer">
                  <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Tất cả Tools</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </CommandItem>
                <CommandItem onSelect={() => { navigate("/trending"); setOpen(false); }} className="gap-2 cursor-pointer">
                  <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Trending</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </CommandItem>
                <CommandItem onSelect={() => { navigate("/deals"); setOpen(false); }} className="gap-2 cursor-pointer">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Ưu đãi</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </CommandItem>
                <CommandItem onSelect={() => { navigate("/categories"); setOpen(false); }} className="gap-2 cursor-pointer">
                  <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Danh mục</span>
                  <ArrowRight className="ml-auto h-3.5 w-3.5 text-muted-foreground" />
                </CommandItem>
              </CommandGroup>
            </>
          )}

          {query && !loading && results.length === 0 && (
            <CommandEmpty>Không tìm thấy kết quả</CommandEmpty>
          )}

          {toolResults.length > 0 && (
            <CommandGroup heading="Tools">
              {toolResults.map((r) => (
                <CommandItem key={r.id} onSelect={() => handleSelect(r)} className="gap-3 cursor-pointer">
                  {r.logoUrl ? (
                    <img
                      src={getToolLogoUrl(r.logoUrl, r.websiteUrl)}
                      alt=""
                      className="h-6 w-6 rounded-md object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                  ) : (
                    typeIcon(r.type)
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{r.name}</div>
                    {r.description && (
                      <div className="text-xs text-muted-foreground truncate">{r.description}</div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{typeLabel(r.type)}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {categoryResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Danh mục">
                {categoryResults.map((r) => (
                  <CommandItem key={r.id} onSelect={() => handleSelect(r)} className="gap-3 cursor-pointer">
                    {r.icon ? <span className="text-base">{r.icon}</span> : typeIcon(r.type)}
                    <span className="text-sm">{r.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{typeLabel(r.type)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {blogResults.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Blog">
                {blogResults.map((r) => (
                  <CommandItem key={r.id} onSelect={() => handleSelect(r)} className="gap-3 cursor-pointer">
                    {typeIcon(r.type)}
                    <span className="text-sm">{r.name}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">{typeLabel(r.type)}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {query && results.length > 0 && (
            <>
              <CommandSeparator />
              <CommandItem
                onSelect={() => {
                  addRecentSearch(query);
                  navigate(`/tools?q=${encodeURIComponent(query)}`);
                  setOpen(false);
                  setQuery("");
                }}
                className="gap-2 cursor-pointer justify-center text-primary"
              >
                <Search className="h-3.5 w-3.5" />
                <span className="text-sm">Xem tất cả kết quả cho "{query}"</span>
              </CommandItem>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
