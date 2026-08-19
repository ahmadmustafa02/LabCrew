"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { MaterialItem } from "@/lib/assignment-types";

const inputClass = "lc-input";

export function NewAssignmentView() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [description, setDescription] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [requireEvidenceUrl, setRequireEvidenceUrl] = useState(true);
  const [requireWriteup, setRequireWriteup] = useState(true);
  const [requireRepoUrl, setRequireRepoUrl] = useState(false);
  const [acceptData, setAcceptData] = useState(false);
  const [dataColumnsText, setDataColumnsText] = useState(
    "sample_id:text\nod600:number\nhours:number",
  );
  const [minWriteupLength, setMinWriteupLength] = useState(40);
  const [checklistText, setChecklistText] = useState(
    "Demo runs locally or is publicly reachable\nShort methods + results writeup",
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);

  function addLink() {
    if (!linkUrl.trim()) return;
    setMaterials((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: linkTitle.trim() || linkUrl.trim(),
        kind: "link",
        url: linkUrl.trim(),
      },
    ]);
    setLinkTitle("");
    setLinkUrl("");
  }

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploadBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.set("file", file);
      form.set("title", file.name);
      const res = await fetch("/api/files/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Upload failed");
      setMaterials((prev) => [...prev, data.material]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadBusy(false);
    }
  }

  async function onCreate() {
    setBusy(true);
    setError(null);
    try {
      const checklist = checklistText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      const dataSchema = acceptData
        ? {
            columns: dataColumnsText
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => {
                const [nameRaw, typeRaw] = line.split(":");
                const name = (nameRaw ?? "").trim();
                const type =
                  typeRaw?.trim().toLowerCase() === "number"
                    ? "number"
                    : typeRaw?.trim().toLowerCase() === "boolean"
                      ? "boolean"
                      : "text";
                return { name, type };
              })
              .filter((c) => c.name),
          }
        : null;
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          instructions,
          dueAt: dueAt || null,
          status: "ACTIVE",
          materials,
          dataSchema,
          rubric: {
            requireEvidenceUrl,
            requireWriteup,
            requireRepoUrl,
            minWriteupLength,
            checklist,
            acceptData,
          },
        }),
      });      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Create failed");
      router.push(`/app/assignments/${data.assignment.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link
          href="/app/assignments"
          className="text-sm text-lc-muted transition-colors duration-200 hover:text-lc-ink"
        >
          ← Assignments
        </Link>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
          Create a research task
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-lc-muted">
          Example: Week 1 read papers, Week 3 reproduce baseline, Week 4 working
          demo.
        </p>
      </div>

      <div className="space-y-5 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Title</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Week 4 - Working demo + short report"
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Short description</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ship a demo and document methods/results"
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">
            Instructions for students
          </span>
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={4}
            placeholder="Submit a public demo link and a short writeup covering methods and results."
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Due date</span>
          <input
            type="date"
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <div className="space-y-4 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <div>
          <h2 className="text-[15px] font-semibold text-lc-ink">Materials</h2>
          <p className="mt-1 text-sm text-lc-muted">
            PDFs, paper links, starter repos — what students should read or use.
          </p>
        </div>

        <div className="space-y-2">
          <input
            value={linkTitle}
            onChange={(e) => setLinkTitle(e.target.value)}
            placeholder="Label (optional)"
            className={inputClass}
          />
          <div className="flex items-center gap-2">
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://..."
              className={inputClass}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLink();
                }
              }}
            />
            <Button
              type="button"
              variant="secondary"
              size="xs"
              onClick={addLink}
              disabled={!linkUrl.trim()}
              className="px-3"
            >
              Add
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="inline-flex cursor-pointer items-center">
            <span className="rounded-[10px] border border-[var(--lc-line-strong)] bg-lc-bg px-3 py-2 text-[13px] font-medium text-lc-ink transition-colors hover:bg-[#f0f0f2]">
              {uploadBusy ? "Uploading…" : "Upload file"}
            </span>
            <input
              type="file"
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg,.txt,.md"
              disabled={uploadBusy}
              onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
            />
          </label>
          <span className="text-xs text-lc-muted">PDF, images, or notes</span>
        </div>

        {materials.length > 0 ? (
          <ul className="space-y-2 border-t border-[var(--lc-line)] pt-3">
            {materials.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between gap-3 rounded-[10px] bg-lc-bg px-3 py-2.5 text-sm"
              >
                <span className="min-w-0 truncate text-lc-ink">
                  {m.title}
                  <span className="ml-2 text-xs text-lc-muted">{m.kind}</span>
                </span>
                <button
                  type="button"
                  className="cursor-pointer text-xs font-medium text-lc-muted transition-colors hover:text-lc-danger"
                  onClick={() =>
                    setMaterials((prev) => prev.filter((x) => x.id !== m.id))
                  }
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="space-y-4 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <h2 className="text-[15px] font-semibold text-lc-ink">What “done” means</h2>
        <label className="flex items-center gap-2 text-sm text-lc-ink">
          <input
            type="checkbox"
            checked={requireEvidenceUrl}
            onChange={(e) => setRequireEvidenceUrl(e.target.checked)}
          />
          Require evidence / demo URL
        </label>
        <label className="flex items-center gap-2 text-sm text-lc-ink">
          <input
            type="checkbox"
            checked={requireRepoUrl}
            onChange={(e) => setRequireRepoUrl(e.target.checked)}
          />
          Require GitHub repo URL
        </label>
        <label className="flex items-center gap-2 text-sm text-lc-ink">
          <input
            type="checkbox"
            checked={requireWriteup}
            onChange={(e) => setRequireWriteup(e.target.checked)}
          />
          Require writeup / research notes
        </label>
        <label className="flex items-center gap-2 text-sm text-lc-ink">
          <input
            type="checkbox"
            checked={acceptData}
            onChange={(e) => setAcceptData(e.target.checked)}
          />
          Accept structured data (CSV / form rows)
        </label>
        {acceptData ? (
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-lc-muted">
              Data columns (one per line: name:type) — optional schema
            </span>
            <textarea
              value={dataColumnsText}
              onChange={(e) => setDataColumnsText(e.target.value)}
              rows={4}
              placeholder={"sample_id:text\nod600:number"}
              className={inputClass}
            />
            <span className="text-xs text-lc-muted">
              Types: text, number, boolean. Leave blank lines out. Students can
              still paste CSV matching these headers.
            </span>
          </label>
        ) : null}
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">
            Minimum writeup length
          </span>          <input
            type="number"
            min={10}
            value={minWriteupLength}
            onChange={(e) => setMinWriteupLength(Number(e.target.value) || 40)}
            className={`${inputClass} w-32`}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">
            Checklist (one per line)
          </span>
          <textarea
            value={checklistText}
            onChange={(e) => setChecklistText(e.target.value)}
            rows={3}
            className={inputClass}
          />
        </label>
      </div>

      {error ? <p className="text-sm text-lc-danger">{error}</p> : null}

      <div className="flex gap-2">
        <Link href="/app/assignments">
          <Button variant="secondary">Cancel</Button>
        </Link>
        <Button
          variant="primary"
          disabled={busy || title.trim().length < 3}
          onClick={() => void onCreate()}
        >
          {busy ? "Creating…" : "Create assignment"}
        </Button>
      </div>
    </div>
  );
}
