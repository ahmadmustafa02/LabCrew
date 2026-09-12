export type CatalogFieldKey =
  | "title"
  | "modality"
  | "instanceCount"
  | "humanRated"
  | "licence"
  | "annotation";

export type CatalogFieldSpec = {
  key: CatalogFieldKey;
  label: string;
};

/** First schema: D4ED-shaped dataset metadata (Livingstone). */
export const D4ED_FIELDS: readonly CatalogFieldSpec[] = [
  { key: "title", label: "Dataset name" },
  { key: "modality", label: "Modality" },
  { key: "instanceCount", label: "How many items" },
  { key: "humanRated", label: "Human ratings" },
  { key: "licence", label: "Licence" },
  { key: "annotation", label: "Annotation" },
] as const;

export const catalogSchema = (id = "d4ed") =>
  id === "d4ed" ? D4ED_FIELDS : D4ED_FIELDS;
