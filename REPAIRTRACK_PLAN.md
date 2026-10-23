# RepairTrack development plan

**RepairTrack: A Mobile-Based Computer Repair Service and Transaction Management System for Bucot, Aliaga, Nueva Ecija**

Planning date: October 22, 2026. Status: repository audit complete; remote Supabase audit blocked. This document is a proposed implementation contract, not an implemented system. No application code, dependencies, Auth settings, database objects, accounts, or seed records are changed by this plan.

## 1. Project overview and audit

RepairTrack helps one small repair shop record customers, devices, repair work, payments, receipts, and transaction history. The intended operator is the Shop Owner / Staff. Version 1 uses one provisioned login account and one shop dataset. It has no role hierarchy.

### Confirmed repository state

| Area | Evidence and finding |
|---|---|
| Framework | `package.json`: Expo `~58.0.16`, React `19.3.0`, React Native `0.88.0`, TypeScript `~6.0.3`. These are declared versions; dependency compatibility still needs an Expo audit. |
| Routing | `expo-router/entry`; routes in `src/app/`. Only starter Home, Explore, and root layout exist. |
| Navigation | `src/components/app-tabs.tsx` uses native tabs; `.web.tsx` uses Router UI tabs. Both remain starter navigation. |
| Forms and backend libraries | React Hook Form, Zod, resolvers, Supabase JS, and AsyncStorage are declared. No Supabase client or repair/customer/payment implementation was found in `src/`. |
| Receipt libraries | Expo Print and Sharing are declared; Sharing is also in app plugins. No receipt flow exists. |
| Theme | `src/constants/theme.ts` contains neutral starter colors and spacing. Blue/lavender is the requested brand direction, not an existing complete UI token system. |
| Logos | `assets/images/logo/repairtrack-logo.png` and `repairtrack-logoname.png` exist. The wordmark was visually inspected: navy lettering, blue accent, lavender/blue device-and-wrench mark. |
| Native projects | No `ios/` or `android/` directories found. Preserve Continuous Native Generation; configure native changes through app configuration/plugins. |
| Package manager | `package-lock.json` exists; no `bun.lock` found. Use npm/npx, with `npx.cmd` in this PowerShell environment. |
| Backend files | No local `supabase/`, migrations, schema declarations, or root environment files found. This does not prove the remote database is empty. |
| Product documentation | README remains the Expo starter. No `PRODUCT.md` or `DESIGN.md` found. Keep this task's deliverable to this single plan; capture those implementation aids later. |
| Working tree | Pre-existing changes include `app.json`, package files, local agent configuration, and logo assets. Preserve them; no commit or push is authorized. |

### Supabase verification: unresolved prerequisite

Only authorized target: project ref **`bajikoucybcqarjadkny`**, expected name **`repair-track`**. Both values currently come from the user, not a remote verification.

Supabase skills are available, but discovery exposed **no Supabase MCP tools in this session**. No remote project was accessed. Do not substitute another project, create a project, use unrelated credentials, or infer an empty database from missing local files.

| Requested remote check | Current result | Read-only evidence required before database work |
|---|---|---|
| Project identity | Not verified | Fetch this exact project's metadata and match returned name/ref. Stop on mismatch. |
| Public tables | Unknown | List public tables, columns, keys, constraints, indexes, row estimates, grants, RLS, and policies. Include views/functions/triggers relevant to application writes. |
| Migration history | Unknown | List remote migration versions/names and compare with any local files added since this audit. Identify imperative versus declarative workflow. |
| Existing application objects | Unknown | Map existing customers/devices/repairs/payments/etc. to this logical proposal. Identify reusable objects and data preservation requirements. |
| Auth configuration | Unknown | Inspect email/password enablement, signup controls, anonymous sign-in, providers, email confirmation, recovery settings, site URL, redirect allowlist, session/JWT settings, and SMTP readiness. Report configuration without secrets. |
| Existing operator | Unknown | Verify presence/count of intended operator accounts with minimal metadata; do not export user records or tokens. |

Use project-scoped, read-only Supabase MCP access when available. If MCP does not expose Auth configuration, report that gap and obtain an authorized read-only source before treating Auth as audited. No schema migration should be drafted or applied until this audit reconciles the proposal with existing objects. Sections 8–10 describe desired logical behavior only.

### Baseline verification

- `npx.cmd --no-install expo lint`: failed. No ESLint config exists; Expo attempted automatic setup and stopped with network `AggregateError [EACCES]`. Do not install/configure lint during this planning task.
- `npx.cmd --no-install tsc --noEmit`: failed on three existing starter issues: CSS module declaration in `animated-icon.web.tsx:5`, Pressable/ref incompatibility in `app-tabs.web.tsx:38`, and global CSS import declaration in `constants/theme.ts:6`.
- Plain `npx` resolves to a PowerShell script blocked by host execution policy; `.cmd` runs without changing that policy.
- No app runtime or physical-device validation was performed. Resolve baseline issues in Phase 0, not in this document-only task.

## 2. Confirmed scope

- One shop, one operator login, one user type named Shop Owner / Staff.
- Email/password authentication with session restoration and logout.
- Customer records, multiple devices per customer, and repeat repairs per device.
- Repair intake, diagnosis/service, estimate/final amount, status history, and release tracking.
- Manual payment recording, partial/full payment, balance, and payment receipts.
- Receipt preview, print, and PDF sharing on supported native devices.
- Dashboard, repair search/filtering, transaction history, and basic reports.
- Shop identity/settings and minimal operator profile.
- Android and iOS mobile layouts; web remains a compatible secondary surface with documented print/share differences.

## 3. Non-goals

No admin/customer/technician roles, public signup, approvals, chat, inventory, parts purchasing, online payment collection, payroll, tax engine, accounting ledger, multi-branch management, customer portal, remote notifications, photo uploads, AI diagnosis, or offline write synchronization. No new Supabase project. No additional state/query/UI library unless existing tools prove insufficient during implementation.

Receipts are service/payment acknowledgments for the thesis scope. Do not claim regulatory accreditation. Real-shop tax document requirements require a separate deployment decision.

## 4. User flow

1. Launch splash while restoring the session. Route to Login or Home without a protected-screen flash.
2. Open New Repair from Home or the center action.
3. Select an existing customer or add a customer inline.
4. Select that customer's device or add a device inline.
5. Enter problem, optional estimate, received date, optional expected release date, and notes. Review and save once.
6. Open Repair Details, record service/diagnosis, and move Pending to In Progress.
7. Set the final amount before the first payment or completion. Record payments as needed.
8. Generate a receipt for each successful payment. Preview, print, share, and reprint from history.
9. Mark the work Completed when service and final amount are recorded.
10. Mark Released after payment is settled and the device is handed over. Save actual release time.
11. Find previous work through customer/device history, Repairs, or Reports.

Payments may occur before completion. Receipt issuance does not automatically mark a repair Completed or Released. An estimate alone is not collectible; finalizing the amount is an explicit operator action.

## 5. Screen map

Paths below are proposed Expo Router paths. Route groups organize screens without appearing in URLs. Keep all non-route logic outside `src/app/`.

| Screen | Proposed route/location | Main behavior |
|---|---|---|
| Splash | Native launch plus root bootstrap state | Show brand; resolve session; provide retry if restoration fails. No artificial delay. |
| Login | `(auth)/login` | Email/password, visibility toggle, submit progress, safe errors. No signup link. |
| Home / Dashboard | `(app)/(tabs)/index` | Four metrics, recent repairs, New Repair, settings/profile entry. |
| Repairs List | `(app)/(tabs)/repairs` | All/Pending/In Progress/Completed/Released/Cancelled; search and pagination. |
| New Repair | `(app)/repairs/new` | Customer, device, problem/details, review. Preserve entered values while navigating inline forms. |
| Repair Details | `(app)/repairs/[id]` | Identity, problem/service, amounts, status action, payment and status history, receipts. |
| Customers List | `(app)/(tabs)/customers` | Name/contact search, add customer, archive visibility filter. |
| Customer Details | `(app)/customers/[id]` | Contact/address, devices, repairs; new repair preselects customer/device. |
| Add / Edit Customer | `(app)/customers/new`, `(app)/customers/[id]/edit` | Validated form and unsaved-change handling. |
| Add / Edit Device | Nested stack/modal outside tabs | Small reusable form tied to one customer. No inventory screen. |
| Record Payment | `(app)/repairs/[id]/payment` | Final amount, paid, balance, amount, method, review/confirmation. |
| Receipt Preview | `(app)/receipts/[id]` | Immutable issued receipt, print, share, retry export. |
| Reports | `(app)/(tabs)/reports` | Period selector, summary counts, status breakdown, monthly collections. |
| More / Profile / Shop Settings | `(app)/settings` | Display name, shop details, account email, logout. Access through Home header. |

Root layout owns auth gating and stack presentation. Proposed folders outside routes: `components`, `features`, `lib`, `hooks`, `constants`, `types`, and `utils`. Feature folders hold forms, queries, validators, and receipt templates. Start with local component state and a small session provider; keep business invariants in the database.

## 6. Navigation design

Display **Home | Repairs | + | Customers | Reports**. There are four destinations and one action. The center button opens New Repair as a stack/modal flow; it is not a blank fifth destination. Back returns to the originating screen without resetting its search or scroll position.

Use an Expo Router custom tab bar supported by SDK 58 when implementing. Validate that choice against versioned docs before replacing the existing native/web tabs. The raised center button must respect safe areas and keyboard behavior. Show icon labels, active state, accessible names, and a generous touch target. Retain Android back behavior and standard iOS dismissal patterns. Avoid nested tab bars and floating controls that obscure the last list row.

Deep links to private detail routes require authentication and ownership checks. Keep a validated intended destination through login; reject invalid or inaccessible IDs safely. Never trust IDs supplied by navigation.

## 7. UI/UX direction

Operate mode: prioritize intake speed, legibility, and clear next actions. Reuse the provided logos without redrawing them. Use the wordmark on Login and receipts, and the compact mark where space is limited. Preserve aspect ratios; test both light and dark surfaces.

Proposed visual language: pale blue/lavender surfaces, strong navy text, a clear blue primary action, restrained shadows, and consistent rounded corners. Color values remain provisional until contrast and actual logo pairing are tested. Use lavender sparingly for emphasis. Keep destructive, warning, success, repair-status, and payment-status colors distinct. Pair every status color with text.

- Home hierarchy: greeting/shop identity, compact repair counts, collection total with period label, then a readable Recent Repairs list. Avoid a wall of identical metric cards.
- Repair rows: transaction number, customer, device, repair status, balance, and received date. Avoid forcing all details onto one line.
- Repair Details: status and next action first; customer/device, service, money, and history below. Distinguish repair status from payment status.
- New Repair: short progressive sections with visible required fields; customer selection precedes device selection. Review before committing.
- Forms: persistent labels, suitable keyboard types, inline error messages, sensible lengths, keyboard-safe scrolling, disabled duplicate submit, and visible successful save.
- Lists: server pagination (initially 25 records), stable keys, debounced search around 300 ms, pull-to-refresh, and no per-row network queries.
- States: first-use empty state, no search matches, loading, offline, permission failure, record unavailable, retry, and successful mutation. Do not show network failures as empty lists.
- Network model: online writes only. Keep unsaved input during recoverable failures; never show a write as saved before server confirmation.
- Accessibility: at least 44 pt iOS / 48 dp Android interactive targets, readable contrast, dynamic text, screen-reader labels, focus order, and no color-only information.
- Test small phones, large text, notches, Android system navigation, tablets, and both system themes. Do not assume fixed bottom insets from starter constants.

### Motion budget

Use existing animation dependencies. Aim for brief 120–220 ms interactions: small press scale, active-tab indicator, short card entry, sheet transitions, status feedback, skeleton fade, and receipt preview fade. Animate transform/opacity where practical. Avoid continuous decorative effects, long staggered lists, and motion that blocks input. Respect Reduce Motion; keep essential feedback visible without movement.

During implementation, capture product/design guidance from this plan and review real rendered screens with Impeccable. Planning does not establish verified visual quality.

## 8. Conditional database schema proposal

**Do not assume any table below is missing or safe to create.** Reconcile each entity against the read-only remote audit first. Reuse compatible existing objects and preserve records. This is a logical proposal, with no migration SQL or migration filenames.

### Shared conventions

- UUID primary keys, except `profiles.id` and `shop_settings.owner_id` as described below.
- `owner_id uuid NOT NULL` on business tables, referencing `profiles.id`; one provisioned account owns this shop's records.
- `created_at` and `updated_at` as server-managed `timestamptz` on mutable tables. Immutable events use their event/creation timestamps.
- Store money as integer centavos, `bigint`, with explicit nonnegative bounds. Proposed ceiling: PHP 9,999,999.99 per repair. Validate decimal input to two places and convert exactly; avoid floating-point arithmetic. Transport bigint values safely before formatting.
- PHP only. Store instants in UTC; display and group financial dates in `Asia/Manila`. Date-only expected release values use `date`.
- Required text is trimmed and nonblank. Suggested limits: names 120, phone 32, address 300, brand/model 100, serial 120, problem/service/notes 2,000 characters. Zod improves feedback; database constraints enforce integrity.
- No cascade deletion of financial/history records. Customer/device archiving uses nullable `archived_at`. Preserve historical labels through receipt snapshots.

### Tables and relationships

| Entity | Purpose and important columns | Keys, relationships, constraints |
|---|---|---|
| `profiles` | Minimal operator record: `id`, `display_name`, `is_active` default false, timestamps. Auth owns email/password. | `id` PK/FK to `auth.users.id`, deletion restricted. Provision exactly one active owner. No role column. Only trusted provisioning can set `is_active`; users may edit display name only. |
| `customers` | `id`, `owner_id`, `full_name`, `contact_number`, optional `address`, `archived_at`, timestamps. | PK `id`; unique `(owner_id,id)` supports scoped FKs. Contact required, format normalized conservatively. Names and phones are not unique: relatives may share contacts. Warn about likely duplicates. |
| `devices` | `id`, `owner_id`, `customer_id`, `device_type`, `brand`, `model`, optional `serial_number`, `archived_at`, timestamps. | Composite FK `(owner_id,customer_id)` to customers. Unique `(owner_id,customer_id,id)` for repair linkage. Serial is optional and not globally unique. Do not reassign a device after it has repairs. |
| `repair_transactions` | `id`, `owner_id`, `customer_id`, `device_id`, server `transaction_number`, `reported_problem`, optional `service_diagnosis`, `estimated_amount_centavos`, `final_amount_centavos`, `status`, `received_at`, optional `expected_release_date`, `completed_at`, `released_at`, `cancelled_at`, `cancellation_reason`, `notes`, timestamps. | Unique transaction number; unique `(owner_id,id)`. Scoped customer FK and composite `(owner_id,customer_id,device_id)` FK to devices ensure selected device belongs to selected customer. Status defaults Pending and permits only five values. Final amount may be null until explicitly set. Estimated amount is optional/nonnegative. |
| `payments` | `id`, `owner_id`, `repair_id`, `amount_centavos`, `method`, `paid_at`, `recorded_at`, `recorded_by`, `request_id`, optional `reference` and `notes`. | Scoped FK to repair; actor FK to profile. Amount strictly positive. Method allowlist: Cash, GCash, Bank Transfer; these record external/manual payments only. Unique `(owner_id,request_id)` prevents duplicate retries. Unique `(owner_id,repair_id,id)` supports receipt linkage. Immutable after posting. |
| `receipts` | `id`, `owner_id`, `repair_id`, `payment_id`, server `receipt_number`, `issued_at`, `template_version`, immutable versioned `snapshot` containing all receipt fields. | Scoped FK to repair and `(owner_id,repair_id,payment_id)` FK to payments. Unique `payment_id` and unique receipt number: one receipt per payment. Snapshot validated by server, never accepted as authoritative client JSON. |
| `repair_status_history` | `id`, `owner_id`, `repair_id`, nullable `from_status`, `to_status`, `changed_at`, `changed_by`, optional `reason`. | Scoped FK to repair; actor FK to profile. Append-only, server-generated. Initial creation records null to Pending. Accepted transitions and history insert commit together. |
| `shop_settings` | `owner_id`, `shop_name`, `address`, `contact_number`, optional receipt footer, timestamps. Defaults to PHP and Asia/Manila. | `owner_id` PK/FK to profile: one settings row per owner. Only approved branding/contact fields editable. No client-editable counter or security settings. |

Do not create a separate public password/users table. Do not duplicate `auth.users` email as an authorization source. Derived balance and payment status belong in a shared query/view response, not editable stored columns.

### Internal numbering support

If existing numbering cannot be reused, add a small internal counter keyed by `(owner_id,document_type,year)` in a non-exposed schema. Atomically increment the relevant row inside the same transaction that inserts the repair/payment receipt. Never generate numbers from client counts or `MAX()+1`.

Use `RT-2026-0001` for repairs and `RC-2026-0001` for receipts. Year comes from server time in Asia/Manila. Pad to at least four digits and allow growth beyond 9999. Counters reset by year, numbers remain unique across years, and retries reuse existing results. Gaps are acceptable; never recycle issued numbers. Both number types must pass concurrent-request tests.

### Minimum useful indexes

Retain indexes supplied by primary/unique constraints; avoid duplicating them. Index referencing FKs when no existing index has the required leading columns.

- Customers: `(owner_id, full_name, id)` for sorted browsing.
- Devices: `(owner_id, customer_id)` and the scoped unique repair-link key.
- Repairs: `(owner_id, status, received_at DESC, id)`; `(owner_id, received_at DESC, id)` for All; `(owner_id, customer_id, received_at DESC)`; `(owner_id, device_id, received_at DESC)`.
- Payments: `(owner_id, repair_id, paid_at, id)`; `(owner_id, paid_at)` for collections; `recorded_by` if not otherwise covered.
- Receipts: `(owner_id, repair_id, issued_at, id)` plus uniqueness/FK-support indexes.
- Status history: `(owner_id, repair_id, changed_at, id)` and `changed_by` where needed.
- Add a standalone referencing index for customer/device/repair IDs only where FK leading-column coverage is otherwise absent. Verify with query plans, rather than adding every possible combination.

Search should run in one parameterized, owner-scoped query joining customer/device fields. Support case-insensitive partial matches for customer name, transaction number, and device type/brand/model/serial. Escape wildcard characters when treating input literally. Start with the small dataset; add trigram indexes only if measured plans/latency justify them. Sort and paginate before fetching details; do not download all records for phone-side searching.

## 9. RLS and security strategy

Use Supabase Auth email/password for the single provisioned operator. Disable public signup, anonymous login, and unused providers in the future implementation phase after verifying current configuration. No in-app account creation or roles. Password recovery uses a configured Supabase email/deep-link flow if available; otherwise document an owner-controlled recovery procedure before deployment.

Use the publishable key in the app, with environment validation. Never include service-role keys, secret keys, database passwords, or Management API tokens in source or `EXPO_PUBLIC_*` variables. Implement session persistence and app foreground/background handling using the then-current official React Native Auth guidance. Clear in-memory business data on logout or session failure; do not persist customer datasets unnecessarily.

### Access policy

- Enable RLS on every exposed application table, and check Data API grants separately. `anon` gets no business access.
- Every read/write requires authenticated `auth.uid()` equal to row `owner_id`, plus an active provisioned profile. An unrelated authenticated account must see no shop records and must not create its own approved shop.
- Profiles allow own-row read and display-name update only. No self-insert, activation, identity reassignment, or deletion. Bootstrap uses a trusted administrative operation outside the app.
- Customers/devices allow scoped read, insert, and permitted edit/archive. Both UPDATE `USING` and `WITH CHECK` must enforce ownership; owner IDs remain immutable. Prevent archive bypass via arbitrary direct field updates where necessary.
- Repairs allow scoped reads and permitted detail edits. Status, numbers, financial fields, and lifecycle timestamps are protected by column privileges and guarded database operations.
- Payments, receipts, and status history allow scoped reads. Deny direct client insert/update/delete; use guarded atomic operations for writes. Financial/history tables have no client DELETE policy.
- Shop settings allow own-row read and safe field updates only. Counter storage has no Data API/client access.
- Scoped composite FKs prevent linking a record to another owner, even through direct API calls.
- Prefer invoker functions and RLS for ordinary queries. Reporting views must preserve caller RLS, for example with `security_invoker` where supported. Do not authorize via editable user metadata.

For protected multi-table writes, use a narrow authenticated RPC boundary with private implementation functions. If elevated privileges are necessary, use a reviewed SECURITY DEFINER implementation with a fixed safe search path, qualified object names, explicit actor/active-owner checks, restricted EXECUTE grants, and no trust in client `owner_id`. Public wrappers remain invoker functions; private helpers are callable only through intended authenticated entry points. Review grants for PUBLIC, anon, and authenticated before exposing endpoints. This is required to protect ledger writes, not a general permission-error workaround.

Validate authorization and invariants inside every guarded operation, including direct API calls. Supabase documents the distinction between grants and row policies in its [RLS guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).

## 10. Business rules and atomic operations

### Lifecycle

| Current state | Allowed next state | Conditions |
|---|---|---|
| New | Pending | Valid active customer/device and nonblank problem; create initial history event. |
| Pending | In Progress | Valid operator; received date already recorded. |
| Pending / In Progress | Cancelled | Reason required; no posted payments. Preserve transaction/history. |
| In Progress | Completed | Service/diagnosis nonblank and final amount explicitly set, including zero for free service. Set completion time. |
| Completed | Released | Balance zero; set server release time when handing over device. |
| Released / Cancelled | None | Terminal; no silent reopening or deletion. |

No skips or backward transitions in version 1. A zero-cost repair can be completed/released without a fake zero-value payment. Pending, In Progress, and Completed accept payments once final amount is set. Released and Cancelled accept no new payments.

Completion means repair work is done; it does not mean the device has left the shop. The Completed count excludes Released. Cancelled records remain searchable.

### Money rules

- `total_paid = sum(posted payment amounts)`; no editable amount-paid field.
- Before finalization: display estimate or “Final amount not set”; balance/payment status is not yet applicable, rather than misleadingly Paid.
- After finalization: `balance = final_amount - total_paid`.
- Final amount greater than zero and paid zero: Unpaid. Paid between zero and total: Partial. Paid equals total: Paid. Explicit final amount zero and no payments: Paid / No charge.
- Every payment must be positive and no greater than the current balance. Reject more than two decimal places and invalid/nonfinite values.
- Estimated amount can change until finalization. Final amount may change only before the first payment and before completion; freeze it thereafter for receipt consistency.
- Payment corrections/refunds are not implemented in version 1. Never edit/delete a posted payment. Confirm amount/method before submission. Block cancellation when payments exist and explain why. A real deployment needing refunds requires an explicit follow-up design; do not improvise refunds as negative payments.
- Payments default to the current server date/time, with no backdating UI in version 1. Store method/reference as supplied after validation. Never count receipts as additional revenue.

### Server operations

| Operation | Required transaction behavior |
|---|---|
| Create repair | Validate active ownership and device/customer pairing; reject archived selection; allocate unique number; insert repair and initial history. Use request idempotency; reusing a key with different input is rejected. |
| Finalize/edit amount | Lock repair; check lifecycle and existing payments; enforce limits; write final amount. Cannot race a payment or completion. |
| Change status | Lock repair; compare expected current state; enforce transition/payment/service rules; write server timestamps and history together. Duplicate/stale requests return current result or conflict without duplicate events. |
| Record payment | Lock repair; verify finalized amount/state; sum payments under that lock; reject overpayment; allocate receipt number; insert payment and receipt snapshot atomically. Same request key returns the same payment/receipt. |
| Archive customer/device | Lock/check related records; deny while any Pending/In Progress/Completed repair exists; archive rather than delete. Serializing intake with archive prevents new active work on an archived record. |

All guarded operations touching a repair use the same lock order. Disable duplicate submits in UI, but rely on server idempotency and row locks for correctness. Add a unique request key for repair creation, as for payments. Receipt snapshot failure rolls back the payment; PDF/print failure does not.

### History and dates

Customer/device ownership is fixed once referenced by repairs. Preserve contact edits normally, but old receipts retain issued snapshots. Received date cannot be in the future; expected release date cannot precede received local date. Actual completion/release/cancellation times are server-generated and consistent with status. Validate date/status coupling in the database, including required release date for Released and null release date otherwise. Retain records when archiving profiles; account deletion is a deliberate maintenance task.

## 11. Development/demo data plan

Create nothing during planning. Later, use a local Supabase development database with a dedicated demo owner. This keeps the existing cloud project as the only cloud project. Never seed production by default or use a demo flag alone as a security boundary.

Five fictional customers, each with a device; one has two devices to prove the relationship:

| Demo key | Fictional name / contact fixture / optional address | Device | Repair / amounts in PHP |
|---|---|---|---|
| DEMO-C01 | Mara Villanueva; `DEMO-0001`; Demo Lane A, Bucot | Laptop, Acer Aspire 5; serial DEMO-A01 | Pending; intermittent charging; estimate 1,200; final unset; no payment. |
| DEMO-C02 | Paolo Mendoza; `DEMO-0002`; Demo Lane B, Aliaga | Desktop, ASUS custom build; DEMO-A02 | In Progress; no display; estimate 2,500; final unset. |
| DEMO-C03 | Liza Santos; `DEMO-0003`; Demo Lane C, Bucot | Laptop, Lenovo IdeaPad 3; DEMO-A03 | Completed; SSD replacement service; final 3,000; no payment; Unpaid. |
| DEMO-C04 | Enzo Reyes; `DEMO-0004`; Demo Lane D, Aliaga | Laptop, Dell Inspiron 15; DEMO-A04 | Released; keyboard replacement; final 1,800; Cash 1,800; Paid; receipt and release time. |
| DEMO-C05 | Bea Navarro; `DEMO-0005`; Demo Lane E, Bucot | Laptop, HP Pavilion 14; DEMO-A05. Second device: Canon PIXMA printer, DEMO-A06 | In Progress; board repair; final 5,000; GCash 2,000; balance 3,000; Partial; receipt. |

Names and addresses are invented. Contact fixtures are deliberately non-dialable; do not generate plausible mobile numbers that could belong to real people. Contact validation should accept bounded nonblank values, with phone-format guidance rather than an unjustified Philippine mobile-only rule.

Provision `owner@repairtrack.test` in the local development Auth instance only, with a generated password supplied privately through development tooling. Do not commit credentials, embed them in the app, or print them in logs. Create its approved profile/settings through the trusted seed path, not public signup.

Use a deterministic manifest of demo record IDs and an explicit demo environment check. Seed idempotently, through the same invariants as application writes; generate complete status histories and receipts. Dates stay within one documented Asia/Manila reporting month. Expected fixture results: five repairs, one Pending, two In Progress, one Completed, one Released, zero Cancelled, and PHP 3,800 collections.

Additional temporary tests cover Cancelled and repeated repairs on a device; they need not expand the five-customer presentation fixture. Cleanup is development-only: verify environment, remove only manifest-owned dependent records in FK order, then remove the demo Auth user. Alternatively reset the disposable local database. Never run broad deletes or cascade cleanup against the cloud project. Require zero demo login/records in the deployment dataset.

## 12. Receipt design and logic

Issue one immutable receipt for each posted payment, including partial payments. Reprinting/sharing the same receipt does not allocate a new number or update its original totals. The issued snapshot includes:

- Shop name, contact/address, RepairTrack branding, receipt number, repair transaction number, issue date/time.
- Customer name and device type/brand/model/optional serial.
- Service/diagnosis; if payment precedes diagnosis, use a clearly labeled reported-problem description.
- Final total, payment amount for this receipt, cumulative amount paid, remaining balance, method/reference, and payment status at issue time.
- Template version and a partial-payment label when applicable.

Repair Details always shows live totals; the receipt shows totals at issuance. Example: PHP 5,000 total, PHP 2,000 this payment, PHP 2,000 cumulative paid, PHP 3,000 balance, Partial. A second receipt after the remaining payment shows Paid while the first remains unchanged.

Use a readable A4-friendly template with repeated identity/number information if content spans pages. Embed a suitably sized logo, escape all customer/service text before HTML rendering, handle long names and notes, and use tabular money alignment. No remote image dependency or public PDF bucket is required.

On native platforms, plan HTML-to-PDF generation with Expo Print, native print presentation, and file sharing through Expo Sharing. Export from the stored receipt snapshot. Check sharing availability, treat cancellation normally, and offer retry without creating another payment. Keep temporary PDFs in app cache and clear them on logout/cleanup. These capabilities and platform restrictions are documented in [SDK 58 Print](https://docs.expo.dev/versions/v58.0.0/sdk/print/) and [SDK 58 Sharing](https://docs.expo.dev/versions/v58.0.0/sdk/sharing/).

For iOS HTML printing, validate embedded/base64 logo handling rather than assuming local image URIs render. On web, use browser print/Save as PDF; local URI sharing does not match native behavior. Do not promise native-equivalent web PDF sharing or add public storage to work around it. Preview may use a native layout fed by the same snapshot; validate its content against the exported PDF without adding a PDF viewer dependency by default.

## 13. Reporting logic

Use a shared database query/RPC layer so Home, Reports, and details apply identical money rules. Return aggregates, not all raw records. Label collections clearly: revenue here means **payments received**, not quoted amounts, billed totals, or profit.

| Metric | Definition |
|---|---|
| Dashboard Pending / In Progress / Completed | Current counts across all dates for each exact status. Completed means awaiting release. |
| Dashboard Total Revenue | Collections in the current Asia/Manila calendar month; label “Collected this month.” |
| Recent Repairs | Five most recently received repairs, with deterministic ID tie-break; link to Details and View All. |
| Reports Total Transactions | Repairs received in the selected date range, including Cancelled; show cancellations separately. |
| Reports status counts | Current status of repairs received in the selected range. Label this basis; not historical status as of the period end. |
| Reports Total Revenue | Payments whose `paid_at` is in the selected period, even if the repair was received earlier. |
| Monthly revenue | Sum payments by Asia/Manila month for the selected calendar year; show zero for months with no payments. |

Convert selected inclusive local dates to UTC half-open ranges: start inclusive, next day after end exclusive. Avoid device-timezone grouping errors. Payment aggregation must occur before joins to history/receipts to prevent duplicate sums. Test repairs received in one month and paid/released in another. No accounting charts beyond a simple monthly column chart/list and status breakdown are needed. Show loading/error/zero states and a clear period label.

## 14. Development phases and acceptance gates

Implementation starts only after this planning task and the remote audit are complete. Each phase produces a small reviewable result and runs lint/typecheck. Do not bundle unrelated dependency upgrades or destructive cleanup.

| Phase | Work | Acceptance gate |
|---|---|---|
| 0 — Environment and remote audit | Restore scoped Supabase MCP access; complete the read-only checklist; map existing objects; inspect dependency compatibility with SDK 58; establish lint without surprise installs; resolve existing type errors; identify target devices. | Verified name/ref, documented tables/Auth/migrations, preservation map, clean baseline checks. No database changes as part of the audit. |
| 1 — Database/Auth foundation | Reconcile this schema with existing data; choose existing declarative/imperative workflow; review additive changes and recovery approach; implement constraints, RLS, grants, guarded writes, numbering, generated types, and provision one operator. | Local/staging tests prove isolation, atomic money/status writes, unique numbers, and preservation. Authorized remote changes only after review; no replacement project. |
| 2 — Shell and design foundation | Capture product/design guidance; build brand tokens/shared controls, root auth bootstrap placeholder, stack structure, four tabs and center action. | Small/large-phone layouts, safe areas, text scaling, keyboard, both themes; all destinations reachable. |
| 3 — Login/session | Configure client/environment, login, restore, expiry, logout, route guards, recovery decision. | Restart/foreground/expiry/logout tested; no private-screen flash or stale customer data. |
| 4 — Customers/devices | Lists, forms, validation, selection, details/history, archive rules. | One customer owns several devices; existing records remain linked and searchable. |
| 5 — Repair intake/details | New Repair flow, atomic numbering, diagnosis, estimates/final amount, lists, joins, search/filtering. | Correct customer/device pairing; retry-safe creation; concurrent numbers remain unique. |
| 6 — Lifecycle/history | Guarded transitions, dates, cancellation and terminal-state handling. | Transition matrix enforced via UI and direct API; one history event per transition. |
| 7 — Payments/receipts | Partial/full payments, concurrency/idempotency, atomic snapshots, preview, print, PDF share. | Overpayment rejected, retries create one ledger entry, original receipts remain reproducible. |
| 8 — Dashboard/reports | Shared aggregates, period selection, collections/month, recent repairs. | Known fixtures reconcile across Home, Reports, payment totals, and receipt history. |
| 9 — Demo and focused testing | Local demo owner/manifest, deterministic seed/cleanup, automated invariant and integration tests. | Five-customer walkthrough works; demo removed without unrelated record loss. |
| 10 — UX/accessibility polish | Impeccable rendered review, subtle motion, reduced motion, loading/error states, list performance. | Android/iOS device checks, readable receipts, screen readers and large text usable. |
| 11 — Final QA/documentation | End-to-end walkthrough; security/dependency checks; recovery/backup notes; schema/ERD/data dictionary, test evidence, installation/user guide, thesis screenshots. | Definition of done met; EAS build installed and verified. No Git push/store submission without separate authorization. |

Dependencies: phases 4–8 require the database/auth foundation; receipts require reliable payment posting; reports require defined payment/status semantics. UI polish does not replace correctness tests.

Use EAS for future signed builds/submission/updates, following official current guidance. On Windows use `npx.cmd eas-cli@latest ...` when executing authorized EAS work. No build/deployment is performed during planning. Install any future dependency through `npx.cmd expo install <package>`; do not create/edit native directories by hand. Verify any new native module against the development-build requirements.

## 15. Testing strategy

Prioritize database invariants and a few realistic end-to-end paths over tests that mirror components. Use isolated local fixtures and two authenticated test identities for negative access tests; only one operator remains in the final dataset.

| Area | Required proof |
|---|---|
| Auth | Correct/incorrect credentials, restore after restart, refresh/expiry, logout, rejected protected deep links, recovery behavior, unrelated/unapproved account denied. |
| Customers | Create/edit validation, duplicate-name/shared-phone acceptance, optional address, archive behavior, unsaved input on request failure. |
| Devices | Several devices per customer; repeated repairs; cross-customer/cross-owner linkage rejected; historical device reassignment denied. |
| Intake/numbering | Required fields, date validation, matching pairing, parallel requests, same-key retries, changed-payload retry rejection, year rollover and counter growth. |
| Lifecycle | Every permitted edge and denied skip/backward/terminal edge; concurrent stale updates; cancellation reason; payment-blocked cancellation; history/timestamps atomic. |
| Amounts/payments | Estimate versus finalized total, zero-cost repair, partial/full payment, exact centavo rounding, excessive decimals, zero/negative/overpayment rejected, amount freeze. |
| Concurrency | Two requests each attempting the remaining balance: exactly one succeeds; final-amount edits versus payment; receipt failure rolls back payment. |
| Idempotency | Double tap, timeout then retry, reconnect: one repair/payment/receipt, no duplicate history, stable numbers. |
| Receipts | Required fields, original snapshot after customer/shop edits and later payments, escaped HTML, long content/page breaks, PHP formatting, missing/embedded logo, cancelled print/share, regeneration after export failure. |
| Release | Only Completed and settled repair releases; actual release time stored; cannot release unpaid or cancelled work. |
| Search/history | All six filters, customer/number/device partial search, no matches, pagination ties, archived historical records, refresh after changes. |
| Reports | Demo totals: five repairs and PHP 3,800 collections; no join multiplication; month boundaries, zero months, cross-month repair/payment, device timezone different from shop. |
| Security | Anonymous and second-user direct table/RPC requests denied; spoofed owner/actor rejected; activation/number/status/payment direct-write attempts fail; views preserve RLS; restricted function execution. |
| Mobile UX | Keyboard, safe areas/back behavior, 320–430 logical-pixel widths, large text, screen reader, dark mode, reduced motion, slow/offline network, failed-save retry. |

Future automation: focused pure-function tests for parsing/formatting and date ranges; database tests for constraints/RLS/RPCs; integration tests for Auth and receipt data; a short device checklist for login, intake, partial/full payment, receipt, release, and reports. Choose test tooling during implementation after checking SDK compatibility; none is installed now.

Run `npx.cmd expo lint` and `npx.cmd tsc --noEmit` for every implementation gate. Run Expo Doctor/dependency checks after environment/package changes and before final builds. Retest only impacted paths after fixes; retain reproducible evidence for thesis documentation.

## 16. Risks, assumptions, and decisions

| Item | Decision / consequence |
|---|---|
| Remote state unavailable | Main blocker: cannot confirm project identity, tables, migrations, or Auth. Treat database design as conditional; Phase 0 must close this before migration design. |
| Supabase documentation access | Changelog fetch through web failed on content type; direct host fetch could not connect. No current breaking-change scan was completed. Re-fetch before implementing backend work. |
| Dependency baseline | Declared versions are not a compatibility verdict. Existing lint/typecheck failures must be resolved before feature work. Do not upgrade blindly. |
| Single account | Version 1 assumes one shop account used by its operator. No per-person accountability or shared-staff membership model is promised. Separate staff accounts require a later explicit design. |
| Release policy | Proposed rule: fully settled before release. Explicitly zero-cost repairs are settled. Changes to this policy require corresponding server tests. |
| Final amount | Freeze after first payment or completion; avoids retroactively changing issued financial records. Estimates remain distinct. |
| Paid cancellation/refunds | Not supported in version 1; paid cancellation is blocked. A shop needing refunds must resolve that before real financial use. |
| Network | Online-only commits; no offline queue. Clear errors and idempotent retries prevent accidental duplicate financial entries. |
| Printing | Printer/service availability differs by device. Validate native print and exported PDF on actual target devices. Web gets browser print/Save as PDF. |
| Privacy | Use fictional fixtures only. Exclude PII from logs/screenshots; document deliberate receipt sharing, session logout, backup access, and retention before production. |
| Recovery | Future migrations need a tested backup/recovery path and preservation checks. Never drop/recreate live tables merely to match this proposal. |

The completed brief supplies product scope and blue/lavender direction. No additional design interview is required to finish this plan. Detailed visual tokens, runtime behavior, provisioning, and release artifacts remain future implementation work.

## 17. Final definition of done

The implemented mini-thesis system is complete when:

1. The existing project's name/ref and baseline objects/Auth/migrations have been verified and documented.
2. One provisioned owner can log in, restore/logout safely, and access only the shop dataset.
3. Customer/device management supports multiple devices and repeated repairs without broken relationships.
4. New repairs receive unique server numbers and move only through the documented lifecycle with complete history.
5. Money rules hold under concurrent requests; partial/full payment and duplicate retries reconcile exactly.
6. Receipts retain issued snapshots, preview accurately, print, and share as PDF on tested native devices.
7. Release requires completion/settlement and stores the actual release time.
8. Search, all repair filters, customer histories, dashboard, and reports reconcile against known fixture totals.
9. Direct API tests prove RLS, grants, active-account authorization, and protected-write enforcement.
10. Five fictional demo customers and the development account can be seeded/removed safely outside production.
11. Branded Android/iOS screens pass visual, accessibility, large-text, reduced-motion, loading/error, and network checks.
12. Lint/typecheck and relevant automated/device tests pass; an EAS build is installed and verified.
13. Setup, data dictionary/ERD, test evidence, user guide, backup/recovery notes, and thesis walkthrough are ready.
14. Production contains no demo credentials, secret keys, or fictional presentation records.

**Planning-task completion is narrower:** this document is delivered; no application/database implementation or Git publication occurs. Remote audit remains explicitly outstanding.

### Documentation references

Consulted or targeted for implementation, with access limitations noted above:

- [Expo SDK 58 reference](https://docs.expo.dev/versions/v58.0.0/) — matched to the declared Expo major before planning platform work.
- [Expo documentation index](https://docs.expo.dev/llms.txt) — current documentation map and API corrections.
- [Expo Router introduction](https://docs.expo.dev/router/introduction/) — planned routing authority; re-fetch the specific SDK 58 navigation API before coding.
- [SDK 58 Expo Print](https://docs.expo.dev/versions/v58.0.0/sdk/print/) and [Expo Sharing](https://docs.expo.dev/versions/v58.0.0/sdk/sharing/) — receipt capabilities/platform limits.
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security) — database access controls.
- [Supabase changelog index](https://supabase.com/changelog.md) — fetch still required before implementation.
