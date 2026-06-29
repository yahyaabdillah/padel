# PadelPro — Master Schema

**File:** `prisma/master.prisma`  
**DB:** PostgreSQL (shared across platform)  
**Updated:** 2026-06-22

---

## Purpose

Master DB menyimpan:
- Role & permission definitions
- Menu configuration (sidebar)
- RBAC matrix (role→menu, role→permission)
- Tenant registry (club DB connections)
- App version

---

## Tables

### m_role — Role Definitions

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| key | VARCHAR(50) | Unique: superadmin/owner/staff/coach/member |
| name | VARCHAR(100) | Display label |
| description | TEXT | |
| scope | VARCHAR(20) | platform/club/member |
| level | INT | 1=highest authority |
| isSystem | BOOLEAN | System role (cannot delete) |

**Relations:**
- m_role_permission[]
- m_role_menu[]

---

### m_permission — Permission Keys

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| key | VARCHAR(100) | Unique: booking.create, members.view, etc. |
| name | VARCHAR(255) | Display |
| groupName | VARCHAR(100) | Grouping category |

**Relations:**
- m_role_permission[]

---

### m_role_permission — Role↔Permission Mapping

Many-to-many junction.

| Column | Type | Notes |
|--------|------|-------|
| roleId | UUID | FK m_role |
| permissionId | UUID | FK m_permission |

**Unique:** (roleId, permissionId)

---

### m_menu — Sidebar Menu Entries

Hierarchical via parentKey.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| key | VARCHAR(100) | Unique slug |
| label | VARCHAR(150) | Display text |
| path | VARCHAR(200) | Route path (empty for parent) |
| icon | VARCHAR(60) | lucide-react export name |
| parentKey | VARCHAR(100) | Parent menu key |
| groupKey | VARCHAR(20) | main/master/others |
| section | VARCHAR(40) | Platform/Club/Member |
| sortOrder | INT | Display order |
| badge | VARCHAR(20) | new/soon/hot |
| isActive | BOOLEAN | |

**Relations:**
- m_role_menu[]

---

### m_role_menu — Role↔Menu Access Matrix

Per-role action flags per menu.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| roleId | UUID | FK m_role |
| menuId | UUID | FK m_menu |
| canView | BOOLEAN | Menu visible |
| canCreate | BOOLEAN | Create action |
| canUpdate | BOOLEAN | Update action |
| canDelete | BOOLEAN | Delete action |
| canCancel | BOOLEAN | Cancel action |
| canImport | BOOLEAN | Import action |
| canExport | BOOLEAN | Export action |

**Unique:** (roleId, menuId)

---

### m_version — App Version

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| versionName | VARCHAR(50) | e.g. "v1" |
| isActive | BOOLEAN | |
| description | TEXT | |

---

### m_tenant — Tenant Registry

DB connection per tenant/club.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID | PK |
| companyId | VARCHAR(50) | Unique identifier |
| name | VARCHAR(255) | Club name |
| slug | VARCHAR(100) | URL slug |
| mode | VARCHAR(20) | custom/product |
| status | VARCHAR(20) | active/trial/suspended/past_due |
| dbHost | VARCHAR(255) | DB host |
| dbPort | INT | Default 5432 |
| dbName | VARCHAR(100) | DB name |
| dbUsername | VARCHAR(100) | DB user |
| dbPassword | VARCHAR(255) | DB password |

---

## RBAC Flow

1. User login → query `m_user` di tenant DB (roleKey)
2. Resolve role level dari `m_role` di master DB
3. Load permissions dari `m_role_permission` + `m_permission`
4. Load menu visibility dari `m_role_menu` + `m_menu`
5. Session cookie berisi: companyId, userId, roleKey, level

---

## Audit Pattern

All tables have:
- createdAt, createdBy
- updatedAt, updatedBy
- deletedAt, deletedBy (nullable)
- isDeleted INT (0=live, 1=soft-deleted)
