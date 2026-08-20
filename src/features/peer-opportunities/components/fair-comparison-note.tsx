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
    <aside className="grid gap-3 rounded-xl border bg-muted/40 p-4" aria-labelledby="fair-title">
      <div className="flex items-center gap-2">
        <Scale aria-hidden="true" className="size-5" />
        <h3 id="fair-title" className="font-medium">
          مبنای این مقایسه چیست؟
        </h3>
      </div>
      <ul className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        {controls.map((control) => (
          <li key={control} className="flex gap-2">
            <span aria-hidden="true">•</span>
            <span>{control}</span>
          </li>
        ))}
      </ul>
    </aside>
  );
}
