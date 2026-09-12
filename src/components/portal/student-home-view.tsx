"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { CardListSkeleton, PageHeaderSkeleton } from "@/components/ui/skeleton";
import { SoftReveal } from "@/components/ui/soft-reveal";

type Home = {
  meetings: {
    id: string;
    title: string;
    agenda: string | null;
    meetingUrl: string | null;
    startsAt: string;
    rsvp: string | null;
  }[];
  tasks: {
    id: string;
    title: string;
    status: string;
    dueAt: string | null;
    submitted: boolean;
  }[];
  notifications: {
    id: string;
    kind: string;
    title: string;
    body: string | null;
    href: string | null;
    readAt: string | null;
    createdAt: string;
  }[];
  unreadNotifications: number;
  directors: { name: string; role: string }[];
  coach?: {
    progress: {
      streak: number;
      submittedCount: number;
      milestoneCount: number;
      openCount: number;
      headline: string;
      detail: string;
    };
    nudge: {
      id: string;
      title: string;
      body: string;
      decidedAt: string | null;
    } | null;
  };
  nextStep?: {
    kind: string;
    title: string;
    reason: string;
    href: string;
    assignmentId?: string;
  };
};

function when(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function kindLabel(kind: string) {
  if (kind === "MESSAGE") return "Message";
  if (kind === "ANNOUNCEMENT") return "Announcement";
  if (kind === "REVIEW") return "Review";
  return kind;
}

export function StudentHomeView() {
  const [home, setHome] = useState<Home | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/portal/home");
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed");
        if (!cancelled) setHome(data.home);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load home");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function openInboxItem(n: Home["notifications"][number]) {
    // Mark as read so Inbox stays unseen-only. For chats, clear all message pings.
    void fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        n.kind === "MESSAGE" ? { kind: "MESSAGE" } : { ids: [n.id] },
      ),
    }).catch(() => undefined);
  }

  if (error) {
    return <p className="text-sm text-lc-danger">{error}</p>;
  }

  return (
    <SoftReveal
      ready={Boolean(home)}
      skeleton={
        <div className="space-y-8">
          <PageHeaderSkeleton />
          <CardListSkeleton count={4} />
        </div>
      }
    >
      {home ? (
        <div className="space-y-8">
          <div>
            <p className="text-sm text-lc-muted">Student portal</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
              Home
            </h1>
            <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
              Your pace, a note from Coach when your director approves one, and
              what&apos;s next in the lab.
            </p>
          </div>

          {home.nextStep ? (
            <section className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5">
              <p className="text-xs font-medium uppercase tracking-wide text-lc-muted">
                Do this next
              </p>
              <p className="mt-2 text-xl font-semibold tracking-tight">{home.nextStep.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-lc-muted">
                {home.nextStep.reason}
              </p>
              <div className="mt-4">
                <Link href={home.nextStep.href}>
                  <Button variant="accent" size="sm">
                    Open
                  </Button>
                </Link>
              </div>
            </section>
          ) : null}

          {home.coach ? (
            <section className="space-y-3">
              <div className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5">
                <p className="text-xs font-medium uppercase tracking-wide text-lc-muted">
                  Your pace
                </p>
                <p className="mt-2 text-xl font-semibold tracking-tight text-lc-ink">
                  {home.coach.progress.headline}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-lc-muted">
                  {home.coach.progress.detail}
                </p>
              </div>
              {home.coach.nudge ? (
                <article className="rounded-[16px] border border-[var(--lc-line)] bg-lc-surface px-5 py-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-lc-muted">
                    From Coach · director-approved
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-lc-ink">
                    {home.coach.nudge.body}
                  </p>
                  <div className="mt-4">
                    <Link href="/app/assignments">
                      <Button variant="accent" size="sm">
                        Open my tasks
                      </Button>
                    </Link>
                  </div>
                </article>
              ) : null}
            </section>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Link href="/app/messages">
              <Button variant="accent" size="sm">
                Message professor
              </Button>
            </Link>
            <Link href="/app/announcements">
              <Button variant="secondary" size="sm">
                Announcements
              </Button>
            </Link>
            <Link href="/app/meetings">
              <Button variant="secondary" size="sm">
                Meetings
              </Button>
            </Link>
            <Link href="/app/assignments">
              <Button variant="secondary" size="sm">
                My tasks
              </Button>
            </Link>
          </div>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                Upcoming meetings
              </h2>
              <Link
                href="/app/meetings"
                className="text-sm text-lc-accent hover:underline"
              >
                View all
              </Link>
            </div>
            {home.meetings.length === 0 ? (
              <p className="rounded-[14px] border border-dashed border-[var(--lc-line-strong)] px-4 py-8 text-center text-sm text-lc-muted">
                No upcoming meetings.
              </p>
            ) : (
              home.meetings.map((m) => (
                <article
                  key={m.id}
                  className="rounded-[14px] border border-[var(--lc-line)] bg-lc-surface px-4 py-4"
                >
                  <p className="font-medium">{m.title}</p>
                  <p className="mt-1 text-sm text-lc-muted">{when(m.startsAt)}</p>
                  {m.meetingUrl ? (
                    <a
                      href={m.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-sm font-medium text-lc-accent hover:underline"
                    >
                      Join →
                    </a>
                  ) : null}
                </article>
              ))
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">Your tasks</h2>
              <Link
                href="/app/assignments"
                className="text-sm text-lc-accent hover:underline"
              >
                Open
              </Link>
            </div>
            {home.tasks.length === 0 ? (
              <p className="text-sm text-lc-muted">No active assignments.</p>
            ) : (
              <ul className="divide-y divide-[var(--lc-line)] rounded-[14px] border border-[var(--lc-line)] bg-lc-surface">
                {home.tasks.map((t) => (
                  <li key={t.id}>
                    <Link
                      href={`/app/assignments/${t.id}`}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                    >
                      <div>
                        <p className="text-sm font-medium text-lc-ink">
                          {t.title}
                        </p>
                        <p className="text-xs text-lc-muted">
                          {t.status}
                          {t.dueAt ? ` · due ${when(t.dueAt)}` : ""}
                        </p>
                      </div>
                      <span
                        className={
                          t.submitted
                            ? "text-xs font-medium text-lc-success"
                            : "text-xs font-medium text-lc-warn"
                        }
                      >
                        {t.submitted ? "Submitted" : "Open"}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-semibold tracking-tight">
                Inbox
                {home.unreadNotifications > 0 ? (
                  <span className="ml-2 text-sm font-normal text-lc-accent">
                    {home.unreadNotifications} unseen
                  </span>
                ) : null}
              </h2>
              <Link
                href="/app/messages"
                className="text-sm text-lc-accent hover:underline"
              >
                Messages
              </Link>
            </div>
            {home.notifications.length === 0 ? (
              <p className="rounded-[14px] border border-dashed border-[var(--lc-line-strong)] px-4 py-8 text-center text-sm text-lc-muted">
                You&apos;re all caught up — no unseen messages or reviews.
              </p>
            ) : (
              <ul className="space-y-2">
                {home.notifications.map((n) => (
                  <li key={n.id}>
                    <Link
                      href={n.href ?? "/app/home"}
                      onClick={() => void openInboxItem(n)}
                      className="block rounded-[12px] border border-[var(--lc-line)] bg-lc-surface px-4 py-3 hover:bg-black/[0.02]"
                    >
                      <p className="text-[11px] font-medium uppercase tracking-wide text-lc-muted">
                        {kindLabel(n.kind)}
                      </p>
                      <p className="mt-0.5 text-sm font-medium">{n.title}</p>
                      {n.body ? (
                        <p className="mt-0.5 line-clamp-2 text-xs text-lc-muted">
                          {n.body}
                        </p>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-[14px] border border-[var(--lc-line)] bg-lc-surface px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-wide text-lc-muted">
              Field kit
            </p>
            <p className="mt-1 text-sm font-medium">Collect on your phone</p>
            <p className="mt-1 text-xs leading-relaxed text-lc-muted">
              LabCrew Field is the offline companion: same lab, schema-validated
              rows, charts with privacy floors. See{" "}
              <code className="text-[11px]">apps/mobile</code> in the repo.
            </p>
          </section>
        </div>
      ) : null}
    </SoftReveal>
  );
}
