import type { Metadata } from "next";

import { FeatureState } from "@/features/peer-opportunities/components/feature-state";
import { loadPeerOpportunities } from "@/features/peer-opportunities/load-peer-opportunities";
import { PeerOpportunitiesPage } from "@/features/peer-opportunities/peer-opportunities-page";

export const metadata: Metadata = {
  title: "فرصت‌های رشد | نبض زرین",
  description: "تفکیک عوامل رشد، مقایسه هم‌صنف و فرصت‌های زمانی فروشگاه",
};

type OpportunitiesRouteProps = {
  searchParams: Promise<{ merchant?: string | string[] }>;
};

export default async function OpportunitiesRoute({
  searchParams,
}: OpportunitiesRouteProps) {
  const params = await searchParams;
  const requestedMerchant = Array.isArray(params.merchant)
    ? params.merchant[0]
    : params.merchant;
  const result = await loadPeerOpportunities(requestedMerchant ?? "M275");
  if (result.status === "error") {
    return <FeatureState error={result.error} />;
  }
  return <PeerOpportunitiesPage payload={result.payload} />;
}
