"use client";

import type { ImpactSummary } from "@/lib/impact";
import { formatNeedlePercent } from "@/lib/impact";

export function NeedleMeter({ summary }: { summary: ImpactSummary }) {
  const width = summary.percent == null ? 0 : Math.max(0, Math.min(100, Math.round(summary.percent * 100)));

  return (
    <div className="min-w-[220px]">
      <div className="flex items-baseline justify-between gap-3 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
        <span>Esta semana</span>
        <span className={summary.meetsTarget ? "text-neutral-900" : "text-neutral-500"}>
          {formatNeedlePercent(summary.percent)} · meta 80%
        </span>
      </div>
      <div className="mt-2 h-1.5 bg-neutral-200">
        <div className="h-full bg-neutral-900" style={{ width: `${width}%` }} />
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        {summary.needleHours} h no ponteiro · {summary.operationalHours} h operacionais
      </p>
    </div>
  );
}
