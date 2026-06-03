# Design System — Seven Gym

Referensi visual: https://gym-docs.7smarts.id

## 1. Color System

| Role | Light | Dark | Kapan Pakai |
|------|-------|------|-------------|
| **Primary** | `#2563eb` | `#3b82f6` | CTA, button, link, active state |
| **Primary Hover** | `#1d4ed8` | `#60a5fa` | Hover primary |
| **Primary Light** | `#eff6ff` | `rgba(59,130,246,0.12)` | Badge bg, highlight |
| **Primary Text** | `#ffffff` | `#ffffff` | Text di atas primary |
| **Secondary** | `#334155` | `#cbd5e1` | Body text, elemen pendukung |
| **Secondary Light** | `#f1f5f9` | `rgba(255,255,255,0.05)` | Hover bg ringan |
| **Tertiary** | `#64748b` | `#94a3b8` | Caption, placeholder |
| **Accent** | `#06b6d4` | `#22d3ee` | Cyan — info, gradient |
| **Accent Light** | `#ecfeff` | `rgba(6,182,212,0.12)` | Background accent |
| **Disabled** | `#cbd5e1` | `#334155` | Disabled border/icon |
| **Disabled BG** | `#f1f5f9` | `#1e293b` | Disabled background |
| **Disabled Text** | `#94a3b8` | `#475569` | Disabled text |
| **Emerald** | `#10b981` | `#34d399` | Success, fitness, growth |
| **Emerald Hover** | `#059669` | `#6ee7b7` | Hover emerald |
| **Emerald Light** | `#d1fae5` | `rgba(16,185,129,0.12)` | Background emerald |

## 2. Surface, Text & Border

| Token | Light | Dark |
|-------|-------|------|
| `--surface-bg` | `#f8fafc` | `#0b1120` |
| `--surface-card` | `#ffffff` | `#1e293b` |
| `--surface-muted` | `#f1f5f9` | `#0f172a` |
| `--text-heading` | `#0f172a` | `#f1f5f9` |
| `--text-body` | `#334155` | `#cbd5e1` |
| `--text-caption` | `#64748b` | `#94a3b8` |
| `--text-muted` | `#94a3b8` | `#475569` |
| `--border-default` | `#e2e8f0` | `#1e293b` |
| `--border-strong` | `#cbd5e1` | `#334155` |

## 3. Full Palette

### Blue (Primary)
`50:#eff6ff` `100:#dbeafe` `200:#bfdbfe` `300:#93c5fd` `400:#60a5fa` **`500:#3b82f6`** `600:#2563eb` `700:#1d4ed8` `800:#1e40af` `900:#1e3a8a`

### Cyan (Accent)
`50:#ecfeff` `100:#cffafe` `200:#a5f3fc` `300:#67e8f9` `400:#22d3ee` **`500:#06b6d4`** `600:#0891b2` `700:#0e7490` `800:#155e75`

### Emerald (Green)
`50:#ecfdf5` `100:#d1fae5` `200:#a7f3d0` `300:#6ee7b7` `400:#34d399` **`500:#10b981`** `600:#059669` `700:#047857` `800:#065f46`

### Slate (Neutral)
`50:#f8fafc` `100:#f1f5f9` `200:#e2e8f0` `300:#cbd5e1` `400:#94a3b8` `500:#64748b` `600:#475569` `700:#334155` `800:#1e293b` `900:#0f172a` `950:#020617`

## 4. Status Colors

| Status | Light BG | Main | Dark Text |
|--------|----------|------|-----------|
| Success | `#ecfdf5` | `#10b981` | `#047857` |
| Error | `#fef2f2` | `#ef4444` | `#b91c1c` |
| Warning | `#fffbeb` | `#f59e0b` | `#b45309` |
| Info | `#ecfeff` | `#06b6d4` | `#0e7490` |

## 5. Typography

**Font:** Outfit (sans-serif)

| Size | Token | Penggunaan |
|------|-------|------------|
| 36px | `text-title-md` | Page title |
| 30px | `text-title-sm` | Section heading |
| 20px | `text-theme-xl` | Card title |
| 16px | `text-base` | Sub-heading |
| 14px | `text-theme-sm` | Body (default) |
| 12px | `text-theme-xs` | Caption, label |

## 6. Cara Pakai

```css
.card {
  background: var(--surface-card);
  border: 1px solid var(--border-default);
  color: var(--text-body);
}

.btn-primary {
  background: var(--color-primary);
  color: var(--color-primary-text);
}
.btn-primary:hover {
  background: var(--color-primary-hover);
}

.badge-success {
  background: var(--color-emerald-light);
  color: var(--color-emerald);
}
```

Atau Tailwind:
```tsx
<button className="bg-blue-600 hover:bg-blue-700 text-white">CTA</button>
<div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Card</div>
```
