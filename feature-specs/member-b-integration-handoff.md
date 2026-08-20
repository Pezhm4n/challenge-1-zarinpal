# Member B Integration Handoff — Conversion Rescue

## Handoff status

- Owner: Member B / Aydin
- Branch: `feat/member-b-conversion-rescue`
- Route: `/recovery`
- Feature artifact: `public/analysis/conversion-recovery.json`
- Feature key: `conversion-recovery`
- Default merchant: `M275`
- State: **Feature complete; ready for Human Lead review and integration**
- Authority: Human Lead performs Shared Contract changes، Merge، Push و Deploy.

## Delivered vertical slice

- Session-grain funnel: `session → attempted → in-bank → verified`
- NoAttempt count، share و requested amount
- First-try-non-verified Retry recovery
- Conservative non-causal NoAttempt recovery scenario
- PSP × amount-band controls with approved sample guards
- Traceable Evidence with formula، filters، numerator/denominator، assumptions، limitations، quality notes، masked samples و dataset fingerprint
- Strict runtime artifact validation
- Persian RTL responsive UI with loading، error، empty، insufficient-data و keyboard/focus states

Only `try_status='Verified'` is treated as successful sales/revenue. `Paid` is stage context only and `Reversed` does not imply success.

## Action Center contribution packet

Artifact envelope:

- `schemaVersion`: `1.0`
- `feature`: `conversion-recovery`
- `dataset.fingerprint`: `2e04a0606153487e900df111605bb8a02797c1a3b9fed2454b1e95f6d1bbe882`
- Merchant keys: `M275`
- Evidence records: `39`
- Current period: `2026-06-01` to `2026-06-30`
- Comparison period: `2026-05-01` to `2026-05-31`

Prioritized Insight:

```json
{
  "id": "recovery-no-attempt-M275",
  "feature": "recovery",
  "priority": 1,
  "status": "opportunity",
  "impact": {
    "value": 4908817383,
    "unit": "rial",
    "labelFa": "پتانسیل برآوردی و غیرتضمینی",
    "kind": "estimate",
    "displayPrecision": 0
  },
  "confidence": "medium",
  "evidenceId": "recovery-M275-scenario-volume",
  "destination": "/recovery"
}
```

Action Center must consume the Insight and its Evidence from the artifact; it must not recompute Member B analytics.

Primary Evidence IDs for integration/demo:

- Insight impact: `recovery-M275-scenario-volume`
- Estimated orders: `recovery-M275-scenario-orders`
- NoAttempt share: `recovery-M275-no-attempt-share`
- NoAttempt amount: `recovery-M275-no-attempt-amount`
- Retry recovery: `recovery-M275-retry-rate`
- Funnel verified count: `recovery-M275-funnel-verified-count`
- Funnel verified rate: `recovery-M275-funnel-verified-rate`

The Python Action Center composer was dry-run against the real artifact. It selected `recovery-no-attempt-M275` and imported all `39` Evidence records successfully.

## Human Lead Shared Contract gate

The local `main` still contains the pre-approval Shared Conversion Recovery shape. Member B intentionally did not edit Shared files.

Human Lead must land the already-approved Shared semantics before validating the composed Action Center artifact:

- `EvidenceRecord.result: MetricValue | null`
- `noAttempt.sharePct: number | null`
- `retry.firstTryNonVerifiedSessions` replaces `retriedSessions`
- `retry.recoveryPct: number | null`
- Segment `verifyPct` and optional `peerOrBaselinePct` accept `null`
- Shared schema accepts null Evidence result only with an explicit quality warning.
- Shared Evidence UI renders null as «قابل محاسبه نیست» and shows the quality code.
- No numeric Insight، ranking، winner or recommendation may be produced from null Evidence.

The M275 artifact contains exactly four intentional null Evidence results, all for low-sample `PSP-07 × amount-band` cells with approved minimum-sample quality codes. The prioritized recovery Insight uses non-null scenario Evidence.

Without the Shared nullability update, the current TypeScript Action Center boundary rejects the composed Evidence index even though Python composition succeeds.

## Integration sequence

1. Land the Human Lead-owned Shared Contract/schema/Evidence UI update.
2. Review or merge the Member B commit chain in order.
3. Confirm the same dataset fingerprint across Action Center and all feature artifacts.
4. Compose Action Center without recomputing feature analytics:

```bash
python -m analytics.action_center \
  --base path/to/action-center-base.json \
  --feature public/analysis/conversion-recovery.json \
  --feature public/analysis/customer-growth.json \
  --feature public/analysis/peer-opportunities.json \
  --output public/analysis/action-center.json
```

5. Validate the composed artifact through the Shared TypeScript boundary.
6. Verify that the Action Center card navigates to `/recovery` and opens `recovery-M275-scenario-volume` as its Evidence.
7. Run the full verification matrix before Merge/Push/Deploy.

Member B commit chain before the final Handoff commit:

1. `6001f34` — `docs(conversion-recovery): add implementation plan`
2. `61d5b9b` — `feat(conversion-recovery): lock recovery formulas`
3. `b51258c` — `feat(conversion-recovery): build traceable artifact`
4. `fc5eb7c` — `feat(conversion-recovery): add recovery experience`
5. `cbabfa8` — `fix(conversion-recovery): harden recovery states`

## Conflict surface

Member B changed no tracked Context، Shared contract، common analytics، global shell، global styles، shadcn primitives or configuration.

Expected integration files are limited to:

- `analytics/conversion_recovery/*`
- Member B analytics tests and fixtures
- `public/analysis/conversion-recovery.json`
- `src/features/conversion-recovery/*`
- `src/app/recovery/*`
- Member B feature specs

If Merge reports a conflict outside these paths, stop and let Human Lead resolve ownership before proceeding.

## Verification matrix

```bash
node --test src/features/conversion-recovery/conversion-recovery-artifact.test.mjs
.venv/Scripts/python.exe -m pytest analytics/tests/test_conversion_recovery.py analytics/tests/test_conversion_recovery_artifact.py -q -p no:cacheprovider
.venv/Scripts/python.exe -m pytest analytics/tests -q -p no:cacheprovider
npm run lint
npm run typecheck
npm run build
```

Last verified results on the Member B branch:

- TypeScript artifact boundary: `11 passed`
- Full analytics regression: `57 passed`
- lint: passed
- typecheck: passed
- production build: passed
- Browser QA: Desktop `1440×900` and Mobile `390×844`
- Horizontal overflow، duplicate DOM IDs، unnamed visible controls و console errors: zero

## Demo path

1. Open the prioritized recovery Insight in Action Center.
2. Show the headline: demand and average ticket did not fall; NoAttempt rose from `10.99%` to `39.49%`.
3. Follow the Session funnel and show that Retry rows are not double-counted.
4. Open the scenario Evidence and explain `551` estimated orders / `4,908,817,383` rial as non-causal and non-guaranteed.
5. Open a low-sample PSP Evidence and show why no winner/ranking is produced.
6. Repeat the core flow on Mobile.

## Remaining owner actions

- Member B: no feature implementation remains after this Handoff commit.
- Human Lead: Shared gate، final Action Center composition، Merge، Push، Deploy and submission QA.
- Demo owner: use the non-causal wording and show both Desktop and Mobile.
