import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, ExternalLink, Star } from "lucide-react";

function ToolBlockView({ node, deleteNode }: { node: any; deleteNode: () => void }) {
  const slug = node.attrs.slug;

  const { data: tool, isLoading } = useQuery({
    queryKey: ["tool-block-preview", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tools")
        .select("id, name, slug, short_description, logo_url, website_url, pricing_type, avg_rating, rating_count, categories(name)")
        .eq("slug", slug)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  if (isLoading) {
    return (
      <NodeViewWrapper>
        <div className="my-4 p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-lg bg-muted animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              <div className="h-3 w-48 bg-muted animate-pulse rounded" />
            </div>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  if (!tool) {
    return (
      <NodeViewWrapper>
        <div className="my-4 p-4 border-2 border-destructive/30 rounded-lg bg-destructive/5">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <p className="text-sm font-medium text-destructive">Tool không tồn tại</p>
              <p className="text-xs text-muted-foreground mt-1">Slug: {slug}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={deleteNode}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </NodeViewWrapper>
    );
  }

  const pricingLabel = (type: string) => {
    if (type === "free") return { label: "Free", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
    if (type === "freemium") return { label: "Freemium", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
    return { label: "Paid", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" };
  };

  const pricing = pricingLabel(tool.pricing_type);

  return (
    <NodeViewWrapper>
      <div className="my-4 p-4 border-2 border-border rounded-lg bg-card hover:border-primary/50 transition-colors group">
        <div className="flex items-start gap-3">
          {/* Logo */}
          {tool.logo_url ? (
            <img
              src={tool.logo_url}
              alt={tool.name}
              className="h-12 w-12 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-lg flex-shrink-0">
              {tool.name?.charAt(0)}
            </div>
          )}

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 mb-1">
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-sm truncate">{tool.name}</h4>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <Badge variant="outline" className={`text-[10px] h-4 px-1.5 ${pricing.color}`}>
                    {pricing.label}
                  </Badge>
                  {tool.categories?.name && (
                    <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                      {tool.categories.name}
                    </Badge>
                  )}
                  {tool.avg_rating && tool.avg_rating > 0 && (
                    <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-current text-yellow-500" />
                      {tool.avg_rating.toFixed(1)}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {tool.website_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    asChild
                  >
                    <a href={tool.website_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={deleteNode}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {tool.short_description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                {tool.short_description}
              </p>
            )}
          </div>
        </div>
      </div>
    </NodeViewWrapper>
  );
}

export const ToolBlock = Node.create({
  name: "toolBlock",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      slug: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-slug"),
        renderHTML: (attributes) => {
          if (!attributes.slug) return {};
          return { "data-slug": attributes.slug };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="tool-block"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "tool-block" })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ToolBlockView as any);
  },
});
