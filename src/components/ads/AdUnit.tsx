import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface AdsConfig {
  enabled: boolean;
  client_id: string;
  slots: Record<string, {
    enabled: boolean;
    mode: "adsense" | "custom";
    slot_id: string;
    format: string;
    custom_code: string;
  }>;
}

const DEFAULT_CONFIG: AdsConfig = {
  enabled: false,
  client_id: "",
  slots: {},
};

export function useAdsConfig() {
  const { data } = useQuery({
    queryKey: ["ads-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "ads_config")
        .maybeSingle();
      if (!data?.value) return DEFAULT_CONFIG;
      const val = typeof data.value === "string" ? JSON.parse(data.value) : data.value;
      return val as AdsConfig;
    },
    staleTime: 5 * 60 * 1000,
  });
  return data || DEFAULT_CONFIG;
}

interface AdUnitProps {
  slotId: string;
  format?: "auto" | "horizontal" | "vertical" | "rectangle";
  className?: string;
}

export function AdUnit({ slotId, format: formatOverride, className }: AdUnitProps) {
  const config = useAdsConfig();
  const containerRef = useRef<HTMLDivElement>(null);
  const executedRef = useRef(false);

  const slot = config.slots?.[slotId];
  const isActive = config.enabled && slot?.enabled;

  // Execute custom scripts
  useEffect(() => {
    if (!isActive || slot?.mode !== "custom" || !slot.custom_code || !containerRef.current) return;
    if (executedRef.current) return;
    executedRef.current = true;

    const container = containerRef.current;
    container.innerHTML = slot.custom_code;

    // Execute script tags manually
    const scripts = container.querySelectorAll("script");
    scripts.forEach((oldScript) => {
      const newScript = document.createElement("script");
      Array.from(oldScript.attributes).forEach((attr) =>
        newScript.setAttribute(attr.name, attr.value)
      );
      if (oldScript.textContent) newScript.textContent = oldScript.textContent;
      oldScript.parentNode?.replaceChild(newScript, oldScript);
    });

    return () => {
      executedRef.current = false;
    };
  }, [isActive, slot?.mode, slot?.custom_code]);

  // Push adsbygoogle
  useEffect(() => {
    if (!isActive || slot?.mode !== "adsense" || !config.client_id) return;
    try {
      ((window as any).adsbygoogle = (window as any).adsbygoogle || []).push({});
    } catch {}
  }, [isActive, slot?.mode, config.client_id]);

  if (!isActive) return null;

  const adFormat = formatOverride || slot?.format || "auto";

  if (slot?.mode === "custom" && slot.custom_code) {
    return (
      <div
        ref={containerRef}
        className={className}
        data-ad-slot={slotId}
      />
    );
  }

  if (slot?.mode === "adsense" && config.client_id) {
    return (
      <div className={className} data-ad-slot={slotId}>
        <ins
          className="adsbygoogle"
          style={{ display: "block" }}
          data-ad-client={config.client_id}
          data-ad-slot={slot.slot_id || ""}
          data-ad-format={adFormat}
          data-full-width-responsive="true"
        />
      </div>
    );
  }

  return null;
}
