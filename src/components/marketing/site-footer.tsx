import Link from "next/link";

const cols = [
  {
    title: "Product",
    items: [
      { href: "/product", label: "Overview" },
      { href: "/how-it-works", label: "How it works" },
      { href: "/pricing", label: "Pricing" },
    ],
  },
  {
    title: "Workspace",
    items: [
      { href: "/signup", label: "Create a lab" },
      { href: "/login", label: "Sign in" },
      { href: "/join", label: "Join with invite" },
    ],
  },
  {
    title: "Company",
    items: [
      { href: "/", label: "Home" },
      { href: "/product#agents", label: "Agent crew" },
      { href: "/pricing#faq", label: "FAQ" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-[var(--lc-line)] bg-[var(--lc-surface)]">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-6 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr] md:px-8">
        <div>
          <p className="text-[17px] font-semibold tracking-tight text-lc-ink">
            LabCrew
          </p>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-lc-muted">
            Your lab’s AI operations crew. Humans direct. Agents run the weekly
            loop.
          </p>
        </div>
        {cols.map((col) => (
          <div key={col.title}>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-lc-muted">
              {col.title}
            </p>
            <ul className="mt-4 space-y-2.5">
              {col.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="text-sm text-lc-ink/80 transition-colors hover:text-lc-ink"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-[var(--lc-line)]">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-6 py-5 text-xs text-lc-muted sm:flex-row sm:items-center sm:justify-between md:px-8">
          <p>© {new Date().getFullYear()} LabCrew. Built for research labs.</p>
          <p>Humans approve. Agents execute.</p>
        </div>
      </div>
    </footer>
  );
}
