import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface DynamicLogoProps {
  className?: string;
  /** Mantido por compatibilidade: o logo é sempre o da WorkSafe. */
  fallbackToDefault?: boolean;
  width?: number;
  height?: number;
  forceWhite?: boolean; // Para forçar branco em fundos escuros
}

/** Logo fixo da WorkSafe (o sistema não é multiempresa): aparece na hora, sem esperar o tema. */
const LOGO_SRC = "/worksafe-logo.webp";

const DynamicLogo: React.FC<DynamicLogoProps> = ({ className, width = 200, height = 70, forceWhite = false }) => {
  const [isDarkMode, setIsDarkMode] = useState(
    () => typeof document !== "undefined" && document.documentElement.classList.contains("dark"),
  );

  useEffect(() => {
    const check = () => setIsDarkMode(document.documentElement.classList.contains("dark"));
    check();
    const observer = new MutationObserver(check);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  const light = forceWhite || isDarkMode;

  return (
    <div className={cn("relative", className)} style={{ width: `${width}px`, height: `${height}px` }}>
      <img
        src={LOGO_SRC}
        alt="WorkSafe Brasil"
        className="h-full w-full object-contain"
        style={{ filter: light ? "invert(0.9) hue-rotate(180deg) brightness(1.1)" : "none", opacity: light ? 0.95 : 1 }}
      />
    </div>
  );
};

export default DynamicLogo;
