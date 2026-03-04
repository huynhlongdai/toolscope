import { Link } from "react-router-dom";
import { 
  Brain, Palette, Code, Megaphone, LineChart, 
  Layout, Video, Shield, Blocks, Zap 
} from "lucide-react";

const categories = [
  { name: "AI & Machine Learning", slug: "ai", icon: Brain, color: "bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" },
  { name: "Design & Creative", slug: "design", icon: Palette, color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" },
  { name: "Development", slug: "development", icon: Code, color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
  { name: "Marketing", slug: "marketing", icon: Megaphone, color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400" },
  { name: "Analytics", slug: "analytics", icon: LineChart, color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
  { name: "No-Code", slug: "no-code", icon: Layout, color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" },
  { name: "Video & Media", slug: "video", icon: Video, color: "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400" },
  { name: "Security", slug: "security", icon: Shield, color: "bg-slate-100 text-slate-600 dark:bg-slate-900/30 dark:text-slate-400" },
  { name: "Productivity", slug: "productivity", icon: Blocks, color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
  { name: "Automation", slug: "automation", icon: Zap, color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400" },
];

export function CategoryGrid() {
  return (
    <section className="py-16">
      <div className="container">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold" style={{ fontFamily: "'Space Grotesk', sans-serif" }}>
              Danh mục công cụ
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">Khám phá theo lĩnh vực bạn quan tâm</p>
          </div>
          <Link to="/categories" className="text-sm font-medium text-primary hover:underline">
            Xem tất cả →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {categories.map((cat) => {
            const Icon = cat.icon;
            return (
              <Link
                key={cat.slug}
                to={`/category/${cat.slug}`}
                className="group flex flex-col items-center gap-3 rounded-xl border border-border/50 bg-card p-5 text-center transition-all hover:border-primary/20 hover:shadow-md"
              >
                <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${cat.color} transition-transform group-hover:scale-110`}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className="text-xs font-medium leading-tight">{cat.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
