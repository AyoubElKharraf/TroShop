import { cn } from "@/lib/utils";

/** Illustration légère (SVG inline) pour états vides — couleurs via currentColor */
export function EmptyCatalogIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 240 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("mx-auto h-[7.5rem] w-auto max-w-[240px] text-primary/35 dark:text-primary/25", className)}
      aria-hidden
    >
      <rect x="24" y="40" width="192" height="96" rx="8" className="fill-muted/40 stroke-current" strokeWidth="2" />
      <rect x="40" y="56" width="48" height="48" rx="4" className="fill-primary/15 stroke-current" strokeWidth="1.5" />
      <rect x="96" y="56" width="48" height="48" rx="4" className="fill-primary/10 stroke-current" strokeWidth="1.5" />
      <rect x="152" y="56" width="48" height="48" rx="4" className="fill-primary/10 stroke-current" strokeWidth="1.5" />
      <path d="M56 104h16M112 104h16M168 104h16" className="stroke-current" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <circle cx="120" cy="24" r="12" className="fill-primary/20 stroke-current" strokeWidth="1.5" />
      <path d="M120 18v12M114 24h12" className="stroke-current" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
