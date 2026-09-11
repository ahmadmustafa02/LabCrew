export async function textFromPdf(buffer: Buffer): Promise<string> {
  const pdfParse = (await import("pdf-parse")).default as (b: Buffer) => Promise<{ text?: string }>;
  const parsed = await pdfParse(buffer);
  return (parsed.text ?? "").replace(/\u0000/g, " ").trim();
}

export function looksLikePdf(buffer: Buffer) {
  return buffer.subarray(0, 5).toString("utf8") === "%PDF-";
}
