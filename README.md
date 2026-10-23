# RepairTrack

**A Mobile-Based Computer Repair Service and Transaction Management System for Bucot, Aliaga, Nueva Ecija**

A single-operator Expo app for a small computer repair shop. It covers customers, their devices, repair intake, the repair lifecycle, partial and full payments, an immutable receipt for every payment, and simple reports.

- Expo SDK 58, React Native, TypeScript, Expo Router
- Supabase (Auth, Postgres, Row Level Security, guarded RPCs)
- React Hook Form + Zod, Expo Print + Expo Sharing

## Run it

```bash
npm install
npx expo start          # press a (Android), i (iOS), or w (web)
```

On Windows PowerShell, use `npx.cmd` instead of `npx`.

`expo-asset` and `expo-file-system` are both included in Expo Go, so no development build is required.

### Environment

Create `.env.local`. It is git-ignored; never commit it.

```
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Only the publishable key belongs in the app. Never put a service-role key, secret key, or database password in an `EXPO_PUBLIC_*` variable or in source.

## Accounts

There is no public signup and no in-app account creation.

1. Create the operator in **Supabase Dashboard → Authentication → Users → Add user**, with **Auto Confirm** ticked.
2. Approve the account from a trusted SQL session:

```sql
insert into public.profiles (id, display_name, is_active)
values ('<auth user id>', 'Shop Owner', true);
insert into public.shop_settings (owner_id, shop_name) values ('<auth user id>', 'My Shop');
```

Any authenticated account without an active profile sees no data and cannot write.

Also turn off **Allow new users to sign up** under Authentication settings.

## Project layout

```
src/app/                 routes (Expo Router)
  _layout.tsx            session gate (Stack.Protected), splash
  login.tsx
  (app)/(tabs)/          Home, Repairs, Customers, Reports + custom tab bar
  (app)/repairs/         new, [id], [id]/payment
  (app)/customers/       new, [id], [id]/edit, [id]/devices/new
  (app)/devices/[id]/edit.tsx, receipts/[id].tsx, settings.tsx
src/components/          UI kit (buttons, fields, sheets, states, tab bar)
src/features/            data access, validation, status rules, receipts, reports
src/lib/                 Supabase client, generated DB types, money/date helpers, errors
supabase/migrations/     schema + guarded operations (applied to the project)
supabase/seed/demo.sql   idempotent fictional demo data
tests/                   unit + live integration tests (node:test)
```

## Business rules (enforced in Postgres)

- **Lifecycle:** Pending → In Progress → Completed → Released. Pending and In Progress can go to Cancelled (reason required, no payments). No skips, no going back, and no reopening Released or Cancelled. Every change writes a status-history row.
- **Completion:** requires a service/diagnosis and a final amount.
- **Release:** requires Completed status and a zero balance. The release time is stored.
- **Money:** stored as integer centavos. Payment status is derived from posted payments; there is no editable amount-paid field.
- **Payments:** must be greater than zero and no more than the remaining balance. They are checked under a row lock, so concurrent requests cannot overpay. Retries are idempotent through a request id. Posted payments cannot be edited or deleted.
- **Final amount:** locked after the first payment or after completion.
- **Receipts:** exactly one immutable receipt per payment, with a server-built snapshot. Later edits to customer or shop details never change issued receipts.
- **Numbering:** `RT-YYYY-0001` and `RC-YYYY-0001`, server-generated with per-year counters (Asia/Manila year). Safe under concurrency. Gaps are allowed and numbers are never reused.
- **Security:** anonymous users have no access. Every table enforces owner + active-profile RLS. The client can only write through column-scoped grants or `SECURITY INVOKER` RPCs that call private `SECURITY DEFINER` implementations.

## Demo data

`supabase/seed/demo.sql` creates five fictional customers with non-dialable `DEMO-000x` contacts. One customer owns two devices. The five repairs cover Pending, In Progress, Completed (unpaid), Released (paid ₱1,800 cash), and In Progress with a partial ₱2,000 GCash payment. Collections total ₱3,800.

Every created id is recorded in `private.demo_manifest`. To remove only the demo records:

```sql
select private.remove_demo_data();
```

## Tests

```bash
npm test                    # unit: money, Manila dates, lifecycle, validation, receipt HTML
npm run test:integration    # live: auth, RLS, numbering, lifecycle, payments, concurrency, receipts, search, reports
npx expo lint
npx tsc --noEmit
```

Integration tests need a git-ignored `.env.test.local` with `RT_QA_OWNER_EMAIL/PASSWORD` and `RT_QA_OUTSIDER_EMAIL/PASSWORD`. The QA owner must be an active profile registered in `private.fixture_owners`, because tests write only to that isolated shop. To clear its data:

```sql
select private.purge_fixture_owner('<qa owner id>');
```

## Receipts: print and share

- **Android/iOS:** Print opens the system print dialog. Share PDF creates the PDF with Expo Print and opens the share sheet. The logo is embedded as base64 because iOS cannot load local asset URLs in print HTML.
- **Web:** Print opens the browser dialog; choose "Save as PDF" there. Sharing local files is not available on web.
- Print and share only read the stored snapshot. A failed or cancelled export never creates a payment or receipt.

Receipts acknowledge service payments. They are not BIR-accredited official receipts.
