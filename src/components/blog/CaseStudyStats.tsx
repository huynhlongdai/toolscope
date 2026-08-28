import { Clock, TrendingUp, DollarSign, Users, Zap, Target, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CaseStudyStat {
  label: string;
  value: string;
  icon?: string | null; // "clock" | "trending" | "dollar" | "users" | "zap" | "target"
}

interface CaseStudyStatsProps {
  stats: CaseStudyStat[];
  className?: string;
}

const ICON_MAP: Record<string, LucideIcon> = {
  clock: Clock,
  trending: TrendingUp,
  dollar: DollarSign,
  users: Users,
  zap: Zap,
  target: Target,
};

/**
 * Stat bar for case-study articles — 3 (or more) headline metrics shown
 * up top ("12h/week saved", "3.5x ROI"...) to hook readers with proof
 * before the narrative. Uses the dark hero surface per Mockup 6.
 */
export function CaseStudyStats({ stats, className }: CaseStudyStatsProps) {
  if (!stats || stats.length === 0) return null;

  return (
    <div
      className={cn(
        "hero-surface hero-grid-bg relative overflow-hidden rounded-2xl border border-hero-border",
        className
      )}
    >
      <div
        className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-hero-teal/20 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative grid grid-cols-2 divide-x divide-hero-border/60 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((stat, i) => {
          const Icon = (stat.icon && ICON_MAP[stat.icon]) || TrendingUp;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 px-3 py-6 text-center sm:py-8">
              <Icon className="h-5 w-5 text-hero-teal" />
              <span className="text-gradient-hero font-heading text-2xl font-bold sm:text-3xl">
                {stat.value}
              </span>
              <span className="text-xs text-hero-muted-foreground">{stat.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
