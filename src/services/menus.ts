import { supabase } from "@/integrations/supabase/client";

export interface MenuItem {
  label: string;
  url: string;
  open_new_tab?: boolean;
  children?: MenuItem[];
}

export async function fetchHeaderMenu() {
  const { data } = await supabase
    .from("menus")
    .select("id, items")
    .eq("location", "header")
    .maybeSingle();
  if (data?.items && Array.isArray(data.items) && data.items.length > 0) {
    return { id: data.id, items: data.items as unknown as MenuItem[] };
  }
  return null;
}

export async function fetchMenuTranslations(menuId: string, locale: string) {
  const { data } = await supabase
    .from("translations")
    .select("field_name, translated_text")
    .eq("entity_type", "menu")
    .eq("entity_id", menuId)
    .eq("locale", locale);
  const map: Record<string, string> = {};
  data?.forEach((row: any) => {
    map[row.field_name] = row.translated_text;
  });
  return map;
}
