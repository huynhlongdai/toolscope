import { Search, X, LayoutGrid, List, Star, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PRICING_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "free", label: "Miễn phí" },
  { value: "freemium", label: "Freemium" },
  { value: "paid", label: "Trả phí" },
  { value: "open_source", label: "Open Source" },
] as const;

const SORT_OPTIONS = [
  { value: "rating", label: "Đánh giá cao" },
  { value: "ai_score", label: "AI Score" },
  { value: "newest", label: "Mới nhất" },
  { value: "az", label: "A → Z" },
] as const;

const TRIAL_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "has_trial", label: "✅ Có dùng thử" },
  { value: "no_card", label: "💳 Không cần thẻ" },
  { value: "free_signup", label: "🆓 Đăng ký miễn phí" },
] as const;

export type SortOption = typeof SORT_OPTIONS[number]["value"];
export type PricingFilter = typeof PRICING_OPTIONS[number]["value"];
export type ViewMode = "grid" | "list";

interface CategoryFiltersProps {
  search: string;
  onSearchChange: (v: string) => void;
  pricingFilter: PricingFilter;
  onPricingChange: (v: PricingFilter) => void;
  trialFilter: string;
  onTrialChange: (v: string) => void;
  highRatingOnly: boolean;
  onHighRatingChange: (v: boolean) => void;
  sortBy: SortOption;
  onSortChange: (v: SortOption) => void;
  viewMode: ViewMode;
  onViewModeChange: (v: ViewMode) => void;
  filteredCount: number;
  totalCount: number;
  pricingCounts: Record<string, number>;
  onClearAll: () => void;
  hasActiveFilters: boolean;
}

export function CategoryFilters({
  search, onSearchChange,
  pricingFilter, onPricingChange,
  trialFilter, onTrialChange,
  highRatingOnly, onHighRatingChange,
  sortBy, onSortChange,
  viewMode, onViewModeChange,
  filteredCount, totalCount,
  pricingCounts,
  onClearAll, hasActiveFilters,
}: CategoryFiltersProps) {
  return (
    <div className="sticky top-16 z-20 -mx-4 mb-6 border-b bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      {/* Row 1: Search + Sort + View */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Tìm kiếm tool..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9"
          />
          {search && (
            <button onClick={() => onSearchChange("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={pricingFilter} onValueChange={(v) => onPricingChange(v as PricingFilter)}>
          <SelectTrigger className="w-auto min-w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRICING_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label} {opt.value !== "all" && pricingCounts[opt.value] != null ? `(${pricingCounts[opt.value]})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={trialFilter} onValueChange={onTrialChange}>
          <SelectTrigger className="w-auto min-w-[160px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TRIAL_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => onSortChange(v as SortOption)}>
          <SelectTrigger className="w-auto min-w-[150px] h-9">
            <SlidersHorizontal className="mr-2 h-3.5 w-3.5" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center rounded-lg border bg-muted/50 p-0.5">
          <button
            onClick={() => onViewModeChange("grid")}
            className={cn("rounded-md p-1.5 transition-colors", viewMode === "grid" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            aria-label="Grid view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            onClick={() => onViewModeChange("list")}
            className={cn("rounded-md p-1.5 transition-colors", viewMode === "list" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground")}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Checkboxes + active filters */}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <Checkbox checked={highRatingOnly} onCheckedChange={(c) => onHighRatingChange(!!c)} />
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span className="text-muted-foreground">Rating ≥ 4</span>
        </label>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {filteredCount}/{totalCount} tool
          </span>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onClearAll} className="h-7 text-xs">
              <X className="mr-1 h-3 w-3" /> Xóa bộ lọc
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
