import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, Images, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";

interface Props {
  toolId: string;
  toolName: string;
}

export function ScreenshotGallery({ toolId, toolName }: Props) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const expanded = open || !isMobile;

  const { data: screenshots } = useQuery({
    queryKey: ["tool-screenshots", toolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_screenshots" as any)
        .select("*")
        .eq("tool_id", toolId)
        .order("sort_order")
        .limit(20);
      if (error) throw error;
      return data as any[];
    },
  });

  if (!screenshots || screenshots.length === 0) return null;

  const prev = () => setActiveIdx((i) => (i === 0 ? screenshots.length - 1 : i - 1));
  const next = () => setActiveIdx((i) => (i === screenshots.length - 1 ? 0 : i + 1));

  return (
    <>
      <Card>
        <Collapsible open={expanded} onOpenChange={setOpen}>
          <CollapsibleTrigger asChild disabled={!isMobile}>
            <CardHeader className={`pb-2 ${isMobile ? "cursor-pointer select-none" : ""}`}>
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Images className="h-4 w-4" /> Screenshots ({screenshots.length})
                </span>
                {isMobile && (
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`} />
                )}
              </CardTitle>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              <div className="relative group cursor-pointer" onClick={() => setLightbox(true)}>
                <img
                  src={screenshots[activeIdx].image_url}
                  alt={screenshots[activeIdx].caption || `${toolName} screenshot ${activeIdx + 1}`}
                  className="w-full rounded-lg object-cover max-h-[300px]"
                  loading="lazy"
                />
                {screenshots.length > 1 && (
                  <>
                    <button onClick={(e) => { e.stopPropagation(); prev(); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); next(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
              </div>
              {screenshots[activeIdx].caption && (
                <p className="text-xs text-muted-foreground mt-2">{screenshots[activeIdx].caption}</p>
              )}
              {screenshots.length > 1 && (
                <div className="flex gap-1.5 mt-3 overflow-x-auto pb-1">
                  {screenshots.map((s: any, i: number) => (
                    <button key={s.id} onClick={() => setActiveIdx(i)}
                      className={`shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                        i === activeIdx ? "border-primary" : "border-transparent"
                      }`}>
                      <img src={s.image_url} alt="" className="h-12 w-16 object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 bg-background/90 flex items-center justify-center" onClick={() => setLightbox(false)}>
          <Button variant="ghost" size="icon" className="absolute top-4 right-4" onClick={() => setLightbox(false)}>
            <X className="h-5 w-5" />
          </Button>
          <img
            src={screenshots[activeIdx].image_url}
            alt={screenshots[activeIdx].caption || ""}
            className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
          {screenshots.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-background/80 rounded-full p-2">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
