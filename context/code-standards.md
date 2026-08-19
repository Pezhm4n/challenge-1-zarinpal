# Code Standards

## TypeScript / React

- TypeScript Strict حفظ شود؛ `any` ممنوع.
- Server Component پیش‌فرض است؛ فقط Interactive boundaryها `use client` بگیرند.
- `src/app` فاقد Business/Analytical logic باشد.
- Componentها کوچک و Domain-named باشند؛ Generic abstraction قبل از دومین مصرف ساخته نشود.
- JSON در Boundary validate شود و حالت خطای Artifact نشان داده شود.
- Amount integer ریال است؛ Format با `Intl.NumberFormat('fa-IR')` فقط در Presentation.
- محاسبه امتیازآور داخل Browser تکرار نشود؛ Artifact منبع حقیقت است.
- Import از Feature دیگر ممنوع؛ Contract/Entity مشترک استفاده شود.

## shadcn / UI

- قبل از Component جدید، Registry و `src/components/ui` بررسی شود.
- Layout با `gap-*`، نه `space-*`.
- Semantic tokens، نه رنگ Tailwind hardcoded در Featureها.
- Dialog/Sheet/Drawer عنوان قابل دسترس داشته باشد.
- Chart فقط وقتی استفاده شود که Insight را روشن‌تر کند؛ Insight card بر Chart مقدم است.
- همه Interactionها keyboard-accessible و دارای focus state باشند.

## Python / DuckDB

- Queryها deterministic، parameterized و Feature-owned باشند.
- اولین transform باید Attempt → Session grain باشد.
- Formulaهای مشترک فقط در `analytics/common` و با Formula ID.
- `SELECT *` فقط در Loader؛ خروجی نهایی ستون‌های صریح داشته باشد.
- Null handling برای هر ستون مستند شود؛ fillna عمومی ممنوع.
- خروجی JSON با ترتیب پایدار، schema version و dataset fingerprint تولید شود.
- Pipeline نباید CSV خام را تغییر دهد.

## Naming

- فایل TypeScript: `kebab-case.ts[x]`
- Component و Type: `PascalCase`
- Function/variable: `camelCase`
- Python module/function: `snake_case`
- Formula ID: `domain.metric.vN`
- JSON fields: `camelCase`

## Dependency Rules

- Dependency جدید فقط با دلیل در Feature Spec یا تأیید Human Lead.
- Library برای کاری که Platform/shadcn انجام می‌دهد اضافه نشود.
- Lockfile باید Commit شود.
- Runtime نباید به Python، DuckDB، CSV خام یا Network AI وابسته باشد.

## Comments and Docs

- Comment چرایی، Assumption یا Data caveat را توضیح دهد؛ کد را بازگو نکند.
- Formulaها و thresholds در `contracts.md` و Evidence توضیح داده شوند.
- تغییر Behavior بدون تغییر Test و Spec report ممنوع است.

## Validation Commands

```bash
npm run lint
npm run typecheck
npm run build
```

تست‌های Python/Feature پس از اضافه‌شدن باید در گزارش Commit ذکر شوند.
