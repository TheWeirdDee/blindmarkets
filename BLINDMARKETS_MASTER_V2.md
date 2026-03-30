# BLINDMARKETS
## Complete Architecture & Agent Truth Document
### Version 2.0 · March 2026 · Starknet × Bitcoin
### Updated to reflect actual codebase after ls -R audit

---

## 0. HOW TO USE THIS DOCUMENT (AGENT INSTRUCTIONS)

> **CRITICAL FOR LLM AGENTS:** This document is the single source of truth for completing BlindMarkets. The PRD at `docs/requirements/prd.md` governs protocol correctness. This document governs build order, routing, design system, Starkzap integration, and docs content. When both documents exist, this document takes precedence on UI, routing, integration, and docs decisions. The PRD takes precedence on cryptographic and protocol specifications.
>
> **Before writing a single line of code:** Read the codebase audit in Section 1.4. Many components already exist. Your job is verification, gap-filling, and improvement — not a fresh build. Mark every task with ✅ after completion. Write to `AGENT_PROGRESS.md` after every task.

### Document Sections

| Section | Contents |
|---|---|
| **0** | How to use this document |
| **1** | Project philosophy, tech stack, actual codebase inventory |
| **2** | Design system — tokens, typography, glassmorphism |
| **3** | Routing architecture — target state vs. current state |
| **4** | Landing page — section-by-section spec |
| **5** | App pages — wireframe specs |
| **6** | Component library — what exists, what to fix, what to add |
| **7** | Starkzap integration — replaces manual starknetWallet.ts |
| **8** | Backend services — Rust gateway + coordinator + observer |
| **9** | Documentation content — every docs page fully specced |
| **10** | PL Genesis submission requirements |
| **11** | Agent phase breakdown — verification-first build order |

---

## 1. PROJECT PHILOSOPHY, TECH STACK & CODEBASE INVENTORY

### 1.1 Product Philosophy

BlindMarkets is a privacy-preserving Bitcoin intent execution protocol on Starknet. It looks and feels like institutional-grade DeFi infrastructure — not a hackathon demo. The encryption layer is invisible to traders. The Starknet settlement layer is invisible to non-technical users. The UI should feel closer to a professional dark-mode trading terminal than a consumer crypto app.

Three principles govern every decision:

- **PRIVACY BY DEFAULT:** Intents are encrypted before they leave the client. The UI visually reinforces this at all times — lock icons, encryption indicators, and privacy mode selectors are always visible.
- **INSTITUTIONAL CREDIBILITY:** Every pixel communicates that this is infrastructure for serious capital. Clean, data-dense, professional.
- **PROGRESSIVE DISCLOSURE:** Advanced constraints are available but never forced. Default flow: connect → select pair → enter amount → select privacy mode → submit.

### 1.2 Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | Frontend at `/frontend/` |
| Language | TypeScript 5.x strict | Frontend + both TS SDKs |
| Styling | Tailwind CSS + CSS Variables | `tailwind.config.ts` exists |
| UI Components | shadcn/ui | Already installed |
| Wallet Layer | **Starkzap SDK** | Replaces `lib/starknetWallet.ts` |
| Starknet | starknet.js | Used in existing lib files |
| State | Zustand | `state/useIntentStore.ts` exists |
| Server State | TanStack Query | Add — not yet in use |
| Forms | React Hook Form + Zod | Add where missing |
| Backend | **Rust** (Axum) | `/backend/gateway/`, `/backend/coordinator/`, `/backend/observer/` |
| Database | PostgreSQL | 5 migration files exist |
| Contracts | Cairo / Scarb | 6 contracts + mocks + tests |
| Fonts | Inter + JetBrains Mono | Add via next/font |
| Animation | Framer Motion | Add — not yet in use |
| Deployment | Vercel (frontend) + Docker (backend) | `docker-compose.yml` exists |

### 1.3 Hard Constraints

- **Never** store plaintext intent data server-side. Encryption happens in `lib/intentCrypto.ts` before any network call.
- **Never** use a raw private key or hot wallet for user-facing transactions. Starkzap manages all user signing.
- **Always** use the AVNU Paymaster for user-facing transactions after Starkzap integration. Users never manage STRK for gas.
- **Dark mode only.** `<html>` is hardcoded dark. No toggle.
- All contract addresses come from `.env.local` (frontend) or `deployment_addresses.env` (backend/scripts). Never hardcode.
- The two TypeScript SDKs (`/client-sdk-ts/` and `/sdk/`) must be consolidated. `/sdk/` is the canonical one. `/client-sdk-ts/` is the older version — migrate any unique logic to `/sdk/` and remove `/client-sdk-ts/`.

### 1.4 Codebase Audit — What Exists vs. What Needs Work

#### Contracts (`/contracts/`)
| File | Status | Notes |
|---|---|---|
| `intent_registry.cairo` | ✅ Built | Verify test coverage in `test_intent_registry.cairo` |
| `batch_auction.cairo` | ✅ Built | Verify test coverage |
| `batch_settlement.cairo` | ✅ Built | Verify test coverage |
| `solver_bond.cairo` | ✅ Built | Verify test coverage |
| `asset_registry.cairo` | ✅ Built | Verify integration with IntentRegistry |
| `gateway_registry.cairo` | ✅ Built | Verify access control |
| `test_integration.cairo` | ✅ Built | Run full integration test suite |
| **Starknet Sepolia deployment** | ❌ MISSING | `deployment_addresses.env` exists — verify if populated or empty |

#### Backend Rust Services
| Service | File | Status | Notes |
|---|---|---|---|
| Gateway | `api.rs` | ✅ Built | Verify all endpoints match API spec |
| Gateway | `auth.rs` | ✅ Built | Verify wallet signature validation |
| Gateway | `crypto.rs` | ✅ Built | Verify encryption scheme matches client SDK |
| Gateway | `ciphertext_pool.rs` | ✅ Built | Verify solver auth gating |
| Gateway | `rate_limiter.rs` | ✅ Built | Verify limits are configured |
| Gateway | `websocket.rs` | ✅ Built | Verify batch event streaming |
| Gateway | `metrics.rs` | ✅ Built | Verify Prometheus endpoints |
| Gateway | `pending_ledger.rs` | ✅ Built | Verify lifecycle tracking |
| Gateway | DB migrations | ✅ Built | 5 migrations — verify schema matches current code |
| Coordinator | `batch_scheduler.rs` | ✅ Built | Verify 30s window determinism |
| Coordinator | `starknet_client.rs` | ✅ Built | Verify Sepolia RPC config |
| Observer | `indexer.rs` | ✅ Built | Verify event parsing for all 4 contracts |

#### Client SDKs
| SDK | Status | Notes |
|---|---|---|
| `/client-sdk/` (Rust) | ✅ Built | Keep as-is for solver reference |
| `/client-sdk-ts/src/` | ⚠️ Legacy | Migrate unique logic to `/sdk/src/`, then delete |
| `/sdk/src/` | ✅ Canonical TS SDK | This is the one to use and complete |

#### Frontend (`/frontend/`)
| Item | Status | Notes |
|---|---|---|
| `app/page.tsx` | ⚠️ Broken | Scroll-anchor single page — must be replaced with proper landing page |
| `app/dashboard/page.tsx` | ⚠️ Exists | Verify this becomes the main app page after routing refactor |
| `app/analytics/page.tsx` | ⚠️ Stub | Needs real content wired to backend |
| `app/intent/page.tsx` | ⚠️ Verify | May be redundant after routing refactor |
| `app/docs/*` | ⚠️ Incomplete | Structure exists, content needs to be filled per Section 9 |
| `app/globals.css` | ⚠️ Partial | Design tokens need to be completed per Section 2.2 |
| `tailwind.config.ts` | ⚠️ Partial | Verify tokens and font config |
| **Route groups** | ❌ Missing | No `(public)`, `(app)`, `(auth)` groups — routing is flat |
| **middleware.ts** | ❌ Missing | No wallet-gated route protection |

#### Existing Components (`/frontend/components/`)
| Component | Status | Notes |
|---|---|---|
| `IntentComposer.tsx` | ⚠️ Exists | Verify props, Starkzap integration, all privacy modes |
| `BatchTimeline.tsx` | ⚠️ Exists | Verify live data connection and animation |
| `RiskDisclosurePanel.tsx` | ⚠️ Exists | Verify collapsible behavior and content |
| `SolverFillPreview.tsx` | ⚠️ Exists | Verify range visualization accuracy |
| `AuditLogView.tsx` | ⚠️ Exists | Verify filter, decrypt button, CSV export |
| `NavigationBar.tsx` | ⚠️ Exists | Must be refactored — no longer scroll-anchor, becomes PublicNav |
| `WalletConnect.tsx` | ⚠️ Exists | Replace internals with Starkzap onboarding |
| `PrivacyModeBadge.tsx` | ⚠️ Exists | Verify three modes with correct color tokens |
| `ExecutionChart.tsx` | ⚠️ Exists | Verify Recharts integration |
| `DashboardLayout.tsx` | ⚠️ Exists | Becomes AppLayout — add sidebar per spec |
| **AppSidebar** | ❌ Missing | Build new |
| **AppHeader** | ❌ Missing | Build new |
| **MobileTabNav** | ❌ Missing | Build new |
| **BatchCountdown** | ❌ Missing | Verify if part of BatchTimeline or separate |
| **EmptyState** | ❌ Missing | Build new |

#### Lib (`/frontend/lib/`)
| File | Status | Notes |
|---|---|---|
| `intentCrypto.ts` | ✅ Exists | Verify AES-256-GCM implementation matches gateway `crypto.rs` |
| `starknetWallet.ts` | ⚠️ Replace | Manual wallet connection — replace with Starkzap |

#### State (`/frontend/state/`)
| File | Status | Notes |
|---|---|---|
| `useIntentStore.ts` | ⚠️ Exists | Verify wallet state is in here or separate; add wallet slice per Section 7.3 |

#### Infrastructure
| Item | Status | Notes |
|---|---|---|
| `docker-compose.yml` | ✅ Exists | Verify all services: gateway, coordinator, observer, postgres |
| `scripts/deploy_contracts.sh` | ✅ Exists | Use this for Starknet Sepolia deployment |
| `scripts/test_e2e.sh` | ✅ Exists | Run after deployment to verify |
| `deployment_addresses.env` | ⚠️ Verify | Check if Starknet Sepolia addresses are populated |

---

## 2. DESIGN SYSTEM

### 2.1 Aesthetic Direction

> BlindMarkets aesthetic: "Encrypted Finance Terminal." Deep dark backgrounds with frosted glass cards and a cyan/teal accent that signals "encrypted and active." Every element must feel like it was designed for a sophisticated BTC trader who cares about execution privacy.

### 2.2 Color Tokens (CSS Variables — complete in `app/globals.css`)

These replace or extend whatever is currently in `globals.css`. All must be present.

```css
:root {
  /* Backgrounds */
  --bg-base: #080c18;
  --bg-surface: #0f1629;
  --bg-glass: rgba(15, 22, 41, 0.6);
  --bg-overlay: rgba(15, 22, 41, 0.9);

  /* Glass */
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-border-strong: rgba(255, 255, 255, 0.15);
  --glass-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);

  /* Text */
  --text-primary: #f9fafb;
  --text-secondary: #9ca3af;
  --text-muted: #4b5563;

  /* Accent — cyan */
  --accent: #22d3ee;
  --accent-subtle: rgba(34, 211, 238, 0.1);
  --accent-foreground: #080c18;

  /* Privacy modes */
  --privacy-high: #10b981;      /* Max Privacy */
  --privacy-medium: #f59e0b;    /* Hidden Amount */
  --privacy-public: #6b7280;    /* Public */

  /* Status */
  --status-success: #10b981;
  --status-pending: #f59e0b;
  --status-error: #ef4444;
  --status-cancelled: #6b7280;

  /* Risk tiers */
  --risk-low: #10b981;
  --risk-medium: #f59e0b;
  --risk-high: #ef4444;

  /* Mono — addresses, hashes */
  --mono: #22d3ee;

  /* Radius */
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;
}
```

Glassmorphism base classes — add to `globals.css`:

```css
.glass-card {
  background: var(--bg-glass);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--glass-shadow);
}

.glass-card-hover {
  transition: border-color 0.2s ease, background 0.2s ease;
}

.glass-card-hover:hover {
  border-color: var(--glass-border-strong);
  background: rgba(15, 22, 41, 0.75);
}

.glass-card-interactive {
  cursor: pointer;
  transition: all 0.2s ease;
}

.glass-card-interactive:hover {
  transform: translateY(-1px);
  border-color: var(--glass-border-strong);
}
```

### 2.3 Typography

```css
/* app/globals.css — add font imports */
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', monospace;
```

In `app/layout.tsx`, import via `next/font/google`:

```typescript
import { Inter, JetBrains_Mono } from 'next/font/google'

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' })
```

### 2.4 Privacy Mode Visual Language

Consistent across the entire UI. Never deviate from these.

| Mode | Lucide Icon | Token | Badge Label |
|---|---|---|---|
| Public | `LockOpen` | `--privacy-public` | "PUBLIC" |
| Hidden Amount | `Lock` | `--privacy-medium` | "HIDDEN AMOUNT" |
| Max Privacy | `ShieldCheck` | `--privacy-high` | "MAX PRIVACY" |

### 2.5 Motion

All animations: Framer Motion. Default ease: `[0.16, 1, 0.3, 1]`. Max duration: 400ms.

| Animation | Duration | Use Case |
|---|---|---|
| `fadeInUp` | 280ms | Page content load, card appearance |
| `fadeIn` | 200ms | Modal backdrop |
| `slideInRight` | 300ms | Drawer panels |
| `scaleIn` | 200ms | Dropdown menus |
| `pulse-encrypted` | 2000ms loop | Encrypted indicator dot on landing |
| `shimmer` | 1600ms loop | Skeleton loading |

---

## 3. ROUTING ARCHITECTURE

### 3.1 Current State (Broken)

```
frontend/app/
├── page.tsx           ← Scroll-anchor single page — REPLACE
├── dashboard/
│   ├── layout.tsx     ← DashboardLayout exists — REFACTOR to AppLayout
│   └── page.tsx       ← Main app page — MOVE to (app)/desk/
├── analytics/
│   └── page.tsx       ← Stub — MOVE to (app)/analytics/ and fill
├── intent/
│   └── page.tsx       ← Verify purpose — likely fold into desk
├── docs/              ← Good structure — keep, fill content
└── api/               ← Gateway proxy routes — keep
```

### 3.2 Target State

```
frontend/app/
├── (public)/
│   ├── layout.tsx     ← PublicLayout: PublicNav + PublicFooter
│   └── page.tsx       ← New standalone landing page
│
├── (app)/
│   ├── layout.tsx     ← AppLayout: AppSidebar + AppHeader
│   ├── desk/
│   │   └── page.tsx   ← Trading desk (from dashboard/page.tsx)
│   ├── history/
│   │   └── page.tsx   ← Full intent history (from AuditLogView)
│   ├── analytics/
│   │   └── page.tsx   ← Analytics (from analytics/page.tsx)
│   ├── risk/
│   │   └── page.tsx   ← Risk & bridge monitoring
│   └── solver/
│       └── page.tsx   ← Solver desk
│
├── (auth)/
│   └── connect/
│       └── page.tsx   ← Starkzap wallet onboarding
│
├── docs/              ← Keep existing structure, fill content per Section 9
│   ├── layout.tsx
│   └── [all doc pages per Section 9]
│
└── api/               ← Keep existing gateway proxy routes
    └── gateway/
```

### 3.3 Middleware

Create `frontend/middleware.ts`:

```typescript
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const APP_ROUTES = ['/desk', '/history', '/analytics', '/risk', '/solver']

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const walletConnected = request.cookies.get('blindmarkets-wallet')?.value

  if (APP_ROUTES.some(r => pathname.startsWith(r)) && !walletConnected) {
    return NextResponse.redirect(
      new URL(`/connect?next=${encodeURIComponent(pathname)}`, request.url)
    )
  }

  if (pathname === '/connect' && walletConnected) {
    return NextResponse.redirect(new URL('/desk', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/desk/:path*',
    '/history/:path*',
    '/analytics/:path*',
    '/risk/:path*',
    '/solver/:path*',
    '/connect',
  ],
}
```

### 3.4 Layout Files

**`(public)/layout.tsx`:** PublicNav (transparent → glass on scroll) + PublicFooter. No auth required.

**`(app)/layout.tsx`:** AppSidebar (220px fixed left) + AppHeader (60px fixed top). Wallet cookie required (middleware enforces).

**`(auth)/connect/page.tsx`:** Standalone fullscreen. No layout wrapper.

**`docs/layout.tsx`:** Existing DocsLayout — keep and verify.

---

## 4. LANDING PAGE SPECIFICATION

The current `page.tsx` is a scroll-anchor app page. Replace it entirely with a standalone marketing page. Content from the existing hero section is good — restructure into proper sections.

### 4.1 Navigation Bar

Fixed, 64px, glass on scroll. Logo left (BrandMark.svg + wordmark). Nav center (desktop): Features · How It Works · Risk · Docs. CTA right: "Open Desk" (accent), "Connect Wallet" (ghost). Mobile: hamburger → fullscreen menu.

### 4.2 Hero Section

Background: `--bg-base`. Subtle animated particle field (small cyan dots, slow motion).

```
Label chip:  "Built on Starknet × Bitcoin"
H1:          "Private BTC execution on Starknet, without leaking the trade before it lands."
Subheadline: "Encrypt the order, commit from the wallet, and let solvers compete on price after the intent is in the batch."
CTAs:        "Open Intent Desk" (accent, large) · "View Batch Data →" (ghost, large)
Hero visual: Animated IntentComposer mockup card — BTC→USDC, Max Privacy mode, 30s countdown ticking
```

### 4.3 Problem Section

Label: "THE PROBLEM"
Headline: "Every public mempool tells the market what you're about to do."

Three stat cards:
- "Front-run before it lands" — mempool visibility = pre-execution alpha leak
- "No price improvement" — AMMs can't compete with private RFQ
- "Sandwich attacks on size" — large BTC orders are systematically exploited

### 4.4 Solution Section

Four alternating feature blocks (left text/right visual, right text/left visual):

1. **Ciphertext First** — Gateway receives AES-256-GCM encrypted payloads. No one sees your order before the batch closes.
2. **Batch Clearing** — Intents collect in 30-second windows. Ordering advantage structurally eliminated.
3. **Competitive Solver Market** — Bonded solvers bid for clearing rights. Best execution guaranteed.
4. **ZK Settlement** — Cairo contracts verify settlement correctness. No trust in solver's word.

### 4.5 Privacy Mode Section

Headline: "Choose how much you reveal."

Three glass cards:
- 🔓 **Public** — Pair, size, and direction visible from submission. Use when speed > concealment.
- 🔒 **Hidden Amount** — Pair and direction visible. Size hidden until batch closes.
- 🔐 **Max Privacy** — Size and direction both hidden. Solver sees neither until execution.

### 4.6 How It Works

Three numbered steps, horizontal on desktop, vertical on mobile:
1. **Encrypt and submit** — Create intent locally, encrypt for gateway, store ciphertext off-chain.
2. **Commit from the wallet** — Wallet sends on-chain commitment hash. You retain cryptographic control.
3. **Clear and settle** — Batch closes, solvers compete, settlement verified on Starknet.

### 4.7 Risk Transparency Section

Headline: "We publish everything that can go wrong."

Show bridge risk table: Bridge risk (Medium), Custody (Multi-sig 7-of-10), Settlement time (60-120 min). "View audit reports →" link. This builds trust with institutional users.

### 4.8 CTA Band + Footer

CTA band: "Ready to route your first BTC intent?" + "Open Intent Desk →" button.

Footer three columns: (1) Logo + tagline "Blind BTC Intent Protocol" + © 2026 BlindMarkets. (2) Protocol: Desk · History · Analytics · Risk. (3) Resources: Docs · GitHub · Audit Reports · Status.

---

## 5. APP PAGES — WIREFRAME SPECIFICATIONS

### 5.1 App Layout Shell

**AppSidebar (220px, fixed left)**
- Top: BlindMarkets logo (BrandMark.svg + wordmark)
- Nav links with Lucide icons:
  - `Crosshair` → `/desk` → "Desk"
  - `Clock` → `/history` → "History"
  - `BarChart2` → `/analytics` → "Analytics"
  - `ShieldAlert` → `/risk` → "Risk"
  - `Zap` → `/solver` → "Solver" (show only when solver mode active)
- Bottom: wallet address (truncated, copy), NetworkBadge
- Collapses to 64px icon-only at `<1280px`. Hidden at `<768px` (hamburger replaces).

**AppHeader (60px, fixed top)**
- Left: Page title / breadcrumb
- Right: BatchCountdown chip (always visible) + WalletStatus button

### 5.2 Trading Desk (/desk)

Two-column split desktop layout:
- Left (60%): `IntentComposer` glass card — full height
- Right (40%): `BatchPanel` stacked on top of `RiskPanel`

IntentComposer sections:
1. Asset pair selector (BTC → token, Switch button)
2. Amount input (balance below, MAX button)
3. "Advanced ▼" constraints expander: min output, max fee, deadline, partial fill toggle
4. Privacy mode selector (three clickable glass cards)
5. `EstimatedFill` range (Min/Expected/Max vs AMM)
6. Cost breakdown (gas + solver fee)
7. "Submit Intent" button (accent, full-width)
8. PrivacyBadge below button

BatchPanel:
- BatchCountdown with live progress bar + seconds
- Last batch stats: intent count, volume, fill rate, settlement status
- "Recent Batches ▼" expandable

RiskPanel: Collapsed by default. "⚠ Risk Disclosure ▸" header. Expands to: bridge risk, custody, settlement time, "What could go wrong?" accordion.

Mobile: Single column. MobileTabNav at bottom (4 tabs: Desk · History · Analytics · Risk).

### 5.3 Intent History (/history)

Header: "Intent History" + Export CSV button.
Filter bar: Date range, Status filter, Search by intent ID.

Intent cards (not table — better for this data density):
- Row 1: Intent ID (mono, truncated), Status badge, timestamp
- Row 2: Pair, amount ("HIDDEN" if encrypted), PrivacyBadge
- Expandable: Batch ID, fill price, solver address, settlement tx with Starkscan link
- Actions: "Decrypt Details" (wallet signature required) | "Cancel On-Chain" (if pending)

Empty state: lock icon illustration + "No intents yet. Submit your first from the Desk."

### 5.4 Analytics (/analytics)

Header: "Analytics" + time range selector (24h / 7d / 30d / All).

Metric cards row (4):
1. Total Volume (USD settled)
2. Active Solvers (unique, last 30 batches)
3. Average Fill Rate (%)
4. Average Savings vs AMM (bps)

Charts grid:
- Left: Batch Volume over time (BarChart, Recharts)
- Right: Fill Rate distribution (AreaChart, Recharts)
- Full-width: Solver Leaderboard table (address, fill count, avg savings bps, bond, reliability)

### 5.5 Risk (/risk)

Bridge Risk section: one card per supported bridge (name, TVL, custody model, risk tier badge, proof-of-reserve link, last verified).

System Health: Starknet RPC, Gateway API, Coordinator — green/amber/red dots with latency. Last batch finality time.

Audit Reports: list with date, scope, auditor, finding counts, PDF links.

### 5.6 Solver Desk (/solver)

Route guard: only accessible with solver mode enabled.

Bond Management: current bond, required minimum, "Top Up" + "Withdraw" buttons.
Intent Pool: current batch's commitment hashes (ciphertext — plaintext locked until batch close).
Bid Interface: after batch close, decrypted intents appear with bid form (route, expected output, fee).
Solver History: past batch participations, fees earned, slashing events.

---

## 6. COMPONENT LIBRARY — VERIFICATION AND GAPS

### 6.1 Components to Verify (Exist — Check Against Spec)

For each existing component, the agent must:
1. Open the file
2. Verify it matches the design tokens in Section 2
3. Verify it uses CSS variables (not hardcoded hex)
4. Verify TypeScript props are fully typed
5. Verify mobile responsiveness
6. Fix any gaps found

| Component | Key Things to Verify |
|---|---|
| `IntentComposer.tsx` | All three privacy modes work. Submit calls Starkzap (after Phase 2). Loading state during tx. |
| `BatchTimeline.tsx` | Live data from `/api/gateway/batches`. Countdown animation. Last batch stats populated. |
| `RiskDisclosurePanel.tsx` | Collapsible. Correct risk values. Audit report links present. |
| `SolverFillPreview.tsx` | Min/Expected/Max range renders. AMM comparison label present. |
| `AuditLogView.tsx` | Filters work. Decrypt button triggers wallet signature. CSV export functional. |
| `PrivacyModeBadge.tsx` | All three modes with correct color tokens from Section 2.4. Tooltips present. |
| `ExecutionChart.tsx` | Recharts integration. Responsive. Uses `--chart-*` colors. |
| `DashboardLayout.tsx` | Refactor into AppLayout — add AppSidebar. Keep header logic. |
| `NavigationBar.tsx` | Refactor into PublicNav — remove scroll-anchor behavior, add proper Link routing. |
| `WalletConnect.tsx` | Replace internals with Starkzap onboarding (Phase 2 task). |
| `BrandMark.tsx` | Verify SVG renders correctly at all sizes. |

### 6.2 Components to Build (Missing)

| Component | Location | Description |
|---|---|---|
| `AppSidebar` | `components/layout/` | 220px fixed left. Logo, nav links, wallet info. Collapse at 1280px. |
| `AppHeader` | `components/layout/` | 60px fixed. Breadcrumb + BatchCountdown chip + WalletStatus. |
| `PublicNav` | `components/layout/` | Landing page nav. Transparent → glass on scroll. |
| `PublicFooter` | `components/layout/` | Three-column footer. |
| `MobileTabNav` | `components/layout/` | Bottom tabs for `<768px`: Desk · History · Analytics · Risk. |
| `EmptyState` | `components/ui/` | SVG illustration + heading + description + optional CTA. |
| `BatchCountdown` | `components/batch/` | Live countdown with progress bar. Pulse on < 5s. |
| `IntentCard` | `components/intent/` | Single intent card for history list. Status badge, expandable, decrypt/cancel actions. |
| `IntentStatusBadge` | `components/intent/` | Settled / Pending / Cancelled / Failed with color tokens. |
| `BridgeCard` | `components/risk/` | TVL, custody model, risk tier badge, proof-of-reserve link. |
| `SystemStatusDot` | `components/risk/` | Green/amber/red dot with label and latency. |
| `NetworkBadge` | `components/wallet/` | "Starknet Sepolia" or "Starknet Mainnet" with indicator dot. |
| `AddressDisplay` | `components/wallet/` | Mono font address, copy button, Starkscan link. |
| `WalletStatus` | `components/wallet/` | Truncated address + copy. Used in AppHeader and AppSidebar. |

### 6.3 SDK Consolidation

The project has two TypeScript SDKs:
- `/client-sdk-ts/src/` — older, has: `crypto.ts`, `intentBuilder.ts`, `gatewayClient.ts`, `types.ts`, `utils.ts`, `errors.ts`
- `/sdk/src/` — canonical, has: `client.ts`, `crypto.ts`, `intent.ts`, `types.ts`, `errors.ts`, `index.ts`

**Action:** Compare `client-sdk-ts/` with `/sdk/`. Migrate any logic unique to `client-sdk-ts/` into `/sdk/src/`. Delete `/client-sdk-ts/` after migration. Update all imports.

---

## 7. STARKZAP INTEGRATION

### 7.1 What Starkzap Replaces

`frontend/lib/starknetWallet.ts` currently handles manual wallet connection (Argent/Braavos only, manual gas, manual nonce). Starkzap replaces this entirely with:
- Social login via Privy (email, Google, Apple) — no extension required
- AVNU Paymaster — zero gas for users
- Clean `wallet.execute()` for all on-chain calls
- Solver routing via `AvnuSwapProvider` + `EkuboSwapProvider`

### 7.2 Installation and Configuration

```bash
cd frontend/
npm install starkzap
```

Create `frontend/lib/starkzap.ts`:

```typescript
import { StarkZap } from 'starkzap'

export const starkzap = new StarkZap({
  network: process.env.NEXT_PUBLIC_STARKNET_NETWORK as 'mainnet' | 'sepolia',
  paymaster: {
    nodeUrl: process.env.NEXT_PUBLIC_AVNU_PAYMASTER_URL!,
    apiKey: process.env.NEXT_PUBLIC_AVNU_API_KEY!,
  },
})
```

Delete `frontend/lib/starknetWallet.ts` after migration.

### 7.3 Wallet Store (update `state/useIntentStore.ts` or create `state/walletStore.ts`)

```typescript
import { create } from 'zustand'
import { connectWallet, connectWithArgent } from '@/lib/starkzap-wallet'

interface WalletState {
  wallet: StarkzapWallet | null
  address: string | null
  isConnecting: boolean
  connect: (method: 'email' | 'argent' | 'braavos') => Promise<void>
  disconnect: () => void
}

export const useWalletStore = create<WalletState>((set) => ({
  wallet: null,
  address: null,
  isConnecting: false,
  connect: async (method) => {
    set({ isConnecting: true })
    try {
      const wallet = method === 'email'
        ? await connectWithEmail()
        : method === 'argent'
        ? await connectWithArgent()
        : await connectWithBraavos()
      set({ wallet, address: wallet.address, isConnecting: false })
      document.cookie = `blindmarkets-wallet=${wallet.address}; path=/; SameSite=Lax`
    } catch (e) {
      set({ isConnecting: false })
      throw e
    }
  },
  disconnect: () => {
    set({ wallet: null, address: null })
    document.cookie = 'blindmarkets-wallet=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/'
  },
}))
```

### 7.4 Gasless Intent Submission

Update `IntentComposer.tsx` submit handler. Replace any manual wallet call with:

```typescript
// After encrypting intent client-side with intentCrypto.ts:
const tx = await wallet.execute(
  [{
    contractAddress: process.env.NEXT_PUBLIC_INTENT_REGISTRY!,
    entrypoint: 'commit_intent',
    calldata: [intentHash, metadataHash, expiryTimestamp],
  }],
  { feeMode: 'sponsored' }
)

await tx.watch(
  ({ finality }) => { if (finality === 'ACCEPTED_ON_L2') setStatus('confirmed') },
  { pollIntervalMs: 1500, timeoutMs: 30000 }
)
```

### 7.5 Connect Page (/connect)

Standalone fullscreen page. Three connection paths:
- "Continue with Email" → Starkzap Privy onboarding
- "Connect Argent" → Starkzap Argent flow
- "Connect Braavos" → Starkzap Braavos flow

On success: set cookie, redirect to `?next` param or `/desk`.

### 7.6 Solver Routing

In solver reference `/solver-reference/src/liquidity_aggregator.rs` (Rust), the liquidity aggregator manually routes. For the TypeScript solver implementation add-on, use Starkzap providers:

```typescript
// frontend/lib/solver/routing.ts (only needed for solver desk UI)
import { AvnuSwapProvider, EkuboSwapProvider } from 'starkzap'

wallet.registerSwapProvider(new AvnuSwapProvider({ apiKey: process.env.AVNU_API_KEY! }))
wallet.registerSwapProvider(new EkuboSwapProvider())
```

### 7.7 New Environment Variables (add to `frontend/.env.local`)

```
NEXT_PUBLIC_STARKNET_NETWORK=sepolia
NEXT_PUBLIC_AVNU_PAYMASTER_URL=https://starknet.paymaster.avnu.fi
NEXT_PUBLIC_AVNU_API_KEY=<from AVNU dashboard>
NEXT_PUBLIC_INTENT_REGISTRY=<from deployment_addresses.env>
NEXT_PUBLIC_BATCH_AUCTION=<from deployment_addresses.env>
NEXT_PUBLIC_BATCH_SETTLEMENT=<from deployment_addresses.env>
NEXT_PUBLIC_SOLVER_BOND=<from deployment_addresses.env>
```

---

## 8. BACKEND SERVICES

The backend is fully Rust-based. This section documents the expected API contract the frontend consumes. Do not modify backend Rust code in the same agent session as frontend work.

### 8.1 Gateway API Endpoints (consumed by frontend)

All proxied through `frontend/app/api/gateway/` route handlers.

| Method | Path | Frontend Consumer | Description |
|---|---|---|---|
| POST | `/intents` | IntentComposer submit | Receive encrypted ciphertext + commitment hash |
| GET | `/intents/:id` | AuditLogView, history page | Intent status by ID |
| POST | `/intents/:id/cancel` | IntentCard cancel action | Cancel pending intent |
| GET | `/batches` | Analytics page | Batch history list |
| GET | `/batches/current` | BatchPanel, BatchCountdown | Live batch countdown + count |
| GET | `/batches/:id` | Analytics detail | Batch detail with settlement |
| GET | `/batches/:id/intents` | Already proxied at `api/gateway/batches/[batchId]/intents/route.ts` | Intents in a batch |
| GET | `/health` | SystemStatusDot | Service health check |

### 8.2 WebSocket (Batch Events)

Gateway exposes WebSocket at `/ws`. Frontend should connect in `BatchPanel` for real-time batch events:
- `batch.open` — new batch started, reset countdown
- `batch.intent_added` — intent count updated
- `batch.closed` — batch closing, solvers bidding
- `batch.settled` — settlement confirmed, update history

### 8.3 Contract Addresses

Read from `deployment_addresses.env` at root. Verify this file is populated with Starknet Sepolia addresses after running `scripts/deploy_contracts.sh`. If empty, Phase 8 of the agent build order is incomplete.

---

## 9. DOCUMENTATION CONTENT — EVERY PAGE SPECCED

The docs live at `frontend/app/docs/` as TSX pages. The DocsLayout exists. The structure exists. The content needs to be filled. This section specifies the exact content for every docs page. Write content as a senior protocol engineer, not a marketing writer.

### 9.0 Docs Layout Requirements

`frontend/app/docs/layout.tsx` (verify the existing `DocsLayout.tsx` component):
- Left sidebar: collapsible section nav linking to all doc pages
- Fixed header: BlindMarkets logo + "Back to Desk" link + search (if implemented)
- Right sidebar: on-page section TOC (anchor links)
- Dark mode only
- Max content width: 720px centered

Sidebar nav structure:
```
Overview
  Introduction
  Quickstart

Traders
  Overview
  Privacy Modes
  Submitting an Order
  Tracking Your Order

Solvers
  Overview
  Bonding & Slashing
  Submitting Solutions

Developers
  TypeScript SDK
  Rust SDK
  Self-Hosting

Contracts
  Overview
  Contract Addresses

API Reference
  Intents
  Batches
  Health
```

---

### 9.1 Introduction (`/docs`)

**Page title:** Introduction to BlindMarkets

**Content:**

BlindMarkets is a privacy-preserving Bitcoin intent execution protocol built on Starknet. It allows users to express trading intents — swaps, limit orders, and DCA positions — in encrypted form, preventing front-running and MEV extraction before settlement.

**The core insight:** On public blockchains, broadcasting a transaction before it is confirmed leaks information to every observer. Miners, validators, and arbitrage bots use this information to extract value at the expense of the original submitter. BlindMarkets breaks this by separating intent expression (private, client-side) from intent commitment (on-chain, ciphertext-only) and intent execution (post-batch, competitive).

**How the protocol works:**
1. User creates an intent locally and encrypts it with AES-256-GCM
2. Encrypted ciphertext is stored at the gateway. Plaintext never leaves the user's client.
3. User's wallet submits a Pedersen commitment hash on-chain to `IntentRegistry`
4. Intents accumulate in 30-second batch windows
5. When the batch closes, authenticated solvers receive the ciphertext pool
6. Solvers compete in a sealed-bid auction for batch clearing rights
7. Winning solver executes all intents, settlement verified by `BatchSettlement` on Starknet
8. Solver bond is slashed if settlement constraints are violated

**What BlindMarkets is not:**
- It is not a Bitcoin L1 protocol. Bitcoin is the value layer; Starknet is the execution layer.
- It does not guarantee instant settlement. Bitcoin confirmations take time.
- It does not provide perfect metadata privacy. Batch timing and gas costs are observable.

**Getting started:** See [Quickstart](/docs/quickstart) for a working integration in under 10 minutes.

---

### 9.2 Quickstart (`/docs/quickstart`)

**Page title:** Quickstart

**Content:**

**Prerequisites:**
- Node.js 18+
- A Starknet wallet (Argent or Braavos) funded with BTC representation on Starknet Sepolia
- Or: sign in with email via the app (no wallet extension required)

**Submit your first intent via the app:**
1. Navigate to [blindmarkets.xyz/desk](https://blindmarkets.xyz/desk)
2. Click "Connect Wallet" — choose email (no extension needed), Argent, or Braavos
3. Select your asset pair (e.g., BTC → USDC)
4. Enter amount and set constraints
5. Select privacy mode: start with "Hidden Amount" for most use cases
6. Click "Submit Intent" — wallet signs the commitment hash, zero gas cost

**Submit via the TypeScript SDK:**

```typescript
import { BlindMarketsClient } from '@blindmarkets/sdk'

const client = new BlindMarketsClient({
  gatewayUrl: 'https://api.blindmarkets.xyz',
  network: 'sepolia',
})

const intent = await client.intent.create({
  tokenIn: 'BTC',
  tokenOut: 'USDC',
  amountIn: '0.5',                    // 0.5 BTC
  minAmountOut: '47500',              // min USDC received
  deadline: Math.floor(Date.now() / 1000) + 300, // 5 min from now
  privacyMode: 'hidden_amount',
})

const { intentId, txHash } = await client.intent.submit(intent, wallet)
console.log(`Intent committed: ${txHash}`)
```

**Check intent status:**
```typescript
const status = await client.intent.getStatus(intentId)
console.log(status) // 'pending' | 'auction' | 'settled' | 'cancelled' | 'failed'
```

**Cancel a pending intent:**
```typescript
await client.intent.cancel(intentId, wallet)
```

---

### 9.3 Traders Overview (`/docs/traders`)

**Page title:** Trading on BlindMarkets

BlindMarkets is designed for traders who need to execute BTC positions without leaking their orderflow to the market. Unlike AMMs where your transaction is public before it is final, BlindMarkets encrypts your intent end-to-end until settlement.

**Who uses BlindMarkets:**
- Institutional traders executing large BTC blocks where public visibility causes adverse price movement
- OTC desks routing client orders without broadcast
- Individual traders in volatile markets where sandwich attacks are a material risk

**Supported intent types:**
- **Swap:** Exchange BTC for another asset at minimum output constraint
- **Limit order:** Execute only if price meets threshold (deadline-gated)
- **DCA:** Execute in fixed increments over time (coming soon)

**Settlement model:** All intents settle through Starknet. Value transfer for BTC involves a bridge adapter. Settlement confirmation time is 60-120 minutes for BTC finality (6 confirmations). Starknet-side confirmation is near-instant.

**Fees:** Solver fee ceiling is set by the user (default: 0.1% of notional). Gas is sponsored for all users — zero STRK required.

---

### 9.4 Privacy Modes (`/docs/traders/privacy-modes`)

**Page title:** Privacy Modes

BlindMarkets offers three privacy modes. Choose based on your trade size and tolerance for information leakage.

**Public 🔓**
- What solvers see before batch close: pair, direction, size
- What's on-chain at commitment: full intent hash
- Best for: Small trades where execution speed matters more than concealment. Solvers can pre-route liquidity, potentially improving fill quality.
- MEV protection: Batch clearing still prevents front-running. No sandwich attacks.

**Hidden Amount 🔒**
- What solvers see before batch close: pair and direction only. Size is encrypted.
- What's on-chain at commitment: commitment hash only
- Best for: Medium to large trades. Direction is visible (solvers know you're buying or selling BTC) but size is concealed until the batch closes. Prevents whale watching.
- MEV protection: Full protection against size-targeting attacks.

**Max Privacy 🔐**
- What solvers see before batch close: nothing. Pair, direction, and size all encrypted.
- What's on-chain at commitment: commitment hash only
- Best for: Large institutional orders or any trade where even the direction of travel is sensitive information.
- MEV protection: Maximum. Solver cannot pre-position against the trade in any direction.
- Tradeoff: Solvers cannot pre-route liquidity. Fill quality may be slightly lower than Public mode for the same notional.

**Recommendation:** Use Hidden Amount for most trades. Switch to Max Privacy for block trades over 5 BTC equivalent.

---

### 9.5 Submitting an Order (`/docs/traders/submitting-an-order`)

**Page title:** Submitting an Order

**Step-by-step (via app):**

1. **Connect your wallet** — Navigate to `/connect`. Sign in with email (Privy account abstraction) or connect Argent/Braavos. Your wallet is non-custodial in all cases.

2. **Select your pair** — Choose input and output assets. Currently supported: BTC → USDC, BTC → ETH, BTC → strkBTC, and reverse pairs.

3. **Enter amount** — The amount is denominated in the input asset. Your available balance is displayed below the input.

4. **Set constraints (optional)** — Click "Advanced" to set:
   - **Minimum output:** Minimum amount you will accept. Intent is cancelled if solver cannot meet this threshold.
   - **Maximum fee:** Maximum solver fee as a percentage of notional. Default: 0.1%.
   - **Deadline:** How long the intent stays valid. Maximum 2 minutes (aligned with batch windows).
   - **Partial fill:** Allow solver to partially fill the intent (default: off for BTC).

5. **Select privacy mode** — Public, Hidden Amount, or Max Privacy. See [Privacy Modes](/docs/traders/privacy-modes).

6. **Review and submit** — The app shows estimated fill range, solver fee estimate, and gas cost (always zero). Click "Submit Intent" and authorize the wallet signature. The commitment hash is sent to `IntentRegistry` on Starknet.

7. **Wait for batch close** — The countdown in the top right shows time remaining in the current batch window (30 seconds). Your intent enters the batch when the commitment is confirmed on-chain.

8. **Settlement** — After the batch closes, solvers compete. The winner executes and settlement is recorded on Starknet. You receive the output asset once Bitcoin confirmations are reached.

---

### 9.6 Tracking Your Order (`/docs/traders/tracking-your-order`)

**Page title:** Tracking Your Order

After submission, navigate to [/history](/history) to see all your intents.

**Status meanings:**
- `Awaiting Onchain` — Commitment transaction submitted but not yet confirmed on Starknet
- `Pending` — Commitment confirmed. Intent in current batch.
- `Auction` — Batch closed. Solvers are bidding.
- `Settled` — Solver executed. Output delivered.
- `Cancelled` — Intent expired or manually cancelled.
- `Failed` — Batch settlement failed. No funds at risk; intent can be resubmitted.

**Decrypting your intent details:** For Hidden Amount and Max Privacy intents, the history view shows "HIDDEN" for the amount. Click "Decrypt Details" and sign a message with your wallet to reveal the plaintext details from your local encrypted store.

**On-chain verification:** Every settled intent has a Starknet transaction hash linking to the `BatchSettlement` event on Starkscan. Click "View on Starkscan" to verify settlement independently.

**Exporting:** Click "Export CSV" to download your full intent history with decoded metadata.

---

### 9.7 Solvers Overview (`/docs/solvers`)

**Page title:** Become a Solver

Solvers are the execution layer of BlindMarkets. A solver monitors the batch, receives the ciphertext pool when the batch closes, constructs optimal routing solutions, and submits bids in the sealed-bid auction. The winning solver executes all intents in the batch and earns the solver fee.

**Requirements to become a solver:**
1. Bond `SolverBond` contract with minimum required stake (see [Bonding](/docs/solvers/bonding))
2. Run a solver node with access to Starknet RPC and liquidity aggregation
3. Authenticate with the gateway using your Starknet wallet signature

**Solver economics:**
- Earning: Solver fee from every settled intent in won batches (fee ceiling set by user)
- Risk: Bond slashed for constraint violations, missed deadlines, or settlement failures
- Competition: Sealed-bid auction — lowest fee bid that meets all constraints wins

**Reference implementation:** A complete Rust solver reference is in `/solver-reference/`. It includes: intent monitoring, matching engine, liquidity aggregation, bond management, and solution construction. Study it before building a custom solver.

---

### 9.8 Bonding & Slashing (`/docs/solvers/bonding`)

**Page title:** Bonding & Slashing

**Bonding:** Solvers deposit a bond into the `SolverBond` contract before participating. The bond covers potential slashing liability. Current minimum bond: configured in `SolverBond` contract constants (verify in `contracts/src/solver_bond.cairo`).

To deposit bond:
```typescript
await wallet.execute([{
  contractAddress: SOLVER_BOND_ADDRESS,
  entrypoint: 'deposit_bond',
  calldata: [amountFelt],
}], { feeMode: 'sponsored' })
```

**Slashing conditions:**
- Constraint violation: settlement output below user's minimum → full bond slash
- Missed execution: won batch but did not execute within the deadline → partial slash
- Invalid proof: settlement proof rejected by `BatchSettlement` → full bond slash

**Withdrawal:** Bond withdrawal is subject to a 7-day unbonding period after request. This prevents slashing evasion.

**Monitoring your bond:** The solver desk at `/solver` shows current bond amount, required minimum, and slashing history.

---

### 9.9 Submitting Solutions (`/docs/solvers/submitting-solutions`)

**Page title:** Submitting Solutions

**Solver lifecycle per batch:**

1. **Monitor** — Watch for `batch.closed` event via WebSocket or polling `GET /batches/current`
2. **Fetch ciphertext pool** — Authenticated `GET /solver/pool` — returns all ciphertexts for the closed batch
3. **Decrypt intents** — Use your solver ECDH keypair to decrypt each intent's payload
4. **Construct solution** — For each intent: find optimal route (internal matching or AMM via AVNU/Ekubo), verify constraints are met, compute expected output
5. **Submit bid** — `POST /solver/bid` with solution calldata and fee
6. **Execute if won** — If your bid wins the auction, execute the batch solution on-chain via `BatchAuction.execute_winning_solution()`
7. **Settlement confirmation** — `BatchSettlement` verifies all constraints are met and records settlement

**Using the reference implementation:**
```bash
cd solver-reference/
cp .env.example .env  # Add SOLVER_PRIVATE_KEY, RPC_URL, GATEWAY_URL
cargo build --release
./target/release/solver-reference
```

**Authentication with gateway:**

Solvers authenticate via Starknet wallet signature. On startup, sign a message: `blindmarkets:solver:auth:{timestamp}` and include in `Authorization: Bearer <signature>` header. Gateway verifies against bonded solver addresses.

---

### 9.10 TypeScript SDK (`/docs/developers/sdk-typescript`)

**Page title:** TypeScript SDK

**Install:**
```bash
npm install @blindmarkets/sdk
# or
yarn add @blindmarkets/sdk
```

**Client initialization:**
```typescript
import { BlindMarketsClient } from '@blindmarkets/sdk'

const client = new BlindMarketsClient({
  gatewayUrl: 'https://api.blindmarkets.xyz',
  network: 'mainnet', // or 'sepolia'
})
```

**Intent types:**
```typescript
import type { IntentParams, PrivacyMode, IntentStatus } from '@blindmarkets/sdk'

const intent: IntentParams = {
  tokenIn: 'BTC',
  tokenOut: 'USDC',
  amountIn: '1.0',
  minAmountOut: '95000',
  deadline: Math.floor(Date.now() / 1000) + 120,
  privacyMode: 'hidden_amount',   // 'public' | 'hidden_amount' | 'max_privacy'
  maxSolverFee: '0.001',          // 0.1% — optional, default 0.001
  allowPartialFill: false,        // optional, default false
}
```

**Encryption:** The SDK encrypts intent details client-side before any network call. The gateway never receives plaintext.

```typescript
// Under the hood — you don't call this directly
import { encryptIntent } from '@blindmarkets/sdk/crypto'
const { ciphertext, commitment } = await encryptIntent(intent, gatewayPublicKey)
```

**Full example:**
```typescript
const { intentId, txHash } = await client.intent.submit(intent, starknetAccount)

// Poll for status
const status = await client.intent.getStatus(intentId)

// Get batch info
const currentBatch = await client.batch.getCurrent()
console.log(`Next batch closes in ${currentBatch.secondsRemaining}s`)

// Cancel
await client.intent.cancel(intentId, starknetAccount)
```

**Error types:**
```typescript
import { GatewayError, ContractError, EncryptionError } from '@blindmarkets/sdk'

try {
  await client.intent.submit(intent, wallet)
} catch (e) {
  if (e instanceof GatewayError) { /* gateway rejected */ }
  if (e instanceof ContractError) { /* on-chain revert */ }
}
```

---

### 9.11 Rust SDK (`/docs/developers/sdk-rust`)

**Page title:** Rust SDK

**Add to `Cargo.toml`:**
```toml
[dependencies]
blindmarkets-client = { path = "./client-sdk" }
# or once published:
# blindmarkets-client = "0.1"
```

**Submit an intent:**
```rust
use blindmarkets_client::{Client, IntentBuilder, PrivacyMode};

let client = Client::new("https://api.blindmarkets.xyz").await?;

let intent = IntentBuilder::new()
    .token_in("BTC")
    .token_out("USDC")
    .amount_in(500_000_000u64) // satoshis
    .min_amount_out(47_500_000_000u64) // USDC base units
    .deadline(chrono::Utc::now().timestamp() as u64 + 120)
    .privacy_mode(PrivacyMode::HiddenAmount)
    .build()?;

let (intent_id, tx_hash) = client.submit_intent(intent, &account).await?;
println!("Intent committed: {}", tx_hash);
```

**Examples:** See `/client-sdk/examples/` for `submit_intent.rs`, `cancel_intent.rs`, and `query_status.rs`.

---

### 9.12 Self-Hosting (`/docs/developers/self-hosting`)

**Page title:** Self-Hosting BlindMarkets

Run a private BlindMarkets deployment for testing or enterprise use.

**Prerequisites:** Docker + Docker Compose, Starknet RPC endpoint, PostgreSQL 15+

**Start all services:**
```bash
git clone https://github.com/winsznx/blindmarkets
cd blindmarkets
cp .env.example .env
# Edit .env with your RPC URL, DB credentials, contract addresses
docker-compose up -d
```

Services started:
- Gateway API: `localhost:8080`
- Coordinator: internal (no public port)
- Observer: internal
- PostgreSQL: `localhost:5432`

**Deploy contracts to your own Starknet network:**
```bash
cd contracts/
scarb build
bash scripts/deploy_contracts.sh sepolia
# Addresses written to deployment_addresses.env
```

**Configure frontend:**
```bash
cd frontend/
cp .env.local.example .env.local
# Set NEXT_PUBLIC_GATEWAY_URL=http://localhost:8080
# Set contract addresses from deployment_addresses.env
npm run dev
```

**Health check:**
```bash
curl http://localhost:8080/health
# {"status":"ok","starknet":"connected","db":"connected"}
```

---

### 9.13 Contracts Overview (`/docs/contracts`)

**Page title:** Contracts

BlindMarkets is built on four production Cairo contracts deployed on Starknet. All contracts are open-source, immutable after deployment, and verified on Starkscan.

| Contract | Purpose |
|---|---|
| `IntentRegistry` | Stores intent commitments (Pedersen hashes), manages nonces, expiry, and cancellation |
| `BatchAuction` | Sealed-bid auction for batch clearing rights. Selects winning solver. Manages bid lifecycle. |
| `BatchSettlement` | Verifies settlement correctness against intent constraints. Records settlement receipts. |
| `SolverBond` | Solver bonding deposits, slashing enforcement, unbonding periods, reputation tracking |

**Additional contracts:**
- `AssetRegistry` — Manages supported asset pairs and bridge adapters
- `GatewayRegistry` — Authorized gateway public keys (used for ciphertext access control)

**Security model:**
- All contracts are pausable by the admin multi-sig in emergency scenarios
- No upgradeable proxies — new versions require redeployment and migration
- Intent commitments are binding: once committed, constraints are cryptographically enforced at settlement

**Reading contract state:**
```typescript
import { Contract, RpcProvider } from 'starknet.js'
import IntentRegistryAbi from '@/lib/abis/intent_registry.json'

const provider = new RpcProvider({ nodeUrl: process.env.NEXT_PUBLIC_STARKNET_RPC })
const registry = new Contract(IntentRegistryAbi, INTENT_REGISTRY_ADDRESS, provider)

const intent = await registry.get_intent(intentId)
```

---

### 9.14 Contract Addresses (`/docs/contracts/addresses`)

**Page title:** Contract Addresses

> These addresses are for Starknet Sepolia (testnet). Mainnet addresses will be published at mainnet launch.

| Contract | Address |
|---|---|
| IntentRegistry | `[from deployment_addresses.env]` |
| BatchAuction | `[from deployment_addresses.env]` |
| BatchSettlement | `[from deployment_addresses.env]` |
| SolverBond | `[from deployment_addresses.env]` |
| AssetRegistry | `[from deployment_addresses.env]` |
| GatewayRegistry | `[from deployment_addresses.env]` |

View on Starkscan: [sepolia.starkscan.co](https://sepolia.starkscan.co)

**Verifying contracts:** All contract class hashes are published. You can verify any contract deployment independently:
```bash
starkli class-hash-at <contract_address> --network sepolia
```

---

### 9.15 API Reference — Intents (`/docs/api-reference/intents`)

**Page title:** Intents API

Base URL: `https://api.blindmarkets.xyz/v1`

**POST /intents** — Submit encrypted intent

Request:
```json
{
  "ciphertext": "base64-encoded AES-256-GCM encrypted intent payload",
  "commitment": "0x[Pedersen commitment hash as hex]",
  "privacy_mode": "hidden_amount",
  "submitter": "0x[starknet address]",
  "signature": "[starknet signature over commitment hash]",
  "expires_at": 1743500000
}
```

Response `201 Created`:
```json
{
  "intent_id": "uuid",
  "status": "awaiting_onchain",
  "created_at": "2026-03-30T12:00:00Z"
}
```

**GET /intents/:id** — Get intent status

Response `200 OK`:
```json
{
  "intent_id": "uuid",
  "status": "pending",
  "batch_id": "uuid",
  "created_at": "2026-03-30T12:00:00Z",
  "expires_at": "2026-03-30T12:02:00Z",
  "settlement_tx": null
}
```

**POST /intents/:id/cancel** — Cancel pending intent

Request: `{ "signature": "[wallet signature over intent_id]" }`

Response `200 OK`: `{ "cancelled": true }`

Errors: `404 Not Found`, `409 Conflict` (already settled/cancelled), `403 Forbidden` (not your intent)

---

### 9.16 API Reference — Batches (`/docs/api-reference/batches`)

**Page title:** Batches API

**GET /batches/current** — Current batch state

Response:
```json
{
  "batch_number": 2442700,
  "opens_at": "2026-03-30T12:00:00Z",
  "closes_at": "2026-03-30T12:00:30Z",
  "seconds_remaining": 14,
  "intent_count": 7,
  "status": "open"
}
```

**GET /batches** — Recent batch list

Query params: `limit` (default 20), `before` (cursor, ISO datetime)

Response: array of batch objects with `batch_number`, `intent_count`, `total_volume_usd`, `fill_rate`, `winning_solver`, `settlement_tx`, `status`

**GET /batches/:id** — Batch detail

Full batch object including `winning_solver`, `solver_fee_earned`, `settlement_tx`, `constraint_violations`.

---

### 9.17 API Reference — Health (`/docs/api-reference/health`)

**Page title:** Health API

**GET /health**

Response `200 OK`:
```json
{
  "status": "ok",
  "starknet": "connected",
  "db": "connected",
  "coordinator": "running",
  "last_batch": "2026-03-30T11:59:30Z",
  "uptime_seconds": 86400
}
```

Use this endpoint to monitor service health. The `SystemStatusDot` component in `/risk` polls this every 30 seconds.

---

## 10. PL GENESIS SUBMISSION REQUIREMENTS

### 10.1 Starknet Bounty ($5,000)

| Requirement | Status | Action |
|---|---|---|
| Open-source GitHub repo with functional Cairo contracts | ✅ Contracts exist | Verify public repo visibility |
| Clear documentation explaining architecture and privacy | ✅ Docs specced in Section 9 | Fill all doc pages per Section 9 |
| Demo video 3-5 minutes | ❌ Missing | Record after Starknet Sepolia confirmed |
| README with dependencies, setup, team | ❌ Incomplete | Write per Section 10.4 |
| Submission on DevSpot by April 1, 2026 @ 7:59 AM | ❌ Pending | Submit draft now |

Judging weights: Privacy Innovation 30% · Technical Execution 25% · Starknet Integration 20% · Usability 15% · Potential Impact 10%

### 10.2 Protocol Labs Fresh Code + Crypto Track

| Bounty | Prize | Requirement | Status |
|---|---|---|---|
| Fresh Code | $5,000 | Repo created after Feb 10 + one sponsor integration | ✅ if dates match |
| Crypto Track | $3,000 | Qualifies as Starknet sponsor submission | ✅ automatic |

### 10.3 Community Vote Bounty ($1,000)

One X post. Draft:

> Built @blindmarkets_xyz — private BTC intent execution on @Starknet.
>
> Encrypt the order → commit from wallet → solvers compete after batch close.
> No front-running. No MEV. Sealed-bid auction enforced in Cairo.
>
> Bounty: @Starknet | Track: Crypto
> @PL__Genesis @protocollabs #PLGenesis
>
> blindmarkets.xyz

### 10.4 README Specification

Required sections in exact order:

1. **BlindMarkets** — one-line: "Privacy-preserving Bitcoin intent execution protocol on Starknet."
2. **What It Does** — three bullets: encrypted intents, batch clearing, solver competition
3. **Privacy Architecture** — encryption flow, commitment scheme, three privacy modes
4. **How It Works** — numbered: Encrypt → Commit → Batch → Solvers bid → Settle
5. **Starknet Integration** — which contracts, what Cairo enforces, why Starknet
6. **Tech Stack** — Next.js 15, Cairo/Scarb, Rust (Axum), Starkzap, PostgreSQL, Docker
7. **Live Demo** — blindmarkets.xyz
8. **Setup** — `git clone`, `npm install`, `cp .env.example .env`, `docker-compose up`, `npm run dev`
9. **Contract Addresses (Starknet Sepolia)** — all 6 contract addresses
10. **Team** — names, GitHub, X handles
11. **License** — MIT

---

## 11. AGENT PHASE BREAKDOWN — VERIFICATION-FIRST BUILD ORDER

> **AGENT INSTRUCTION:** This is NOT a fresh build. Many components, services, and contracts already exist. Every phase starts with a verification step before writing any code. Read existing files before replacing them. If an existing file meets the spec, mark it ✅ and move on — do not rewrite working code. If it needs changes, make targeted edits. Only build from scratch when the spec says ❌ Missing.

### Phase 0: Design System and CSS Tokens [BLOCKER]

- [ ] **P0-01** Open `frontend/app/globals.css`. Verify all color tokens from Section 2.2 exist. Add any missing tokens. Do NOT delete existing styles — add the missing variables.
- [ ] **P0-02** Add glassmorphism base classes from Section 2.2 to `globals.css`.
- [ ] **P0-03** Open `frontend/app/layout.tsx`. Verify `<html>` has `class="dark"` hardcoded. Add Inter + JetBrains Mono via `next/font/google`. Add font CSS variables.
- [ ] **P0-04** Open `frontend/tailwind.config.ts`. Verify it references the CSS variables. Add any missing token references.
- [ ] **P0-05** Install missing packages: `framer-motion`, `starkzap`, `@tanstack/react-query`. Verify `package.json`.

### Phase 1: Routing Refactor [BLOCKER]

- [ ] **P1-01 [BLOCKER]** Create route group folder structure: `app/(public)/`, `app/(app)/`, `app/(auth)/`. Move existing `dashboard/page.tsx` content to `app/(app)/desk/page.tsx`. Move `analytics/page.tsx` to `app/(app)/analytics/page.tsx`. Stub remaining app routes.
- [ ] **P1-02 [BLOCKER]** Create `app/(public)/layout.tsx` wrapping PublicNav + PublicFooter. Create `app/(app)/layout.tsx` wrapping AppSidebar + AppHeader (stubs initially). Create `app/(auth)/connect/page.tsx` stub.
- [ ] **P1-03 [BLOCKER]** Create `frontend/middleware.ts` per Section 3.3 spec. Test redirect behavior.
- [ ] **P1-04** Create `loading.tsx` and `error.tsx` for each app route. Skeleton loading states — never spinners.

### Phase 2: Layout Shell Components

- [ ] **P2-01** Build `AppSidebar` component per Section 5.1. Nav links: Crosshair/Clock/BarChart2/ShieldAlert/Zap icons. Wallet address at bottom. Collapse behavior at 1280px.
- [ ] **P2-02** Build `AppHeader` component. Breadcrumb left, BatchCountdown chip (stub initially), WalletStatus right.
- [ ] **P2-03** Wire `app/(app)/layout.tsx` to use AppSidebar + AppHeader.
- [ ] **P2-04** Build `MobileTabNav` for `<768px`: Desk · History · Analytics · Risk.
- [ ] **P2-05** Refactor existing `NavigationBar.tsx` into `PublicNav` — remove scroll-anchor behavior, add proper Next.js `Link` routing, add glass-on-scroll behavior.
- [ ] **P2-06** Build `PublicFooter` per Section 4.8.
- [ ] **P2-07** Wire `app/(public)/layout.tsx` to use PublicNav + PublicFooter.

### Phase 3: Starkzap Integration

- [ ] **P3-01** Install Starkzap: `npm install starkzap` in `frontend/`. Create `frontend/lib/starkzap.ts` per Section 7.2.
- [ ] **P3-02** Create `frontend/state/walletStore.ts` per Section 7.3. Verify it doesn't conflict with existing `useIntentStore.ts`.
- [ ] **P3-03** Build `/connect` page per Section 7.5. Three connection paths. Cookie set on success, redirect to `?next` or `/desk`.
- [ ] **P3-04** Open existing `WalletConnect.tsx`. Replace internals with Starkzap onboarding calls. Keep the same exported interface so existing consumers don't break.
- [ ] **P3-05** Update `IntentComposer.tsx` submit handler to use `wallet.execute()` with `feeMode: 'sponsored'` per Section 7.4.
- [ ] **P3-06** Delete `frontend/lib/starknetWallet.ts` after verifying no remaining imports.
- [ ] **P3-07** Build `WalletStatus`, `NetworkBadge`, `AddressDisplay` components per Section 6.2. Wire into AppSidebar and AppHeader.

### Phase 4: Component Verification and Gap-Filling

For each existing component: open file → verify design tokens → verify TypeScript props → verify mobile → fix gaps.

- [ ] **P4-01** Verify and fix `IntentComposer.tsx` — all three privacy modes, Advanced constraints panel, correct CSS variables.
- [ ] **P4-02** Verify and fix `BatchTimeline.tsx` — live data from `/api/gateway/batches/current`, countdown animation. Build `BatchCountdown` as separate component if not already extracted.
- [ ] **P4-03** Verify and fix `RiskDisclosurePanel.tsx` — collapsible, risk values, audit links.
- [ ] **P4-04** Verify and fix `SolverFillPreview.tsx` — range visualization, AMM comparison label.
- [ ] **P4-05** Verify and fix `AuditLogView.tsx` — filters, Decrypt button (wallet signature), CSV export.
- [ ] **P4-06** Verify and fix `PrivacyModeBadge.tsx` — all three modes match Section 2.4 exactly.
- [ ] **P4-07** Verify and fix `ExecutionChart.tsx` — Recharts responsive, correct color tokens.
- [ ] **P4-08** Build missing components: `EmptyState`, `IntentCard`, `IntentStatusBadge`, `BridgeCard`, `SystemStatusDot`.
- [ ] **P4-09** SDK consolidation: compare `/client-sdk-ts/` with `/sdk/`. Migrate unique logic to `/sdk/src/`. Delete `/client-sdk-ts/`.

### Phase 5: Landing Page

- [ ] **P5-01** Replace `app/(public)/page.tsx` entirely. Build Hero section per Section 4.2. Particle background with Framer Motion.
- [ ] **P5-02** Build animated IntentComposer mockup card for hero visual.
- [ ] **P5-03** Build Problem section per Section 4.3. Three stat cards with scroll reveal.
- [ ] **P5-04** Build Solution section per Section 4.4. Four alternating blocks.
- [ ] **P5-05** Build Privacy Mode section per Section 4.5. Three glass feature cards.
- [ ] **P5-06** Build How It Works, Risk Transparency, CTA band, Footer sections per Sections 4.6–4.8.
- [ ] **P5-07** Animation pass: `fadeInUp` staggered on scroll for all sections.
- [ ] **P5-08** Mobile responsive pass: verify all sections at 375px and 768px.

### Phase 6: App Pages — Wire to Real Data

- [ ] **P6-01** Build `/desk` page per Section 5.2. IntentComposer left, BatchPanel + RiskPanel right. Wire BatchPanel to `/api/gateway/batches/current` with TanStack Query polling every 5s.
- [ ] **P6-02** Build `/history` page per Section 5.3. IntentCard list. Wire to `/api/gateway/intents?address=[wallet]`. Filter and export working.
- [ ] **P6-03** Build `/analytics` page per Section 5.4. Metric cards + charts + solver leaderboard. Wire to analytics endpoints.
- [ ] **P6-04** Build `/risk` page per Section 5.5. Bridge cards, system health dots, audit report list.
- [ ] **P6-05** Build `/solver` page per Section 5.6. Bond management, intent pool, bid interface.
- [ ] **P6-06** Add TanStack Query provider to `app/(app)/layout.tsx`. Verify all pages use `useQuery` for data fetching, not `useEffect/fetch`.

### Phase 7: Documentation Pages

Fill content for every docs page per Section 9. Each page has full content specced — write it in TSX.

- [ ] **P7-01** Verify `app/docs/layout.tsx` — sidebar nav, right TOC, correct structure. Fix if needed.
- [ ] **P7-02** Fill `app/docs/page.tsx` — Introduction per Section 9.1.
- [ ] **P7-03** Fill `app/docs/quickstart` — per Section 9.2.
- [ ] **P7-04** Fill all traders docs pages — per Sections 9.3–9.6.
- [ ] **P7-05** Fill all solvers docs pages — per Sections 9.7–9.9.
- [ ] **P7-06** Fill all developers docs pages — per Sections 9.10–9.12.
- [ ] **P7-07** Fill contracts docs pages — per Sections 9.13–9.14.
- [ ] **P7-08** Fill API reference pages — per Sections 9.15–9.17.
- [ ] **P7-09** Wire contract addresses in `docs/contracts/addresses` to pull from `deployment_addresses.env` or an env variable. Never hardcode.

### Phase 8: Cairo Contracts — Deployment Verification [PL GENESIS BLOCKER]

- [ ] **P8-01** Open `deployment_addresses.env`. Check if Starknet Sepolia addresses are populated. If YES, skip to P8-05. If NO, continue.
- [ ] **P8-02** Run `scarb build` in `contracts/`. Verify zero compile errors.
- [ ] **P8-03** Run `scarb test` in `contracts/`. Verify all test files pass: `test_intent_registry`, `test_batch_auction`, `test_batch_settlement`, `test_solver_bond`, `test_integration`.
- [ ] **P8-04** Run `bash scripts/deploy_contracts.sh` targeting Starknet Sepolia. Record all six contract addresses in `deployment_addresses.env`.
- [ ] **P8-05** Verify deployment: submit a test intent on the live blindmarkets.xyz pointing to Sepolia. Confirm commitment tx hash visible on Starkscan.
- [ ] **P8-06** Run `bash scripts/test_e2e.sh` against Sepolia deployment. Verify full batch lifecycle completes.
- [ ] **P8-07** Update all frontend `.env.local` variables with deployed contract addresses.

### Phase 9: PL Genesis Submission Package

- [ ] **P9-01** Write `README.md` per Section 10.4 — all ten sections, Starknet Sepolia addresses included.
- [ ] **P9-02** Record demo video (3-5 min). Script: Problem (0:00-0:30) → Landing page tour (0:30-1:15) → Live intent submission on Sepolia (1:15-2:30) → Batch close + settlement tx on Starkscan (2:30-3:30) → Architecture explanation (3:30-4:00) → Why Starknet (4:00-5:00).
- [ ] **P9-03** Write 250-500 word DevSpot project summary.
- [ ] **P9-04** Submit DevSpot draft. Select: Starknet bounty + PL Fresh Code + PL Crypto track.
- [ ] **P9-05** Post Community Vote tweet per Section 10.3.
- [ ] **P9-06** Final DevSpot submit before April 1, 2026 @ 7:59 AM.

### Phase 10: Polish and Demo Readiness

- [ ] **P10-01** Responsive audit: all app pages at 375px, 768px, 1280px. Fix overflows.
- [ ] **P10-02** Token audit: `grep -r '#[0-9a-fA-F]' frontend/components` — zero raw hex values should remain. All must use CSS variables.
- [ ] **P10-03** Loading state audit: every data-fetching component has a Skeleton state. No blank screens.
- [ ] **P10-04** Error state audit: every page has an `error.tsx` with retry.
- [ ] **P10-05** End-to-end: connect wallet (Starkzap Privy) → compose Max Privacy BTC→USDC intent → submit → view in history → decrypt details → export CSV. Zero errors.
- [ ] **P10-06** Performance: Lighthouse > 85. Lazy load analytics charts and solver page.

---

## 11.2 Context Budget Rules

- Each Phase = one agent session where possible.
- After every task: write to `AGENT_PROGRESS.md` — task ID, files modified, next task.
- Never rewrite an entire file when a targeted edit suffices.
- All ABIs in `frontend/lib/abis/*.ts`. Never inline.
- All Supabase/API query functions in `frontend/lib/queries/*.ts`. Never inline in components.
- If context window is near limit: complete the current file, add a 3-line summary at the top of the file, stop. Next session reads the summary.

---

**END OF DOCUMENT**

*BlindMarkets Master Spec v2.0 · March 2026 · Starknet × Bitcoin*
*Build order: Phase 0 → 1 → 2 → ... → 10. Verification before new code. Always.*
