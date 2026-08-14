"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type Props = {
  ready: boolean;
  skeleton: React.ReactNode;
  children: React.ReactNode;
  className?: string;
};

/**
 * SaaS-style crossfade:
 * 1) Content mounts under the skeleton at opacity 0
 * 2) Next frame, skeleton fades out / content fades in
 * No hard unmount pop.
 */
export function SoftReveal({ ready, skeleton, children, className }: Props) {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (!ready) {
      setRevealed(false);
      return;
    }
    let cancelled = false;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        if (!cancelled) setRevealed(true);
      });
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(id);
    };
  }, [ready]);

  const show = ready && revealed;

  return (
    <div className={cn("grid", className)} aria-busy={!ready}>
      <div
        className={cn(
          "col-start-1 row-start-1 transition-opacity duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          show ? "pointer-events-none opacity-0" : "opacity-100",
        )}
        aria-hidden={show}
      >
        {skeleton}
      </div>
      <div
        className={cn(
          "col-start-1 row-start-1 transition-opacity duration-[380ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
          show ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        aria-hidden={!show}
      >
        {ready ? (
          children
        ) : (
          <div className="invisible" aria-hidden>
            {skeleton}
          </div>
        )}
      </div>
    </div>
  );
}
