# Product

<!-- impeccable:product-schema 1 -->

## Platform

android

Android is the primary target (confirmed). iOS and web remain supported surfaces that must stay correct: safe areas, Reduce Motion, iOS back behavior, and browser print on web.

## Users

One shop owner or staff member of a small computer repair shop in Bucot, Aliaga, Nueva Ecija. They use one phone at the shop counter, often with a customer waiting, to log a device for repair, track its progress, take payments, hand over receipts, and look up past work. Each owner can register a separate account and shop. There are no admin, staff-management, or customer roles.

## Product Purpose

RepairTrack replaces paper job slips and memory with a reliable record of customers, their devices, every repair transaction, payments, and receipts. Success means: intake takes under a minute, the next action on any repair is obvious, money totals are always correct, and any past job can be found by number, customer, or device.

## Positioning

A deliberately small, tool for an individual shop that treats the money and status ledger as the source of truth: server-generated repair and receipt numbers, a strict repair lifecycle, payments that can never exceed the balance or be edited, and an immutable receipt for every payment, including partial ones.

## Operating Context

- Counter workflow: Sign in or register, Dashboard, add or select customer, add or select device, create repair (Pending), In Progress, record diagnosis/service, set final amount, take partial or full payment, issue receipt, Completed, Released.
- Cancelled is a separate terminal state for Pending or In Progress repairs without payments.
- Payments are recorded manually: Cash, GCash, Bank Transfer. No online payment.
- Receipts are previewed on the phone, printed, or shared as PDF to the customer.
- Money is Philippine peso; reporting days and months follow Asia/Manila.
- Online-only; no offline queue.

## Capabilities and Constraints

- Screens: Splash, Login, Home/Dashboard, Repairs list, New Repair, Repair Details, Customers list, Customer Details, Add/Edit Customer, Add/Edit Device, Record Payment, Receipt Preview, Reports, Profile/Shop Settings.
- Bottom navigation: Home | Repairs | + | Customers | Reports, where + opens New Repair and is not a destination.
- Out of scope: extra roles, customer accounts, user management, approvals, chat, inventory, online payment, appointments, AI diagnosis, multi-branch, push notifications, advanced accounting, tax engine, offline sync, refunds.
- Stack: Expo SDK 58, React Native, Expo Router, Supabase (Auth, Postgres, RLS, RPC), React Hook Form + Zod, Expo Print + Sharing.
- Light theme only in version 1 (confirmed); dark mode is a later decision.

## Brand Commitments

- Name: RepairTrack.
- Logo assets: `assets/images/logo/repairtrack-logo.png` (mark) and `assets/images/logo/repairtrack-logoname.png` (wordmark). Use as supplied; never redraw.
- Requested direction (binding from the brief): modern, premium, clean, minimal, soft, professional; blue, lavender, pale blue, navy typography, white / near-white surfaces; avoid generic admin-dashboard styling.

## Evidence on Hand

- Logo assets above. No real customer data, testimonials, or shop photos exist; demo data must stay clearly fictional with non-dialable contact fixtures.
- Receipts are service/payment acknowledgments, not accredited tax documents.

## Product Principles

1. The next action is always obvious on every repair.
2. Money is never ambiguous: show final amount, paid, and balance together, and never call a quote revenue.
3. Speed at the counter beats completeness of optional fields.
4. Server truth only: never present unsaved work as done.
5. Small and finished beats broad and partial.

## Accessibility & Inclusion

48dp touch targets, readable contrast, dynamic text sizes, screen-reader labels, no color-only status, and Reduce Motion respected.
