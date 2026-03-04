import { useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export function HeroSection() {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      navigate(`/tools?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute right-0 top-1/3 h-[300px] w-[400px] rounded-full bg-accent/5 blur-3xl" />
      </div>

      <div className="container text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          Tìm kiếm thông minh bằng AI
        </div>
        
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-tight md:text-6xl" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
          Khám phá công cụ{" "}
          <span className="text-primary">hoàn hảo</span>{" "}
          cho công việc của bạn
        </h1>
        
        <p className="mx-auto mt-5 max-w-xl text-lg text-muted-foreground">
          Tổng hợp, review và so sánh hàng ngàn công cụ. Được hỗ trợ bởi AI để giúp bạn chọn đúng tool.
        </p>

        <form onSubmit={handleSearch} className="mx-auto mt-8 flex max-w-xl items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Mô tả nhu cầu của bạn, VD: 'tool thiết kế miễn phí cho startup'..."
              className="h-12 pl-10 text-base rounded-xl border-border/60 bg-card shadow-sm"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 rounded-xl px-6">
            <Search className="h-4 w-4 mr-2" />
            Tìm kiếm
          </Button>
        </form>

        <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-sm text-muted-foreground">
          <span>Phổ biến:</span>
          {["AI Writing", "Design Tools", "Project Management", "No-Code", "Analytics"].map((tag) => (
            <button
              key={tag}
              onClick={() => navigate(`/tools?q=${encodeURIComponent(tag)}`)}
              className="rounded-full border border-border px-3 py-1 text-xs font-medium transition-colors hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
