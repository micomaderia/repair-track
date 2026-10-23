# Local UI refinement

The UI changes are local. No commit, push, or remote database migration was performed.

## Manual backend deployment

1. Apply `supabase/migrations/20261023090000_signup_and_archives.sql` to the existing RepairTrack Supabase project after the four existing migrations. Use a trusted SQL session or the project's normal migration deployment process.
2. In Supabase Dashboard → Authentication → Sign In / Providers → Email, disable **Confirm Email**. Public signup must remain enabled. The application expects a session immediately after registration; it never auto-confirms accounts using a client-side secret.
3. Regenerate database types after deployment. `src/lib/app-database.types.ts` is a temporary typed overlay for the additive migration; the original generated file remains untouched.
4. Run `npm run test:integration` again. The archive tests explicitly skip when the migration is missing.

The migration creates profiles and shop settings for new accounts, using the server-created auth user ID for ownership. User metadata supplies display names only. Existing accounts and ownership policies are retained. Archives use guarded owner-scoped functions, preserve all financial and status history, and remain included in reports. Permanent deletion remains unavailable because immutable history and restrictive foreign keys protect these records.

Deploy the migration before shipping this UI. Archive searches and actions require its new functions and columns. Existing repair/payment/receipt operations remain unchanged.

## Verification after deployment

- Register two new owners with distinct shops. Each should receive an immediate session and an empty workspace. Sign out and sign back in without confirming email.
- Create a customer, device, and repair for one owner. Verify the other owner cannot read or edit any of them, or call archive actions with their IDs.
- Archive and restore repairs and customers. Active customer repairs must prevent customer archival. Archived customers must be restored before new intake.
- Verify archived repairs disappear from Home and Repairs, while reports, payment totals, receipts, and status history remain unchanged.
- Inspect sign-in, sign-up, four-step intake, reports/custom dates, Settings, archive confirmations, and receipt sharing/printing on Android, iOS, and web at small and large font sizes.
- Verify a single blue focus border on text, password, money, multiline, search, and date inputs. Verify safe areas, keyboard handling, back navigation, and Reduce Motion.

## Receipt compatibility

Receipts still render only their immutable stored snapshots. Existing version-1 snapshots contain one recorded service/diagnosis or reported problem, but do not store estimates or both issue and diagnosis separately. The UI preserves that recorded content and marks the estimate as not recorded. It does not reconstruct old receipts from mutable repair records.

## Visual verification limit

This session has no connected browser, Android emulator, or iOS simulator. Static review, lint, typecheck, unit tests, integration tests, and web export do not replace a rendered device review.

## Completed checks

- `npx.cmd expo lint`: passed without warnings.
- `npx.cmd tsc --noEmit`: passed.
- `npm.cmd test`: 21 passed.
- `npm.cmd run test:integration`: 20 passed; 3 archive tests skipped because the migration is not applied.
- `npx.cmd expo export --platform all --output-dir .impeccable/review/build`: Android and iOS Hermes bundles plus web export passed. This verifies bundling, not installation or device interaction.
- Impeccable static finish review: material findings fixed and rechecked. Reports and archive lists remount on query identity changes, and archived customers cannot enter new intake from device actions or preselected routes.

The inherited `DESIGN.md` and surface brief still describe the earlier Workbench/notched-row composition. The implementation follows the user's newer approved refinement request. These design artifacts were not otherwise migrated as part of this task.
