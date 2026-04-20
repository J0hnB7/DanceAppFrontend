# Accessibility backlog

Moderate and minor findings tracked outside the CI gate. The gate
(`tests/e2e/accessibility.spec.ts`) fails only on `critical` and
`serious` impact — anything softer lands here and must be fixed when
the owning page is next touched.

Snapshot date: 2026-04-19 · Source: Phase B18 audit
(`danceapp-backend/docs/audits/phase-b-accessibility-2026-04-17.md`)

## Open items

### G4 — ConfirmSheet dialog semantics (MEDIUM)
`src/app/judge/[token]/round/page.tsx:120` renders a custom bottom
sheet without `role="dialog"`, `aria-modal`, or a focus trap. Keyboard
and screen-reader users cannot reach the confirm/back buttons.
Refactor onto Radix `<Dialog>` or add a focus-trap hook.

### G6 — Contrast sweep (MEDIUM)
Secondary (`#6B7280`) and tertiary (`#9CA3AF`) text on the light
`#F9FAFB` surface is at or below WCAG AA 4.5:1. Waiting on the first
axe CI run to enumerate exact nodes; fix by raising tertiary to
`#6B7280` or restricting it to decorative use (≥ 18px).

### G8 — SimpleDialog description prop (LOW)
`src/components/ui/dialog.tsx:37` hardcodes `aria-describedby={undefined}`.
Axe issues a warning (not a violation). Add an optional `description`
prop so callers can render `<DialogDescription>` when helpful.

### G9 — Manual AT pass (LOW)
No NVDA / VoiceOver walkthrough on record. Axe does not catch
landmark mis-nesting, heading order, or async timing bugs. Schedule
a one-hour VoiceOver pass over login, judge PIN, and results before
public launch and log the result here.

### NF2 — Landing page reduced-motion gap (LOW)
`src/app/page.tsx` uses inline `animation:` style properties for the
orbs. The `globals.css` `@media (prefers-reduced-motion: reduce)` rule
only covers class-based animations, so the landing page still animates
for users who opted out. Move the animations into CSS classes.

### NF3 — Judge CoupleTile tentative state (LOW)
`CoupleTile` sets `aria-pressed={state === "selected"}` so the
"tentative" amber state announces as "not pressed". Extend to
`aria-pressed="mixed"` for tentative, or add a supplementary
`aria-label` suffix.

## Closed

- G1 — axe-core Playwright scan (commit 0d2be21)
- G2 — `<html lang>` hardcoded `"sk"` (commit 6547c12)
- G3 — password toggle missing `aria-label` (commit c1bdca4)
- G5 — register success missing `aria-live` (commit 1a384f0)
- G7 — skip-to-main-content link (commit 4e89e82)
