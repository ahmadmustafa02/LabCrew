export const DEMO_SEATS = [
  {
    slug: "resops",
    seat: "#1 ResOps · Elyes Manai",
    title: "Who has what + Week 0",
    body: "New student starter tasks and a sign-out list for lab stuff. Not a repair shop.",
    href: "/app/desk",
    role: "director" as const,
  },
  {
    slug: "dataforge",
    seat: "#2 DataForge · Jiguo Cao",
    title: "Collect on the web",
    body: "Open a collect assignment (stream log or Week 0 first collect). Phone app is Field in apps/mobile.",
    href: "/app/assignments",
    role: "student" as const,
  },
  {
    slug: "catalog",
    seat: "#7 Catalog · Steven Livingstone",
    title: "Paper → checked record",
    body: "Paste a paper excerpt. Fields without a supporting quote stay held.",
    href: "/app/catalog",
    role: "director" as const,
  },
  {
    slug: "next-step",
    seat: "#4 Next step (honest) · Alaa Alslaity",
    title: "Do this next",
    body: "Student Home card: Week 0, then collect, writeup, overdue gear, catalog hold. Not a coding tutor.",
    href: "/app/home",
    role: "student" as const,
  },
  {
    slug: "plan",
    seat: "Plan + sources",
    title: "Topic → assignments → find papers/datasets",
    body: "Draft a roadmap, add assignments, then Find sources. Attach only what you pick.",
    href: "/app/research",
    role: "director" as const,
  },
] as const;

export type DemoSeatSlug = (typeof DEMO_SEATS)[number]["slug"];

export function demoSeat(slug: string) {
  return DEMO_SEATS.find((s) => s.slug === slug) ?? null;
}

export function demoLoginHref(seat: (typeof DEMO_SEATS)[number]) {
  return `/login?next=${encodeURIComponent(seat.href)}`;
}
