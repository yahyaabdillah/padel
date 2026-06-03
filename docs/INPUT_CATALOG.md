# PadelHub — Input & Select Catalog

> Daftar semua inputan di project. Referensi untuk: tooltip, searchable, addable.
> Legend: ✅ = sudah, ❌ = belum, 🔲 = N/A

---

## Select Components

| # | File | Label | searchable | addable | Rekomendasi addable |
|---|------|-------|:---:|:---:|-----|
| 1 | `components/booking/NewBookingStepper.tsx` | Court selector | ❌ | ❌ | ❌ (fixed list) |
| 2 | `components/booking/NewBookingStepper.tsx` | Duration | ❌ | ❌ | ❌ (fixed enum) |
| 3 | `components/booking/NewBookingStepper.tsx` | Cari member | ✅ | ❌ | ❌ (harus lewat registrasi) |
| 4 | `components/checkin/CheckinPanel.tsx` | Cari member | ✅ | ❌ | ❌ (harus lewat registrasi) |
| 5 | `components/classes/ClassEnrollDrawer.tsx` | Member | ✅ | ❌ | ❌ (harus lewat registrasi) |
| 6 | `components/classes/ClassFormDrawer.tsx` | Type | ❌ | ❌ | ✅ (add class type) |
| 7 | `components/classes/ClassFormDrawer.tsx` | Level | ❌ | ❌ | ❌ (fixed enum) |
| 8 | `components/classes/ClassFormDrawer.tsx` | Coach | ✅ | ❌ | ❌ (managed elsewhere) |
| 9 | `components/classes/ClassFormDrawer.tsx` | Day | ❌ | ❌ | ❌ (fixed enum) |
| 10 | `components/classes/ClassFormDrawer.tsx` | Court | ❌ | ❌ | ❌ (managed elsewhere) |
| 11 | `components/marketing/PromoBuilderDrawer.tsx` | Type | ❌ | ❌ | ❌ (fixed: percent/flat) |
| 12 | `components/marketing/PromoBuilderDrawer.tsx` | Scopes | ❌ | ❌ | ❌ (fixed enum) |
| 13 | `components/marketing/PromoBuilderDrawer.tsx` | Tier multi-select | ❌ | ❌ | ❌ (fixed tiers) |
| 14 | `components/pos/ProductFormDrawer.tsx` | Category | ❌ | ❌ | ✅ (add new category) |
| 15 | `components/club-core/register/CourtBookingStep.tsx` | Duration | ❌ | ❌ | ❌ (fixed enum) |
| 16 | `components/club-core/register/PtSessionStep.tsx` | Coach | ❌ | ❌ | ❌ (managed elsewhere) |
| 17 | `app/(admin)/checkin/page.tsx` | Court (opsional) | ❌ | ❌ | ❌ (fixed list) |
| 18 | `app/(admin)/me/profile/page.tsx` | Skill level | ❌ | ❌ | ❌ (fixed enum) |
| 19 | `app/(admin)/me/profile/page.tsx` | Dominant hand | ❌ | ❌ | ❌ (fixed enum) |
| 20 | `app/(admin)/me/profile/page.tsx` | Preferred court side | ❌ | ❌ | ❌ (fixed enum) |
| 21 | `app/(admin)/marketing/notifications/page.tsx` | Audience | ❌ | ❌ | ❌ (fixed segments) |
| 22 | `app/(admin)/platform/feature-flags/page.tsx` | Plan | ❌ | ❌ | ❌ (managed elsewhere) |
| 23 | `app/(admin)/platform/feature-flags/page.tsx` | Tenant | ✅ | ❌ | ❌ (managed elsewhere) |
| 24 | `app/(admin)/settings/page.tsx` | Timezone | ❌ | ❌ | ❌ (fixed list) |
| 25 | `app/(admin)/settings/page.tsx` | Currency | ❌ | ❌ | ❌ (fixed list) |
| 26 | `app/(admin)/settings/staff/page.tsx` | Role (invite) | ❌ | ❌ | ❌ (fixed roles) |
| 27 | `app/(admin)/settings/staff/page.tsx` | Role (changer) | ❌ | ❌ | ❌ (fixed roles) |

**Harus searchable (belum):** #1, #6, #10, #14, #15, #16, #17, #18, #19, #20, #21, #24, #25 — semua Select idealnya searchable.

**Rekomendasi addable:** #3, #4, #5 (quick-add member), #6 (add class type), #14 (add product category).

---

## TextInput Components

| # | File | Label / Purpose | Tooltip needed |
|---|------|-----------------|:---:|
| 1 | `components/club-core/MemberRegister.tsx` | Nama Lengkap | ✅ |
| 2 | `components/club-core/MemberRegister.tsx` | Email (opsional) | ✅ |
| 3 | `components/club-engage/PromoReferralInput.tsx` | Kode Promo | ✅ |
| 4 | `components/club-engage/PromoReferralInput.tsx` | Kode Referral (opsional) | ✅ |
| 5 | `components/booking/NewBookingStepper.tsx` | Cari member | ✅ |
| 6 | `components/marketing/PromoBuilderDrawer.tsx` | Promo code | ✅ |
| 7 | `components/marketing/PromoBuilderDrawer.tsx` | Promo name | ✅ |
| 8 | `components/marketing/PromoBuilderDrawer.tsx` | Value | ✅ |
| 9 | `components/marketing/PromoBuilderDrawer.tsx` | Min spend | ✅ |
| 10 | `components/marketing/PromoBuilderDrawer.tsx` | Max discount | ✅ |
| 11 | `components/pos/ProductFormDrawer.tsx` | Product name | ✅ |
| 12 | `components/pos/ProductFormDrawer.tsx` | Price (IDR) | ✅ |
| 13 | `components/pos/ProductFormDrawer.tsx` | Stock | ✅ |
| 14 | `components/pos/ProductFormDrawer.tsx` | SKU (optional) | ✅ |
| 15 | `components/classes/ClassFormDrawer.tsx` | Class name | ✅ |
| 16 | `components/classes/ClassFormDrawer.tsx` | Capacity (seats) | ✅ |
| 17 | `components/classes/ClassFormDrawer.tsx` | Price / session | ✅ |
| 18 | `app/(admin)/checkin/page.tsx` | Nama tamu | ✅ |
| 19 | `app/(admin)/me/profile/page.tsx` | Full name | ✅ |
| 20 | `app/(admin)/me/profile/page.tsx` | Email | ✅ |
| 21 | `app/(admin)/me/profile/page.tsx` | Phone | ✅ |
| 22 | `app/(admin)/marketing/notifications/page.tsx` | Campaign title | ✅ |
| 23 | `app/(admin)/platform/access-control/page.tsx` | Display name | ✅ |
| 24 | `app/(admin)/platform/billing/page.tsx` | Search invoice | ✅ |
| 25 | `app/(admin)/platform/tenants/page.tsx` | Search club | ✅ |
| 26 | `app/(admin)/settings/page.tsx` | Club name | ✅ |
| 27 | `app/(admin)/settings/page.tsx` | Tagline | ✅ |
| 28 | `app/(admin)/settings/page.tsx` | Phone | ✅ |
| 29 | `app/(admin)/settings/page.tsx` | Email | ✅ |
| 30 | `app/(admin)/settings/staff/page.tsx` | Name (invite) | ✅ |
| 31 | `app/(admin)/settings/staff/page.tsx` | Email (invite) | ✅ |

---

## Other Inputs

| # | File | Component | Label / Purpose | Tooltip |
|---|------|-----------|-----------------|:---:|
| 1 | `components/club-core/MemberRegister.tsx` | PhoneInput | Nomor Telepon | ✅ |
| 2 | `app/(admin)/marketing/notifications/page.tsx` | Textarea | Message | ✅ |
| 3 | `app/(admin)/settings/page.tsx` | Textarea | Address | ✅ |
| 4 | `components/club-core/register/CourtBookingStep.tsx` | DatePicker | Date | ✅ |
| 5 | `components/booking/NewBookingStepper.tsx` | DatePicker | Other date | ✅ |
| 6 | `app/(admin)/me/book/page.tsx` | DatePicker | Other date… | ✅ |
| 7 | `components/club-core/register/PtSessionStep.tsx` | DatePicker | Day | ✅ |
| 8 | `components/marketing/PromoBuilderDrawer.tsx` | DatePicker | Valid from / to | ✅ |
| 9 | `app/(admin)/settings/hours/page.tsx` | TimeSelect | From / To / Peak | ✅ |
| 10 | `components/classes/ClassFormDrawer.tsx` | time input | Start / End time | ✅ |

---

## Switch / Toggle

| # | File | Label | Tooltip |
|---|------|-------|:---:|
| 1 | `components/club-core/MemberRegister.tsx` | Tertarik coaching/PT? | ✅ |
| 2 | `components/club-core/register/PtSessionStep.tsx` | Pakai pelatih? | ✅ |
| 3 | `app/(admin)/me/checkin/page.tsx` | Jendela ketat (±10 min) | ✅ |
| 4 | `app/(admin)/checkin/page.tsx` | Strict window | ✅ |
| 5 | `app/(admin)/me/profile/page.tsx` | Booking reminders | ✅ |
| 6 | `app/(admin)/me/profile/page.tsx` | Open-play invites | ✅ |
| 7 | `app/(admin)/me/profile/page.tsx` | Promotions & offers | ✅ |
| 8 | `app/(admin)/me/profile/page.tsx` | Leaderboard updates | ✅ |
| 9 | `components/marketing/PromoBuilderDrawer.tsx` | Active | ✅ |
| 10 | `components/marketing/PromoBuilderDrawer.tsx` | Notify | ✅ |
| 11 | `app/(admin)/settings/hours/page.tsx` | Open/Closed per day | ✅ |
| 12 | `app/(admin)/platform/feature-flags/page.tsx` | Module toggles | ✅ |
| 13 | `app/(admin)/platform/access-control/page.tsx` | Permission toggles | ✅ |

---

## Action Items

1. **Tooltip** — tambah `hint` prop (sudah didukung TextInput/Select) atau custom tooltip ke SEMUA input di atas.
2. **Searchable** — set `searchable={true}` pada SEMUA Select (termasuk yang fixed enum; UX lebih baik).
3. **Addable** — set `addable={true}` + `onAddOption`/`onAddClick` pada: class type (#6), product category (#14). Member selects TIDAK addable (harus lewat registrasi resmi).
