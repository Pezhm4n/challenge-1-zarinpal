import { Scale } from "lucide-react";

import type { PeerBenchmark } from "../types";

export function FairComparisonNote({
  benchmarks,
}: {
  benchmarks: PeerBenchmark[];
}) {
  const controls = Array.from(
    new Set(benchmarks.flatMap((benchmark) => benchmark.controls)),
  );

  return (
    <aside className="grid gap-3 rounded-2xl border border-border/60 bg-muted/30 p-5 shadow-2xs" aria-labelledby="fair-title">
      <div className="flex items-center gap-2 text-foreground">
        <span className="flex size-7 items-center justify-center rounded-lg bg-muted text-primary">
          <Scale aria-hidden="true" className="size-4" />
        </span>
        <h3 id="fair-title" className="text-sm font-bold">
          مبنای این مقایسه چیست؟
        </h3>
      </div>
      <ul className="grid gap-2 text-xs leading-relaxed text-muted-foreground sm:grid-cols-2">
        {controls.map((control) => (
          <li key={control} className="flex items-start gap-2">
            <span aria-hidden="true" className="text-primary font-bold">•</span>
            <span>{control}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}

