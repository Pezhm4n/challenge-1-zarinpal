import { Calculator } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function EvidenceMetricButton({
  evidenceId,
  ariaLabel,
  onEvidenceRequest,
  children,
  className,
}: {
  evidenceId?: string;
  ariaLabel: string;
  onEvidenceRequest: (evidenceId: string) => void;
  children: ReactNode;
  className?: string;
}) {
  if (!evidenceId) {
    return <span className={className}>{children}</span>;
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full px-2 text-start underline decoration-dotted underline-offset-4 outline-none transition-all hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
        className,
      )}
      aria-label={ariaLabel}
      onClick={() => onEvidenceRequest(evidenceId)}
    >
      {children}
      <Calculator aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary" />
    </button>
  );
}

