"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

type Gear = {
  id: string;
  name: string;
  note: string | null;
  status: "IN_LAB" | "CHECKED_OUT" | "BROKEN";
  holderName: string | null;
  dueBackAt: string | null;
  mine: boolean;
};

const STATUS: Record<Gear["status"], string> = {
  IN_LAB: "On the shelf",
  CHECKED_OUT: "Someone took it",
  BROKEN: "Broken",
};

export function LabDeskView() {
  const [role, setRole] = useState<"director" | "student">("student");
  const [onboardExists, setOnboardExists] = useState(false);
  const [equipment, setEquipment] = useState<Gear[]>([]);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/desk/equipment");
    const data = await res.json();
    if (!data.ok) {
      setError(data.error ?? "Could not load the list");
      return;
    }
    setRole(data.role === "director" ? "director" : "student");
    setOnboardExists(Boolean(data.onboardExists));
    setEquipment(data.equipment ?? []);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function patch(id: string, action: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/desk/equipment/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error ?? "Update failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-[-0.03em] text-lc-ink">
          Who has what
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-lc-muted">
          A sign-out list for lab stuff (meters, tubes, laptops). Plus starter
          homework for a new student. That is all.
        </p>
      </div>

      <section className="space-y-3 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
        <h2 className="text-[15px] font-semibold text-lc-ink">New student homework</h2>
        {onboardExists ? (
          <p className="text-sm text-lc-muted">
            Three starter tasks are on Assignments. Students see them first on Home
            (“Do this next”).
          </p>
        ) : role === "director" ? (
          <p className="text-sm text-lc-muted">
            Creates three small tasks: can you sign in, safety note, one practice
            log. Same as any other assignment.
          </p>
        ) : (
          <p className="text-sm text-lc-muted">
            No starter tasks yet. Your director adds them here.
          </p>
        )}
        <div className="flex flex-wrap gap-2">
          {role === "director" && !onboardExists ? (
            <Button
              variant="accent"
              size="sm"
              disabled={busy}
              onClick={() => {
                void (async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const res = await fetch("/api/desk/onboard", { method: "POST" });
                    const data = await res.json();
                    if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed");
                    await load();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : "Failed");
                  } finally {
                    setBusy(false);
                  }
                })();
              }}
            >
              Add starter tasks
            </Button>
          ) : null}
          <Link href="/app/assignments">
            <Button variant="secondary" size="sm">
              Open assignments
            </Button>
          </Link>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-[15px] font-semibold text-lc-ink">Things in the lab</h2>
        {equipment.length === 0 ? (
          <p className="rounded-[16px] border border-dashed border-[var(--lc-line)] px-5 py-8 text-sm text-lc-muted">
            Nothing on the list yet.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--lc-line)] overflow-hidden rounded-[16px] border border-[var(--lc-line)] bg-lc-surface">
            {equipment.map((g) => (
              <li key={g.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
                <div>
                  <p className="text-sm font-semibold text-lc-ink">{g.name}</p>
                  <p className="mt-1 text-xs text-lc-muted">
                    {g.status === "CHECKED_OUT" && g.mine
                      ? "You have it"
                      : STATUS[g.status]}
                    {g.status === "CHECKED_OUT" && !g.mine && g.holderName
                      ? ` · ${g.holderName}`
                      : ""}
                    {g.dueBackAt
                      ? ` · due ${new Date(g.dueBackAt).toLocaleDateString()}`
                      : ""}
                    {g.note ? ` · ${g.note}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {g.status === "IN_LAB" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => void patch(g.id, "checkout")}
                    >
                      I took this
                    </Button>
                  ) : null}
                  {g.status === "CHECKED_OUT" && (g.mine || role === "director") ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => void patch(g.id, "return")}
                    >
                      I put it back
                    </Button>
                  ) : null}
                  {role === "director" && g.status !== "BROKEN" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => void patch(g.id, "broken")}
                    >
                      Broken
                    </Button>
                  ) : null}
                  {role === "director" && g.status === "BROKEN" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => void patch(g.id, "repair")}
                    >
                      Fixed — on the shelf
                    </Button>
                  ) : null}
                  {role === "director" ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={busy}
                      onClick={() => {
                        if (!window.confirm(`Remove ${g.name}?`)) return;
                        void (async () => {
                          setBusy(true);
                          try {
                            await fetch(`/api/desk/equipment/${g.id}`, { method: "DELETE" });
                            await load();
                          } finally {
                            setBusy(false);
                          }
                        })();
                      }}
                    >
                      Remove
                    </Button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {role === "director" ? (
        <section className="space-y-3 rounded-[16px] border border-[var(--lc-line)] bg-lc-surface p-5">
          <h2 className="text-[15px] font-semibold text-lc-ink">Put something on the list</h2>
          <p className="text-sm text-lc-muted">
            A name is enough. Example: laptop 3, or pH meter (the water tester).
          </p>
          <input
            className="lc-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name, e.g. laptop 3"
          />
          <input
            className="lc-input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Where it lives (optional)"
          />
          <Button
            variant="accent"
            size="sm"
            disabled={busy || name.trim().length < 2}
            onClick={() => {
              void (async () => {
                setBusy(true);
                setError(null);
                try {
                  const res = await fetch("/api/desk/equipment", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, note }),
                  });
                  const data = await res.json();
                  if (!res.ok || !data.ok) throw new Error(data.error ?? "Failed");
                  setName("");
                  setNote("");
                  await load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Failed");
                } finally {
                  setBusy(false);
                }
              })();
            }}
          >
            Add to the list
          </Button>
        </section>
      ) : null}

      {error ? <p className="text-sm text-lc-danger">{error}</p> : null}
    </div>
  );
}
