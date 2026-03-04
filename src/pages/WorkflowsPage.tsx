import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { SEOHead } from "@/components/seo/SEOHead";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "react-router-dom";
import { Workflow, ArrowRight, Eye, ThumbsUp } from "lucide-react";

const WorkflowsPage = () => {
  const { data: workflows, isLoading } = useQuery({
    queryKey: ["workflows"],
    queryFn: async () => {
      const { data } = await supabase
        .from("workflows")
        .select("*, profiles(display_name)")
        .eq("status", "published")
        .order("upvotes", { ascending: false });
      return data || [];
    },
  });

  return (
    <div className="flex min-h-screen flex-col">
      <SEOHead title="Use Cases & Workflows - ToolScope" description="Khám phá các workflow và use case phổ biến với bộ tools phù hợp." />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <div className="container py-8">
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <Workflow className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
                Use Cases & Workflows
              </h1>
            </div>
            <p className="text-muted-foreground">Tìm bộ tools phù hợp cho từng workflow cụ thể.</p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-44 rounded-xl" />)}
            </div>
          ) : workflows?.length ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {workflows.map((wf: any) => (
                <Link key={wf.id} to={`/workflow/${wf.slug}`}>
                  <Card className="group h-full transition-all hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/20">
                    {wf.cover_image_url && (
                      <div className="h-36 overflow-hidden rounded-t-xl">
                        <img src={wf.cover_image_url} alt={wf.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    )}
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">{wf.title}</h3>
                      {wf.description && <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{wf.description}</p>}
                      {wf.category && (
                        <span className="mt-2 inline-block text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{wf.category}</span>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><ThumbsUp className="h-3 w-3" /> {wf.upvotes}</span>
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {wf.view_count}</span>
                        {wf.tool_ids?.length > 0 && <span>{wf.tool_ids.length} tools</span>}
                        <ArrowRight className="h-3 w-3 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <Workflow className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Chưa có workflow nào</h3>
              <p className="text-muted-foreground">Các workflow và use case sẽ sớm được thêm vào.</p>
            </div>
          )}
        </div>
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default WorkflowsPage;
