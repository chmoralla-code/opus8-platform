# Opus8 Platform — Architecture Map

```
opus8-platform/
├── ARCHITECTURE.md                 # This file
├── README.md                       # Project overview & setup
│
├── web-app/                        # Next.js 14 Web Dashboard
│   ├── package.json
│   ├── tsconfig.json
│   ├── next.config.js
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── .env.local.example
│   ├── supabase/
│   │   └── migrations/
│   │       └── 00001_initial.sql   # Schema: profiles, pending_payments, api_keys
│   ├── public/
│   │   ├── gcash-qr.png            # GCash QR placeholder
│   │   ├── claude-logo.svg         # Abstract Claude emblem
│   │   └── favicon.ico
│   └── src/
│       ├── app/
│       │   ├── layout.tsx          # Root layout (Claude theme)
│       │   ├── page.tsx            # Landing / marketing page
│       │   ├── dashboard/
│       │   │   ├── page.tsx        # User dashboard
│       │   │   ├── layout.tsx      # Dashboard shell
│       │   │   └── settings/
│       │   │       └── page.tsx    # Settings page
│       │   ├── admin/
│       │   │   ├── page.tsx        # Admin login
│       │   │   └── dashboard/
│       │   │       └── page.tsx    # Payment verification table
│       │   └── api/
│       │       ├── v1/
│       │       │   └── anthropic/
│       │       │       └── chat/
│       │       │           └── completions/
│       │       │               └── route.ts  # Central proxy endpoint
│       │       ├── auth/
│       │       │   └── callback/
│       │       │       └── route.ts          # Supabase auth callback
│       │       ├── payments/
│       │       │   ├── submit/
│       │       │   │   └── route.ts          # Submit GCash ref
│       │       │   └── admin/
│       │       │       └── route.ts          # Admin approve/reject
│       │       ├── api-keys/
│       │       │   └── generate/
│       │       │       └── route.ts          # Generate sk_opus8_ token
│       │       └── billing/
│       │           └── balance/
│       │               └── route.ts          # Get wallet balance
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Header.tsx
│       │   │   ├── Footer.tsx
│       │   │   └── Sidebar.tsx
│       │   ├── auth/
│       │   │   ├── LoginForm.tsx
│       │   │   └── SignUpForm.tsx
│       │   ├── dashboard/
│       │   │   ├── UsageBar.tsx     # 100% fuel bar with color states
│       │   │   ├── GcashModal.tsx   # GCash refill modal
│       │   │   ├── ApiKeyCard.tsx   # Generate & copy key
│       │   │   └── ChatLogExport.tsx # Export .md files
│       │   ├── admin/
│       │   │   ├── AdminLoginPanel.tsx
│       │   │   └── PaymentTable.tsx
│       │   └── ui/
│       │       ├── Button.tsx
│       │       ├── Modal.tsx
│       │       ├── Input.tsx
│       │       └── Spinner.tsx
│       ├── lib/
│       │   ├── supabase/
│       │   │   ├── client.ts        # Browser client
│       │   │   ├── server.ts        # Server client (service role)
│       │   │   └── middleware.ts    # Supabase auth middleware
│       │   ├── billing/
│       │   │   └── calculator.ts    # PHP token cost calculator (2x markup)
│       │   ├── crypto/
│       │   │   └── api-keys.ts      # sk_opus8_ generator & validator
│       │   └── utils/
│       │       ├── os-detector.ts   # Auto OS detection
│       │       └── constants.ts     # Rate tiers, exchange rates
│       └── types/
│           ├── database.ts          # Supabase table types
│           ├── billing.ts           # Token cost types
│           └── api.ts               # Request/response types
│
├── desktop-app/                     # Tauri v2 Desktop App
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── index.html
│   ├── src-tauri/
│   │   ├── Cargo.toml
│   │   ├── tauri.conf.json
│   │   ├── capabilities/
│   │   │   └── default.json
│   │   ├── icons/
│   │   │   └── icon.png
│   │   └── src/
│   │       ├── main.rs              # Tauri entry point
│   │       ├── lib.rs               # Plugin registration
│   │       ├── commands.rs          # Shell bridge, Claude CLI, Ruflo
│   │       ├── proxy.rs             # Env var injection middleware
│   │       └── daemon.rs            # Background ruflo daemon runner
│   └── src/
│       ├── main.tsx                 # React entry
│       ├── App.tsx                  # Root component
│       ├── styles/
│       │   └── globals.css          # Claude theme CSS + animations
│       ├── components/
│       │   ├── layout/
│       │   │   ├── AppShell.tsx     # Left/Right pane container
│       │   │   ├── Header.tsx       # Branded header with Claude logo
│       │   │   └── Sidebar.tsx      # Usage bar + settings toggle
│       │   ├── chat/
│       │   │   ├── ChatPane.tsx     # Left pane — chat workspace
│       │   │   ├── MessageBubble.tsx
│       │   │   ├── StreamingCursor.tsx  # animate-pulse cursor
│       │   │   ├── ThinkingPanel.tsx    # Collapsible Pro reasoning UI
│       │   │   └── ImageUploader.tsx    # Hidden vision routing logic
│       │   ├── preview/
│       │   │   └── PreviewPane.tsx  # Right pane — iframe webview
│       │   └── settings/
│       │       ├── SettingsModal.tsx
│       │       └── ApiKeyInput.tsx  # BYOK vs Platform Balance toggle
│       ├── hooks/
│       │   ├── useChatStream.ts     # Streaming chat hook
│       │   ├── useVisionRouter.ts   # Silent image → vision API middleware
│       │   └── useBilling.ts        # Balance & usage bar hook
│       ├── lib/
│       │   ├── tauri-bridge.ts      # invoke() wrappers for Rust commands
│       │   ├── model-brands.ts      # Model name rebrand map
│       │   └── export-chat.ts       # Markdown export utility
│       └── types/
│           └── chat.ts              # Chat message types
│
├── shared/                          # Shared between web & desktop
│   ├── types/
│   │   └── index.ts                 # Shared type definitions
│   ├── constants/
│   │   └── index.ts                 # Rate tiers, brand names, colors
│   └── utils/
│       └── index.ts                 # Shared helpers
│
└── .github/
    └── workflows/
        ├── deploy-web.yml           # Vercel deploy pipeline
        ├── deploy-supabase.yml      # Supabase migration pipeline
        └── build-desktop.yml        # Tauri desktop build pipeline
```
