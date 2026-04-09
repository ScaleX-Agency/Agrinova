# AGENT.md — Agrinova Inventory Management System

> Drop this file into your project. This is the complete UI design system, data model, business logic, and feature spec for an AI coding agent to build the Agrinova IMS UI from scratch.

---

## 1. Project Overview

| Field | Value |
|---|---|
| **Product** | Agrinova IMS — Inventory Management System |
| **Company** | Agrinova — Your Partner in Lifesciences |
| **Location** | Battaramulla, Sri Lanka |
| **Users** | Max 4 concurrent users |
| **Scale** | ~250 invoices/month |
| **Roles** | Admin · Sales Representative · Customer |

---

## 2. Design Philosophy

**Aesthetic direction:** Clean enterprise-grade dashboard. Refined, data-dense, professional. Inspired by linear.app and Notion — flat surfaces, crisp typography, generous whitespace, subtle borders. NOT generic Bootstrap admin panels.

**Core principles:**
- Data density without clutter — show what matters, hide the rest in drawers
- Green + Navy brand colors thread through every screen (from logo)
- Role-based UI — admins see everything, sales reps see only their data, customers see their balance/invoices
- Offline-tolerant feel — avoid spinners everywhere; skeleton states preferred
- Print-ready — invoice and receipt pages must look clean when printed (CSS `@media print`)

---

## 3. Brand & Color System

```css
:root {
  /* === PRIMARY BRAND === */
  --color-green:        #1a5c2e;   /* Forest Green — buttons, primary actions */
  --color-green-mid:    #2d7a42;   /* Mid Green — hover states */
  --color-green-light:  #e8f5ec;   /* Light Green — badges, row highlights */
  --color-green-border: #b6d9be;   /* Green border — table accents */

  /* === SECONDARY BRAND === */
  --color-navy:         #2b2d7e;   /* Deep Navy — headings, sidebar */
  --color-navy-mid:     #3d40a8;   /* Mid Navy — hover nav items */
  --color-navy-light:   #eeeffe;   /* Light Navy — selected nav, badges */
  --color-navy-border:  #c0c3f0;   /* Navy border */

  /* === NEUTRALS === */
  --color-bg:           #faf9f5;   /* Warm Cream — page background */
  --color-surface:      #ffffff;   /* White — cards, panels */
  --color-surface-2:    #f4f3ef;   /* Off-white — table rows alt, inputs */
  --color-border:       #e4e2db;   /* Default border */
  --color-border-strong:#c8c6be;   /* Stronger border — table headers */

  /* === TEXT === */
  --color-text-primary: #1a1a1a;   /* Near black — headings, labels */
  --color-text-secondary:#5a6672;  /* Slate — secondary text, hints */
  --color-text-muted:   #9ba5ad;   /* Muted — placeholders */

  /* === STATUS === */
  --color-success:      #1a5c2e;   /* Same as green — positive amounts */
  --color-success-bg:   #e8f5ec;
  --color-warning:      #854f0b;
  --color-warning-bg:   #faeeda;
  --color-danger:       #a32d2d;
  --color-danger-bg:    #fcebeb;
  --color-info:         #185fa5;
  --color-info-bg:      #e6f1fb;

  /* === LAYOUT === */
  --sidebar-width:      240px;
  --topbar-height:      60px;
  --radius-sm:          6px;
  --radius-md:          9px;
  --radius-lg:          13px;
  --shadow-sm:          0 1px 3px rgba(0,0,0,0.06);
  --shadow-md:          0 4px 16px rgba(0,0,0,0.08);
}
```

---

## 4. Typography

```css
/* Headings — Playfair Display (serif, authoritative) */
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=DM+Sans:wght@300;400;500&display=swap');

--font-display: 'Playfair Display', Georgia, serif;
--font-body:    'DM Sans', -apple-system, sans-serif;
--font-mono:    'JetBrains Mono', 'Fira Code', monospace; /* invoice IDs, stock codes */
```

| Element | Font | Size | Weight | Color |
|---|---|---|---|---|
| Page title | Display | 24px | 700 | `--color-navy` |
| Section heading | Display | 18px | 600 | `--color-navy` |
| Card label | Body | 11px | 500 | `--color-text-secondary` (uppercase, 1.2px tracking) |
| Card value | Body | 22px | 500 | `--color-text-primary` |
| Table header | Body | 12px | 500 | `--color-text-secondary` (uppercase) |
| Table cell | Body | 14px | 400 | `--color-text-primary` |
| Badge | Body | 11px | 500 | varies by status |
| Invoice ID | Mono | 13px | 400 | `--color-navy` |

---

## 5. Layout Structure

```
┌──────────────────────────────────────────────────────┐
│  TOPBAR  (60px)   Logo · Search · User · Notifications│
├───────────┬──────────────────────────────────────────┤
│           │                                          │
│  SIDEBAR  │   MAIN CONTENT AREA                      │
│  (240px)  │   max-width: 1200px, padding: 32px       │
│           │                                          │
│  Nav      │   Page Header (title + actions)          │
│  Groups   │   ─────────────────────────────          │
│           │   Stat Cards Row (4 cards)               │
│           │   ─────────────────────────────          │
│           │   Primary Table / Content                │
│           │                                          │
└───────────┴──────────────────────────────────────────┘
```

### Sidebar Navigation Groups

```
AGRINOVA  [logo]
─────────────────
  Dashboard

INVENTORY
  Stock Overview
  Products
  New Stock Entry
  Stock Movements

SALES
  Invoices
  Receipts
  Goods Issue Notes

CUSTOMERS
  Customer List
  Outstanding Balances
  Reminders

COMMISSION
  Commission Calculator
  Sales Performance

REPORTS
  Monthly Report
  Export

─────────────────
  Settings
  [User Avatar + Name]
```

**Active nav item:** `background: --color-navy-light`, left border `3px solid --color-navy`, text `--color-navy`, weight 500.

---

## 6. Components

### 6.1 Stat Card

```html
<div class="stat-card">
  <span class="stat-label">Total Stock Items</span>
  <span class="stat-value">1,284</span>
  <span class="stat-delta positive">+12 this week</span>
</div>
```

```css
.stat-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  padding: 20px 24px;
  display: flex; flex-direction: column; gap: 6px;
}
.stat-label  { font-size: 11px; font-weight: 500; text-transform: uppercase;
               letter-spacing: 1.2px; color: var(--color-text-secondary); }
.stat-value  { font-size: 28px; font-weight: 500; color: var(--color-text-primary);
               font-family: var(--font-display); }
.stat-delta.positive { font-size: 12px; color: var(--color-success); }
.stat-delta.negative { font-size: 12px; color: var(--color-danger); }
```

### 6.2 Data Table

```css
table {
  width: 100%; border-collapse: collapse;
  font-size: 14px; font-family: var(--font-body);
}
thead th {
  font-size: 11px; font-weight: 500; text-transform: uppercase;
  letter-spacing: 1px; color: var(--color-text-secondary);
  border-bottom: 1.5px solid var(--color-border-strong);
  padding: 10px 14px; text-align: left; background: var(--color-surface);
  position: sticky; top: 0;
}
tbody tr { border-bottom: 1px solid var(--color-border); }
tbody tr:hover { background: var(--color-surface-2); }
tbody td { padding: 12px 14px; color: var(--color-text-primary); }
tbody tr:nth-child(even) { background: var(--color-bg); }
```

### 6.3 Badge / Status Pill

```css
.badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 10px; border-radius: 100px;
  font-size: 11px; font-weight: 500;
}
.badge-green  { background: var(--color-green-light);  color: var(--color-green); }
.badge-navy   { background: var(--color-navy-light);   color: var(--color-navy); }
.badge-warn   { background: var(--color-warning-bg);   color: var(--color-warning); }
.badge-danger { background: var(--color-danger-bg);    color: var(--color-danger); }
.badge-info   { background: var(--color-info-bg);      color: var(--color-info); }
```

| Status | Badge Variant |
|---|---|
| In Stock | `badge-green` |
| Low Stock | `badge-warn` |
| Out of Stock | `badge-danger` |
| Issued | `badge-navy` |
| Returned | `badge-info` |
| Paid | `badge-green` |
| Partial | `badge-warn` |
| Overdue | `badge-danger` |

### 6.4 Buttons

```css
.btn-primary {
  background: var(--color-green); color: white;
  border: none; padding: 10px 20px; border-radius: var(--radius-md);
  font-family: var(--font-body); font-size: 14px; font-weight: 500;
  cursor: pointer; transition: background .15s;
}
.btn-primary:hover { background: var(--color-green-mid); }

.btn-secondary {
  background: transparent; color: var(--color-navy);
  border: 1.5px solid var(--color-navy-border); padding: 9px 18px;
  border-radius: var(--radius-md); font-size: 14px; font-weight: 500; cursor: pointer;
}
.btn-danger {
  background: var(--color-danger-bg); color: var(--color-danger);
  border: 1px solid var(--color-danger); /* same padding as primary */
}
.btn-ghost {
  background: transparent; color: var(--color-text-secondary);
  border: none; padding: 8px 12px; border-radius: var(--radius-sm);
}
.btn-ghost:hover { background: var(--color-surface-2); color: var(--color-text-primary); }
```

### 6.5 Form Fields

```css
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-label { font-size: 13px; font-weight: 500; color: var(--color-text-primary); }
.form-input {
  border: 1.5px solid var(--color-border); border-radius: var(--radius-md);
  padding: 10px 14px; font-family: var(--font-body); font-size: 14px;
  background: var(--color-bg); color: var(--color-text-primary);
  transition: border-color .15s;
}
.form-input:focus { outline: none; border-color: var(--color-green); }
.form-input::placeholder { color: var(--color-text-muted); }
```

### 6.6 Modal / Drawer

- Modals: centered, `max-width: 560px`, white surface, `border-radius: var(--radius-lg)`, `box-shadow: var(--shadow-md)`, backdrop `rgba(0,0,0,0.35)`
- Right Drawer: `width: 420px`, slides in from right, used for viewing/editing records
- Always include: title row + close button (×), footer with Cancel + Primary action buttons

### 6.7 Invoice / Receipt Print Layout

```css
@media print {
  .sidebar, .topbar, .no-print { display: none !important; }
  .print-page {
    width: 210mm; padding: 16mm 14mm;
    font-family: 'DM Sans', sans-serif; font-size: 12pt;
  }
  .invoice-header { display: flex; justify-content: space-between; margin-bottom: 24pt; }
  .invoice-logo img { width: 120px; }
  .invoice-table th { background: var(--color-navy); color: white; }
  .invoice-total { font-weight: 700; font-size: 14pt; color: var(--color-green); }
}
```

---

## 7. Pages & Screen Specs

### 7.1 Dashboard

**Stat cards row (4 cards):**
- Total Products
- Total Stock Value (LKR)
- Outstanding Receivables (LKR)
- Invoices This Month

**Charts section (2 columns):**
- Left: Bar chart — Monthly invoice count (12 months)
- Right: Donut — Stock by inventory location (IGRN 1–4)

**Bottom section:**
- Recent invoices table (last 10) — columns: Invoice #, Customer, Date, Amount, Status
- Low stock alerts list — products below threshold

---

### 7.2 Stock Overview

**Filter bar:** Inventory Location dropdown (All · IGRN 1–4) + Search input + Export button

**Table columns:**

| Column | Type | Notes |
|---|---|---|
| Product ID | mono text | e.g. `PRD-0042` |
| Product Name | text | |
| Pack Size | text | |
| Location | badge | IGRN 1/2/3/4 |
| Current Stock | number | highlight red if < threshold |
| Last Updated | date | |
| Actions | buttons | Issue · Return · Adjust |

---

### 7.3 Products

**Actions:** Add Product button (top right) → opens modal

**Product modal fields:**
- Product ID (auto-generated, read-only)
- Product Name *
- Pack Size *
- Category
- Inventory Location * (dropdown: IGRN 1–4)
- Initial Stock Count
- Reorder Threshold

---

### 7.4 New Stock Entry

**Form fields:**
- Entry Type: `Local Purchase` | `Foreign Import` (toggle/radio)
- Date *
- Reference No.
- Inventory Location *
- Products table (add rows): Product · Pack Size · Qty Received · Unit Price
- Notes
- Submit → updates stock count for selected location (`+qty`)

---

### 7.5 Stock Movements

**Table columns:** Date · Type (Issue / Return / Purchase / Adjustment) · Product · Location · Qty Change · Reference · User

**Type badges:** Issue → `badge-navy` · Return → `badge-info` · Purchase → `badge-green` · Adjustment → `badge-warn`

---

### 7.6 Invoices

**Invoice list table:** Invoice # · Date · Customer · Sales Rep · Amount (LKR) · Status (Paid/Partial/Unpaid)

**Create invoice flow:**
1. Select Customer
2. Select Sales Rep (auto-fill if sales rep is logged in)
3. Add products (table with: Product · Qty · Unit Price · Line Total)
4. Auto-calculate: Subtotal, Tax (if any), Total
5. Print / Save

**Invoice Number format:** `INV-YYYYMM-NNN` e.g. `INV-202604-001`

**Important:** Original invoice kept by Agrinova. Customer gets printed copy.

---

### 7.7 Receipts

**Receipt list table:** Receipt # · Date · Invoice Ref · Customer · Amount · Payment Method

**Create receipt:**
- Select Invoice (dropdown, filter by customer)
- Cash Received Date *
- Amount Received
- Payment Method: Cash · Bank Transfer · Cheque
- Notes

**Receipt Number format:** `RCP-YYYYMM-NNN`

---

### 7.8 Goods Issue Notes

**Table:** GIN # · Date · Products (count) · Issued To · Issued By · Status

Recorded manually in the system after physical issue. Fields: Date · Products table · Issued To (Customer/Rep) · Notes

---

### 7.9 Customer List

**Table columns:** Customer ID · Name · Phone · Sales Rep · Outstanding (LKR) · Last Payment

**Outstanding amount color rules:**
- LKR 0: green text
- LKR 1–50,000: default text
- LKR 50,001–150,000: warning orange
- LKR 150,001+: danger red

**Customer detail drawer:** shows full profile + invoice history + payment history + outstanding balance

---

### 7.10 Outstanding Balances

**Table:** Customer · Sales Rep · Oldest Invoice Date · Days Outstanding · Total Outstanding (LKR)

**Filter:** Sales Rep dropdown · Days overdue range (0–30 / 31–65 / 65+)

**Color coding rows:**
- 0–30 days: default
- 31–65 days: `--color-warning-bg` row
- 65+ days: `--color-danger-bg` row

---

### 7.11 Reminders

Auto-generated reminder list based on outstanding amounts. Fields per reminder:
- Customer name + phone
- Outstanding amount (LKR)
- Oldest invoice date
- Days outstanding
- Assigned sales rep

Actions: Mark as contacted · Send reminder (WhatsApp/SMS link)

---

### 7.12 Commission Calculator

**Commission logic (implement exactly):**

```
days = CASH_COLLECTED_DATE - RECEIPT_DATE

if days <= 0:
    commission_rate = 2.5%
elif 0 < days <= 65:
    commission_rate = 2.0%
else:
    commission_rate = 0%

commission_amount = invoice_amount × commission_rate
```

**UI: Month selector → table per sales rep:**

| Sales Rep | Invoices | Total Sales (LKR) | Cash Collected (LKR) | Avg Days | Commission Rate | Commission (LKR) |
|---|---|---|---|---|---|---|

**Footer row:** Grand total commission for the month.

**Export:** Print-ready / Excel export button.

---

### 7.13 Sales Performance

**Per sales rep, per month:**
- Total invoices issued
- Total value (LKR)
- Total collected
- Collection rate (%)
- Top customers (by value)

**Chart:** Line chart — monthly sales per rep (multi-line, one color per rep)

---

### 7.14 Settings

- User management (Admin only): Add/edit/delete users, assign roles
- Inventory locations: Manage IGRN 1–4 names/details
- Company info: Name, address, logo, contact (used on invoices)
- Backup: Export full data as JSON/CSV

---

## 8. Data Model (simplified)

```
Users          id, name, email, role (admin|sales_rep|customer), assigned_customers[]
Customers      id, name, phone, email, address, sales_rep_id, credit_limit
Products       id, name, pack_size, category, reorder_threshold
Inventory      id, product_id, location (IGRN1–4), quantity, last_updated
StockMovement  id, product_id, location, type (issue|return|purchase|adjust), qty_change, date, ref, user_id
Invoices       id, invoice_no, date, customer_id, sales_rep_id, line_items[], total, status
Receipts       id, receipt_no, invoice_id, customer_id, cash_collected_date, amount, method
GIN            id, gin_no, date, items[], issued_to, issued_by, notes
```

---

## 9. Role-Based UI Rules

| Feature | Admin | Sales Rep | Customer |
|---|---|---|---|
| Dashboard | Full | Own data only | Own balance only |
| All customers | ✅ | ❌ (own only) | ❌ |
| Stock management | ✅ | View only | ❌ |
| Create invoice | ✅ | ✅ (own customers) | ❌ |
| Create receipt | ✅ | ✅ | ❌ |
| Commission view | All reps | Own only | ❌ |
| User management | ✅ | ❌ | ❌ |
| Export / Backup | ✅ | ❌ | ❌ |

---

## 10. Inventory Locations Reference

| Code | Name | Location |
|---|---|---|
| IGRN 1 | Head Office | Battaramulla |
| IGRN 2 | Kuliyapitiya Branch | Kuliyapitiya |
| IGRN 3 | Nuwara Eliya Branch | Nuwara Eliya |
| IGRN 4 | Peradeniya Branch | Peradeniya |

---

## 11. Key UX Rules

1. **Sticky table headers** — all data tables have `position: sticky; top: 0` on `<thead>`
2. **Empty states** — every table must have an illustrated empty state with a call-to-action button
3. **Confirmation dialogs** — all delete/destructive actions require a modal confirmation
4. **Toast notifications** — success/error feedback as floating toasts (top-right, 3s auto-dismiss)
5. **Loading skeletons** — use animated skeleton rows instead of spinners for table loading
6. **Keyboard shortcuts** — `N` for new record, `Escape` to close modals
7. **Date format** — always display as `DD MMM YYYY` (e.g. `09 Apr 2026`)
8. **Currency format** — always `LKR #,###,###.00` (never just numbers)
9. **Print invoices** — `window.print()` triggered button, hides sidebar/topbar via `@media print`
10. **Returns** — only possible after manager/chairman approval; show "Pending Approval" badge until approved

---

## 12. Responsive Behavior

- **Desktop (≥1280px):** Full sidebar + full table columns
- **Tablet (768–1279px):** Sidebar collapses to icon-only (48px), table hides less important columns
- **Mobile (< 768px):** Sidebar hidden, hamburger menu, cards stack vertically, tables scroll horizontally

---

## 13. Tech Stack Recommendation

| Layer | Recommendation |
|---|---|
| Frontend | React + Vite |
| UI Framework | Tailwind CSS (custom config using above tokens) |
| Charts | Recharts |
| Tables | TanStack Table |
| Forms | React Hook Form + Zod |
| State | Zustand |
| Backend | Supabase (Postgres + Auth + RLS for role-based access) |
| PDF/Print | react-to-print |
| Export | SheetJS (xlsx) |

---

## 14. File Reference

- Logo: `agrinova-logo.jpeg` — use in topbar (32px height), invoices (80px), login page (120px)
- Primary color extracted from logo: `#1a5c2e` (green), `#2b2d7e` (navy)
- Tagline: *"Your Partner in Lifesciences"*
- Address: 205D, Kalapaluwawa Road, Koswatta, Battaramulla
- Tel: 011 207 3603/4 · Mob: 0777 687 897
- Email: info.agrinova@gmail.com

---

*Generated for Agrinova IMS · April 2026 · agrinova-ims AGENT.md v1.0*
