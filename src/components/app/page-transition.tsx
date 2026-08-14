"use client";

/**
 * Soft crossfade without remounting via pathname key —
 * remounting was wiping client state and causing empty→data flashes.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="lc-page-stable">{children}</div>;
}
