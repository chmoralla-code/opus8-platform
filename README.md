# Opus8 Platform — Desktop-First AI Coding Platform

A custom-branded "Claude Opus 8" interface combining a Next.js web dashboard with a Tauri desktop application.

## Architecture

- **web-app/**: Next.js 14 — marketing site, user dashboard, GCash payments, admin panel, central LLM proxy
- **desktop-app/**: Tauri v2 (Rust + React + Tailwind) — AI chat workspace, live preview, agentic shell
- **shared/**: Types, constants, and utilities shared between both apps

## Quick Start

```bash
# Web App
cd web-app && npm install && npm run dev

# Desktop App
cd desktop-app && npm install && npm run tauri dev
```

## Key Features

- Supabase Auth with GCash payment tracking
- Central API proxy with 2x PHP ROI markup
- Silent vision routing for image uploads
- Agentic shell bridge for Claude CLI & Ruflo swarms
- Dynamic Pay-As-You-Go usage bar
- Admin payment verification dashboard

## Deployment

- **Web**: Vercel (auto-deploy on push to main)
- **Database**: Supabase (migrations via GitHub Actions)
- **Desktop**: Tauri build artifacts (GitHub Actions)
