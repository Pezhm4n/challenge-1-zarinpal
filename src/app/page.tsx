import { ActionCenter } from "@/features/action-center/action-center"
import type { GrowthDecompositionSource } from "@/features/action-center/growth-waterfall-model"
import { loadActionCenterArtifact } from "@/features/action-center/load-artifact"
import { loadPeerOpportunities } from "@/features/peer-opportunities/load-peer-opportunities"
import { m275ActionCenterArtifact } from "@/mocks/action-center-m275"


export default async function Home() {
  const loadedArtifact = await loadActionCenterArtifact({
    developmentFixture: m275ActionCenterArtifact,
  })

  // Route composition only: the peer artifact feeds the growth waterfall of
  // the Action Center. When it is unavailable the chart is hidden, never faked.
  const peerResult = await loadPeerOpportunities()
  let growthDecomposition: GrowthDecompositionSource | undefined
  if (peerResult.status === "ready") {
    const payload = peerResult.payload
    growthDecomposition = {
      merchantKey: payload.selection.merchantKey,
      drivers: payload.decomposition.map((driver) => ({
        driver: driver.driver,
        current: driver.current,
        previous: driver.previous,
        changePct: driver.changePct,
        contributionRial: driver.contributionRial,
      })),
      currentVolumeRial:
        payload.peerBenchmarks.find(
          (benchmark) => benchmark.metric === "verifiedVolumeRial",
        )?.merchantValue ?? null,
    }
  }

  return (
    <ActionCenter
      artifact={loadedArtifact.artifact}
      showDevelopmentFixture={loadedArtifact.source === "development-fixture"}
      growthDecomposition={growthDecomposition}
    />
  )
}
