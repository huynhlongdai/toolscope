import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function AnalyticsProvider() {
  const location = useLocation();

  const { data: settings } = useQuery({
    queryKey: ["site-settings-analytics"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("key, value")
        .in("key", ["ga_measurement_id", "custom_head_scripts", "custom_body_scripts"]);
      const map: Record<string, any> = {};
      data?.forEach((row: any) => { map[row.key] = row.value; });
      return map;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Inject GA script
  useEffect(() => {
    const gaId = settings?.ga_measurement_id;
    if (!gaId) return;

    // Check if already loaded
    if (document.querySelector(`script[src*="gtag/js?id=${gaId}"]`)) return;

    const script1 = document.createElement("script");
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
    script1.setAttribute("data-analytics", "ga");
    document.head.appendChild(script1);

    const script2 = document.createElement("script");
    script2.setAttribute("data-analytics", "ga-config");
    script2.textContent = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${gaId}');
    `;
    document.head.appendChild(script2);

    return () => {
      document.querySelectorAll('script[data-analytics="ga"], script[data-analytics="ga-config"]').forEach(el => el.remove());
    };
  }, [settings?.ga_measurement_id]);

  // Inject custom head scripts
  useEffect(() => {
    const scripts = settings?.custom_head_scripts;
    if (!scripts) return;

    const container = document.createElement("div");
    container.setAttribute("data-analytics", "custom-head");
    container.innerHTML = scripts;
    // Move all child nodes to head
    const nodes = Array.from(container.childNodes);
    nodes.forEach(node => document.head.appendChild(node));

    return () => {
      document.querySelectorAll('[data-analytics="custom-head"]').forEach(el => el.remove());
    };
  }, [settings?.custom_head_scripts]);

  // Track page views on route change
  useEffect(() => {
    if ((window as any).gtag) {
      (window as any).gtag("event", "page_view", {
        page_path: location.pathname + location.search,
        page_title: document.title,
      });
    }
  }, [location.pathname, location.search]);

  return null;
}
