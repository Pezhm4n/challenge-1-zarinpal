# Implementation Plan — Member D: Peer & Opportunity Strategy

## 1. Ownership and Scope

- **Owner:** شایان — Member D
- **Branch:** `feat/member-d-peer-opportunities`
- **Feature key:** `peer-opportunities`
- **Route:** `/opportunities`
- **Primary output:** `public/analysis/peer-opportunities.json`
- **Owned areas:** `analytics/peer_opportunities/*`، `src/features/peer-opportunities/*` و route اختصاصی `src/app/opportunities/page.tsx`
- **Approval-gated areas:** `src/contracts/*`، `analytics/common/*`، Shared Evidence/Shell، configها و تمام فایل‌های Context/Plan

هدف این Slice پاسخ روشن به سه سؤال پذیرنده است:

1. تغییر حجم موفق بیشتر از Traffic، Conversion یا Average Ticket آمده است؟
2. پذیرنده در مقایسه با هم‌صنف واجد شرایط چه جایگاهی دارد؟
3. کدام بازه‌های روز/ساعت فرصت یا ریسک عملیاتی نشان می‌دهند؟

### Out of Scope

- Forecast یا ادعای علّی/تضمین رشد
- Benchmark خام بین صنف‌ها
- Holiday API و Seasonal model
- Auth، Database، Runtime analytics یا LLM
- Import مستقیم از Feature ممبر C یا سایر Featureها

## 2. Source of Truth and Contract Mapping

Artifact باید دقیقاً `AnalysisArtifact<PeerOpportunitiesPayload>` در `contracts.md` باشد:

| Contract field | Planned source |
|---|---|
| `schemaVersion` | ثابت `1.0` |
| `generatedAt` | زمان اجرای Pipeline به ISO |
| `dataset.*` | fingerprint و metadata از `analytics/common` متعلق به ایدین |
| `feature` | ثابت `peer-opportunities` |
| `merchants` | Payload مستقل هر پذیرنده و period ازپیش‌تولیدشده |
| `selection` | merchant، current period و comparison period مصوب |
| `decomposition` | Shapley decomposition روی Sessions × Verification × Ticket |
| `peerBenchmarks` | verification، verified volume و average verified ticket |
| `timeWindows` | cellهای weekday/hour با حداقل ۲۵ Session |
| `insights` | Growth، Peer و Timing summaries با مقصد `/opportunities` |
| `evidence` | Evidence مستقل برای هر Insight و عدد امتیازآور |

UI فقط Artifact معتبر را نمایش می‌دهد و هیچ KPI امتیازآوری را در Browser دوباره محاسبه نمی‌کند.

## 3. Planned Files

| File | Responsibility |
|---|---|
| `data/fixtures/peer-opportunities-sessions.csv` | Fixture کوچک، دستی و شامل حداقل ۱۲ peer، یک outlier، tie و cell کم‌نمونه |
| `analytics/peer_opportunities/__init__.py` | Module boundary |
| `analytics/peer_opportunities/formulas.py` | توابع pure برای decomposition، percentile و window lift |
| `analytics/peer_opportunities/queries.py` | Queryهای parameterized و ستون‌های صریح DuckDB |
| `analytics/peer_opportunities/artifact.py` | ساخت Payload، Evidence، stable ordering و validation خروجی |
| `analytics/peer_opportunities/pipeline.py` | CLI اجرای fixture/full dataset و نوشتن JSON نهایی |
| `analytics/tests/test_peer_opportunities.py` | Unit/regression tests اختصاصی Member D |
| `public/analysis/peer-opportunities.json` | Artifact کوچک و deployable تولیدشده |
| `src/features/peer-opportunities/load-peer-opportunities.ts` | خواندن و اعتبارسنجی JSON در Server boundary |
| `src/features/peer-opportunities/peer-opportunities-page.tsx` | Composition اصلی Feature و stateهای سطح صفحه |
| `src/features/peer-opportunities/components/growth-decomposition.tsx` | نمایش سه Driver و contribution ریالی |
| `src/features/peer-opportunities/components/peer-position.tsx` | percentile، median، peer count و insufficient state |
| `src/features/peer-opportunities/components/fair-comparison-note.tsx` | توضیح category/sample/size/ticket/period controls |
| `src/features/peer-opportunities/components/time-window-opportunities.tsx` | Top/Bottom windowها و Action پیشنهادی |
| `src/features/peer-opportunities/components/feature-state.tsx` | Missing/invalid/insufficient/data-quality states |
| `src/app/opportunities/page.tsx` | فقط route composition؛ بدون logic تحلیلی |

قبل از افزودن هر Component پایه، `src/components/ui` و shadcn registry بررسی می‌شود. Dependency جدید بدون تأیید پژمان اضافه نمی‌شود.

## 4. Data Flow

```text
challenge_data.csv (attempt grain)
  -> analytics/common normalized session view (ایدین)
  -> Member D merchant-period aggregates
  -> decomposition + peer cohort + time windows
  -> InsightSummary + EvidenceRecord
  -> validated peer-opportunities.json
  -> server-side loader
  -> /opportunities
```

### Required normalized session fields

Member D از Session grain مصوب ایدین استفاده می‌کند و آن را دوباره تعریف نمی‌کند. حداقل ورودی موردنیاز:

- `session_key`
- `merchant_key`
- `category_id` و `category_title`
- `amount_rial`
- `created_at`
- `eventual_verified`
- metadata لازم برای period completeness و dataset fingerprint

تا آماده‌شدن Loader مشترک، Fixture همین Shape را شبیه‌سازی می‌کند. Full pipeline فقط بعد از تطبیق Fixture schema با خروجی `analytics/common` اجرا می‌شود.

## 5. Analytical Design

### 5.1 Merchant-period metrics

برای هر merchant و period:

```text
sessions = count(distinct session_key)
verified_sessions = count(session where eventual_verified = true)
verification_rate = verified_sessions / sessions
verified_volume_rial = sum(amount_rial where eventual_verified = true)
average_verified_ticket_rial = verified_volume_rial / verified_sessions
```

- Amount همیشه integer ریال است.
- Zero denominator هیچ‌وقت به `0`، `Infinity` یا `NaN` تبدیل نمی‌شود.
- period جاری و comparison باید هم‌اندازه و کامل باشند؛ period ناقص با Data-quality note مشخص می‌شود.

### 5.2 Revenue decomposition

فرمول ثبت‌شده: `growth.revenue_decomposition.v1`.

```text
Volume = Sessions × Verification rate × Average verified ticket
```

برای جلوگیری از double-count شدن interaction، contribution سه Driver با Shapley decomposition روی تمام ۶ ترتیب جایگزینی previous→current محاسبه می‌شود:

- Traffic = Sessions
- Conversion = Verification rate
- Ticket = Average verified ticket

الزامات:

- مجموع contributionها دقیقاً برابر `current volume - previous volume` باشد.
- محاسبه داخلی با precision پایدار انجام شود.
- contributionهای نهایی به integer ریال گرد شوند و residual با ترتیب tie-break ثابت `traffic -> conversion -> ticket` reconcile شود.
- Formula، دوره‌ها، inputs، rounding و residual در Evidence ثبت شوند.
- برای M275 باید Traffic مثبت، Ticket غیرمنفی و Conversion Driver منفی اصلی باشد.

### 5.3 Peer cohort and percentile

فرمول ثبت‌شده: `peer.robust_percentile.v1`.

Eligibility پایه:

1. همان `category_id`
2. target merchant حذف شود
3. همان full period
4. حداقل ۱۰۰ Session برای target و هر peer
5. حداقل ۱۰ peer واجد شرایط بعد از تمام فیلترها

Metrics:

- `verificationRate`
- `verifiedVolumeRial`
- `averageVerifiedTicketRial`

Percentile پیشنهادی برای tieها mid-rank است:

```text
percentile = 100 × (count(peer < target) + 0.5 × count(peer = target)) / peer_count
```

- Median روی peerهای واجد شرایط و داده خام محاسبه می‌شود.
- Outlier داده حذف یا تغییر داده نمی‌شود؛ winsorization فقط در صورت نیاز برای display scale است و در Evidence ذکر می‌شود.
- Volume percentile و Ticket percentile جدا نمایش داده می‌شوند تا Volume بالا به‌تنهایی به‌عنوان performance بهتر تفسیر نشود.
- `controls` باید category، period، حداقل sample، target exclusion و نحوه تفسیر size/ticket را صریح ثبت کند.
- در peer count کمتر از ۱۰ یا target کمتر از ۱۰۰ Session، `sufficient=false` و Insight با status برابر `insufficient-data` تولید می‌شود؛ percentile در UI نمایش داده نمی‌شود.

### 5.4 Time-window opportunities

فرمول ثبت‌شده: `time.window_lift.v1`.

- Sessionهای period جاری بر اساس `created_at` به `weekday × hour` گروه‌بندی می‌شوند.
- cell کمتر از ۲۵ Session وارد `timeWindows` نمایشی نمی‌شود.
- Baseline نرخ Verification همان merchant در همان full period است.
- `liftVsBaselinePct` اختلاف نسبی نرخ cell با baseline است، نه اثر علّی کمپین.
- Top/Bottom windowها با sample، verification، volume و label غیرعلّی نمایش داده می‌شوند.
- در zero baseline یا period ناقص، timing Insight به insufficient/data-quality state می‌رود.
- Timezone تبدیل نمی‌شود مگر اینکه ایدین/پژمان معنای timezone ستون `created_at` را تأیید کنند.

## 6. Insight and Evidence Plan

حداقل سه Insight تولید می‌شود:

| Insight | `feature` | Formula | Evidence focus |
|---|---|---|---|
| Driver اصلی تغییر Volume | `growth` | `growth.revenue_decomposition.v1` | current/previous metrics، سه contribution و reconciliation |
| جایگاه نسبت به هم‌صنف | `peers` | `peer.robust_percentile.v1` | eligibility، peer count، median، percentile و controls |
| فرصت/ریسک زمانی | `timing` | `time.window_lift.v1` | baseline، cell sample، lift و محدودیت غیرعلّی |

هر `InsightSummary.evidenceId` باید دقیقاً به یک `EvidenceRecord.id` موجود اشاره کند. Evidence شامل این موارد است:

- Formula ID، source columns و grain
- period و comparison period
- filters، numerator/denominator و baseline
- category/sample/size/ticket/period controls
- assumptions، limitations و confidence reason
- dataset fingerprint
- تعداد محدودی sample row مجاز، بدون Card ID کامل
- Data-quality note برای zero denominator، insufficient sample، incomplete period یا outlier sensitivity

Integration با Action Center از طریق آرایه `InsightSummary` انجام می‌شود؛ Import مستقیم از Feature ایدین ممنوع است.

## 7. UI Implementation Plan

ترتیب اطلاعات در `/opportunities`:

1. خلاصه نتیجه و اقدام اصلی به زبان ساده
2. سه Driver با contribution ریالی و جهت اثر
3. جایگاه peer با percentile، median و peer count
4. «مقایسه منصفانه چگونه انجام شد؟» با controls
5. بازه‌های زمانی قوی/ضعیف و اقدام پیشنهادی
6. Evidence trigger برای هر عدد امتیازآور

### UI states

- Loading فقط در boundary واقعی async
- Missing artifact
- Invalid schema
- Merchant not found
- Period/comparison not found
- Insufficient peer group
- Zero verified orders / undefined ticket
- No eligible time window
- Data-quality warning برای incomplete period یا outlier sensitivity

### UX and accessibility

- فارسی و RTL؛ Mobile `390×844` و Desktop `1440×900`
- Action card قبل از visualization
- touch target حداقل ۴۴px و focus visible
- status فقط با رنگ منتقل نشود
- Chart/visual summary دارای متن screen-reader باشد
- رنگ‌ها فقط از Semantic Tokenهای موجود
- Evidence component مشترک ایدین reuse شود؛ نسخه Duplicate ساخته نشود

## 8. Test Matrix

| Test | Expected result |
|---|---|
| Attempt retries in fixture | هر `session_key` فقط یک بار در KPI حساب شود |
| Shapley identity | مجموع سه contribution دقیقاً برابر volume delta باشد |
| Only Traffic changes | تمام delta به Traffic تخصیص یابد |
| Only Conversion changes | تمام delta به Conversion تخصیص یابد |
| Only Ticket changes | تمام delta به Ticket تخصیص یابد |
| Rounding residual | خروجی integer و identity حفظ شود |
| Previous/current zero denominator | null/data-quality path؛ بدون Infinity/NaN |
| Merchant exclusion | target داخل peer cohort نباشد |
| Category isolation | peer صنف دیگر وارد محاسبه نشود |
| Percentile ties | mid-rank deterministic باشد |
| Extreme outlier | median پایدار و raw data دست‌نخورده بماند |
| Peer count 9/10 | 9 insufficient و 10 sufficient باشد |
| Target sessions 99/100 | 99 insufficient و 100 eligible باشد |
| Time cell 24/25 | 24 حذف و 25 قابل نمایش باشد |
| Incomplete period | warning/insufficient state تولید شود |
| Artifact contract | envelope، stable keys، evidence links و finite numbers معتبر باشند |
| M275 regression | facts مصوب decomposition/peer/timing بازتولید شوند |

Fixture-run و full-dataset run جدا اجرا می‌شوند. Fixture باید نتیجه دستی قابل محاسبه داشته باشد.

## 9. Execution Sequence and Checkpoints

### T+0 تا T+60m — Contract gate and fixture

- Shape نهایی normalized session و period definitions را از ایدین دریافت کن.
- تصمیم‌های D1 تا D3 بخش بعد را با پژمان قفل کن.
- Fixture حداقل ۱۲ peer + outlier + tie + sparse window بساز.
- تست‌های acceptance را ابتدا ثبت کن.

**Exit:** Fixture دستی و Formula behavior مشخص.

### T+1h تا T+3h — Analytics and artifact

- Formulaهای pure و Queryهای feature-owned را پیاده کن.
- Decomposition، peer guards و timing threshold را تست کن.
- Artifact fixture و سپس full-dataset را تولید و validate کن.
- M275 regression را قفل کن.

**Exit:** `peer-opportunities.json` واقعی با Evidence و تست سبز.

### T+3h تا T+4h — Early integration

- `InsightSummary` مربوط به decomposition را به ایدین تحویل بده.
- Evidence ID و destination را با Shared contract تطبیق بده.

**Exit:** Action Center می‌تواند حداقل Insight اصلی Member D را مصرف کند.

### T+4h تا T+6h — Feature UI

- Server loader و route composition را اضافه کن.
- Decomposition، peer position و controls را بساز.
- insufficient/error states و responsive baseline را پوشش بده.

**Exit:** `/opportunities` روی artifact واقعی functional باشد.

### T+6h تا T+8h — Timing, evidence and QA

- Top/Bottom timing windows و Actionها را کامل کن.
- Shared Evidence component ایدین را متصل کن.
- Mobile/Desktop/RTL/keyboard و تمام error stateها را بررسی کن.
- lint، typecheck، Python tests و build را اجرا کن.

**Exit:** Slice آماده Integration و Demo.

## 10. Decision Gates and Shared Requests

### D1 — Peer control policy — مصوب در Integration gate

سیاست نهایی: same category + same full period + target exclusion + حداقل ۱۰۰ Session برای هر پذیرنده و حداقل ۱۰ peer. برای جلوگیری از آستانهٔ دلخواه و افت نمونه، size/ticket فیلتر جداگانه نیستند؛ رتبه مبلغ کل و میانگین مبلغ به‌صورت دو معیار مستقل کنار نرخ موفقیت نمایش داده و محدودیت این تصمیم در Evidence ثبت می‌شود.

### D2 — Undefined numeric fields — مصوب در Integration gate

رفتار نهایی:

- رکورد decomposition یا time-window با مخرج نامعتبر از آرایه نمایشی حذف می‌شود و Insight حالت `insufficient-data` می‌گیرد.
- `EvidenceRecord.result = null` فقط همراه هشدار صریح Data-quality در Shared boundary پذیرفته می‌شود.
- `0` جعلی، `Infinity` و `NaN` در Pipeline و Runtime رد می‌شوند.

### D3 — Default periods/timezone — مصوب در Integration gate

- Decomposition دموی M275: May در برابر June.
- تمام واقعیت‌های peer و timing از دوره کامل June در Artifact نهایی بازتولید شده‌اند؛ اعداد آزمایشی اولیه کنار گذاشته شدند.
- `created_at` زمان محلی ایران است و هیچ تبدیل UTC روی برچسب روز/ساعت اعمال نمی‌شود.

### Dependencies by member

- **ایدین — Member A:** normalized session contract، dataset fingerprint، TS contracts، Shared Evidence و shell
- **پژمان — Member B / Human Lead:** اختیار Integration gate این مرحله را به شایان واگذار کرد
- **همتی — Member C:** Customer summary فقط در صورت نیاز از Contract مصوب؛ بدون Import مستقیم
- **شایان — Member D:** تمام Analytics/UI/Testهای Feature و handoff مربوط به peer opportunities

## 11. Validation and Handoff

دستورهای نهایی:

```text
.venv/Scripts/python -m pytest analytics/tests/test_peer_opportunities.py -q
npm run lint
npm run typecheck
npm run build
```

بررسی دستی:

- M275 روی Mobile و Desktop
- Evidence برای هر عدد با حداکثر دو interaction
- Peer insufficient state
- Missing/invalid artifact state
- هیچ raw CSV، secret، Card ID کامل یا stack trace در Client bundle/UI
- Diff فقط در File boundaryهای Member D یا Shared change تأییدشده

## 12. Definition of Done

- [ ] Decomposition identity و rounding دقیق است.
- [ ] Peer cohort category-specific، merchant-excluded و sample-guarded است.
- [ ] Percentile، volume rank و ticket rank جدا و درست تفسیر می‌شوند.
- [ ] Time window زیر ۲۵ Session نمایش داده نمی‌شود.
- [ ] M275 facts در period مصوب reproduce می‌شوند.
- [ ] هر Insight دارای Action، Confidence و Evidence معتبر است.
- [ ] تمام مبلغ‌ها integer ریال و تمام Estimateها صریح هستند.
- [ ] Loading/empty/error/insufficient/data-quality states پوشش داده شده‌اند.
- [ ] Mobile/Desktop/RTL/keyboard بررسی شده است.
- [ ] Python tests، lint، typecheck و build سبز هستند.
- [ ] هیچ تغییر خارج Scope یا Shared بدون تأیید وجود ندارد.
- [ ] خروجی برای Integration ایدین و Review پژمان آماده است.
