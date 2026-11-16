---
name: haihire-frontend-data-i18n
description: Manages TanStack Query v5 caches, Axios URL Gatekeeper and 401 refresh queues, SSE real-time cache invalidation, notifications, and 2-tier i18n in apps/web. Use when writing API clients, hooks, real-time sync, error handling, or localized copy in HaiHire.
---

# HaiHire Frontend Data Fetching, Real-Time & i18n Skill

Stack baselines verified in `apps/web/package.json` and `apps/web/src/lib/`:
- **Server State**: `@tanstack/react-query@^5.107.1` with centralized `queryKeys` (`apps/web/src/hooks/query-keys.ts`)
- **HTTP Client**: `axios@^1.21.0` (`apps/web/src/lib/api/client.ts`)
- **Real-Time Sync**: SSE (`apps/api/src/events/`) + `createRealtimeInvalidator` (`apps/web/src/lib/realtime-sync.ts`) consuming 17 `AppEventType`s from `@haihire/shared`
- **Toasts**: `react-toastify@11.2.0` wrapped strictly via `apps/web/src/lib/toast.ts` (`@/lib/toast`)
- **Localization**: 2-tier 2-way i18n (`I18nProvider` in `apps/web/src/i18n/index.tsx` + `LocalizationProvider` in `apps/web/src/components/providers/localization-provider.tsx`)

---

## 1. TanStack Query v5 Standards

Per TanStack Query v5 official guidelines:
- **Object-Only API:** Always use single-object signatures (`useQuery({ queryKey, queryFn })`, `useMutation({ mutationFn, onSuccess })`, `queryClient.invalidateQueries({ queryKey })`).
- **Centralized Key Factory:** Add and reference all keys in `apps/web/src/hooks/query-keys.ts` (`queryKeys.jobs`, `queryKeys.applications`, `queryKeys.paginatedApplications`, `queryKeys.candidates`, `queryKeys.interviews`, `queryKeys.myOrg`, etc.). Never inline ad-hoc string arrays across components.
- **Prefix Invalidation:** Design query keys generically-to-specifically (e.g., `["applications", "paginated", params]`) so mutating or receiving `APPLICATIONS_CHANGED` can invalidate the whole `["applications"]` family cleanly.
- **Await/Return Invalidation Promises:** Return or `await queryClient.invalidateQueries(...)` inside `onSuccess` when mutation completion toggles UI loading/navigation transitions.

---

## 2. Axios API Client, URL Gatekeeper & Document Previews (`src/lib/api/client.ts`)

- **Base URL Routing:** Browser requests route through relative `/api` (proxied by Next.js `next.config.ts` rewrites to backend) unless an external non-localhost `NEXT_PUBLIC_API_URL` is configured; SSR/server actions talk directly to `env.INTERNAL_API_URL`.
- **URL Gatekeeper:** Request interceptor rejects any URL containing `[object` or `%5Bobject` (`[HaiHire API Gatekeeper]`) so accidentally stringified objects never reach the backend.
- **401 Silent Refresh Queue:**
  - Response interceptor catches HTTP `401` (excluding `/auth/login`, etc. and already-retried requests), queues concurrent failing requests in `failedQueue`, exchanges `haihire_recruiter_refresh_token` at `POST /auth/refresh`, updates cookies (`haihire_token`, `haihire_has_org`) + `localStorage` + `Authorization` header, and replays queued requests.
  - On missing or expired refresh token, `clearServerAndClientSession()` clears client tokens/cookies and calls `POST /auth/logout` best-effort.
- **Private MinIO Document Proxy:**
  - Never render raw `/haihire-resumes/` URLs directly (the MinIO bucket is private).
  - Always use `buildDocumentDownloadPath()` / `getDocumentUrl()` which route through tenant-guarded `/applications/:id/documents/download` or `/candidates/:id/documents/download` endpoints.

---

## 3. SSE Real-Time Cache Sync (`src/lib/realtime-sync.ts`)

- **17 Event Types:** Defined in `packages/shared/src/events.ts` (`APP_EVENT_TYPES`: `CONNECTED`, `HEARTBEAT`, `ORG_UPDATED`, `MEMBERS_CHANGED`, `MEMBER_ROLE_UPDATED`, `MEMBER_REMOVED`, `INVITE_LINKS_CHANGED`, `PERMISSIONS_CHANGED`, `JOBS_CHANGED`, `CANDIDATES_CHANGED`, `APPLICATIONS_CHANGED`, `INTERVIEWS_CHANGED`, `SOURCING_CHANGED`, `EMAIL_CHANGED`, `WEBHOOKS_CHANGED`, `AUDIT_LOGS_CHANGED`, `ACTIVITIES_CHANGED`).
- **Debounced Prefix Deduplication:** Always route incoming SSE events through `createRealtimeInvalidator(queryClient, 100)`, which deduplicates serialized prefixes inside a `Map` over a `100ms` window so burst emissions (e.g., application creation emitting multiple events) collapse into a single `invalidateQueries` per unique key prefix.

---

## 4. Notifications & 2-Way / 2-Tier i18n

- **Notifications:** Always import `{ toast } from "@/lib/toast"`, never `react-toastify` directly.
- **API Error Localization (`apps/web/src/lib/api-error.ts`):**
  - Use `getApiErrorMessage(error, t)` everywhere errors are shown to users.
  - It maps backend `payload.code` (`64` `APP_ERROR_CODES` in `@haihire/shared`) -> `t("errors.<CODE>", payload.params)`, falling back cleanly to `payload.message`, status-code fallback (`401`, `403`, `404`, `429`, `500`), or `errors.generic`.
- **Two-Way Dictionary Parity (`pnpm lint:i18n` & `pnpm lint:error-i18n`):**
  - Keep `apps/web/src/i18n/types.ts` (`TranslationSchema`), `apps/web/src/i18n/locales/en.ts`, and `apps/web/src/i18n/locales/vi.ts` 100% synchronized—zero missing keys and zero hardcoded user-facing strings in UI JSX.
  - Every `APP_ERROR_CODES` entry in `packages/shared/src/errors.ts` must have matching keys in `en.ts` and `vi.ts`.
- **Two-Tier Localization Precedence:**
  - `LocalizationProvider` resolves active language in order: DB `user.preferredLanguage` (`"vi" | "en"`) -> `localStorage`/cookie (`I18nProvider`) -> `organization.defaultLanguage`, and resolves effective timezone from `user.preferredTimezone` -> `organization.timezone`, plus formatting tokens (`dateFormat`, `timeFormat`, `nameDisplayOrder`, `defaultCurrency`).
