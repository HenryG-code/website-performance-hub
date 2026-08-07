import Link from "next/link";
import { Activity, BarChart3, ShieldCheck } from "lucide-react";
import { Logo } from "@/components/layout/logo";

const HIGHLIGHTS = [
  {
    icon: BarChart3,
    title: "Every site in one view",
    body: "Performance, SEO, accessibility and best-practice scores side by side, with trends over time.",
  },
  {
    icon: Activity,
    title: "Findings you can act on",
    body: "Each audit explains what it found, what to change, and how many points the fix is worth.",
  },
  {
    icon: ShieldCheck,
    title: "Private to your account",
    body: "Websites, audits and issues are scoped to you and enforced at the database level.",
  },
];

/**
 * Split layout for the auth screens: the form on the left, product context on
 * the right. The right column is hidden below `lg`, where the form should have
 * the whole viewport.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <main className="surface-glow flex flex-col px-5 py-8 sm:px-8">
        <Link href="/sign-in" className="inline-flex w-fit rounded-lg">
          <Logo />
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        <p className="text-center text-xs text-subtle-foreground">
          PerformanceHub · Website health monitoring
        </p>
      </main>

      <aside className="relative hidden flex-col justify-center border-l border-border bg-surface px-12 lg:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_80%_0%,rgba(59,130,246,0.12),transparent_60%)]"
        />
        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight text-foreground text-balance">
              Know exactly how healthy every website you manage is.
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              PerformanceHub brings audit scores, uptime and outstanding issues
              for your whole portfolio into a single dashboard.
            </p>
          </div>

          <ul className="space-y-5">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.title} className="flex gap-3.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-elevated">
                    <Icon className="size-4 text-accent" />
                  </span>
                  <span className="space-y-1">
                    <span className="block text-sm font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="block text-xs leading-relaxed text-muted-foreground">
                      {item.body}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </aside>
    </div>
  );
}
