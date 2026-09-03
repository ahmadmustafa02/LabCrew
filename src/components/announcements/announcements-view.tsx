"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { SoftReveal } from "@/components/ui/soft-reveal";
import { useSession } from "@/components/session/session-provider";

type Announcement = {
  id: string;
  title: string;
  body: string;
  audience: string;
  createdAt: string;
  createdByName: string;
  recipientCount: number;
};

type Student = { memberId: string; name: string; email: string };

export function AnnouncementsView() {
  const { role } = useSession();
  const isDirector = role === "director";

  const [rows, setRows] = useState<Announcement[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<"ALL" | "SELECTED">("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() {
    try {
      const reqs: Promise<Response>[] = [fetch("/api/announcements")];
      if (isDirector) reqs.push(fetch("/api/demo/members"));
      const [aRes, memRes] = await Promise.all(reqs);
      const aData = await aRes.json();
      if (!aRes.ok || !aData.ok) throw new Error(aData.error ?? "Load failed");
      setRows(aData.announcements);
      if (memRes) {
        const mem = await memRes.json();
        if (mem.ok) setStudents(mem.students);
      }
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load announcements",
      );
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    setReady(false);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirector]);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          audience,
          memberIds: audience === "SELECTED" ? [...selected] : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Send failed");
      setTitle("");
      setBody("");
      setAudience("ALL");
      setSelected(new Set());
      setToast(`Sent to ${data.sent} student${data.sent === 1 ? "" : "s"}`);
      window.setTimeout(() => setToast(null), 2800);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-lc-muted">Announcements</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
            {isDirector ? "Broadcast to cohort" : "From your lab"}
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
            {isDirector
              ? "Deadline moves, reminders, and notes — send to all or selected students."
              : "Messages your director posted for the cohort."}
          </p>
          {error ? <p className="mt-2 text-sm text-lc-danger">{error}</p> : null}
        </div>
        {toast ? (
          <p className="rounded-[10px] bg-[var(--lc-success-soft)] px-3 py-2 text-sm text-lc-success">
            {toast}
          </p>
        ) : null}
      </div>

      {isDirector ? (
        <form
          onSubmit={onCreate}
          className="space-y-4 rounded-[14px] border border-[var(--lc-line)] bg-lc-surface p-5"
        >
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Title</span>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Week 4 deadline moved to Friday"
              className="lc-input w-full"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium">Message</span>
            <textarea
              required
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Please update your submission by Friday 5pm…"
              className="lc-input w-full resize-y"
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={audience === "ALL" ? "primary" : "secondary"}
              onClick={() => setAudience("ALL")}
            >
              Send to all
            </Button>
            <Button
              type="button"
              size="sm"
              variant={audience === "SELECTED" ? "primary" : "secondary"}
              onClick={() => setAudience("SELECTED")}
            >
              Send to selected
            </Button>
          </div>
          {audience === "SELECTED" ? (
            <div className="max-h-48 space-y-1 overflow-y-auto rounded-[10px] border border-[var(--lc-line)] p-2">
              {students.map((s) => (
                <label
                  key={s.memberId}
                  className="flex cursor-pointer items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-black/[0.03]"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(s.memberId)}
                    onChange={() => {
                      setSelected((prev) => {
                        const next = new Set(prev);
                        if (next.has(s.memberId)) next.delete(s.memberId);
                        else next.add(s.memberId);
                        return next;
                      });
                    }}
                  />
                  <span className="text-sm font-medium">{s.name}</span>
                </label>
              ))}
            </div>
          ) : null}
          <Button type="submit" disabled={busy} variant="accent">
            {busy ? "Sending…" : "Send announcement"}
          </Button>
        </form>
      ) : null}

      <SoftReveal ready={ready} skeleton={<CardListSkeleton count={3} />}>
        <div className="space-y-3">
          {rows.length === 0 ? (
            <p className="rounded-[14px] border border-dashed border-[var(--lc-line-strong)] px-5 py-10 text-center text-sm text-lc-muted">
              {isDirector ? "No announcements yet." : "No announcements yet."}
            </p>
          ) : (
            rows.map((a) => (
              <article
                key={a.id}
                className="rounded-[14px] border border-[var(--lc-line)] bg-lc-surface p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold tracking-tight">
                      {a.title}
                    </h2>
                    <p className="mt-1 text-sm text-lc-muted">
                      {new Date(a.createdAt).toLocaleString()} · {a.createdByName}
                      {isDirector ? ` · ${a.recipientCount} recipients` : ""}
                    </p>
                  </div>
                  {isDirector ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`Delete “${a.title}”?`)) return;
                        void (async () => {
                          setBusy(true);
                          try {
                            const res = await fetch(
                              `/api/announcements/${a.id}`,
                              { method: "DELETE" },
                            );
                            const data = await res.json();
                            if (!res.ok || !data.ok) {
                              throw new Error(data.error ?? "Delete failed");
                            }
                            setToast("Announcement deleted");
                            window.setTimeout(() => setToast(null), 2000);
                            await load();
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Delete failed",
                            );
                          } finally {
                            setBusy(false);
                          }
                        })();
                      }}
                    >
                      Delete
                    </Button>
                  ) : null}
                </div>
                <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed">
                  {a.body}
                </p>
              </article>
            ))
          )}
        </div>
      </SoftReveal>
    </div>
  );
}
