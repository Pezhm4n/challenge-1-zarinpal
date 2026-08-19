# Risk Register

| Risk | Probability | Impact | Early warning | Mitigation | Plan B | Owner |
|---|---|---|---|---|---|---|
| Scope creep | High | High | Feature جدید بدون معیار امتیاز | BUILD/LATER/DON'T + freeze T+9h | فقط M275 golden path + 3 insights | Human Lead/A |
| Wrong product direction | Medium | High | Dashboard پر از chart و بدون action | هر صفحه Finding→Impact→Action→Evidence | حذف chartهای غیرضروری | A |
| Attempt/session double count | High | Critical | KPI با row count | common session normalization + fixture | فقط metricهای session-validated | B/A |
| Traceability ناکافی | Medium | Critical | عدد بدون evidenceId | contract validation rejects insight | Demo فقط Insightهای کامل | A |
| Counterfactual misleading | Medium | High | متن تضمینی/causal | Estimate label + assumptions + baseline | حذف opportunity amount، نگه‌داشتن diagnosis | B |
| Hard dependency on common loader | Medium | High | B/C/D منتظر A | Mock/feature-local CTE و stable contract | integrate artifact manually | A |
| Dataset processing time/failure | Low | High | OOM یا scan کند | DuckDB full scan، offline bundle | M275-only artifact + verified fixture | B/D |
| Merchant concentration bias | High | High | global average benchmark | category/eligibility/robust median | benchmark را insufficient اعلام کن | D |
| Missing values misuse | High | High | null→0 عمومی | column-specific rules + evidence quality | metric affected حذف شود | C/B |
| Customer identity overclaim | Medium | High | card=customer wording | anonymous card language + privacy note | فقط aggregate repeat signal | C |
| AI failure/cost | Low | Medium | core flow به LLM وابسته | AI خارج Core | AI feature حذف | Human Lead |
| Auth/database failure | Low | Low | وقت روی infra | Auth/DB out of scope | selector/static artifact | A |
| Merge conflict | Medium | High | shared file edits | folder ownership + A shared owner | Human Lead cherry-pick/integrate | Human Lead |
| Context loss | Medium | High | Agent تصمیم تکراری می‌گیرد | immutable context + local tracker | restart from AGENTS/spec | All |
| Security/privacy issue | Medium | High | raw card/CSV in bundle/Git | mask IDs، gitignore، artifact review | remove sample rows | C/A |
| Build/deploy incompatibility | Medium | High | local-only dependency | static Next runtime، no Python at runtime | static export/provider fallback | A/Human Lead |
| Mobile demo failure | Medium | High | overflow/table unreadable | 390px checkpoint from T+3h | hide complex table, key/value evidence | A |
| Demo failure | Medium | Critical | network/route/artifact error | local recording + fallback dataset bundle | screen-recorded backup | Human Lead |
| Time overrun | High | Critical | no real payload by T+3h | M275 first, freeze T+9h | ship Action Center + B only, C/D summary | Human Lead |
| adjusted_fee mislabel | Low | High | UI says real fee | invariant/test/content search | remove fee metric | D/A |

## Top Three Active Risks

1. تلاش‌محور بودن داده و Double counting.
2. تبدیل‌شدن محصول به Chart dashboard بدون اقدام/مدرک.
3. مصرف بیش از ۱۴ ساعت و آسیب به Challengeهای بعدی.
