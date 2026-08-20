import { CircleAlert } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  ConversionRecoveryArtifactError,
  getConversionRecoveryPayload,
  loadConversionRecoveryArtifact,
} from "@/features/conversion-recovery/conversion-recovery-artifact"
import { ConversionRecoveryPage } from "@/features/conversion-recovery/conversion-recovery-page"


type RecoveryRouteProps = {
  searchParams: Promise<{ merchant?: string | string[] }>
}

async function loadPageData(searchParams: RecoveryRouteProps["searchParams"]) {
  try {
    const artifact = await loadConversionRecoveryArtifact()
    const params = await searchParams
    const requestedMerchant = Array.isArray(params.merchant)
      ? params.merchant[0]
      : params.merchant
    const merchantKeys = Object.keys(artifact.merchants).sort((left, right) => {
      if (left === "M275") return -1
      if (right === "M275") return 1
      return left.localeCompare(right, "en")
    })
    const merchantKey = requestedMerchant ?? merchantKeys[0]
    const payload = getConversionRecoveryPayload(artifact, merchantKey)

    return { artifact, payload, merchantKeys, errorMessage: null }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof ConversionRecoveryArtifactError
        ? error.message
        : "تحلیل بازیابی در حال حاضر قابل نمایش نیست."

    return { artifact: null, payload: null, merchantKeys: [], errorMessage }
  }
}

export default async function RecoveryRoute({ searchParams }: RecoveryRouteProps) {
  const result = await loadPageData(searchParams)

  if (!result.artifact || !result.payload) {
    return (
      <section
        aria-labelledby="recovery-error-title"
        className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center"
      >
        <Alert variant="destructive">
          <CircleAlert aria-hidden="true" />
          <AlertTitle id="recovery-error-title">
            خطا در بارگذاری تحلیل بازیابی
          </AlertTitle>
          <AlertDescription>{result.errorMessage}</AlertDescription>
        </Alert>
      </section>
    )
  }

  return (
    <ConversionRecoveryPage
      artifact={result.artifact}
      payload={result.payload}
      merchantKeys={result.merchantKeys}
    />
  )
}
