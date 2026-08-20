import { ActionCenter } from "@/features/action-center/action-center"
import { loadActionCenterArtifact } from "@/features/action-center/load-artifact"
import { m275ActionCenterArtifact } from "@/mocks/action-center-m275"


export default async function Home() {
  const loadedArtifact = await loadActionCenterArtifact({
    developmentFixture: m275ActionCenterArtifact,
  })

  return (
    <ActionCenter
      artifact={loadedArtifact.artifact}
      showDevelopmentFixture={loadedArtifact.source === "development-fixture"}
    />
  )
}
