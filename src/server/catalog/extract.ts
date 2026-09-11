import { chatJson, llmConfigured } from "@/server/llm/client";
import { catalogSchema, type CatalogFieldKey } from "./schema";
import { verifyAll, type DraftField, type VerifiedField } from "./verify";

type LlmField = {
  key?: string;
  value?: string;
  quote?: string;
  page?: number;
};

const sentenceAround = (source: string, match: RegExp): { value: string; quote: string } | null => {
  const found = source.match(match);
  if (!found?.[0]) return null;
  const idx = source.toLowerCase().indexOf(found[0].toLowerCase());
  if (idx < 0) return null;
  const start = source.lastIndexOf(".", idx);
  const end = source.indexOf(".", idx + found[0].length);
  const quote = source.slice(start < 0 ? 0 : start + 1, end < 0 ? source.length : end + 1).trim();
  return { value: found[1] ?? found[0], quote };
};

/** Deterministic first pass — works with no API key. */
export function heuristicExtract(source: string): DraftField[] {
  const specs = catalogSchema();
  const byKey = new Map<CatalogFieldKey, DraftField>();

  const titleLine = source.split("\n").map((l) => l.trim()).find((l) => l.length > 8 && l.length < 140);
  if (titleLine) {
    byKey.set("title", {
      key: "title",
      label: "Dataset name",
      value: titleLine.replace(/^title:\s*/i, ""),
      quote: titleLine,
    });
  }

  const count = sentenceAround(
    source,
    /(\d{1,3}(?:,\d{3})+|\d{3,6})\s+(?:audio|video|audiovisual|clips?|instances?|samples?|recordings?)/i,
  );
  if (count) {
    byKey.set("instanceCount", {
      key: "instanceCount",
      label: "How many items",
      value: (count.value.match(/[\d,]+/)?.[0] ?? count.value).replace(/,/g, ""),
      quote: count.quote,
    });
  }

  const modalityHit = sentenceAround(source, /\b(audio-?visual|audiovisual|audio|video|text)\b/i);
  if (modalityHit) {
    const raw = modalityHit.value.toLowerCase();
    const modality = raw.includes("audio") && raw.includes("visual")
      ? "audiovisual"
      : raw.includes("audio")
        ? "audio"
        : raw.includes("video")
          ? "video"
          : "text";
    byKey.set("modality", {
      key: "modality",
      label: "Modality",
      value: modality,
      quote: modalityHit.quote,
    });
  }

  const human = sentenceAround(source, /human[- ]?(?:rat(?:ed|ings?|ers?)|annotat(?:ed|ors?|ion))/i);
  if (human) {
    byKey.set("humanRated", {
      key: "humanRated",
      label: "Human ratings",
      value: "yes",
      quote: human.quote,
    });
  }

  const licence = sentenceAround(source, /\b(CC-BY(?:-[\d.]+)?|CC0|MIT|Apache-2\.0|proprietary)\b/i);
  if (licence) {
    byKey.set("licence", {
      key: "licence",
      label: "Licence",
      value: licence.value,
      quote: licence.quote,
    });
  }

  const annotation = sentenceAround(source, /\b(categorical|dimensional|valence|arousal|transcript)\b/i);
  if (annotation) {
    byKey.set("annotation", {
      key: "annotation",
      label: "Annotation",
      value: annotation.value,
      quote: annotation.quote,
    });
  }

  return specs.map((spec) => {
    const hit = byKey.get(spec.key);
    return (
      hit ?? {
        key: spec.key,
        label: spec.label,
        value: "",
        quote: "",
      }
    );
  });
}

export async function extractCatalogFields(source: string): Promise<{
  fields: VerifiedField[];
  via: "llm+verify" | "heuristic+verify";
}> {
  const heuristic = heuristicExtract(source);

  if (!llmConfigured()) {
    return { fields: verifyAll(heuristic, source), via: "heuristic+verify" };
  }

  const llm = await chatJson<{ fields?: LlmField[] }>({
    system:
      "Extract dataset metadata. Only use facts in the paper text. Each field needs a verbatim quote from the text. If unknown, value empty and quote empty. JSON: {fields:[{key,value,quote,page}]} keys: title,modality,instanceCount,humanRated,licence,annotation",
    user: source.slice(0, 12_000),
    temperature: 0.1,
  });

  if (!llm.ok || !Array.isArray(llm.data.fields)) {
    return { fields: verifyAll(heuristic, source), via: "heuristic+verify" };
  }

  const specs = catalogSchema();
  const merged = specs.map((spec) => {
    const fromLlm = llm.data.fields?.find((f) => f.key === spec.key);
    const fromH = heuristic.find((f) => f.key === spec.key);
    return {
      key: spec.key,
      label: spec.label,
      value: (fromLlm?.value ?? fromH?.value ?? "").trim(),
      quote: (fromLlm?.quote ?? fromH?.quote ?? "").trim(),
      page: fromLlm?.page ?? null,
    };
  });

  return { fields: verifyAll(merged, source), via: "llm+verify" };
}
