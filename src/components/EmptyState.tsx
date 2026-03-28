import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { EmptyCatalogIllustration } from "@/components/illustrations/EmptyCatalogIllustration";

type EmptyStateProps = {
  /** Icône principale (souvent Inbox, Search, etc.) */
  icon: LucideIcon;
  title: string;
  description: string;
  /** Affiche l’illustration catalogue au-dessus (états vides home / catalogue) */
  showCatalogIllustration?: boolean;
  children?: React.ReactNode;
  className?: string;
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  showCatalogIllustration,
  children,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/25 px-4 py-12 text-center sm:px-8 sm:py-14",
        className
      )}
    >
      <div className="mx-auto flex max-w-md flex-col items-center">
        {showCatalogIllustration && <EmptyCatalogIllustration className="mb-2" />}
        <div
          className={cn(
            "mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary",
            showCatalogIllustration && "h-12 w-12"
          )}
        >
          <Icon className={showCatalogIllustration ? "h-6 w-6" : "h-7 w-7"} strokeWidth={1.5} aria-hidden />
        </div>
        <h2 className="font-heading text-balance text-xl font-semibold tracking-tight text-foreground">{title}</h2>
        <p className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">{description}</p>
        {children ? <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:flex-row sm:justify-center">{children}</div> : null}
      </div>
    </div>
  );
}
