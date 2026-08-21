# ارائه دهنده خدمات درگاه پرداخت اینترنتی

## Mission
Create implementation-ready, token-driven UI guidance for ارائه دهنده خدمات درگاه پرداخت اینترنتی that is optimized for consistency, accessibility, and fast delivery across documentation site.

## Brand
- Product/brand: ارائه دهنده خدمات درگاه پرداخت اینترنتی
- URL: https://www.zarinpal.com/
- Audience: developers and technical teams
- Product surface: documentation site

## Style Foundations
- Visual style: clean, functional, implementation-oriented
- Main font style: `font.family.primary=IRANYekanXVF`, `font.family.stack=IRANYekanXVF`, `font.size.base=14px`, `font.weight.base=400`, `font.lineHeight.base=normal`
- Typography scale: `font.size.xs=13.33px`, `font.size.sm=14px`, `font.size.md=16px`, `font.size.lg=18px`, `font.size.xl=20px`, `font.size.2xl=28px`, `font.size.3xl=36px`
- Color palette: `color.text.primary=#19191a`, `color.surface.base=#000000`, `color.border.strong=#ffffff`, `color.text.inverse=#0000ee`, `color.surface.raised=#f1f1f3`, `color.surface.strong=#0a33ff`
- Spacing scale: `space.1=8px`, `space.2=12px`, `space.3=16px`, `space.4=20px`, `space.5=24px`, `space.6=40px`, `space.7=64px`, `space.8=80px`
- Radius/shadow/motion tokens: `radius.xs=16px`, `radius.sm=24px`, `radius.md=999px` | `motion.duration.instant=200ms`, `motion.duration.fast=500ms`

## Accessibility
- Target: WCAG 2.2 AA
- Keyboard-first interactions required.
- Focus-visible rules required.
- Contrast constraints required.

## Writing Tone
Concise, confident, implementation-focused.

## Rules: Do
- Use semantic tokens, not raw hex values, in component guidance.
- Every component must define states for default, hover, focus-visible, active, disabled, loading, and error.
- Component behavior should specify responsive and edge-case handling.
- Interactive components must document keyboard, pointer, and touch behavior.
- Accessibility acceptance criteria must be testable in implementation.

## Rules: Don't
- Do not allow low-contrast text or hidden focus indicators.
- Do not introduce one-off spacing or typography exceptions.
- Do not use ambiguous labels or non-descriptive actions.
- Do not ship component guidance without explicit state rules.

## Guideline Authoring Workflow
1. Restate design intent in one sentence.
2. Define foundations and semantic tokens.
3. Define component anatomy, variants, interactions, and state behavior.
4. Add accessibility acceptance criteria with pass/fail checks.
5. Add anti-patterns, migration notes, and edge-case handling.
6. End with a QA checklist.

## Required Output Structure
- Context and goals.
- Design tokens and foundations.
- Component-level rules (anatomy, variants, states, responsive behavior).
- Accessibility requirements and testable acceptance criteria.
- Content and tone standards with examples.
- Anti-patterns and prohibited implementations.
- QA checklist.

## Component Rule Expectations
- Include keyboard, pointer, and touch behavior.
- Include spacing and typography token requirements.
- Include long-content, overflow, and empty-state handling.
- Include known page component density: links (47), cards (20), buttons (15), navigation (7).

- Extraction diagnostics: Audience and product surface inference confidence is low; verify generated brand context.

## Quality Gates
- Every non-negotiable rule must use "must".
- Every recommendation should use "should".
- Every accessibility rule must be testable in implementation.
- Teams should prefer system consistency over local visual exceptions.
