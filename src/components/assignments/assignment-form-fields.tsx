"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AssignmentFormState } from "@/lib/assignment-form";
import type { MaterialItem } from "@/lib/assignment-types";

const inputClass = "lc-input";

export type StudentOpt = { memberId: string; name: string; email: string };

type Props = {
  value: AssignmentFormState;
  onChange: (next: AssignmentFormState) => void;
  dueType?: "date" | "datetime";
  students: StudentOpt[];
  uploadBusy?: boolean;
  onUpload: (file: File | null) => void;
};

export function AssignmentFormFields({
  value: form,
  onChange,
  dueType = "date",
  students,
  uploadBusy,
  onUpload,
}: Props) {
  const [linkTitle, setLinkTitle] = useState("");
  const [linkUrl, setLinkUrl] = useState("");

  function patch(partial: Partial<AssignmentFormState>) {
    onChange({ ...form, ...partial });
  }

  function addLink() {
    if (!linkUrl.trim()) return;
    const item: MaterialItem = {
      id: crypto.randomUUID(),
      title: linkTitle.trim() || linkUrl.trim(),
      kind: "link",
      url: linkUrl.trim(),
    };
    patch({ materials: [...form.materials, item] });
    setLinkTitle("");
    setLinkUrl("");
  }

  return (
    <>
      <div className="space-y-5 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Title</span>
          <input
            value={form.title}
            onChange={(e) => patch({ title: e.target.value })}
            placeholder="Week 4 - Working demo + short report"
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Short description</span>
          <input
            value={form.description}
            onChange={(e) => patch({ description: e.target.value })}
            placeholder="Ship a demo and document methods/results"
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Instructions for students</span>
          <textarea
            value={form.instructions}
            onChange={(e) => patch({ instructions: e.target.value })}
            rows={4}
            className={inputClass}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Due date</span>
          <input
            type={dueType === "datetime" ? "datetime-local" : "date"}
            value={form.dueAt}
            onChange={(e) => patch({ dueAt: e.target.value })}
            className={inputClass}
          />
        </label>
      </div>

      <div className="space-y-4 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <div>
          <h2 className="text-[15px] font-semibold text-lc-ink">Assigned to</h2>
          <p className="mt-1 text-sm text-lc-muted">
            Everyone in the lab, or only the students you pick.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={form.audience === "ALL" ? "primary" : "secondary"}
            onClick={() => patch({ audience: "ALL" })}
          >
            Everyone
          </Button>
          <Button
            type="button"
            size="sm"
            variant={form.audience === "SELECTED" ? "primary" : "secondary"}
            onClick={() => patch({ audience: "SELECTED" })}
          >
            Specific students
          </Button>
        </div>
        {form.audience === "SELECTED" ? (
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-[10px] border border-[var(--lc-line)] p-2">
            {students.length === 0 ? (
              <p className="px-2 py-3 text-sm text-lc-muted">
                No students yet — invite them from Team.
              </p>
            ) : (
              students.map((s) => {
                const on = form.selectedMemberIds.includes(s.memberId);
                return (
                  <label
                    key={s.memberId}
                    className="flex cursor-pointer items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-black/[0.03]"
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={() => {
                        const next = on
                          ? form.selectedMemberIds.filter((id) => id !== s.memberId)
                          : [...form.selectedMemberIds, s.memberId];
                        patch({ selectedMemberIds: next });
                      }}
                    />
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-lc-muted">{s.email}</span>
                  </label>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      <div className="space-y-4 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <div>
          <h2 className="text-[15px] font-semibold text-lc-ink">Materials</h2>
          <p className="mt-1 text-sm text-lc-muted">
            PDFs, paper links, starter repos — what students should read or use.
          </p>
        </div>
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
              onChange={(e) => {
                void onUpload(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
          <span className="text-xs text-lc-muted">PDF, images, or notes</span>
        </div>
        {form.materials.length > 0 ? (
          <ul className="space-y-2 border-t border-[var(--lc-line)] pt-3">
            {form.materials.map((m) => (
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
                    patch({ materials: form.materials.filter((x) => x.id !== m.id) })
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
            checked={form.requireEvidenceUrl}
            onChange={(e) => patch({ requireEvidenceUrl: e.target.checked })}
          />
          Require evidence / demo URL
        </label>
        <label className="flex items-center gap-2 text-sm text-lc-ink">
          <input
            type="checkbox"
            checked={form.requireRepoUrl}
            onChange={(e) => patch({ requireRepoUrl: e.target.checked })}
          />
          Require GitHub repo URL
        </label>
        <label className="flex items-center gap-2 text-sm text-lc-ink">
          <input
            type="checkbox"
            checked={form.requireWriteup}
            onChange={(e) => patch({ requireWriteup: e.target.checked })}
          />
          Require writeup / research notes
        </label>
        <label className="flex items-center gap-2 text-sm text-lc-ink">
          <input
            type="checkbox"
            checked={form.acceptData}
            onChange={(e) => patch({ acceptData: e.target.checked })}
          />
          Accept structured data (CSV / form rows)
        </label>
        {form.acceptData ? (
          <>
            <label className="flex items-center gap-2 text-sm text-lc-ink">
              <input
                type="checkbox"
                checked={form.requireData}
                onChange={(e) => patch({ requireData: e.target.checked })}
              />
              Require structured data on submit
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-lc-muted">
                Data columns (one per line: name:type)
              </span>
              <textarea
                value={form.dataColumnsText}
                onChange={(e) => patch({ dataColumnsText: e.target.value })}
                rows={4}
                className={inputClass}
              />
            </label>
          </>
        ) : null}
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Minimum writeup length</span>
          <input
            type="number"
            min={10}
            value={form.minWriteupLength}
            onChange={(e) => patch({ minWriteupLength: Number(e.target.value) || 40 })}
            className={`${inputClass} w-32`}
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-lc-muted">Checklist (one per line)</span>
          <textarea
            value={form.checklistText}
            onChange={(e) => patch({ checklistText: e.target.value })}
            rows={3}
            className={inputClass}
          />
        </label>
      </div>
    </>
  );
}
