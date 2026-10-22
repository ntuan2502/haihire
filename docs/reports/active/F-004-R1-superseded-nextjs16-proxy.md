# F-004-R1: Correction & Superseding of Finding F-004 (Next.js 16 Proxy Convention)

> **Status:** SUPERSEDED & REVERTED  
> **Date:** October 22, 2026  
> **Original Finding:** [F-004] in `report.md`  
> **Reversion Commit:** [`be46651`](https://github.com/ntuan2502/haihire/commit/be46651) (`fix(frontend): restore next.js 16 proxy.ts convention and eliminate middleware deprecation`)  
> **Target Release:** v0.3.0

---

## 1. Context & Retrospective

In the Phase 1 static codebase audit (`report.md`), Finding **[F-004]** classified `frontend/src/proxy.ts` as a P1 naming misconfiguration, stating that Next.js App Router ignores `proxy.ts` and strictly requires `middleware.ts`. In Phase 3 Branch 1, commit `c6c805b` renamed `proxy.ts` to `middleware.ts` and `function proxy` to `function middleware`.

Following Phase 3 Branch 2, a technical investigation recorded in [`INVESTIGATION_DEPRECATED_PATTERNS.md`](../../../INVESTIGATION_DEPRECATED_PATTERNS.md) proved that Finding F-004 was diagnosed based on outdated pre-Next.js 16 knowledge:

1. **Next.js 16 Architectural Shift:** In Next.js 16 (`next: 16.4.0`), Vercel explicitly deprecated `middleware.ts` in favor of `proxy.ts` (see [Next.js Middleware to Proxy Documentation](https://nextjs.org/docs/messages/middleware-to-proxy)).
2. **Original Author Accuracy:** The original file created by `ntuan2502` in commit `6593328` (September 3, 2026) was already adhering to the modern Next.js 16 convention.
3. **Build Warning Evidence:** Running `pnpm --filter ./frontend run build` with `middleware.ts` emitted the deprecation warning:
   ```
   ⚠ The "middleware" file convention is deprecated. Please use "proxy" instead.
     To migrate automatically, run:
     npx @next/codemod@canary middleware-to-proxy .
     Learn more: https://nextjs.org/docs/messages/middleware-to-proxy
   ```

---

## 2. Remediation Applied

In commit `be46651`:

- Renamed `frontend/src/middleware.ts` back to [`frontend/src/proxy.ts`](../../../frontend/src/proxy.ts).
- Export function renamed back from `middleware` to `export function proxy(request: NextRequest)`.
- Renamed test suite to [`frontend/src/proxy.spec.ts`](../../../frontend/src/proxy.spec.ts) maintaining 4/4 passing unit test cases.
- Re-ran production build `pnpm --filter ./frontend run build`, verifying 0 deprecation warnings and active route `ƒ Proxy (Middleware)`.

---

## 3. Historical Record Integrity

Per project documentation integrity guidelines, the original description of Finding [F-004] in `report.md` is preserved as an audit artifact for historical accountability, annotated with a formal update note referencing this revision record.
