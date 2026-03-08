import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdUnit } from "@/components/ads/AdUnit";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { FeaturedTools } from "@/components/home/FeaturedTools";
import { StatsCounter } from "@/components/home/StatsCounter";
import { RecentReviews } from "@/components/home/RecentReviews";
import { TrendingDeals } from "@/components/home/TrendingDeals";
import { BlogPreview } from "@/components/home/BlogPreview";
import { NewsletterCTA } from "@/components/home/NewsletterCTA";
import { SEOHead } from "@/components/seo/SEOHead";

const Index = () => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="flex min-h-screen flex-col">
      <SEOHead
        title="ToolScope - Khám phá & Review công cụ tốt nhất"
        description="Nền tảng tổng hợp & review công cụ hàng đầu. Tìm tool phù hợp nhất cho bạn với AI. So sánh, đánh giá và khám phá hàng ngàn công cụ."
        canonical={origin}
        ogImage={`${origin}/og-image.png`}
        jsonLd={{
          "@context": "https://schema.org",
          "@graph": [
            {
              "@type": "WebSite",
              name: "ToolScope",
              url: origin,
              potentialAction: {
                "@type": "SearchAction",
                target: `${origin}/tools?q={search_term_string}`,
                "query-input": "required name=search_term_string",
              },
            },
            {
              "@type": "Organization",
              name: "ToolScope",
              url: origin,
              logo: `${origin}/favicon.ico`,
            },
          ],
        }}
      />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <HeroSection />
        <AdUnit slotId="hero_below" className="container my-4" />
        <CategoryGrid />
        <FeaturedTools />
        <StatsCounter />
        <RecentReviews />
        <TrendingDeals />
        <BlogPreview />
        <NewsletterCTA />
        <AdUnit slotId="footer_above" className="container my-4" />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Index;
