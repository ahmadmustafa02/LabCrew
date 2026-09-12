import type { Metadata } from "next";
import { CatalogDetail } from "@/components/catalog/catalog-detail";

export const metadata: Metadata = { title: "Catalog record" };

export default async function CatalogRecordPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <CatalogDetail id={id} />;
}
