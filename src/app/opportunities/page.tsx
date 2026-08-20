import type { Metadata } from "next";

import { FeatureState } from "@/features/peer-opportunities/components/feature-state";
import { loadPeerOpportunities } from "@/features/peer-opportunities/load-peer-opportunities";
import { PeerOpportunitiesPage } from "@/features/peer-opportunities/peer-opportunities-page";

export const metadata: Metadata = {
  title: "فرصت‌های رشد | نبض زرین",
  description: "تفکیک عوامل رشد، مقایسه هم‌صنف و فرصت‌های زمانی پذیرنده",
};

export default async function OpportunitiesRoute() {
  const result = await loadPeerOpportunities("M275");
  if (result.status === "error") {
    return <FeatureState error={result.error} />;
  }
  return (
    <PeerOpportunitiesPage
      payload={result.payload}
      generatedAt={result.artifact.generatedAt}
      fingerprint={result.artifact.dataset.fingerprint}
    />
  );
}
