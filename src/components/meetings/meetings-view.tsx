"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardListSkeleton } from "@/components/ui/skeleton";
import { SoftReveal } from "@/components/ui/soft-reveal";
import { useSession } from "@/components/session/session-provider";

type Meeting = {
  id: string;
  title: string;
  agenda: string | null;
  meetingUrl: string | null;
  startsAt: string;
  audience: string;
  inviteCount: number;
  myRsvp: string | null;
  createdByName: string;
  recipients: { memberId: string; name: string; rsvp: string | null }[];
};

type Student = { memberId: string; name: string; email: string };

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MeetingsView() {
  const { role } = useSession();
  const isDirector = role === "director";

  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [title, setTitle] = useState("");
  const [agenda, setAgenda] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [audience, setAudience] = useState<"ALL" | "SELECTED">("ALL");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  async function load() {
    try {
      const reqs: Promise<Response>[] = [fetch("/api/meetings")];
      if (isDirector) reqs.push(fetch("/api/demo/members"));
      const [mRes, memRes] = await Promise.all(reqs);
      const mData = await mRes.json();
      if (!mRes.ok || !mData.ok) throw new Error(mData.error ?? "Load failed");
      setMeetings(mData.meetings);
      if (memRes) {
        const mem = await memRes.json();
        if (mem.ok) setStudents(mem.students);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load meetings");
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    setReady(false);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDirector]);

  const upcoming = useMemo(
    () =>
      [...meetings].sort(
        (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
      ),
    [meetings],
  );

  function toggleStudent(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          agenda,
          meetingUrl,
          startsAt: new Date(startsAt).toISOString(),
          audience,
          memberIds: audience === "SELECTED" ? [...selected] : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Create failed");
      setTitle("");
      setAgenda("");
      setMeetingUrl("");
      setStartsAt("");
      setAudience("ALL");
      setSelected(new Set());
      setToast(`Sent to ${data.sent} student${data.sent === 1 ? "" : "s"}`);
      window.setTimeout(() => setToast(null), 2800);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  async function setRsvp(meetingId: string, rsvp: "YES" | "NO" | "MAYBE") {
    setMeetings((prev) =>
      prev.map((m) => (m.id === meetingId ? { ...m, myRsvp: rsvp } : m)),
    );
    try {
      const res = await fetch(`/api/meetings/${meetingId}/rsvp`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvp }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "RSVP failed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "RSVP failed");
      await load();
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-lc-muted">Meetings</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
            {isDirector ? "Lab meetings" : "Your meetings"}
          </h1>
          <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
            {isDirector
              ? "Create a meeting with agenda + link, then send to everyone or selected students in one click."
              : "See invites from your director, join the call, and RSVP."}
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
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">Title</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Week 4 progress sync"
                className="lc-input w-full"
              />
            </label>
            <label className="block sm:col-span-2">
              <span className="mb-1.5 block text-sm font-medium">Agenda</span>
              <textarea
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
                rows={3}
                placeholder="1) Demos  2) Blockers  3) Next milestone"
                className="lc-input w-full resize-y"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">
                Meeting link
              </span>
              <input
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
                placeholder="https://meet.google.com/…"
                className="lc-input w-full"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Starts at</span>
              <input
                required
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
                className="lc-input w-full"
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={audience === "ALL" ? "primary" : "secondary"}
              onClick={() => setAudience("ALL")}
            >
              Send to all students
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
              {students.length === 0 ? (
                <p className="px-2 py-3 text-sm text-lc-muted">
                  No students yet — invite them from Team.
                </p>
              ) : (
                students.map((s) => (
                  <label
                    key={s.memberId}
                    className="flex cursor-pointer items-center gap-3 rounded-[8px] px-2 py-2 hover:bg-black/[0.03]"
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(s.memberId)}
                      onChange={() => toggleStudent(s.memberId)}
                    />
                    <span className="text-sm font-medium">{s.name}</span>
                    <span className="text-xs text-lc-muted">{s.email}</span>
                  </label>
                ))
              )}
            </div>
          ) : null}

          <Button type="submit" disabled={busy} variant="accent">
            {busy ? "Sending…" : "Create & send"}
          </Button>
        </form>
      ) : null}

      <SoftReveal ready={ready} skeleton={<CardListSkeleton count={3} />}>
      <div className="space-y-3">
        {upcoming.length === 0 ? (
          <p className="rounded-[14px] border border-dashed border-[var(--lc-line-strong)] px-5 py-10 text-center text-sm text-lc-muted">
            {isDirector
              ? "No meetings yet. Create one above."
              : "No meeting invites yet."}
          </p>
        ) : (
          upcoming.map((m) => {
            const yes = m.recipients.filter((r) => r.rsvp === "YES").length;
            const no = m.recipients.filter((r) => r.rsvp === "NO").length;
            const maybe = m.recipients.filter((r) => r.rsvp === "MAYBE").length;
            const pending = m.recipients.filter((r) => !r.rsvp).length;
            return (
            <article
              key={m.id}
              className="rounded-[14px] border border-[var(--lc-line)] bg-lc-surface p-5 transition-shadow duration-200 hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold tracking-tight">
                    {m.title}
                  </h2>
                  <p className="mt-1 text-sm text-lc-muted">
                    {formatWhen(m.startsAt)}
                    {isDirector
                      ? ` · ${m.inviteCount} invited`
                      : ` · from ${m.createdByName}`}
                  </p>
                  {m.agenda ? (
                    <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-lc-ink">
                      {m.agenda}
                    </p>
                  ) : null}
                  {m.meetingUrl ? (
                    <a
                      href={m.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-flex text-sm font-medium text-lc-accent hover:underline"
                    >
                      Join meeting →
                    </a>
                  ) : null}
                  {isDirector && m.recipients.length > 0 ? (
                    <div className="mt-3 space-y-1.5">
                      <p className="text-xs font-medium text-lc-muted">
                        RSVPs · {yes} going · {maybe} maybe · {no} can&apos;t ·{" "}
                        {pending} no response
                      </p>
                      <ul className="max-h-28 space-y-0.5 overflow-y-auto text-xs text-lc-muted">
                        {m.recipients.map((r) => (
                          <li key={r.memberId}>
                            {r.name} —{" "}
                            {r.rsvp === "YES"
                              ? "Going"
                              : r.rsvp === "NO"
                                ? "Can't"
                                : r.rsvp === "MAYBE"
                                  ? "Maybe"
                                  : "No response"}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>

                {!isDirector ? (
                  <div className="flex shrink-0 gap-1.5">
                    {(["YES", "NO", "MAYBE"] as const).map((r) => (
                      <Button
                        key={r}
                        size="sm"
                        variant={m.myRsvp === r ? "accent" : "secondary"}
                        onClick={() => void setRsvp(m.id, r)}
                      >
                        {r === "YES" ? "Going" : r === "NO" ? "Can't" : "Maybe"}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(`Cancel meeting “${m.title}”?`)) return;
                      void (async () => {
                        setBusy(true);
                        try {
                          const res = await fetch(`/api/meetings/${m.id}`, {
                            method: "DELETE",
                          });
                          const data = await res.json();
                          if (!res.ok || !data.ok) {
                            throw new Error(data.error ?? "Cancel failed");
                          }
                          setToast("Meeting cancelled");
                          window.setTimeout(() => setToast(null), 2000);
                          await load();
                        } catch (err) {
                          setError(
                            err instanceof Error ? err.message : "Cancel failed",
                          );
                        } finally {
                          setBusy(false);
                        }
                      })();
                    }}
                  >
                    Cancel
                  </Button>
                )}
              </div>
            </article>
            );
          })
        )}
      </div>
      </SoftReveal>
    </div>
  );
}
