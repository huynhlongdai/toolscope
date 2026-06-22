import { type ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { SEOHead } from "@/components/seo/SEOHead";
import { LimitedTimeBanner } from "@/components/deals/LimitedTimeBanner";
import { NewsletterPopup } from "@/components/home/NewsletterPopup";

interface PageLayoutProps {
  children: ReactNode;
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: Record<string, any>;
  /** Hide footer (e.g. for full-screen pages) */
  hideFooter?: boolean;
}

export function PageLayout({
  children,
  title,
  description,
  canonical,
  ogImage,
  jsonLd,
  hideFooter = false,
}: PageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col">
      {title && (
        <SEOHead
          title={title}
          description={description}
          canonical={canonical}
          ogImage={ogImage}
          jsonLd={jsonLd}
        />
      )}
      <LimitedTimeBanner />
      <Header />
      <main id="main-content" className="flex-1 pb-20 md:pb-0">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
      {!hideFooter && <Footer />}
      <MobileBottomNav />
      <NewsletterPopup />
    </div>
  );
}
