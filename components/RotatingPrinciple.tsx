"use client";

import { PRINCIPLES, PRINCIPLE_INTERVAL_MS, formatPrinciple, principleIndex } from "@/lib/principles";
import { useEffect, useState } from "react";

export function RotatingPrinciple() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const started = Date.now();
    const timer = window.setInterval(() => {
      setIndex(principleIndex(Date.now() - started));
    }, PRINCIPLE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <p className="mt-2 text-sm leading-relaxed text-neutral-500" aria-live="polite">
      {formatPrinciple(PRINCIPLES[index] ?? PRINCIPLES[0])}
    </p>
  );
}
