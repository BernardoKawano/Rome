import Image from "next/image";

const ICON_SRC = "/icon/icon.png";

type AppIconProps = {
  size?: number;
  className?: string;
  priority?: boolean;
};

export function AppIcon({ size = 48, className = "", priority = false }: AppIconProps) {
  return (
    <Image
      src={ICON_SRC}
      alt="Rome"
      width={size}
      height={size}
      priority={priority}
      className={`object-contain ${className}`.trim()}
    />
  );
}
