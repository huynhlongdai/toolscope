import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Mail } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/lib/i18n";

interface MenuItem {
  label: string;
  url: string;
  open_new_tab?: boolean;
}

interface FooterColumn {
  label: string;
  url: string;
  children?: MenuItem[];
}

function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useI18n();

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    setLoading(false);
    if (error) {
      if (error.code === "23505") toast.info(t("newsletter.alreadySubscribed"));
      else toast.error(t("newsletter.error"));
    } else {
      toast.success(t("newsletter.success"));
      setEmail("");
    }
  };

  return (
    <form onSubmit={handleSubscribe} className="flex gap-2">
      <Input type="email" placeholder={t("newsletter.placeholder")} value={email} onChange={(e) => setEmail(e.target.value)} className="h-9 text-xs" required />
      <Button type="submit" size="sm" disabled={loading} className="shrink-0"><Mail className="h-3 w-3" /></Button>
    </form>
  );
}

export function Footer() {
  const { t, locale } = useI18n();

  const defaultFooterColumns = [
    {
      title: t("footer.explore"),
      items: [
        { label: t("footer.allTools"), url: "/tools" },
        { label: t("footer.categories"), url: "/categories" },
        { label: t("footer.trending"), url: "/trending" },
        { label: t("footer.compare"), url: "/compare" },
      ],
    },
    {
      title: t("footer.community"),
      items: [
        { label: t("footer.blog"), url: "/blog" },
        { label: t("footer.collections"), url: "/collections" },
        { label: t("footer.submitTool"), url: "/submit" },
      ],
    },
    {
      title: t("footer.about"),
      items: [
        { label: t("footer.intro"), url: "/about" },
        { label: t("footer.contact"), url: "/contact" },
        { label: t("footer.privacy"), url: "/privacy" },
      ],
    },
  ];

  const { data: dbMenuData } = useQuery({
    queryKey: ["menu-footer-with-id"],
    queryFn: async () => {
      const { data } = await supabase.from("menus").select("id, items").eq("location", "footer").maybeSingle();
      if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
        return { id: data.id, items: data.items as unknown as FooterColumn[] };
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // Load menu translations
  const menuId = dbMenuData?.id;
  const { data: menuTranslations } = useQuery({
    queryKey: ["menu-translations-footer", menuId, locale],
    queryFn: async () => {
      const { data } = await supabase
        .from("translations")
        .select("field_name, translated_text")
        .eq("entity_type", "menu")
        .eq("entity_id", menuId!)
        .eq("locale", locale);
      const map: Record<string, string> = {};
      data?.forEach((row: any) => { map[row.field_name] = row.translated_text; });
      return map;
    },
    enabled: !!menuId && locale !== "vi",
    staleTime: 5 * 60 * 1000,
  });

  const footerColumns = dbMenuData
    ? dbMenuData.items.map((col: any, colIdx: number) => ({
        title: menuTranslations?.[`item_${colIdx}_label`] || col.label,
        items: (col.children ?? []).map((child: any, childIdx: number) => ({
          ...child,
          label: menuTranslations?.[`item_${colIdx}_child_${childIdx}_label`] || child.label,
        })),
      }))
    : defaultFooterColumns;

  const renderLink = (item: MenuItem) => {
    const isExternal = item.url.startsWith("http");
    if (isExternal || item.open_new_tab) {
      return <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground">{item.label}</a>;
    }
    return <Link key={item.label} to={item.url} className="text-sm text-muted-foreground hover:text-foreground">{item.label}</Link>;
  };

  return (
    <footer className="border-t border-border bg-card">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
                <span className="text-xs font-bold text-primary-foreground">T</span>
              </div>
              <span className="text-lg font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>ToolScope</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{t("footer.description")}</p>
            <NewsletterForm />
          </div>
          {footerColumns.map((col: any) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-semibold">{col.title}</h4>
              <div className="flex flex-col gap-2">{col.items.map((item: MenuItem) => renderLink(item))}</div>
            </div>
          ))}
        </div>
        <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">© 2026 ToolScope. All rights reserved.</div>
      </div>
    </footer>
  );
}
