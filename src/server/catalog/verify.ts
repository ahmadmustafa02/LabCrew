export type DraftField = {
  key: string;
  label: string;
  value: string;
  quote: string;
  page?: number | null;
};

export type VerifiedField = DraftField & {
  confidence: "high" | "medium" | "low";
  trust: "trusted" | "held";
  verifierNote: string;
};

const collapse = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

/** Quote must appear in the paper text. This is the part ChatGPT skips. */
export function quoteInSource(quote: string, source: string): boolean {
  const q = collapse(quote);
  if (q.length < 12) return false;
  return collapse(source).includes(q);
}

/** Value tokens (numbers / keywords) should show up in the cited sentence. */
export function valueSupportedByQuote(value: string, quote: string): boolean {
  const v = collapse(value);
  const q = collapse(quote);
  if (!v || v === "unknown" || v === "—") return false;
  const valueDigits = value.replace(/\D/g, "");
  const quoteDigits = quote.replace(/\D/g, "");
  if (valueDigits.length >= 3 && quoteDigits.includes(valueDigits)) return true;
  const tokens = v
    .split(/[^a-z0-9+.-]+/)
    .filter((t) => t.length >= 2 && t !== "yes" && t !== "no");
  if (tokens.length === 0) return q.includes(v);
  const hits = tokens.filter((t) => q.includes(t)).length;
  return hits / tokens.length >= 0.5;
}

export function verifyDraftField(field: DraftField, source: string): VerifiedField {
  if (!field.value.trim() || field.value.trim().toLowerCase() === "unknown") {
    return {
      ...field,
      value: "",
      confidence: "low",
      trust: "held",
      verifierNote: "No value claimed — held, not guessed.",
    };
  }
  if (!quoteInSource(field.quote, source)) {
    return {
      ...field,
      confidence: "low",
      trust: "held",
      verifierNote: "Cited sentence was not found in the paper. Held.",
    };
  }
  if (!valueSupportedByQuote(field.value, field.quote)) {
    return {
      ...field,
      confidence: "low",
      trust: "held",
      verifierNote: "The cited sentence does not support this value. Held.",
    };
  }
  return {
    ...field,
    confidence: "high",
    trust: "trusted",
    verifierNote: "Quote is in the paper and supports the value.",
  };
}

export function verifyAll(fields: readonly DraftField[], source: string) {
  return fields.map((f) => verifyDraftField(f, source));
}
