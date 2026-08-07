import { cn } from "@/lib/utils";
import { hashSeed } from "@/lib/mock/random";

/**
 * Deterministic letter-mark for a website. Avoids fetching remote favicons
 * (which would break the "runs locally without credentials" requirement) while
 * still giving each site a recognisable identity in lists.
 */
const PALETTE = [
  "from-blue-500/25 to-blue-500/5 text-blue-300 ring-blue-500/25",
  "from-emerald-500/25 to-emerald-500/5 text-emerald-300 ring-emerald-500/25",
  "from-violet-500/25 to-violet-500/5 text-violet-300 ring-violet-500/25",
  "from-amber-500/25 to-amber-500/5 text-amber-300 ring-amber-500/25",
  "from-rose-500/25 to-rose-500/5 text-rose-300 ring-rose-500/25",
  "from-cyan-500/25 to-cyan-500/5 text-cyan-300 ring-cyan-500/25",
];

const SIZES = {
  sm: "size-7 text-[10px] rounded-md",
  md: "size-9 text-xs rounded-lg",
  lg: "size-12 text-sm rounded-xl",
} as const;

export function SiteAvatar({
  name,
  initials,
  size = "md",
  className,
}: {
  name: string;
  initials: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const palette = PALETTE[hashSeed(name) % PALETTE.length];

  return (
    <span
      aria-hidden
      title={name}
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-gradient-to-br font-semibold ring-1 ring-inset",
        SIZES[size],
        palette,
        className,
      )}
    >
      {initials}
    </span>
  );
}
