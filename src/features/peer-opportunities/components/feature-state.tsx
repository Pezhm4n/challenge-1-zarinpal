import { CircleAlert } from "lucide-react";

import type { ArtifactError } from "../types";

export function FeatureState({ error }: { error: ArtifactError }) {
  return (
    <main className="mx-auto grid min-h-screen w-full max-w-3xl place-items-center p-6">
      <section className="grid max-w-lg gap-3 rounded-xl border bg-card p-6 text-center shadow-sm">
        <CircleAlert aria-hidden="true" className="mx-auto size-8 text-destructive" />
        <h1 className="text-xl font-semibold">تحلیل فرصت‌ها آماده نیست</h1>
        <p className="text-sm text-muted-foreground">{error.messageFa}</p>
        <p className="text-xs text-muted-foreground">کد وضعیت: {error.code}</p>
      </section>
    </main>
  );
}
