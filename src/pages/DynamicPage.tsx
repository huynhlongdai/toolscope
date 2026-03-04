import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect } from "react";
import { Link } from "react-router-dom";

interface Block {
  type: string;
  data: any;
}

export default function DynamicPage() {
  const { slug } = useParams<{ slug: string }>();

  const { data: page, isLoading } = useQuery({
    queryKey: ["page", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pages")
        .select("*")
        .eq("slug", slug!)
        .eq("status", "published")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (page) {
      document.title = page.seo_title || page.title;
    }
  }, [page]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-8"><Skeleton className="h-64" /></main>
        <Footer />
      </div>
    );
  }

  if (!page) {
    return (
      <div className="flex min-h-screen flex-col">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <p className="text-xl text-muted-foreground">Không tìm thấy trang</p>
          <Link to="/" className="mt-4 inline-block text-primary hover:underline">← Trang chủ</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const blocks: Block[] = (page.blocks as any) ?? [];

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">
        {blocks.map((block, idx) => (
          <BlockRenderer key={idx} block={block} />
        ))}
        {blocks.length === 0 && (
          <div className="container py-16 text-center text-muted-foreground">Trang này chưa có nội dung.</div>
        )}
      </main>
      <Footer />
    </div>
  );
}

function BlockRenderer({ block }: { block: Block }) {
  const d = block.data;

  switch (block.type) {
    case "hero":
      return (
        <section className="py-20 bg-gradient-to-br from-primary/5 to-primary/10">
          <div className="container text-center space-y-4">
            <h1 className="text-4xl font-bold md:text-5xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>{d.title}</h1>
            {d.subtitle && <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{d.subtitle}</p>}
            {d.buttonText && (
              <Button asChild size="lg"><a href={d.buttonUrl}>{d.buttonText}</a></Button>
            )}
          </div>
        </section>
      );
    case "text":
      return (
        <section className="py-12">
          <div className="container max-w-3xl prose prose-neutral dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: d.content }} />
        </section>
      );
    case "image":
      return (
        <section className="py-8">
          <div className="container max-w-4xl">
            <img src={d.src} alt={d.alt} className="w-full rounded-xl" />
            {d.caption && <p className="text-sm text-muted-foreground text-center mt-2">{d.caption}</p>}
          </div>
        </section>
      );
    case "cta":
      return (
        <section className="py-16 bg-primary/5">
          <div className="container text-center space-y-4">
            <h2 className="text-3xl font-bold">{d.title}</h2>
            {d.description && <p className="text-muted-foreground">{d.description}</p>}
            {d.buttonText && (
              <Button asChild size="lg"><a href={d.buttonUrl}>{d.buttonText}</a></Button>
            )}
          </div>
        </section>
      );
    case "features":
      return (
        <section className="py-16">
          <div className="container">
            {d.title && <h2 className="text-3xl font-bold text-center mb-8">{d.title}</h2>}
            <div className="grid gap-6 md:grid-cols-3">
              {(d.items ?? []).map((item: any, i: number) => (
                <Card key={i}>
                  <CardContent className="pt-6 text-center space-y-2">
                    <span className="text-3xl">{item.icon}</span>
                    <h3 className="font-semibold">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      );
    case "faq":
      return (
        <section className="py-16">
          <div className="container max-w-3xl">
            {d.title && <h2 className="text-3xl font-bold text-center mb-8">{d.title}</h2>}
            <div className="space-y-4">
              {(d.items ?? []).map((item: any, i: number) => (
                <Card key={i}>
                  <CardContent className="pt-6">
                    <h3 className="font-semibold mb-2">{item.question}</h3>
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      );
    case "video":
      return (
        <section className="py-12">
          <div className="container max-w-3xl">
            {d.title && <h3 className="text-xl font-bold mb-4 text-center">{d.title}</h3>}
            <div className="aspect-video">
              <iframe src={d.url?.replace("watch?v=", "embed/")} className="w-full h-full rounded-xl" allowFullScreen />
            </div>
          </div>
        </section>
      );
    case "divider":
      return <div className="container"><hr className="my-8 border-border" /></div>;
    default:
      return null;
  }
}
