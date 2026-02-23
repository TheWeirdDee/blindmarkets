# BlindMarkets

Privacy-preserving Bitcoin intent execution with a frontend control console, gateway API, coordinator scheduler, and Starknet contracts.

## What This Repository Contains

BlindMarkets is a monorepo with:

- `frontend/`: Next.js app (App Router) for composing intents, monitoring batches, and viewing risk/analytics.
- `backend/gateway/`: Rust API that validates, decrypts, stores, and relays intents.
- `backend/coordinator/`: Rust scheduler for deterministic batching and auction finalization.
- `contracts/`: Cairo contracts for registry, auctions, settlement, and solver bonds.
- `docs/`: requirements and archived implementation notes.

## Repository Layout

```text
blindmarkets/
├── frontend/                # Next.js UI + API proxy routes
├── backend/
│   ├── gateway/             # Rust gateway API
│   └── coordinator/         # Rust batch scheduler
├── contracts/               # Starknet Cairo contracts + tests
├── docs/
│   ├── requirements/prd.md
│   └── archive/*.md
└── scripts/                 # deployment and test helpers
```

## System Canvas

```mermaid
graph TD
  U[User / Trader]
  FE[Frontend Console<br/>Next.js]
  APIR[Frontend API Routes<br/>/api/gateway/*]
  GW[Gateway API<br/>Rust + Axum]
  PG[(PostgreSQL)]
  RD[(Redis)]
  CO[Coordinator<br/>Rust Scheduler]
  SN[Starknet RPC]
  C[(Contracts<br/>Registry / Auction / Settlement)]
  SV[Solver Network]

  U --> FE
  FE --> APIR
  APIR --> GW
  GW --> PG
  GW --> RD
  GW --> SN
  SN --> C
  CO --> GW
  CO --> SN
  SV --> GW
  SV --> SN

  classDef ui fill:#f8f8f8,stroke:#111,stroke-width:1.5px,color:#111;
  classDef svc fill:#111,stroke:#2f2f2f,stroke-width:1.5px,color:#fff;
  classDef data fill:#fff,stroke:#777,stroke-width:1px,color:#111;
  class U,FE,APIR ui;
  class GW,CO,SV svc;
  class PG,RD,SN,C data;
```

## Intent Lifecycle (Execution Timeline)

```mermaid
graph TD
  A[Compose Intent] --> B[Encrypt Payload]
  B --> C[Sign Commitment]
  C --> D[Submit to Gateway]
  D --> E[Validate + Persist]
  E --> F[Assign Batch Window]
  F --> G[Broadcast to Solvers]
  G --> H[Solver Bids / Solutions]
  H --> I[Auction Finalization]
  I --> J[Settlement Attempt]
  J -->|Success| K[Intent Settled]
  J -->|Failure| L[Batch Failure + Requeue]
  L --> F

  classDef stage fill:#0f0f0f,stroke:#00d1ff,stroke-width:1.5px,color:#f5f5f5;
  classDef ok fill:#052b1f,stroke:#19d3a2,stroke-width:1.5px,color:#d9fff2;
  classDef warn fill:#2a1a05,stroke:#ff9f1c,stroke-width:1.5px,color:#ffe8c7;
  class A,B,C,D,E,F,G,H,I,J stage;
  class K ok;
  class L warn;
```

## Privacy Envelope (Client to Gateway)

```mermaid
graph TD
  PLAIN[Plain Intent Fields]
  NONCE[Client Nonce]
  HASH[Commitment / Intent Hash]
  SIG[User Signature]
  ECDH[ECDH Shared Secret]
  AES[AES-GCM Ciphertext]
  SUBMIT[Gateway Submit API]
  VERIFY[Gateway Verify + Decrypt]

  PLAIN --> HASH
  NONCE --> HASH
  HASH --> SIG
  PLAIN --> ECDH
  ECDH --> AES
  HASH --> SUBMIT
  SIG --> SUBMIT
  AES --> SUBMIT
  SUBMIT --> VERIFY

  classDef crypto fill:#0d1220,stroke:#8f7dff,stroke-width:1.5px,color:#f2efff;
  classDef transport fill:#111,stroke:#00d1ff,stroke-width:1.5px,color:#fff;
  class PLAIN,NONCE,HASH,SIG,ECDH,AES crypto;
  class SUBMIT,VERIFY transport;
```

## Failure and Recovery Loop

```mermaid
graph TD
  T0[Coordinator Tick] --> Q[Fetch Pending Intents]
  Q --> CB[Create Batch On-Chain]
  CB -->|OK| AC[Start Auction Window]
  CB -->|Error| RF[Report Failure]
  AC --> FA[Finalize Auction]
  FA -->|OK| ST[Settle Batch]
  FA -->|Error| RF
  ST -->|OK| DONE[Persist Settled State]
  ST -->|Error| REQ[Requeue Intents]
  REQ --> T0
  RF --> T0

  classDef loop fill:#101010,stroke:#ff4d6d,stroke-width:1.5px,color:#fff;
  classDef normal fill:#171717,stroke:#c7c7c7,stroke-width:1px,color:#f5f5f5;
  class T0,Q,CB,AC,FA,ST,DONE,REQ normal;
  class RF loop;
```

## Frontend Development

### 1) Install and run

```bash
cd frontend
npm install
npm run dev -p 3001
```

Frontend local URL: `http://localhost:3001`

### 2) Required environment variables

Use `frontend/.env.example` as the source of truth.

Server-side vars used by Next API routes:

- `GATEWAY_URL`
- `GATEWAY_API_KEY_HEADER`
- `GATEWAY_API_KEY`

Public vars used by UI:

- `NEXT_PUBLIC_BATCH_WINDOW_SECONDS`
- `NEXT_PUBLIC_GENESIS_TIMESTAMP`
- `NEXT_PUBLIC_*` risk/default display vars

## Backend Local Stack

Gateway expects local PostgreSQL and Redis.

- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`
- Gateway default local URL: `http://127.0.0.1:3000`

## Vercel Deployment (Frontend)

`frontend/vercel.json` is configured for Next.js builds.

Recommended Vercel project settings:

- Framework Preset: `Next.js`
- Root Directory: `frontend`
- Install Command: `npm install`
- Build Command: `npm run build`

Set env vars in Vercel Project Settings:

- `GATEWAY_URL`
- `GATEWAY_API_KEY_HEADER`
- `GATEWAY_API_KEY`
- Required `NEXT_PUBLIC_*` variables for display/config

## Documents and Specs

- Product requirements: `docs/requirements/prd.md`
- Historical implementation/checklist notes: `docs/archive/`

## Security Notes

- Never commit real API keys or private keys.
- Keep `.env*` files local (ignored by git).
- Use separate credentials for local, staging, and production.
