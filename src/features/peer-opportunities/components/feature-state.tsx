import { CircleAlert } from "lucide-react";

import type { ArtifactError } from "../types";

export function FeatureState({ error }: { error: ArtifactError }) {
  return (
    <div className="mx-auto grid min-h-[50vh] w-full max-w-3xl place-items-center p-6">
      <section className="grid max-w-lg gap-4 rounded-2xl border border-border/70 bg-card p-8 text-center shadow-sm">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <CircleAlert aria-hidden="true" className="size-6" />
        </div>
        <h1 className="text-xl font-bold tracking-tight text-foreground">تحلیل فرصت‌ها آماده نیست</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">{error.messageFa}</p>
        <p className="text-xs font-mono text-muted-foreground">کد وضعیت: {error.code}</p>
      </section>
    </div>
  );
}

