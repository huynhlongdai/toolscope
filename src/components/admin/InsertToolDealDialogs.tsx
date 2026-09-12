import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Tag, Wrench, Check, X } from "lucide-react";

export function InsertToolDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (shortcode: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());

  const { data: tools = [], isFetching } = useQuery({
    queryKey: ["insert-tool-picker", search],
    queryFn: async () => {
      let q = supabase
        .from("tools")
        .select("id, name, slug, short_description, logo_url, pricing_type, avg_rating, categories(name)")
        .eq("status", "published")
        .order("view_count", { ascending: false })
        .limit(20);
      if (search.trim()) q = q.ilike("name", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const handleToggle = (slug: string) => {
    setSelectedSlugs(prev => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  };

  const handleInsert = () => {
    const slugs = Array.from(selectedSlugs);
    if (slugs.length > 0) {
      // Insert as HTML tool-block divs that the ToolBlock extension can parse
      const html = slugs.map(slug => 
        `<div data-type="tool-block" data-slug="${slug}"></div>`
      ).join("") + "<p></p>";
      onInsert(html);
    }
    onOpenChange(false);
    setSelectedSlugs(new Set());
    setSearch("");
  };

  const pricingLabel = (type: string) => {
    if (type === "free") return { label: "Free", color: "bg-green-100 text-green-700" };
    if (type === "freemium") return { label: "Freemium", color: "bg-blue-100 text-blue-700" };
    return { label: "Paid", color: "bg-purple-100 text-purple-700" };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Wrench className="h-4 w-4" />
              Chèn Tool Card
            </div>
            {selectedSlugs.size > 0 && (
              <Badge variant="secondary" className="text-xs">
                {selectedSlugs.size} đã chọn
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm tool theo tên..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-96">
            {isFetching && (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {!isFetching && <CommandEmpty>Không tìm thấy tool.</CommandEmpty>}
            <CommandGroup>
              {tools.map((tool: any) => {
                const isSelected = selectedSlugs.has(tool.slug);
                const pricing = pricingLabel(tool.pricing_type);
                return (
                  <CommandItem
                    key={tool.id}
                    value={tool.slug}
                    onSelect={() => handleToggle(tool.slug)}
                    className="py-2"
                  >
                    <div className="flex items-center gap-3 w-full">
                      {/* Checkbox indicator */}
                      <div className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        isSelected ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground/30"
                      }`}>
                        {isSelected && <Check className="h-3 w-3" />}
                      </div>

                      {/* Logo */}
                      {tool.logo_url ? (
                        <img
                          src={tool.logo_url}
                          alt=""
                          className="h-10 w-10 rounded-lg object-cover flex-shrink-0"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold flex-shrink-0">
                          {tool.name?.charAt(0)}
                        </div>
                      )}

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-medium truncate">{tool.name}</p>
                          {tool.avg_rating && tool.avg_rating > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ⭐ {tool.avg_rating.toFixed(1)}
                            </span>
                          )}
                        </div>
                        {tool.short_description && (
                          <p className="text-xs text-muted-foreground line-clamp-1 mb-1">
                            {tool.short_description}
                          </p>
                        )}
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${pricing.color}`}>
                            {pricing.label}
                          </Badge>
                          {tool.categories?.name && (
                            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                              {tool.categories.name}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>

        {/* Footer with actions */}
        {selectedSlugs.size > 0 && (
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-t bg-muted/30">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedSlugs(new Set())}
              className="text-xs"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Bỏ chọn tất cả
            </Button>
            <Button size="sm" onClick={handleInsert}>
              <Wrench className="h-3.5 w-3.5 mr-1" />
              Chèn {selectedSlugs.size} tool{selectedSlugs.size > 1 ? "s" : ""}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function InsertDealDialog({
  open,
  onOpenChange,
  onInsert,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (shortcode: string) => void;
}) {
  const [search, setSearch] = useState("");

  const { data: deals = [], isFetching } = useQuery({
    queryKey: ["insert-deal-picker", search],
    queryFn: async () => {
      let q = (supabase.from("deals") as any)
        .select("id, title, slug, coupon_code, discount_value, discount_type, tools(name, logo_url)")
        .eq("is_active", true)
        .order("is_exclusive", { ascending: false })
        .limit(20);
      if (search.trim()) q = q.ilike("title", `%${search.trim()}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
    enabled: open,
  });

  const handlePick = (deal: any) => {
    const identifier = deal.coupon_code || deal.slug;
    onInsert(`<p>[deal:${identifier}]</p>`);
    onOpenChange(false);
    setSearch("");
  };

  const discountLabel = (deal: any) =>
    deal.discount_type === "percentage" && deal.discount_value
      ? `-${deal.discount_value}%`
      : deal.discount_type === "fixed" && deal.discount_value
      ? `-${deal.discount_value}`
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4" /> Chèn Deal cụ thể
          </DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm deal theo tên..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-80">
            {isFetching && (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {!isFetching && <CommandEmpty>Không tìm thấy deal.</CommandEmpty>}
            <CommandGroup>
              {deals.map((deal: any) => (
                <CommandItem key={deal.id} value={deal.slug} onSelect={() => handlePick(deal)}>
                  <div className="flex items-center gap-2 min-w-0 w-full">
                    {deal.tools?.logo_url ? (
                      <img src={deal.tools.logo_url} alt="" className="h-6 w-6 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        <Tag className="h-3 w-3" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{deal.title}</p>
                      {deal.tools?.name && (
                        <p className="text-xs text-muted-foreground truncate">{deal.tools.name}</p>
                      )}
                    </div>
                    {discountLabel(deal) && (
                      <span className="text-xs font-semibold text-destructive flex-shrink-0">{discountLabel(deal)}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
