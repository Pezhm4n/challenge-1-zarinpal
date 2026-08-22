import { Alert, AlertDescription, AlertTitle } from "@/features/customer-growth/ui/alert"
import {
  CustomerGrowthArtifactError,
  getCustomerGrowthPayload,
  loadCustomerGrowthArtifact,
} from "@/features/customer-growth/customer-growth-artifact"
import { CustomerGrowthPage } from "@/features/customer-growth/customer-growth-page"

type CustomersPageProps = {
  searchParams: Promise<{ merchant?: string | string[] }>
}

async function loadPageData(searchParams: CustomersPageProps["searchParams"]) {
  try {
    const artifact = await loadCustomerGrowthArtifact()
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
    const payload = getCustomerGrowthPayload(artifact, merchantKey)

    return { artifact, merchantKeys, payload, errorMessage: null }
  } catch (error: unknown) {
    const errorMessage =
      error instanceof CustomerGrowthArtifactError
        ? error.message
        : "گزارش مشتریان در حال حاضر قابل نمایش نیست."

    return { artifact: null, merchantKeys: [], payload: null, errorMessage }
  }
}

export default async function CustomersPage({ searchParams }: CustomersPageProps) {
  const result = await loadPageData(searchParams)

  if (!result.artifact || !result.payload) {
    return (
      <div className="mx-auto flex min-h-[50vh] w-full max-w-3xl items-center p-4 sm:p-6">
        <Alert variant="destructive" className="rounded-2xl">
          <AlertTitle>خطا در بارگذاری گزارش مشتریان</AlertTitle>
          <AlertDescription>{result.errorMessage}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <CustomerGrowthPage
      artifact={result.artifact}
      merchantKeys={result.merchantKeys}
      payload={result.payload}
    />
  )
}

