import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LaunchCountdownProps {
  targetDate: string;
  className?: string;
  compact?: boolean;
}

export function LaunchCountdown({ targetDate, className, compact }: LaunchCountdownProps) {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft(targetDate));

  useEffect(() => {
    const timer = setInterval(() => {
      const t = getTimeLeft(targetDate);
      setTimeLeft(t);
      if (t.total <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (timeLeft.total <= 0) return null;

  if (compact) {
    return (
      <span className={cn("text-xs font-mono text-primary", className)}>
        {timeLeft.days > 0 && `${timeLeft.days}d `}{String(timeLeft.hours).padStart(2, "0")}:{String(timeLeft.minutes).padStart(2, "0")}:{String(timeLeft.seconds).padStart(2, "0")}
      </span>
    );
  }

  return (
    <div className={cn("flex gap-2", className)}>
      {[
        { value: timeLeft.days, label: "Ngày" },
        { value: timeLeft.hours, label: "Giờ" },
        { value: timeLeft.minutes, label: "Phút" },
        { value: timeLeft.seconds, label: "Giây" },
      ].map((item) => (
        <div key={item.label} className="flex flex-col items-center rounded-lg bg-primary/10 px-3 py-2 min-w-[3.5rem]">
          <span className="text-xl font-bold font-mono text-primary">{String(item.value).padStart(2, "0")}</span>
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function getTimeLeft(targetDate: string) {
  const total = new Date(targetDate).getTime() - Date.now();
  if (total <= 0) return { total: 0, days: 0, hours: 0, minutes: 0, seconds: 0 };
  return {
    total,
    days: Math.floor(total / (1000 * 60 * 60 * 24)),
    hours: Math.floor((total / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((total / (1000 * 60)) % 60),
    seconds: Math.floor((total / 1000) % 60),
  };
}
