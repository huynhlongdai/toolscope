import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { HeroSection } from "@/components/home/HeroSection";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { FeaturedTools } from "@/components/home/FeaturedTools";
import { SEOHead } from "@/components/seo/SEOHead";

const Index = () => {
  return (
    <div className="flex min-h-screen flex-col">
      <SEOHead
        title="ToolScope - Khám phá & Review công cụ tốt nhất"
        description="Nền tảng tổng hợp & review công cụ hàng đầu. Tìm tool phù hợp nhất cho bạn với AI."
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "ToolScope",
          url: window.location.origin,
          potentialAction: { "@type": "SearchAction", target: `${window.location.origin}/tools?q={search_term_string}`, "query-input": "required name=search_term_string" },
        }}
      />
      <Header />
      <main className="flex-1 pb-20 md:pb-0">
        <HeroSection />
        <CategoryGrid />
        <FeaturedTools />
      </main>
      <Footer />
      <MobileBottomNav />
    </div>
  );
};

export default Index;
