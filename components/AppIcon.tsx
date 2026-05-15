import Image from "next/image";

/** Versão 256px (pré-redimensionada com Lanczos) — mais nítida e leve que o PNG 1024px */
const ICON_SRC = "/icon/icon-256.png";
const SOURCE_PX = 256;
/** Fator para ecrãs retina (2×/3×) sem pedir o PNG completo em cada vista */
const RETINA_FACTOR = 3;

type AppIconProps = {
  /** Largura/altura visíveis em CSS (px) */
  size?: number;
  className?: string;
  priority?: boolean;
};

export function AppIcon({ size = 48, className = "", priority = false }: AppIconProps) {
  const displayPx = Math.max(32, Math.round(size));
  const intrinsicPx = Math.min(SOURCE_PX, displayPx * RETINA_FACTOR);

  return (
    <Image
      src={ICON_SRC}
      alt="Rome"
      width={intrinsicPx}
      height={intrinsicPx}
      quality={100}
      sizes={`${displayPx}px`}
      priority={priority}
      className={`max-w-none shrink-0 object-contain ${className}`.trim()}
      style={{ width: displayPx, height: displayPx }}
    />
  );
}
