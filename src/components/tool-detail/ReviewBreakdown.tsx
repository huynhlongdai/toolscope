import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Star } from "lucide-react";

interface Review {
  ease_of_use?: number | null;
  customer_support?: number | null;
  value_for_money?: number | null;
  likelihood_to_recommend?: number | null;
}

interface Props {
  reviews: Review[];
}

function avg(values: (number | null | undefined)[]): number {
  const valid = values.filter((v): v is number => v != null && v > 0);
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function RatingBar({ label, value, max = 5 }: { label: string; value: number; max?: number }) {
  if (value === 0) return null;
  const pct = (value / max) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs w-24 shrink-0">{label}</span>
      <div className="h-2 flex-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-medium w-8 text-right">{value.toFixed(1)}</span>
    </div>
  );
}

export function ReviewBreakdown({ reviews }: Props) {
  const structured = reviews.filter((r) => r.ease_of_use || r.customer_support || r.value_for_money);
  if (structured.length === 0) return null;

  const easeAvg = avg(structured.map((r) => r.ease_of_use));
  const supportAvg = avg(structured.map((r) => r.customer_support));
  const valueAvg = avg(structured.map((r) => r.value_for_money));
  const npsAvg = avg(structured.map((r) => r.likelihood_to_recommend));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Star className="h-4 w-4 text-amber-400" /> Đánh giá theo tiêu chí
          <span className="text-xs text-muted-foreground font-normal">({structured.length} reviews)</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <RatingBar label="Dễ sử dụng" value={easeAvg} />
        <RatingBar label="Hỗ trợ KH" value={supportAvg} />
        <RatingBar label="Giá trị" value={valueAvg} />
        {npsAvg > 0 && <RatingBar label="NPS" value={npsAvg} max={10} />}
      </CardContent>
    </Card>
  );
}
