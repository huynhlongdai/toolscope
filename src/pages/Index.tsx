import { AdUnit } from "@/components/ads/AdUnit";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { FeaturedTools } from "@/components/home/FeaturedTools";
import { StatsCounter } from "@/components/home/StatsCounter";
import { RecentReviews } from "@/components/home/RecentReviews";
import { TrendingDeals } from "@/components/home/TrendingDeals";
import { BlogPreview } from "@/components/home/BlogPreview";
import { NewsletterCTA } from "@/components/home/NewsletterCTA";
import { PageLayout } from "@/components/layout/PageLayout";

const Index = () => {
  const origin = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <PageLayout
      title="ToolScope — Find the Perfect AI Tool for Your Workflow"
      description="Compare 800+ tools across 67 categories. AI-powered recommendations, honest reviews, and exclusive deals."
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
    >
      <HeroSection />
      <StatsCounter />
      <AdUnit slotId="hero_below" className="container my-4" />
      <CategoryGrid />
      <FeaturedTools />
      <TrendingDeals />
      <RecentReviews />
      <BlogPreview />
      <NewsletterCTA />
      <AdUnit slotId="footer_above" className="container my-4" />
    </PageLayout>
  );
};

export default Index;
