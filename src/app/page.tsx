import { ActionCenter } from "@/features/action-center/action-center"
import { m275ActionCenterArtifact } from "@/mocks/action-center-m275"


export default function Home() {
  return (
    <ActionCenter
      artifact={m275ActionCenterArtifact}
      showDevelopmentFixture={process.env.NODE_ENV === "development"}
    />
  )
}
