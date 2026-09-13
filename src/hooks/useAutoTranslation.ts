import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useI18n } from "@/lib/i18n";
import { toast } from "sonner";

interface TranslationResult {
  title?: string;
  content?: string;
  excerpt?: string;
}

interface UseAutoTranslationOptions {
  postId: string | null;
  originalTitle: string;
  originalContent: string;
  originalExcerpt?: string;
  enabled?: boolean;
}

interface UseAutoTranslationResult {
  translatedTitle: string;
  translatedContent: string;
  translatedExcerpt?: string;
  isTranslating: boolean;
  isTranslated: boolean;
}

export function useAutoTranslation(options: UseAutoTranslationOptions): UseAutoTranslationResult {
  const { postId, originalTitle, originalContent, originalExcerpt = "", enabled = true } = options;
  const { locale } = useI18n();
  
  const [translatedTitle, setTranslatedTitle] = useState(originalTitle);
  const [translatedContent, setTranslatedContent] = useState(originalContent);
  const [translatedExcerpt, setTranslatedExcerpt] = useState(originalExcerpt);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isTranslated, setIsTranslated] = useState(false);

  useEffect(() => {
    if (!enabled || !postId || locale === "vi") {
      setTranslatedTitle(originalTitle);
      setTranslatedContent(originalContent);
      setTranslatedExcerpt(originalExcerpt);
      setIsTranslated(false);
      return;
    }

    const cacheKey = `blog-translation-${postId}-${locale}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as TranslationResult;
        setTranslatedTitle(parsed.title || originalTitle);
        setTranslatedContent(parsed.content || originalContent);
        setTranslatedExcerpt(parsed.excerpt || originalExcerpt);
        setIsTranslated(true);
        return;
      } catch (e) {
        localStorage.removeItem(cacheKey);
      }
    }

    setIsTranslating(true);
    
    supabase.functions
      .invoke("translate-blog", {
        body: {
          post_id: postId,
          target_locale: locale,
        },
      })
      .then(({ data, error }) => {
        if (error) throw error;
        
        const result: TranslationResult = {
          title: data.title || originalTitle,
          content: data.content || originalContent,
          excerpt: data.excerpt || originalExcerpt,
        };
        
        setTranslatedTitle(result.title);
        setTranslatedContent(result.content);
        setTranslatedExcerpt(result.excerpt);
        setIsTranslated(true);
        
        localStorage.setItem(cacheKey, JSON.stringify(result));
        
        toast.success(`Đã dịch bài viết sang ${locale.toUpperCase()}`);
      })
      .catch((error) => {
        console.error("Auto-translation failed:", error);
        setTranslatedTitle(originalTitle);
        setTranslatedContent(originalContent);
        setTranslatedExcerpt(originalExcerpt);
        setIsTranslated(false);
      })
      .finally(() => {
        setIsTranslating(false);
      });
  }, [postId, locale, originalTitle, originalContent, originalExcerpt, enabled]);

  return {
    translatedTitle,
    translatedContent,
    translatedExcerpt,
    isTranslating,
    isTranslated,
  };
}
