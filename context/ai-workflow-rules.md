# AI Workflow Rules

## Before Work

1. `AGENTS.md` را کامل بخوان.
2. Contextها و Feature Spec اختصاصی را بخوان.
3. Branch/Worktree و Folder ownership را تأیید کن.
4. Contract مورد استفاده و Mock موجود را مشخص کن.
5. برای کار Multi-file یک Plan کوتاه بنویس.

## Scope

- فقط Vertical Slice خود را End-to-End اجرا کن.
- فایل نامرتبط را Refactor یا Format نکن.
- Shared File، Contract، Architecture، Auth یا dependency اصلی بدون تأیید Human Lead تغییر نکند.
- اگر Spec ناقص است، Missing decision را گزارش کن؛ Architecture جدید اختراع نکن.

## Parallel Work

- B/C/D با `src/mocks` و Contract تثبیت‌شده شروع می‌کنند؛ منتظر Pipeline A نمی‌مانند.
- هر Feature Analytics و UI خود را در Folder اختصاصی نگه دارد.
- تغییر `src/app` فقط در فایل Route اختصاصی یا توسط A/Human Lead.
- Merge order در `team-plan.md` رعایت شود.

## Context Files

- Agentهای پیاده‌سازی حق تغییر Context، AGENTS، CLAUDE، contracts، plan و risk register را ندارند.
- پیشنهاد تغییر را در گزارش بنویس و به Human Lead ارجاع بده.
- `context/progress-tracker.md` از Template ساخته می‌شود، local است و تنها Context قابل تغییر توسط عضو است.

## Validation

- ابتدا Acceptance Criteria را به تست/چک تبدیل کن.
- Formula مهم با Fixture دستی validate شود.
- Dataset full-run و fixture-run جدا باشند.
- Mobile 390px و Desktop 1440px بررسی شوند.
- هر Insight حداقل یک Evidence interaction و یک Data-quality state دارد.
- قبل از Commit، Diff خارج Scope حذف یا گزارش شود.

## Handoff Format

```text
Implemented:
Changed:
Validated:
Evidence checked:
Issues:
Assumptions:
Shared-file requests:
```

## Stop Conditions

- Contract ناسازگار یا تغییر shared لازم است.
- عدد با Evidence/Fixture تطابق ندارد.
- Data field معنای نامشخص دارد.
- Build/Test شکست دارد و Root cause معلوم نیست.
- تغییر خارج Vertical Slice لازم می‌شود.

در Stop condition، تغییر پرریسک انجام نده و Human Lead را مطلع کن.
