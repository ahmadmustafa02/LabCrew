"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { MessagesShellSkeleton } from "@/components/ui/skeleton";
import { SoftReveal } from "@/components/ui/soft-reveal";
import { useSession } from "@/components/session/session-provider";
import { cn } from "@/lib/cn";

type Conversation = {
  id: string;
  title: string;
  studentMemberId: string;
  studentName: string;
  lastPreview: string | null;
  lastMessageAt: string | null;
};

type StudentOpt = { memberId: string; name: string; email: string };

type ChatMessage = {
  id: string;
  clientId?: string | null;
  body: string;
  createdAt: string;
  senderMemberId: string;
  senderName: string;
  mine: boolean;
  pending?: boolean;
};

function uid() {
  return `c_${Math.random().toString(36).slice(2)}_${Date.now()}`;
}

export function MessagesView() {
  const { role } = useSession();
  const isDirector = role === "director";
  const search = useSearchParams();
  const initialC = search.get("c");

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [withoutThread, setWithoutThread] = useState<StudentOpt[]>([]);
  const [activeId, setActiveId] = useState<string | null>(initialC);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [listReady, setListReady] = useState(false);
  const [threadReady, setThreadReady] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const esRef = useRef<EventSource | null>(null);

  const active = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );

  const loadList = useCallback(async () => {
    try {
      const res = await fetch("/api/messages/conversations");
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed");
      setConversations(data.conversations);
      setWithoutThread(data.studentsWithoutThread ?? []);
      setError(null);
      setListReady(true);
      return data.conversations as Conversation[];
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load messages");
      setListReady(true);
      return [] as Conversation[];
    }
  }, []);

  useEffect(() => {
    void (async () => {
      const list = await loadList();
      setActiveId((cur) => cur ?? initialC ?? list[0]?.id ?? null);
    })();
  }, [loadList, initialC]);

  useEffect(() => {
    if (!activeId) {
      setMessages([]);
      setThreadReady(true);
      return;
    }

    let cancelled = false;
    setThreadReady(false);
    setMessages([]);

    async function loadHistory() {
      const res = await fetch(`/api/messages/conversations/${activeId}`);
      const data = await res.json();
      if (cancelled) return;
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Failed to load thread");
        setThreadReady(true);
        return;
      }
      setMessages(data.messages);
      setThreadReady(true);
    }

    void loadHistory();

    esRef.current?.close();
    const es = new EventSource(
      `/api/messages/conversations/${activeId}/stream`,
    );
    esRef.current = es;

    es.addEventListener("message", (ev) => {
      try {
        const msg = JSON.parse(ev.data) as ChatMessage;
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          if (msg.clientId && prev.some((m) => m.clientId === msg.clientId)) {
            return prev.map((m) =>
              m.clientId === msg.clientId ? { ...msg, pending: false } : m,
            );
          }
          return [...prev, msg];
        });
        void loadList();
      } catch {
        /* ignore */
      }
    });

    return () => {
      cancelled = true;
      es.close();
    };
  }, [activeId, loadList]);

  useEffect(() => {
    if (!threadReady || messages.length === 0) return;
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, threadReady]);

  async function openStudent(memberId: string) {
    const res = await fetch("/api/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ studentMemberId: memberId }),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Could not open chat");
      return;
    }
    await loadList();
    setActiveId(data.conversation.id);
  }

  async function openMyThread() {
    const res = await fetch("/api/messages/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    if (!res.ok || !data.ok) {
      setError(data.error ?? "Could not open chat");
      return;
    }
    await loadList();
    setActiveId(data.conversation.id);
  }

  async function onSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeId) return;

    const clientId = uid();
    const optimistic: ChatMessage = {
      id: clientId,
      clientId,
      body: text,
      createdAt: new Date().toISOString(),
      senderMemberId: "me",
      senderName: "You",
      mine: true,
      pending: true,
    };
    setDraft("");
    setMessages((prev) => [...prev, optimistic]);

    try {
      const res = await fetch(`/api/messages/conversations/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: text, clientId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Send failed");
      setMessages((prev) =>
        prev.map((m) =>
          m.clientId === clientId ? { ...data.message, pending: false } : m,
        ),
      );
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.clientId !== clientId));
      setDraft(text);
      setError(err instanceof Error ? err.message : "Send failed");
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-lc-muted">Messages</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
          {isDirector ? "Student inbox" : "Message your professor"}
        </h1>
        <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-lc-muted">
          Instant send with live delivery — no page refresh.
        </p>
        {error ? <p className="mt-2 text-sm text-lc-danger">{error}</p> : null}
      </div>

      <SoftReveal ready={listReady} skeleton={<MessagesShellSkeleton />}>
        <div className="flex h-[min(70vh,640px)] overflow-hidden rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
          <aside className="flex w-[min(40%,280px)] flex-col border-r border-[var(--lc-line)]">
            <div className="border-b border-[var(--lc-line)] px-3 py-3 text-xs font-medium uppercase tracking-wide text-lc-muted">
              Threads
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "block w-full border-b border-[var(--lc-line)] px-3 py-3 text-left transition-colors duration-150",
                    activeId === c.id
                      ? "bg-[var(--lc-accent-soft)]"
                      : "hover:bg-black/[0.03]",
                  )}
                >
                  <p className="truncate text-sm font-medium">{c.title}</p>
                  <p className="mt-0.5 truncate text-xs text-lc-muted">
                    {c.lastPreview ?? "No messages yet"}
                  </p>
                </button>
              ))}
              {!isDirector && conversations.length === 0 ? (
                <div className="p-3">
                  <Button
                    size="sm"
                    variant="accent"
                    onClick={() => void openMyThread()}
                  >
                    Start chat with directors
                  </Button>
                </div>
              ) : null}
              {isDirector && withoutThread.length > 0 ? (
                <div className="border-t border-[var(--lc-line)] p-2">
                  <p className="px-1 pb-1 text-[11px] font-medium uppercase text-lc-muted">
                    Start new
                  </p>
                  {withoutThread.map((s) => (
                    <button
                      key={s.memberId}
                      type="button"
                      onClick={() => void openStudent(s.memberId)}
                      className="block w-full rounded-[8px] px-2 py-2 text-left text-sm hover:bg-black/[0.04]"
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          </aside>

          <section className="flex min-w-0 flex-1 flex-col">
            <div className="border-b border-[var(--lc-line)] px-4 py-3">
              <p className="text-sm font-semibold">
                {active?.title ?? "Select a conversation"}
              </p>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto px-4 py-4">
              {activeId && !threadReady ? (
                <div className="space-y-3 py-2" aria-busy="true">
                  <div className="lc-skel ml-auto h-10 w-[55%] rounded-[16px]" />
                  <div className="lc-skel h-10 w-[48%] rounded-[16px]" />
                  <div className="lc-skel ml-auto h-10 w-[40%] rounded-[16px]" />
                </div>
              ) : !activeId ? (
                <p className="py-10 text-center text-sm text-lc-muted">
                  Pick a thread to message.
                </p>
              ) : messages.length === 0 ? (
                <p className="py-10 text-center text-sm text-lc-muted">
                  Say hi — messages appear instantly on both sides.
                </p>
              ) : (
                messages.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      m.mine ? "justify-end" : "justify-start",
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[78%] rounded-[16px] px-3.5 py-2 text-[14px] leading-relaxed",
                        m.mine
                          ? "rounded-br-md bg-lc-accent text-white"
                          : "rounded-bl-md bg-black/[0.05] text-lc-ink",
                        m.pending && "opacity-60",
                      )}
                    >
                      {!m.mine ? (
                        <p className="mb-0.5 text-[11px] font-medium opacity-70">
                          {m.senderName}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap">{m.body}</p>
                    </div>
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            <form
              onSubmit={onSend}
              className="flex gap-2 border-t border-[var(--lc-line)] p-3"
            >
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={!activeId}
                placeholder={activeId ? "Message…" : "Open a thread first"}
                className="lc-input min-w-0 flex-1"
              />
              <Button
                type="submit"
                variant="accent"
                disabled={!activeId || !draft.trim()}
              >
                Send
              </Button>
            </form>
          </section>
        </div>
      </SoftReveal>
    </div>
  );
}
