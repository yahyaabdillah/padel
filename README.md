# Seven Gym Mockup

Mockup aplikasi Seven Gym Management System.

## Tech Stack

- **Next.js 16** + React 19 + TypeScript
- **Tailwind CSS 4** (via `@tailwindcss/postcss`)
- **Font**: Outfit (Google Fonts)
- **Charts**: ApexCharts
- **Calendar**: FullCalendar

## Getting Started

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000)

## Halaman UI Kit

Akses halaman UI Kit di: [http://localhost:3000/ui-kit](http://localhost:3000/ui-kit)

Halaman ini menampilkan semua komponen yang tersedia:
- Design Tokens (Colors, Typography, Spacing, Shadows)
- Buttons (Primary, Outline, Sizes, Icons, Disabled)
- Badges (Light, Solid, Colors, Sizes)
- Alerts (Success, Error, Warning, Info)
- Forms & Inputs (Text, Email, Password, Select, Textarea, States)
- Tables
- Modals (Default, Fullscreen)
- Switches & Toggles
- Cards (Stat, Revenue, Warning, Info)
- Typography Scale
- Spacing & Border Radius

## Struktur Komponen

```
src/
├── app/
│   ├── layout.tsx          (Root layout + providers)
│   └── (admin)/
│       ├── layout.tsx      (Sidebar + Header + RBAC)
│       └── ui-kit/page.tsx (UI Kit showcase)
├── components/
│   ├── ui/                 (Button, Badge, Alert, Modal, Table, etc.)
│   ├── form/               (Input, Select, Switch, TextArea, etc.)
│   ├── common/             (ComponentCard, PageBreadCrumb, etc.)
│   ├── header/             (BranchSwitcher, UserDropdown, etc.)
│   └── ...
├── context/                (Theme, Role, Sidebar, PrototypeData)
├── hooks/                  (useModal, useGoBack)
├── icons/                  (SVG icons + gym-icons.tsx)
├── layout/                 (AppHeader, AppSidebar, Navigation)
└── data/                   (Mock data for prototype)
```
