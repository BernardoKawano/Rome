import { AppIcon } from "@/components/AppIcon";
import type { ReactNode } from "react";

type BrandMarkProps = {
  iconSize?: number;
  title?: string;
  subtitle?: ReactNode;
  layout?: "vertical" | "horizontal";
  className?: string;
};

export function BrandMark({
  iconSize = 80,
  title = "Demandas",
  subtitle,
  layout = "vertical",
  className = "",
}: BrandMarkProps) {
  const isHorizontal = layout === "horizontal";

  return (
    <div
      className={`flex ${isHorizontal ? "flex-row items-center gap-4 text-left" : "flex-col items-center gap-3 text-center"} ${className}`.trim()}
    >
      <AppIcon size={iconSize} priority className={isHorizontal ? "shrink-0" : ""} />
      <div className={isHorizontal ? "min-w-0" : ""}>
        <h1 className="text-2xl font-medium tracking-tight text-neutral-950 sm:text-3xl">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-sm leading-relaxed text-neutral-500">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
