import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  jsonLd?: Record<string, any>;
  hreflangs?: { lang: string; href: string }[];
  twitterCard?: "summary" | "summary_large_image";
}

export function SEOHead({ title, description, ogImage, ogType = "website", canonical, jsonLd, hreflangs, twitterCard = "summary_large_image" }: SEOHeadProps) {
  useEffect(() => {
    if (title) document.title = title;

    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.content = content;
    };

    if (description) {
      setMeta("description", description);
      setMeta("og:description", description, "property");
      setMeta("twitter:description", description);
    }
    if (title) {
      setMeta("og:title", title, "property");
      setMeta("twitter:title", title);
    }
    if (ogImage) {
      setMeta("og:image", ogImage, "property");
      setMeta("twitter:image", ogImage);
    }
    setMeta("og:type", ogType, "property");
    setMeta("twitter:card", twitterCard);

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
    }

    // Hreflang tags
    document.querySelectorAll('link[data-hreflang]').forEach(el => el.remove());
    if (hreflangs) {
      hreflangs.forEach(({ lang, href }) => {
        const link = document.createElement("link");
        link.rel = "alternate";
        link.hreflang = lang;
        link.href = href;
        link.setAttribute("data-hreflang", "true");
        document.head.appendChild(link);
      });
    }

    // JSON-LD
    if (jsonLd) {
      const existingScript = document.querySelector('script[data-seo-jsonld]');
      if (existingScript) existingScript.remove();
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.setAttribute("data-seo-jsonld", "true");
      script.textContent = JSON.stringify(jsonLd);
      document.head.appendChild(script);
      return () => { script.remove(); };
    }
  }, [title, description, ogImage, ogType, canonical, jsonLd, hreflangs, twitterCard]);

  return null;
}
