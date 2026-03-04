import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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

const defaultFooterColumns = [
  {
    title: "Khám phá",
    items: [
      { label: "Tất cả tools", url: "/tools" },
      { label: "Danh mục", url: "/categories" },
      { label: "Trending", url: "/trending" },
      { label: "So sánh", url: "/compare" },
    ],
  },
  {
    title: "Cộng đồng",
    items: [
      { label: "Blog", url: "/blog" },
      { label: "Collections", url: "/collections" },
      { label: "Gửi tool", url: "/submit" },
    ],
  },
  {
    title: "Về chúng tôi",
    items: [
      { label: "Giới thiệu", url: "/about" },
      { label: "Liên hệ", url: "/contact" },
      { label: "Chính sách", url: "/privacy" },
    ],
  },
];

export function Footer() {
  const { data: dbMenuItems } = useQuery({
    queryKey: ["menu-footer"],
    queryFn: async () => {
      const { data } = await supabase
        .from("menus")
        .select("items")
        .eq("location", "footer")
        .maybeSingle();
      if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
        return data.items as FooterColumn[];
      }
      return null;
    },
    staleTime: 5 * 60 * 1000,
  });

  // If DB has footer menu, use grouped structure: each top-level item = column header with children
  const footerColumns = dbMenuItems
    ? dbMenuItems.map((col: any) => ({
        title: col.label,
        items: col.children ?? [],
      }))
    : defaultFooterColumns;

  const renderLink = (item: MenuItem) => {
    const isExternal = item.url.startsWith("http");
    if (isExternal || item.open_new_tab) {
      return (
        <a key={item.label} href={item.url} target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground">
          {item.label}
        </a>
      );
    }
    return (
      <Link key={item.label} to={item.url} className="text-sm text-muted-foreground hover:text-foreground">
        {item.label}
      </Link>
    );
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
            <p className="text-sm text-muted-foreground">
              Nền tảng tổng hợp & review công cụ hàng đầu. Tìm tool phù hợp nhất cho bạn.
            </p>
          </div>
          {footerColumns.map((col: any) => (
            <div key={col.title}>
              <h4 className="mb-3 text-sm font-semibold">{col.title}</h4>
              <div className="flex flex-col gap-2">
                {col.items.map((item: MenuItem) => renderLink(item))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-8 border-t border-border pt-6 text-center text-sm text-muted-foreground">
          © 2026 ToolScope. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
