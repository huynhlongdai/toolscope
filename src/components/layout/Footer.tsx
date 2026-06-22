import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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

export function Footer() {
  const { t, locale } = useI18n();

  const defaultFooterColumns = [
    {
      title: "Product",
      items: [
        { label: t("footer.allTools"), url: "/tools" },
        { label: t("footer.categories"), url: "/categories" },
        { label: t("footer.trending"), url: "/trending" },
        { label: "Deals", url: "/deals" },
        { label: "Blog", url: "/blog" },
      ],
    },
    {
      title: "Community",
      items: [
        { label: "Submit a Tool", url: "/submit" },
        { label: "Submit a Deal", url: "/submit-deal" },
        { label: "Write a Review", url: "/tools" },
        { label: "Leaderboard", url: "/leaderboard" },
      ],
    },
    {
      title: "Company",
      items: [
        { label: "About", url: "/about" },
        { label: t("footer.contact"), url: "/contact" },
        { label: t("footer.privacy"), url: "/privacy" },
        { label: "Terms of Service", url: "/terms" },
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
      return (
        <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {item.label}
        </a>
      );
    }
    return (
      <Link key={item.label} to={item.url}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors">
        {item.label}
      </Link>
    );
  };

  return (
    <footer className="border-t border-border/40 bg-card/50">
      <div className="container py-14">
        <div className="grid gap-10 md:grid-cols-5">
          {/* Brand column */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-500">
                <span className="text-sm font-bold text-white">T</span>
              </div>
              <span className="text-xl font-extrabold tracking-tight text-gradient">ToolScope</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {t("footer.description")}
            </p>
          </div>

          {/* Link columns */}
          {footerColumns.map((col: any) => (
            <div key={col.title}>
              <h4 className="mb-4 text-sm font-semibold text-foreground">{col.title}</h4>
              <div className="flex flex-col gap-2.5">
                {col.items.map((item: MenuItem) => renderLink(item))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border/40 pt-8">
          <p className="text-sm text-muted-foreground">© 2025 ToolScope. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Twitter</a>
            <a href="https://discord.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">Discord</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
