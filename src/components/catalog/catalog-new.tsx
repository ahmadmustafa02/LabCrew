"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const SAMPLE = `CREMA-D: Crowd-sourced Emotional Multimodal Actors Dataset
We collected 7,442 audiovisual clips of actors portraying emotions.
Clips were rated by humans using categorical emotion labels.
The dataset is released under a CC-BY-4.0 licence for research reuse.`;

export function CatalogNew() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(fromFile?: File) {
    setBusy(true);
    setError(null);
    try {
      let filename: string | undefined;
      if (fromFile) {
        const form = new FormData();
        form.set("file", fromFile);
        const up = await fetch("/api/files/upload", { method: "POST", body: form });
        const upData = await up.json();
        if (!up.ok || !upData.ok) throw new Error(upData.error ?? "Upload failed");
        const url = String(upData.file?.url ?? "");
        filename = url.split("/").pop();
      }
      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: fromFile ? undefined : text,
          filename,
          sourceName: fromFile?.name,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Extract failed");
      router.push(`/app/catalog/${data.record.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <p className="text-[11px] font-medium uppercase tracking-wide text-lc-muted">Catalog</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">Add from a paper</h1>
        <p className="mt-2 text-sm leading-relaxed text-lc-muted">
          Paste the relevant paragraphs or upload a PDF. We fill a form, then a verifier
          keeps any field whose cited sentence is missing or does not support the value.
          ChatGPT would just guess. Held fields wait for you.
        </p>
      </header>

      <label className="block text-sm font-medium">
        Paper excerpt
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={10}
          className="mt-2 w-full rounded-[12px] border border-[var(--lc-line)] bg-lc-surface px-3 py-3 text-sm leading-relaxed"
          placeholder="Paste methods / dataset paragraphs…"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        <Button disabled={busy || text.trim().length < 40} onClick={() => void submit()}>
          {busy ? "Checking…" : "Extract and verify"}
        </Button>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => setText(SAMPLE)}
        >
          Load sample paragraph
        </Button>
        <label className="inline-flex cursor-pointer items-center rounded-[10px] border border-[var(--lc-line)] px-3 py-2 text-sm">
          Upload PDF
          <input
            type="file"
            accept="application/pdf,.pdf,.txt"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void submit(file);
            }}
          />
        </label>
      </div>
      {error ? <p className="text-sm text-lc-danger">{error}</p> : null}
    </div>
  );
}
