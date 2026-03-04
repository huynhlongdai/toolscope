import { useEffect } from "react";

interface SEOHeadProps {
  title?: string;
  description?: string;
  ogImage?: string;
  ogType?: string;
  canonical?: string;
  jsonLd?: Record<string, any>;
}

export function SEOHead({ title, description, ogImage, ogType = "website", canonical, jsonLd }: SEOHeadProps) {
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
    }
    if (title) {
      setMeta("og:title", title, "property");
    }
    if (ogImage) setMeta("og:image", ogImage, "property");
    setMeta("og:type", ogType, "property");

    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = canonical;
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
  }, [title, description, ogImage, ogType, canonical, jsonLd]);

  return null;
}
