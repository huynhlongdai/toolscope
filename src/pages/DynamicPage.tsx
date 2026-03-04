import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

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
        .from("pages").select("*").eq("slug", slug!).eq("status", "published").maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  useEffect(() => {
    if (page) document.title = page.seo_title || page.title;
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

// Countdown component
function CountdownTimer({ targetDate }: { targetDate: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  useEffect(() => {
    const calc = () => {
      const diff = Math.max(0, new Date(targetDate).getTime() - Date.now());
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    };
    calc();
    const interval = setInterval(calc, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flex justify-center gap-4 text-3xl font-bold md:text-5xl">
      {[
        { val: timeLeft.days, label: "Ngày" },
        { val: timeLeft.hours, label: "Giờ" },
        { val: timeLeft.minutes, label: "Phút" },
        { val: timeLeft.seconds, label: "Giây" },
      ].map((item, i) => (
        <div key={i} className="flex flex-col items-center">
          <span className="tabular-nums">{pad(item.val)}</span>
          <span className="text-xs font-normal opacity-80 mt-1">{item.label}</span>
        </div>
      ))}
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
            {d.buttonText && <Button asChild size="lg"><a href={d.buttonUrl}>{d.buttonText}</a></Button>}
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
            {d.buttonText && <Button asChild size="lg"><a href={d.buttonUrl}>{d.buttonText}</a></Button>}
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
            <Accordion type="single" collapsible className="w-full">
              {(d.items ?? []).map((item: any, i: number) => (
                <AccordionItem key={i} value={`faq-${i}`}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
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

    // NEW BLOCKS
    case "testimonials":
      return (
        <section className="py-16 bg-muted/30">
          <div className="container">
            {d.title && <h2 className="text-3xl font-bold text-center mb-10">{d.title}</h2>}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {(d.items ?? []).map((item: any, i: number) => (
                <Card key={i} className="relative overflow-hidden">
                  <CardContent className="pt-6 space-y-4">
                    <div className="text-4xl text-primary/20 absolute top-4 right-4">"</div>
                    <p className="italic text-muted-foreground relative z-10">"{item.quote}"</p>
                    <div className="flex items-center gap-3 pt-2">
                      {item.avatar ? (
                        <img src={item.avatar} alt={item.name} className="w-10 h-10 rounded-full object-cover" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm">
                          {item.name?.[0]?.toUpperCase() || "?"}
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-sm">{item.name}</p>
                        <p className="text-xs text-muted-foreground">{item.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      );

    case "pricing":
      return (
        <section className="py-16">
          <div className="container">
            {d.title && <h2 className="text-3xl font-bold text-center mb-10">{d.title}</h2>}
            <div className={cn("grid gap-6 mx-auto", (d.plans?.length ?? 0) <= 3 ? "md:grid-cols-3 max-w-5xl" : "md:grid-cols-4 max-w-6xl")}>
              {(d.plans ?? []).map((plan: any, i: number) => (
                <Card key={i} className={cn("relative flex flex-col", plan.highlighted && "border-primary shadow-lg scale-105")}>
                  {plan.highlighted && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Phổ biến nhất
                    </div>
                  )}
                  <CardContent className="pt-8 flex-1 flex flex-col">
                    <h3 className="text-lg font-bold text-center">{plan.name}</h3>
                    <div className="text-center my-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                    </div>
                    <ul className="space-y-2 flex-1 mb-6">
                      {(plan.features ?? []).map((f: string, j: number) => (
                        <li key={j} className="flex items-center gap-2 text-sm">
                          <span className="text-primary">✓</span> {f}
                        </li>
                      ))}
                    </ul>
                    <Button asChild variant={plan.highlighted ? "default" : "outline"} className="w-full">
                      <a href={plan.buttonUrl}>{plan.buttonText}</a>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      );

    case "accordion":
      return (
        <section className="py-16">
          <div className="container max-w-3xl">
            {d.title && <h2 className="text-3xl font-bold text-center mb-8">{d.title}</h2>}
            <Accordion type="single" collapsible className="w-full">
              {(d.items ?? []).map((item: any, i: number) => (
                <AccordionItem key={i} value={`acc-${i}`}>
                  <AccordionTrigger>{item.title}</AccordionTrigger>
                  <AccordionContent>{item.content}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      );

    case "button":
      return (
        <section className="py-8">
          <div className={cn("container", d.align === "center" && "text-center", d.align === "right" && "text-right")}>
            <Button
              asChild
              variant={d.variant === "outline" ? "outline" : d.variant === "secondary" ? "secondary" : "default"}
              size="lg"
            >
              <a href={d.url}>{d.text}</a>
            </Button>
          </div>
        </section>
      );

    case "countdown":
      return (
        <section className="py-16" style={{ background: `linear-gradient(135deg, ${d.bgColor || "#6366f1"}, ${d.bgColor || "#6366f1"}dd)` }}>
          <div className="container text-center text-white space-y-6">
            {d.title && <p className="text-lg opacity-90">⏰ {d.title}</p>}
            {d.targetDate && <CountdownTimer targetDate={d.targetDate} />}
          </div>
        </section>
      );

    case "gallery":
      return (
        <section className="py-16">
          <div className="container">
            {d.title && <h2 className="text-3xl font-bold text-center mb-10">{d.title}</h2>}
            <div className={cn(
              "grid gap-4",
              d.columns === "2" ? "md:grid-cols-2" : d.columns === "4" ? "md:grid-cols-4" : "md:grid-cols-3"
            )}>
              {(d.items ?? []).filter((item: any) => item.src).map((item: any, i: number) => (
                <div key={i} className="group relative overflow-hidden rounded-xl">
                  <img
                    src={item.src}
                    alt={item.alt || ""}
                    className="w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  {item.caption && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <p className="text-white text-sm">{item.caption}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>
      );

    default:
      return null;
  }
}
