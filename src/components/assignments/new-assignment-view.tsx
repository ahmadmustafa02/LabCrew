"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AssignmentFormFields, type StudentOpt } from "@/components/assignments/assignment-form-fields";
import { Button } from "@/components/ui/button";
import {
  DEFAULT_ASSIGNMENT_FORM,
  formToPayload,
  type AssignmentFormState,
} from "@/lib/assignment-form";

export function NewAssignmentView() {
  const router = useRouter();
  const [form, setForm] = useState<AssignmentFormState>(DEFAULT_ASSIGNMENT_FORM);
  const [students, setStudents] = useState<StudentOpt[]>([]);
  const [busy, setBusy] = useState(false);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/demo/members");
      const data = await res.json();
      if (data.ok) setStudents(data.students ?? []);
    })();
  }, []);

  async function onUpload(file: File | null) {
    if (!file) return;
    setUploadBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.set("file", file);
      body.set("title", file.name);
      const res = await fetch("/api/files/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Upload failed");
      setForm((prev) => ({ ...prev, materials: [...prev.materials, data.material] }));
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
      const payload = formToPayload(form);
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, status: "ACTIVE" }),
      });
      const data = await res.json();
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
          One task by hand. To draft a whole term from a sentence, use{" "}
          <Link href="/app/research/new" className="text-lc-ink underline-offset-2 hover:underline">
            Plan from a topic
          </Link>
          .
        </p>
      </div>

      <AssignmentFormFields
        value={form}
        onChange={setForm}
        students={students}
        uploadBusy={uploadBusy}
        onUpload={onUpload}
      />

      {error ? <p className="text-sm text-lc-danger">{error}</p> : null}

      <div className="flex gap-2">
        <Link href="/app/assignments">
          <Button variant="secondary">Cancel</Button>
        </Link>
        <Button
          variant="primary"
          disabled={busy || form.title.trim().length < 3}
          onClick={() => void onCreate()}
        >
          {busy ? "Creating…" : "Create assignment"}
        </Button>
      </div>
    </div>
  );
}
