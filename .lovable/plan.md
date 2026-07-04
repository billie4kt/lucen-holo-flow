
# Admin + Client Dashboards — Build Plan

Foundations first (auth, roles, orgs), then upgrade the existing `/admin` password-only page into a full role-based dashboard, then scaffold `/dashboard` for clients scoped to their organization.

---

## 1. Auth + roles + orgs (backend)

New migration (one file, GRANTs + RLS included):

```text
enum app_role: 'admin' | 'client'

table profiles(id=auth.users.id PK, full_name, avatar_url, org_id fk, created_at)
table user_roles(id, user_id, role, unique(user_id, role))
table organizations(id, name, slug unique, industry, created_at)
table engagements(id, org_id fk, title, status, industry_slug,
                  use_case_slug, stage, next_step, starts_at, created_at)
table submission_notes(id, submission_id fk contact_submissions, author_id,
                       body, created_at)

alter contact_submissions add:
  org_id (nullable fk), owner_id (nullable fk auth.users),
  tags text[] default '{}'
```

Security-definer `has_role(uid, role)` (per project rules).
Trigger `handle_new_user` → insert profile; first-ever signup auto-gets `admin` role, everyone else gets `client`.
RLS:
- `profiles`: user reads/updates self; admin reads all.
- `organizations` / `engagements`: members of org read; admin all writes.
- `contact_submissions`: admins full; clients read only rows where `org_id = their org`.
- `submission_notes`: admins full; clients read notes on their own submissions.
- `engine_events` stays insert-only; admins get SELECT.

Auth providers: enable email/password + Google via managed OAuth (defaults).

## 2. Auth UI

- `/auth` — sign in / sign up (email+password, Google button). Uses `onAuthStateChange` + `getSession`; redirect `next` param preserved.
- `<ProtectedRoute role?>` wrapper for `/admin/*` and `/dashboard/*`.
- Header: show avatar + role, "Sign out", link to Admin or Dashboard depending on role.

## 3. Admin dashboard `/admin/*` (replaces password gate)

Sidebar layout (shadcn sidebar) with routes:

```text
/admin              → overview (KPIs from TelemetryPanel + recent submissions)
/admin/submissions  → triage table: filter by status/industry/tag,
                      assign owner, add notes, tags, status timeline
/admin/telemetry    → deep-dive: live visitor stream, per-path speed,
                      geo (from user_agent + referrer), error log
/admin/content      → manage industries.ts / usecases.ts + media bucket
                      (list, upload, replace, delete, metadata)
/admin/users        → list profiles, assign roles, invite by email,
                      view org membership
/admin/orgs         → CRUD organizations + assign clients + engagements
```

The old `ADMIN_PASSWORD` gate is removed; access is `has_role(uid, 'admin')`.
Existing `admin-contacts` edge function is refactored to check the caller's JWT + admin role instead of a shared password.

## 4. Client dashboard `/dashboard/*`

Same sidebar shell, scoped to `auth.uid()`'s org:

```text
/dashboard              → welcome + active engagements + KPI tiles
/dashboard/engagements  → list + detail (stage, next step, timeline)
/dashboard/analytics    → telemetry filtered to their industry pages
                          (reuses TelemetryPanel with a scope prop)
/dashboard/messages     → their contact/quote submissions + reply thread
                          (adds submission_notes visible to client)
/dashboard/settings     → profile, org info, sign out
```

Foundations only for engagements/messages UI — no external notifications yet.

## 5. Technical notes

- New files: `src/pages/Auth.tsx`, `src/components/ProtectedRoute.tsx`, `src/components/DashboardShell.tsx` (shared sidebar), `src/pages/admin/*`, `src/pages/dashboard/*`, `src/hooks/useAuth.ts`, `src/hooks/useRole.ts`.
- `src/App.tsx` routes updated; `/admin` becomes nested.
- `admin-contacts` function updated: auth via bearer JWT + role check, actions extended (`assignOwner`, `addNote`, `addTag`, `listUsers`, `setRole`, `upsertOrg`, `upsertEngagement`).
- Client dashboard reads directly with RLS — no new function needed for MVP.
- `TelemetryPanel` gets an optional `scope?: { pathPrefix?: string }` prop for the client analytics view.
- Existing password-based session on `/admin` is retired; users must sign in. First admin bootstrap: whoever signs up first is admin (documented in-app), plus a manual `INSERT INTO user_roles` fallback via migration for the current user if they share their email.

## 6. Out of scope this pass

- Email notifications on submissions (can add via `send-transactional-email` later).
- Realtime subscriptions (poll-based like today; upgrade later).
- Billing / plans.
- Fine-grained per-engagement permissions beyond org membership.

---

**Question before I build:** what email should be seeded as the first admin? If you'd rather bootstrap by "first signup wins", say so and I'll skip the seed.
