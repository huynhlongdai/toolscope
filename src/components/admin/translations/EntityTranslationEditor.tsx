import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Languages, RefreshCw, Save, Check, AlertCircle } from "lucide-react";
import { SUPPORTED_LOCALES, type Locale } from "@/lib/i18n";

const TARGET_LOCALES = Object.entries(SUPPORTED_LOCALES).filter(([code]) => code !== "vi") as [Locale, { label: string; flag: string; nativeName: string }][];

interface TranslationField {
  key: string;
  label: string;
  type: "input" | "textarea" | "richtext";
  originalValue: string;
}

interface EntityTranslationEditorProps {
  entityType: "blog" | "workflow" | "tool";
  entityId: string | undefined;
  fields: TranslationField[];
  translateFunctionName: string;
  translateBodyExtra?: Record<string, any>;
}

export function EntityTranslationEditor({
  entityType,
  entityId,
  fields,
  translateFunctionName,
  translateBodyExtra = {},
}: EntityTranslationEditorProps) {
  const queryClient = useQueryClient();
  const [locale, setLocale] = useState<Locale>("en");
  const [editedFields, setEditedFields] = useState<Record<string, string>>({});

  const { data: translations = [], isLoading } = useQuery({
    queryKey: ["entity-translations", entityType, entityId, locale],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("translations")
        .select("*")
        .eq("entity_type", entityType)
        .eq("entity_id", entityId!)
        .eq("locale", locale);
      if (error) throw error;
      return data;
    },
    enabled: !!entityId,
  });

  const translationMap: Record<string, { id: string; text: string; is_auto: boolean }> = {};
  translations.forEach((t: any) => {
    translationMap[t.field_name] = { id: t.id, text: t.translated_text, is_auto: t.is_auto };
  });

  const hasTranslation = fields.some((f) => !!translationMap[f.key]);

  const translateMutation = useMutation({
    mutationFn: async () => {
      const body: any = { locale, ...translateBodyExtra };
      if (entityType === "blog") body.blog_id = entityId;
      if (entityType === "workflow") body.workflow_id = entityId;
      if (entityType === "tool") body.tool_id = entityId;

      const { data, error } = await supabase.functions.invoke(translateFunctionName, { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-translations", entityType, entityId, locale] });
      setEditedFields({});
      toast.success(`Đã dịch sang ${SUPPORTED_LOCALES[locale].nativeName}`);
    },
    onError: (e: any) => toast.error(e.message || "Lỗi dịch"),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      for (const [fieldName, text] of Object.entries(editedFields)) {
        const existing = translationMap[fieldName];
        if (existing) {
          const { error } = await supabase
            .from("translations")
            .update({ translated_text: text, is_auto: false, updated_at: new Date().toISOString() })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await supabase.from("translations").insert({
            entity_type: entityType,
            entity_id: entityId!,
            locale,
            field_name: fieldName,
            translated_text: text,
            is_auto: false,
          });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entity-translations", entityType, entityId, locale] });
      setEditedFields({});
      toast.success("Đã lưu bản dịch");
    },
    onError: () => toast.error("Lỗi lưu"),
  });

  if (!entityId) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
        <AlertCircle className="h-4 w-4" />
        Lưu bài viết trước khi quản lý bản dịch
      </div>
    );
  }

  const getFieldValue = (field: TranslationField) => {
    if (editedFields[field.key] !== undefined) return editedFields[field.key];
    return translationMap[field.key]?.text ?? "";
  };

  const isEdited = Object.keys(editedFields).length > 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Select value={locale} onValueChange={(v) => { setLocale(v as Locale); setEditedFields({}); }}>
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {TARGET_LOCALES.map(([code, meta]) => (
                <SelectItem key={code} value={code}>
                  {meta.flag} {meta.nativeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasTranslation && (
            <Badge variant="secondary" className="text-xs gap-1">
              <Check className="h-3 w-3" /> Đã dịch
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => translateMutation.mutate()}
            disabled={translateMutation.isPending}
          >
            {translateMutation.isPending ? (
              <RefreshCw className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Languages className="mr-1 h-3.5 w-3.5" />
            )}
            {hasTranslation ? "Dịch lại" : "Dịch AI"}
          </Button>
          {isEdited && (
            <Button size="sm" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="mr-1 h-3.5 w-3.5" />
              Lưu thay đổi
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground text-center py-4">Đang tải...</p>
      ) : (
        <div className="space-y-4">
          {fields.map((field) => {
            const current = getFieldValue(field);
            const isAuto = translationMap[field.key]?.is_auto;
            return (
              <div key={field.key} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Label className="text-sm">{field.label}</Label>
                  {isAuto !== undefined && (
                    <Badge variant="outline" className="text-[10px] h-4">
                      {isAuto ? "AI" : "Thủ công"}
                    </Badge>
                  )}
                </div>
                {/* Original text preview */}
                {field.originalValue && (
                  <p className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 line-clamp-2">
                    <span className="font-medium">Gốc:</span> {field.originalValue.replace(/<[^>]*>/g, "").slice(0, 200)}
                  </p>
                )}
                {field.type === "textarea" || field.type === "richtext" ? (
                  <Textarea
                    value={current}
                    onChange={(e) => setEditedFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    rows={field.type === "richtext" ? 6 : 3}
                    placeholder={`Bản dịch ${SUPPORTED_LOCALES[locale].nativeName}...`}
                    className="text-sm"
                  />
                ) : (
                  <Input
                    value={current}
                    onChange={(e) => setEditedFields((prev) => ({ ...prev, [field.key]: e.target.value }))}
                    placeholder={`Bản dịch ${SUPPORTED_LOCALES[locale].nativeName}...`}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
