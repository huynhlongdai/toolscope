import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import { Loader2, Tag, Wrench } from "lucide-react";

/**
 * "Insert Tool" picker: search published tools by name and insert a
 * `[tool:slug]` shortcode, rendered live as a ToolCard by ShortcodeContent.
 */
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

  const { data: tools = [], isFetching } = useQuery({
    queryKey: ["insert-tool-picker", search],
    queryFn: async () => {
      let q = supabase
        .from("tools")
        .select("id, name, slug, short_description, logo_url")
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

  const handlePick = (slug: string) => {
    onInsert(`<p>[tool:${slug}]</p>`);
    onOpenChange(false);
    setSearch("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md p-0 gap-0">
        <DialogHeader className="px-4 pt-4 pb-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Wrench className="h-4 w-4" /> Chèn Tool Card
          </DialogTitle>
        </DialogHeader>
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Tìm tool theo tên..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-80">
            {isFetching && (
              <div className="flex items-center justify-center py-6 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {!isFetching && <CommandEmpty>Không tìm thấy tool.</CommandEmpty>}
            <CommandGroup>
              {tools.map((tool: any) => (
                <CommandItem key={tool.id} value={tool.slug} onSelect={() => handlePick(tool.slug)}>
                  <div className="flex items-center gap-2 min-w-0">
                    {tool.logo_url ? (
                      <img src={tool.logo_url} alt="" className="h-6 w-6 rounded-md object-cover flex-shrink-0" />
                    ) : (
                      <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                        {tool.name?.[0]}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{tool.name}</p>
                      {tool.short_description && (
                        <p className="text-xs text-muted-foreground truncate">{tool.short_description}</p>
                      )}
                    </div>
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

/**
 * "Insert Deal" picker: search active deals (by title or their tool's name)
 * and insert a real `[deal:CODE]` (tool-scoped coupon) or `[deal:slug]`
 * (standalone deal lookup) shortcode - replacing the old static `[deals]`
 * snippet with a real, specific deal chosen by the writer.
 */
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
    // Prefer the coupon code shortcode when present (matches legacy
    // tool-scoped behavior); otherwise fall back to the deal's own slug
    // (works standalone, e.g. inside a blog post not tied to one tool).
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
