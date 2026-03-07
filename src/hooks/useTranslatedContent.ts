import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";

interface TranslatedContent {
  [field: string]: string | undefined;
}

interface UseTranslatedContentResult {
  translated: TranslatedContent;
  isTranslated: boolean;
  isLoading: boolean;
}

const SOURCE_LOCALE = "vi";

export function useTranslatedContent(
  entityType: string,
  entityId: string | undefined,
  fields: string[],
  fallbacks: Record<string, string | null | undefined> = {}
): UseTranslatedContentResult {
  const { locale } = useI18n();

  const { data: translations, isLoading } = useQuery({
    queryKey: ["translated-content", locale, entityType, entityId, fields.join(",")],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("translations")
        .select("field_name, translated_text")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .eq("locale", locale)
        .in("field_name", fields);
      if (error) throw error;
      return data;
    },
    enabled: !!entityId && locale !== SOURCE_LOCALE && fields.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  if (locale === SOURCE_LOCALE || !entityId) {
    const translated: TranslatedContent = {};
    fields.forEach((f) => {
      translated[f] = fallbacks[f] ?? undefined;
    });
    return { translated, isTranslated: false, isLoading: false };
  }

  const translated: TranslatedContent = {};
  let hasTranslation = false;

  fields.forEach((f) => {
    const match = translations?.find((t) => t.field_name === f);
    if (match) {
      translated[f] = match.translated_text;
      hasTranslation = true;
    } else {
      translated[f] = fallbacks[f] ?? undefined;
    }
  });

  return { translated, isTranslated: hasTranslation, isLoading };
}
