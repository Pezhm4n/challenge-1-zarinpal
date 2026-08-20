import type {
  ActionCenterPayload,
  AnalysisArtifact,
  EvidenceSampleRow,
  MetricValue,
} from "../contracts/analysis"

const datasetFingerprint =
  "abb353bb023c6870ccf6694ce9d2bc38c9170e490b609d2a00b1722e807322db"

const currentPeriod = { from: "2026-06-01", to: "2026-06-30" } as const
const comparisonPeriod = { from: "2026-05-01", to: "2026-05-31" } as const

const partialPeriodQuality = {
  severity: "warning",
  code: "PARTIAL_MERCHANT_PERIOD",
  messageFa:
    "آخرین Session این پذیرنده در این بازه مربوط به ۲۲ ژوئن است؛ مقایسه ماهانه با این محدودیت تفسیر شود.",
} as const

const noAttemptSamples: EvidenceSampleRow[] = [
  {
    sessionKey: "1487743",
    trySeq: 0,
    createdAt: "2026-06-01T00:21:17",
    amountRial: 6_880_000,
    sessionStatus: "Failed",
    tryStatus: "NoAttempt",
    pspCode: null,
    payerCardMasked: null,
  },
  {
    sessionKey: "1558167",
    trySeq: 0,
    createdAt: "2026-06-01T02:25:30",
    amountRial: 15_680_000,
    sessionStatus: "Failed",
    tryStatus: "NoAttempt",
    pspCode: null,
    payerCardMasked: null,
  },
]

const verifiedSamples: EvidenceSampleRow[] = [
  {
    sessionKey: "152992",
    trySeq: 1,
    createdAt: "2026-06-01T00:05:54",
    amountRial: 12_770_000,
    sessionStatus: "Verified",
    tryStatus: "Verified",
    pspCode: "PSP-03",
    payerCardMasked: "CARD********3881",
  },
  {
    sessionKey: "168106",
    trySeq: 1,
    createdAt: "2026-06-01T00:31:38",
    amountRial: 5_190_000,
    sessionStatus: "Verified",
    tryStatus: "Verified",
    pspCode: "PSP-03",
    payerCardMasked: "CARD********2664",
  },
]

const salesDelta: MetricValue = {
  value: -3_357_260_000,
  unit: "rial",
  labelFa: "تغییر فروش موفق نسبت به مه",
  kind: "actual",
  displayPrecision: 0,
}

const noAttemptShare: MetricValue = {
  value: 39.49,
  unit: "percent",
  labelFa: "سهم Sessionهای بدون ورود به تلاش پرداخت",
  kind: "actual",
  displayPrecision: 2,
}

const recoveryEstimate: MetricValue = {
  value: 4_900_000_000,
  unit: "rial",
  labelFa: "پتانسیل برآوردی بازیابی فروش",
  kind: "estimate",
  displayPrecision: 0,
}

export const m275ActionCenterArtifact = {
  schemaVersion: "1.0",
  generatedAt: "2026-07-01T00:00:00Z",
  dataset: {
    fingerprint: datasetFingerprint,
    rowCount: 2_213_289,
    sessionCount: 2_062_839,
    minCreatedAt: "2026-01-01",
    maxCreatedAt: "2026-06-30",
  },
  feature: "action-center",
  merchants: {
    M275: {
      merchant: {
        merchantKey: "M275",
        categoryId: "56610001",
        categoryTitleFa: "کیف و کفش فروشی",
        availablePeriods: [
          {
            ...currentPeriod,
            labelFa: "ژوئن ۲۰۲۶ (داده تا ۲۲ ژوئن)",
          },
        ],
        dataCoverage: {
          sessions: 3_183,
          verifiedSessions: 1_170,
          firstCreatedAt: "2026-06-01T00:05:54",
          lastCreatedAt: "2026-06-22T10:28:19",
          quality: "limited",
        },
      },
      selection: {
        merchantKey: "M275",
        period: currentPeriod,
        comparison: comparisonPeriod,
      },
      headlineMetrics: [
        {
          id: "verified-sales-delta",
          value: salesDelta,
          change: {
            value: -24.37,
            unit: "percent",
            labelFa: "درصد تغییر فروش موفق",
            kind: "actual",
            displayPrecision: 2,
          },
          evidenceId: "evidence-m275-sales-delta",
        },
        {
          id: "sessions",
          value: {
            value: 3_183,
            unit: "count",
            labelFa: "Session در ژوئن",
            kind: "actual",
            displayPrecision: 0,
          },
          change: {
            value: 16.59,
            unit: "percent",
            labelFa: "رشد Session نسبت به مه",
            kind: "actual",
            displayPrecision: 2,
          },
          evidenceId: "evidence-m275-session-growth",
        },
        {
          id: "session-conversion",
          value: {
            value: 36.76,
            unit: "percent",
            labelFa: "نرخ موفقیت Session",
            kind: "actual",
            displayPrecision: 2,
          },
          change: {
            value: -21.01,
            unit: "percentage-point",
            labelFa: "تغییر نرخ موفقیت نسبت به مه",
            kind: "actual",
            displayPrecision: 2,
          },
          evidenceId: "evidence-m275-conversion",
        },
      ],
      prioritizedInsights: [
        {
          id: "m275-recovery-potential",
          feature: "recovery",
          priority: 1,
          status: "opportunity",
          titleFa: "بازیابی مسیر قبل از درگاه بیشترین ظرفیت را دارد",
          findingFa:
            "با بازگشت سهم NoAttempt به سطح مه و ثابت‌ماندن Conversion پرداخت‌های آغازشده، حدود ۵۵۱ خرید ظرفیت بازیابی دارد.",
          actionFa:
            "تغییرات مسیر Checkout تا انتقال به درگاه را از ابتدای ژوئن بررسی و نرخ ورود به درگاه را روزانه پایش کنید.",
          impact: recoveryEstimate,
          confidence: "medium",
          confidenceReasonFa:
            "برآورد بر داده Session-level استوار است، اما دوره ژوئن برای این پذیرنده تا ۲۲ ژوئن پوشش دارد و سناریو علّی نیست.",
          evidenceId: "evidence-m275-recovery-scenario",
          destination: "/recovery",
        },
        {
          id: "m275-no-attempt-warning",
          feature: "recovery",
          priority: 2,
          status: "warning",
          titleFa: "توقف قبل از ورود به پرداخت افزایش یافته است",
          findingFa:
            "۱٬۲۵۷ Session از ۳٬۱۸۳ Session ژوئن وارد هیچ تلاش پرداختی نشده‌اند؛ سهم NoAttempt از ۱۰٫۹۹٪ به ۳۹٫۴۹٪ رسیده است.",
          actionFa:
            "لاگ‌های انتقال Checkout به درگاه و خطاهای سمت پذیرنده را برای Sessionهای NoAttempt بازبینی کنید.",
          impact: noAttemptShare,
          confidence: "high",
          confidenceReasonFa:
            "صورت و مخرج مستقیماً پس از تجمیع Attemptها روی session_key محاسبه شده‌اند.",
          evidenceId: "evidence-m275-no-attempt",
          destination: "/recovery",
        },
        {
          id: "m275-sales-decline",
          feature: "growth",
          priority: 3,
          status: "warning",
          titleFa: "رشد Session به فروش موفق تبدیل نشده است",
          findingFa:
            "Sessionها ۱۶٫۵۹٪ بیشتر شده‌اند، اما فروش موفق از ۱۳٬۷۷۸٬۵۳۰٬۰۰۰ به ۱۰٬۴۲۱٬۲۷۰٬۰۰۰ ریال کاهش یافته است.",
          actionFa:
            "افت Conversion را پیش از تغییر قیمت یا جذب ترافیک بیشتر برطرف کنید؛ میانگین مبلغ خرید عامل اصلی افت نیست.",
          impact: salesDelta,
          confidence: "high",
          confidenceReasonFa:
            "فروش موفق فقط یک‌بار برای هر Session دارای حداقل یک Attempt تأییدشده جمع شده است.",
          evidenceId: "evidence-m275-sales-delta",
          destination: "/opportunities",
        },
      ],
      evidenceIndex: {
        "evidence-m275-sales-delta": {
          id: "evidence-m275-sales-delta",
          formulaId: "growth.revenue_decomposition.v1",
          titleFa: "تغییر فروش موفق",
          explanationFa:
            "مبلغ هر Session دارای حداقل یک Attempt با وضعیت Verified یک‌بار جمع و با دوره قبل مقایسه شده است.",
          grain: "merchant-period",
          sourceColumns: [
            "session_key",
            "merchant_key",
            "amount",
            "try_status",
            "created_at",
          ],
          filters: [
            { field: "merchant_key", operator: "=", value: "M275" },
            { field: "try_status", operator: "session_has", value: "Verified" },
          ],
          period: currentPeriod,
          comparisonPeriod,
          numerator: { labelFa: "فروش موفق ژوئن به ریال", value: 10_421_270_000 },
          denominator: { labelFa: "فروش موفق مه به ریال", value: 13_778_530_000 },
          formulaFa:
            "فروش موفق ژوئن منهای فروش موفق مه = ۱۰٬۴۲۱٬۲۷۰٬۰۰۰ منهای ۱۳٬۷۷۸٬۵۳۰٬۰۰۰ ریال",
          result: salesDelta,
          baseline: {
            type: "previous-period-verified-volume-rial",
            value: 13_778_530_000,
            sampleSize: 2_730,
          },
          controls: [
            "تجمیع روی session_key قبل از محاسبه فروش",
            "هر Session موفق فقط یک‌بار شمرده شده است",
            "مقایسه همان پذیرنده در دو دوره متوالی",
          ],
          assumptions: ["Verified معیار مصوب فروش موفق در MVP است"],
          limitations: [
            "داده ژوئن این پذیرنده تا ۲۲ ژوئن پوشش دارد",
            "این مقایسه اثر علّی هیچ تغییر محصولی را اثبات نمی‌کند",
          ],
          dataQuality: [partialPeriodQuality],
          sampleRows: verifiedSamples,
          datasetFingerprint,
        },
        "evidence-m275-session-growth": {
          id: "evidence-m275-session-growth",
          formulaId: "growth.revenue_decomposition.v1",
          titleFa: "رشد تعداد Session",
          explanationFa:
            "تعداد session_key یکتا در ژوئن با تعداد Session یکتا در مه مقایسه شده است.",
          grain: "merchant-period",
          sourceColumns: ["session_key", "merchant_key", "created_at"],
          filters: [{ field: "merchant_key", operator: "=", value: "M275" }],
          period: currentPeriod,
          comparisonPeriod,
          numerator: { labelFa: "Sessionهای ژوئن", value: 3_183 },
          denominator: { labelFa: "Sessionهای مه", value: 2_730 },
          formulaFa: "(۳٬۱۸۳ منهای ۲٬۷۳۰) تقسیم بر ۲٬۷۳۰ = ۱۶٫۵۹٪ رشد",
          result: {
            value: 3_183,
            unit: "count",
            labelFa: "Session در ژوئن",
            kind: "actual",
            displayPrecision: 0,
          },
          baseline: {
            type: "previous-period-session-count",
            value: 2_730,
            sampleSize: 2_730,
          },
          controls: ["شمارش session_key یکتا", "مقایسه همان پذیرنده"],
          assumptions: ["created_at زمان انتساب Session به دوره است"],
          limitations: ["داده ژوئن این پذیرنده تا ۲۲ ژوئن پوشش دارد"],
          dataQuality: [partialPeriodQuality],
          sampleRows: [...noAttemptSamples, ...verifiedSamples],
          datasetFingerprint,
        },
        "evidence-m275-conversion": {
          id: "evidence-m275-conversion",
          formulaId: "session.verify_rate.v1",
          titleFa: "نرخ موفقیت Session",
          explanationFa:
            "Session موفق Sessionی است که دست‌کم یک Attempt با وضعیت Verified داشته باشد.",
          grain: "session",
          sourceColumns: ["session_key", "try_status", "created_at", "merchant_key"],
          filters: [{ field: "merchant_key", operator: "=", value: "M275" }],
          period: currentPeriod,
          comparisonPeriod,
          numerator: { labelFa: "Sessionهای موفق ژوئن", value: 1_170 },
          denominator: { labelFa: "تمام Sessionهای ژوئن", value: 3_183 },
          formulaFa: "۱٬۱۷۰ تقسیم بر ۳٬۱۸۳ = ۳۶٫۷۶٪",
          result: {
            value: 36.76,
            unit: "percent",
            labelFa: "نرخ موفقیت Session",
            kind: "actual",
            displayPrecision: 2,
          },
          baseline: {
            type: "previous-period-session-verify-rate-percent",
            value: 57.77,
            sampleSize: 2_730,
          },
          controls: ["تجمیع Retryها روی session_key", "bool_or برای وضعیت Verified"],
          assumptions: ["Verified معیار مصوب موفقیت در MVP است"],
          limitations: ["داده ژوئن این پذیرنده تا ۲۲ ژوئن پوشش دارد"],
          dataQuality: [partialPeriodQuality],
          sampleRows: verifiedSamples,
          datasetFingerprint,
        },
        "evidence-m275-no-attempt": {
          id: "evidence-m275-no-attempt",
          formulaId: "funnel.no_attempt_share.v1",
          titleFa: "سهم Sessionهای NoAttempt",
          explanationFa:
            "Sessionهایی که بیشترین try_seq آن‌ها صفر و وضعیت آن‌ها NoAttempt است، قبل از ورود به تلاش پرداخت متوقف شده‌اند.",
          grain: "session",
          sourceColumns: [
            "session_key",
            "try_seq",
            "try_status",
            "merchant_key",
            "created_at",
          ],
          filters: [
            { field: "merchant_key", operator: "=", value: "M275" },
            { field: "max(try_seq)", operator: "=", value: 0 },
            { field: "try_status", operator: "=", value: "NoAttempt" },
          ],
          period: currentPeriod,
          comparisonPeriod,
          numerator: { labelFa: "Sessionهای NoAttempt ژوئن", value: 1_257 },
          denominator: { labelFa: "تمام Sessionهای ژوئن", value: 3_183 },
          formulaFa: "۱٬۲۵۷ تقسیم بر ۳٬۱۸۳ = ۳۹٫۴۹٪",
          result: noAttemptShare,
          baseline: {
            type: "previous-period-no-attempt-share-percent",
            value: 10.99,
            sampleSize: 2_730,
          },
          controls: ["تجمیع روی session_key", "NoAttempt فقط با try_seq صفر"],
          assumptions: ["try_seq صفر طبق قرارداد Session بدون تلاش پرداخت است"],
          limitations: ["داده ژوئن این پذیرنده تا ۲۲ ژوئن پوشش دارد"],
          dataQuality: [partialPeriodQuality],
          sampleRows: noAttemptSamples,
          datasetFingerprint,
        },
        "evidence-m275-recovery-scenario": {
          id: "evidence-m275-recovery-scenario",
          formulaId: "scenario.no_attempt_recovery.v1",
          titleFa: "سناریوی محافظه‌کارانه بازیابی NoAttempt",
          explanationFa:
            "این عدد یک Estimate سناریویی است: سهم NoAttempt به سطح مه برمی‌گردد و نرخ موفقیت Sessionهای واردشده به تلاش و میانگین مبلغ خرید ژوئن ثابت می‌ماند.",
          grain: "merchant-period",
          sourceColumns: [
            "session_key",
            "try_seq",
            "try_status",
            "amount",
            "merchant_key",
            "created_at",
          ],
          filters: [{ field: "merchant_key", operator: "=", value: "M275" }],
          period: currentPeriod,
          comparisonPeriod,
          numerator: { labelFa: "خریدهای برآوردی قابل بازیابی", value: 551 },
          denominator: { labelFa: "Sessionهای واردشده به تلاش در ژوئن", value: 1_926 },
          formulaFa:
            "Sessionهای NoAttempt مازاد × نرخ موفقیت Sessionهای واردشده به تلاش × میانگین مبلغ خرید موفق ژوئن؛ نتیجه برای نمایش محافظه‌کارانه گرد شده است.",
          result: recoveryEstimate,
          baseline: {
            type: "previous-period-no-attempt-share-percent",
            value: 10.99,
            sampleSize: 2_730,
          },
          controls: [
            "Baseline همان پذیرنده در مه",
            "Conversion فقط روی ۱٬۹۲۶ Session attempted ژوئن",
            "میانگین مبلغ فقط روی ۱٬۱۷۰ Session موفق ژوئن",
          ],
          assumptions: [
            "سهم NoAttempt می‌تواند تا سطح مه کاهش یابد",
            "نرخ موفقیت پرداخت‌های آغازشده ثابت می‌ماند",
            "میانگین مبلغ خرید موفق ژوئن ثابت می‌ماند",
          ],
          limitations: [
            "این سناریو تضمین درآمد یا ادعای علّی نیست",
            "برآورد برای نمایش محافظه‌کارانه به ۴٫۹ میلیارد ریال گرد شده است",
            "داده ژوئن این پذیرنده تا ۲۲ ژوئن پوشش دارد",
          ],
          dataQuality: [
            partialPeriodQuality,
            {
              severity: "info",
              code: "COUNTERFACTUAL_ESTIMATE",
              messageFa: "نتیجه سناریو Estimate است و اثر علّی یا درآمد قطعی محسوب نمی‌شود.",
            },
          ],
          sampleRows: [...noAttemptSamples, ...verifiedSamples],
          datasetFingerprint,
        },
      },
    },
  },
} satisfies AnalysisArtifact<ActionCenterPayload>

export const m275ActionCenterFixtureMeta = {
  developmentOnly: true,
  labelFa: "داده نمونه توسعه M275",
  replacementFile: "public/analysis/action-center.json",
} as const
