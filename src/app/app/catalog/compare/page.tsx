import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogCompare } from "@/components/catalog/catalog-compare";

export const metadata: Metadata = { title: "Compare datasets" };

export default function CatalogComparePage() {
  return (
    <Suspense fallback={<p className="text-sm text-lc-muted">Loading…</p>}>
      <CatalogCompare />
    </Suspense>
  );
}
