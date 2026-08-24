import type { ReactNode } from "react"

/** Remounts on every route change, giving each page a soft entrance. */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="animate-page-enter">{children}</div>
}
