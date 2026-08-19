# Member D — Peer & Opportunity Strategy

## Assignment

- Provisional Agent: Codex #2
- Primary Vertical Slice: Growth decomposition، peer benchmark و timing opportunities
- Secondary responsibility: statistical guardrails and demo narrative
- Decision authority: Folderهای `peer-opportunities`; Shared changes approval-gated

## Goal

به پذیرنده توضیح دهد تغییر درآمد از Traffic، Conversion یا Ticket آمده، نسبت به هم‌صنف مشابه کجاست و بهترین فرصت زمانی/استراتژیک چیست.

## User Flow

1. کاربر `/opportunities` را باز می‌کند.
2. Revenue change به سه Driver ساده شکسته می‌شود.
3. Peer percentile با sample و controls دیده می‌شود.
4. Time windows قوی/ضعیف و اقدام پیشنهادی نمایش داده می‌شوند.
5. Evidence نشان می‌دهد Benchmark و controls چگونه ساخته شده‌اند.

## Inputs

- Session-level merchant/category/amount/status/time
- Customer summary اختیاری فقط از Contract، نه import مستقیم C
- period comparison

## Outputs

- `analytics/peer_opportunities/*`
- `public/analysis/peer-opportunities.json`
- UI در `src/features/peer-opportunities`
- Route `/opportunities`
- Insight/Evidence summaries

## Core Analysis

- Volume = Sessions × Verification rate × Avg verified ticket
- Period decomposition با روش بدون double-count interaction و مستند
- Peer percentile هم‌صنف با eligibility و minimum sample
- کنترل size/ticket/period؛ robust median
- Day/hour windows با minimum 25 sessions
- Data concentration/coverage warnings

## M275 Required Story

- Session رشد کرده و Ticket افت نکرده؛ Conversion driver منفی است.
- Overall verification 54.2% و حدود percentile 38.8 در کفش‌فروشی‌های واجد شرایط.
- Volume حدود percentile 87.8 و ticket حدود percentile 10.2؛ بنابراین مقایسه خام volume کافی نیست.
- June timing insights فقط با sample threshold و بدون ادعای causality.

## UI

- Three-driver decomposition
- Peer position با percentile و peer count
- «مقایسه منصفانه چگونه انجام شد؟»
- Top/bottom time windows با Action
- Evidence trigger و insufficient-peer state

## Dependencies

- Hard: Session grain، Contract و period definitions
- Soft: Evidence component A
- Can Mock: Artifact و peer data
- Must integrate early: Decomposition InsightSummary تا T+4h

## Mock Strategy

Peer fixture شامل حداقل ۱۲ Merchant ساختگی و یک outlier باشد تا median/percentile/sample guard تست شود.

## Acceptance Criteria

- Decomposition جمعاً با volume delta سازگار باشد.
- Benchmark category-specific و merchant-excluded باشد.
- Minimum peer/sample guard اجرا شود.
- Size/ticket/period controls در Evidence ذکر شوند.
- Percentile و volume rank مخلوط نشوند.
- Time window زیر ۲۵ Session نمایش داده نشود.
- M275 facts reproduce شوند.

## Error Cases

- peer group <10
- merchant <100 sessions
- period ناقص یا بدون prior period
- zero verified orders/avg ticket
- extreme outlier
- sparse day/hour cell

## Tests

- decomposition identity
- percentile with ties/outlier
- merchant exclusion
- minimum sample guard
- time window threshold
- M275 regression values

## Out of Scope

- Forecast/seasonal causal model
- Cross-category benchmark خام
- guaranteed campaign lift
- Holiday API یا calendar integration

## Demo Value

مستقیماً معیار عمق ۶۰ را هدف می‌گیرد: چندمرحله‌ای، controlled و فراتر از چیدن نمودارها.

## Checkpoints

- T+60m: formula design + peer fixture
- T+3h: decomposition/peer artifact
- T+6h: `/opportunities` functional
- T+8h: timing, evidence and integration
