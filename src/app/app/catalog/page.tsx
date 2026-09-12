import type { Metadata } from "next";
import { CatalogList } from "@/components/catalog/catalog-list";

export const metadata: Metadata = { title: "Catalog" };

export default function CatalogPage() {
  return <CatalogList />;
}
