import type { LucideIcon } from "lucide-react";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface ErrorStatePanelProps {
  title: string;
  description: string;
  onRetry?: () => void;
  retryLabel: string;
  icon?: LucideIcon;
}

/** Bloc d’erreur réutilisable (requêtes liste / page). */
export function ErrorStatePanel({ title, description, onRetry, retryLabel, icon: Icon = AlertCircle }: ErrorStatePanelProps) {
  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-col items-center gap-4 py-8 text-center sm:flex-row sm:text-left">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="font-heading text-lg font-semibold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {onRetry && (
          <Button type="button" variant="outline" onClick={onRetry} className="shrink-0">
            {retryLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
