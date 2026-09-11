import type { Metadata } from "next";
import { CatalogNew } from "@/components/catalog/catalog-new";

export const metadata: Metadata = { title: "Add from paper" };

export default function CatalogNewPage() {
  return <CatalogNew />;
}
