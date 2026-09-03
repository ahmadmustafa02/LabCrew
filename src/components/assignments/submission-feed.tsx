"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { initials } from "@/lib/assignment-buckets";

type Author = {
  memberId: string;
  name: string;
  role: string;
};

type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: Author;
  replies: Array<{
    id: string;
    body: string;
    createdAt: string;
    author: Author;
  }>;
};

type Reaction = {
  emoji: string;
  count: number;
  mine: boolean;
};

type WorkPost = {
  id: string;
  version: number;
  writeup: string | null;
  evidenceUrl: string | null;
  repoUrl: string | null;
  attachments: Array<{ id: string; title: string; kind: string; url: string }>;
  submittedAt: string;
  editedAt: string | null;
  canEdit: boolean;
  comments: Comment[];
  reactions: Reaction[];
};

const REACTION_META: Record<string, { label: string; glyph: string }> = {
  like: { label: "Like", glyph: "👍" },
  celebrate: { label: "Celebrate", glyph: "🎉" },
  insightful: { label: "Insightful", glyph: "💡" },
  curious: { label: "Curious", glyph: "🤔" },
};

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  return `${d}d`;
}

function Avatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--lc-accent-soft)] text-[11px] font-semibold text-lc-accent"
    >
      {initials(name)}
    </span>
  );
}

export function SubmissionFeed({
  assignmentId,
  submissionId,
  studentName,
  reviewStatus,
  refreshKey = 0,
  initialPosts,
}: {
  assignmentId: string;
  submissionId: string;
  studentName: string;
  reviewStatus: string | null;
  /** Bump after turn-in so the work log reloads */
  refreshKey?: number;
  /** Fallback from assignment GET when feed API is down */
  initialPosts?: Array<{
    id: string;
    version: number;
    writeup: string | null;
    evidenceUrl: string | null;
    repoUrl: string | null;
    attachments: Array<{ id: string; title: string; kind: string; url: string }>;
    submittedAt: string;
    editedAt: string | null;
  }>;
}) {
  const [posts, setPosts] = useState<WorkPost[]>(() =>
    (initialPosts ?? []).map((p) => ({
      ...p,
      canEdit: true,
      comments: [],
      reactions: [
        { emoji: "like", count: 0, mine: false },
        { emoji: "celebrate", count: 0, mine: false },
        { emoji: "insightful", count: 0, mine: false },
        { emoji: "curious", count: 0, mine: false },
      ],
    })),
  );
  const [published, setPublished] = useState(
    () => (initialPosts?.length ?? 0) > 0,
  );
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editWriteup, setEditWriteup] = useState("");
  const [editEvidence, setEditEvidence] = useState("");
  const [editRepo, setEditRepo] = useState("");
  const [commentByPost, setCommentByPost] = useState<Record<string, string>>(
    {},
  );
  const [replyTo, setReplyTo] = useState<{
    postId: string;
    commentId: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/assignments/${assignmentId}/submissions/${submissionId}/feed`,
      );
      const data = await res.json();
      if (!data.ok) {
        setError(data.error ?? "Could not load work log");
        return;
      }
      setPosts(data.posts ?? []);
      setPublished(Boolean(data.published));
      setError(null);
    } catch {
      setError("Could not load work log");
    }
  }, [assignmentId, submissionId]);

  useEffect(() => {
    void load();
  }, [load, refreshKey]);

  async function postAction(payload: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/assignments/${assignmentId}/submissions/${submissionId}/feed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed");
      setPosts(data.posts ?? []);
      setPublished(Boolean(data.published));
      if (payload.action === "edit") setEditingId(null);
      if (payload.postId && typeof payload.postId === "string") {
        setCommentByPost((prev) => ({ ...prev, [payload.postId as string]: "" }));
      }
      setReplyTo(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function startEdit(post: WorkPost) {
    setEditingId(post.id);
    setEditWriteup(post.writeup ?? "");
    setEditEvidence(post.evidenceUrl ?? "");
    setEditRepo(post.repoUrl ?? "");
  }

  async function saveEdit(post: WorkPost) {
    await postAction({
      action: "edit",
      postId: post.id,
      writeup: editWriteup,
      evidenceUrl: editEvidence,
      repoUrl: editRepo,
      attachments: post.attachments,
    });
  }

  async function onComment(e: FormEvent, postId: string) {
    e.preventDefault();
    const text = (commentByPost[postId] ?? "").trim();
    if (!text) return;
    const isReply = replyTo?.postId === postId;
    await postAction(
      isReply
        ? {
            action: "reply",
            postId,
            parentId: replyTo!.commentId,
            text,
          }
        : { action: "comment", postId, text },
    );
  }

  if (!published || posts.length === 0) {
    if (error) {
      return (
        <div
          role="alert"
          className="rounded-[14px] border border-[var(--lc-danger)]/30 bg-[var(--lc-danger-soft)] px-4 py-3 text-sm text-lc-danger"
        >
          <p className="font-medium">Work log unavailable</p>
          <p className="mt-1 opacity-90">{error}</p>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => void load()}
          >
            Retry
          </Button>
        </div>
      );
    }
    return (
      <p className="rounded-[14px] border border-dashed border-[var(--lc-line)] px-4 py-6 text-sm text-lc-muted">
        No work posts yet. Use <strong>Turn in</strong> to publish your first
        attempt.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {posts.length > 1 ? (
        <p className="text-xs text-lc-muted">
          Work log · {posts.length} attempts (oldest → newest)
        </p>
      ) : null}
      {posts.map((post) => {
        const isLatest = post.version === posts[posts.length - 1]?.version;
        const comment = commentByPost[post.id] ?? "";
        const replyingHere = replyTo?.postId === post.id;
        return (
          <article
            key={post.id}
            className="overflow-hidden rounded-[16px] border border-[var(--lc-line)] bg-lc-surface shadow-[var(--lc-shadow)]"
          >
            <header className="flex items-start gap-3 border-b border-[var(--lc-line)] px-4 py-3.5">
              <Avatar name={studentName} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-lc-ink">
                  {studentName}
                  {posts.length > 1 ? (
                    <span className="ml-2 text-xs font-medium text-lc-muted">
                      Attempt {post.version}
                      {isLatest ? " · latest" : ""}
                    </span>
                  ) : null}
                </p>
                <p className="text-xs text-lc-muted">
                  Turned in · {new Date(post.submittedAt).toLocaleString()}
                  {post.editedAt
                    ? ` · edited ${new Date(post.editedAt).toLocaleString()}`
                    : ""}
                  {isLatest && reviewStatus
                    ? ` · ${reviewStatus.replaceAll("_", " ").toLowerCase()}`
                    : ""}
                </p>
              </div>
              {post.canEdit ? (
                <button
                  type="button"
                  className="cursor-pointer rounded-[8px] px-2 py-1 text-xs font-medium text-lc-muted hover:bg-black/[0.04] hover:text-lc-ink dark:hover:bg-white/[0.06]"
                  aria-label="Edit this work post"
                  title="Edit this post"
                  disabled={busy}
                  onClick={() =>
                    editingId === post.id
                      ? setEditingId(null)
                      : startEdit(post)
                  }
                >
                  {editingId === post.id ? "Cancel" : "Edit"}
                </button>
              ) : null}
            </header>

            <div className="space-y-3 px-4 py-4">
              {editingId === post.id ? (
                <div className="space-y-3">
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-lc-muted">
                      Write-up
                    </span>
                    <textarea
                      className="lc-input min-h-[100px]"
                      value={editWriteup}
                      onChange={(e) => setEditWriteup(e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-lc-muted">
                      Evidence URL
                    </span>
                    <input
                      className="lc-input"
                      value={editEvidence}
                      onChange={(e) => setEditEvidence(e.target.value)}
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-lc-muted">
                      Repo URL
                    </span>
                    <input
                      className="lc-input"
                      value={editRepo}
                      onChange={(e) => setEditRepo(e.target.value)}
                    />
                  </label>
                  <Button
                    type="button"
                    variant="accent"
                    size="sm"
                    disabled={busy}
                    onClick={() => void saveEdit(post)}
                  >
                    Save changes
                  </Button>
                </div>
              ) : (
                <>
                  {post.writeup ? (
                    <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-lc-ink">
                      {post.writeup}
                    </p>
                  ) : (
                    <p className="text-sm text-lc-muted">
                      No write-up — see attachments.
                    </p>
                  )}

                  {(post.evidenceUrl ||
                    post.repoUrl ||
                    post.attachments.length > 0) && (
                    <div className="flex flex-wrap gap-2">
                      {post.evidenceUrl ? (
                        <a
                          href={post.evidenceUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-[var(--lc-line)] px-3 py-1.5 text-xs font-medium text-lc-accent hover:bg-[var(--lc-accent-soft)]"
                        >
                          Evidence link
                        </a>
                      ) : null}
                      {post.repoUrl ? (
                        <a
                          href={post.repoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-[var(--lc-line)] px-3 py-1.5 text-xs font-medium text-lc-accent hover:bg-[var(--lc-accent-soft)]"
                        >
                          Repository
                        </a>
                      ) : null}
                      {post.attachments.map((a) => (
                        <a
                          key={a.id}
                          href={a.url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-lg border border-[var(--lc-line)] px-3 py-1.5 text-xs font-medium text-lc-ink hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                        >
                          {a.kind === "file" ? "📎 " : "🔗 "}
                          {a.title}
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5 border-t border-[var(--lc-line)] px-3 py-2">
              {post.reactions.map((r) => {
                const meta = REACTION_META[r.emoji] ?? {
                  label: r.emoji,
                  glyph: r.emoji,
                };
                return (
                  <button
                    key={r.emoji}
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void postAction({
                        action: "reaction",
                        postId: post.id,
                        emoji: r.emoji,
                      })
                    }
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1 rounded-full px-2.5 py-1 text-xs transition-colors",
                      r.mine
                        ? "bg-[var(--lc-accent-soft)] font-medium text-lc-accent"
                        : "text-lc-muted hover:bg-black/[0.04] dark:hover:bg-white/[0.05]",
                    )}
                    aria-pressed={r.mine}
                    aria-label={meta.label}
                  >
                    <span aria-hidden>{meta.glyph}</span>
                    {r.count > 0 ? (
                      <span>{r.count}</span>
                    ) : (
                      <span>{meta.label}</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4 border-t border-[var(--lc-line)] px-4 py-3">
              {post.comments.length === 0 ? (
                <p className="text-xs text-lc-muted">
                  No comments yet — directors can leave feedback here.
                </p>
              ) : (
                post.comments.map((c) => (
                  <div key={c.id} className="space-y-3">
                    <div className="flex gap-2.5">
                      <Avatar name={c.author.name} />
                      <div className="min-w-0 flex-1">
                        <div className="rounded-2xl bg-black/[0.04] px-3 py-2 dark:bg-white/[0.06]">
                          <p className="text-xs font-semibold text-lc-ink">
                            {c.author.name}
                            <span className="ml-1.5 font-normal text-lc-muted">
                              {c.author.role === "ADMIN" ||
                              c.author.role === "MENTOR"
                                ? "· Director"
                                : ""}
                            </span>
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap text-sm text-lc-ink">
                            {c.body}
                          </p>
                        </div>
                        <div className="mt-1 flex gap-3 px-1 text-[11px] text-lc-muted">
                          <span>{timeAgo(c.createdAt)}</span>
                          <button
                            type="button"
                            className="cursor-pointer font-medium hover:text-lc-ink"
                            onClick={() => {
                              setReplyTo({
                                postId: post.id,
                                commentId: c.id,
                              });
                              setCommentByPost((prev) => ({
                                ...prev,
                                [post.id]: "",
                              }));
                            }}
                          >
                            Reply
                          </button>
                        </div>
                      </div>
                    </div>
                    {c.replies.map((r) => (
                      <div key={r.id} className="ml-8 flex gap-2.5 sm:ml-11">
                        <Avatar name={r.author.name} />
                        <div className="min-w-0 flex-1">
                          <div className="rounded-2xl bg-black/[0.04] px-3 py-2 dark:bg-white/[0.06]">
                            <p className="text-xs font-semibold text-lc-ink">
                              {r.author.name}
                            </p>
                            <p className="mt-0.5 whitespace-pre-wrap text-sm text-lc-ink">
                              {r.body}
                            </p>
                          </div>
                          <p className="mt-1 px-1 text-[11px] text-lc-muted">
                            {timeAgo(r.createdAt)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ))
              )}

              <form
                onSubmit={(e) => void onComment(e, post.id)}
                className="flex gap-2 pt-1"
              >
                <div className="min-w-0 flex-1">
                  {replyingHere ? (
                    <p className="mb-1.5 text-[11px] text-lc-muted">
                      Replying…{" "}
                      <button
                        type="button"
                        className="cursor-pointer font-medium text-lc-ink"
                        onClick={() => setReplyTo(null)}
                      >
                        Cancel
                      </button>
                    </p>
                  ) : null}
                  <input
                    className="lc-input"
                    placeholder={
                      replyingHere ? "Write a reply…" : "Add a comment…"
                    }
                    value={comment}
                    onChange={(e) =>
                      setCommentByPost((prev) => ({
                        ...prev,
                        [post.id]: e.target.value,
                      }))
                    }
                    disabled={busy}
                  />
                </div>
                <Button
                  type="submit"
                  variant="secondary"
                  size="md"
                  disabled={busy || !comment.trim()}
                >
                  Post
                </Button>
              </form>
            </div>
          </article>
        );
      })}
      {error ? <p className="text-xs text-lc-danger">{error}</p> : null}
    </div>
  );
}
