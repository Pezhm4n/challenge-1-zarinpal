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
        "inline-flex min-h-11 items-center gap-1.5 rounded-md px-1.5 text-start underline decoration-dotted underline-offset-4 outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
      aria-label={ariaLabel}
      onClick={() => onEvidenceRequest(evidenceId)}
    >
      {children}
      <Calculator aria-hidden="true" className="size-3.5 shrink-0 text-muted-foreground" />
    </button>
  );
}
