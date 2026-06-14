'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { detectOS, getDownloadText, getDownloadLink, getOSDisplayName } from '@/lib/utils/os-detector';
import type { OperatingSystem } from '@shared/types';
import { THEME } from '@shared/constants';

export default function LandingPage() {
  const [os, setOS] = useState<OperatingSystem>('unknown');

  useEffect(() => {
    setOS(detectOS());
  }, []);

  return (
    <main className="min-h-screen">
      {/* --- Hero Section --- */}
      <section className="max-w-7xl mx-auto px-6 pt-24 pb-16 text-center">
        {/* Claude Abstract Logo */}
        <div className="mb-8 flex justify-center">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: '#CC5A37' }}>
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2z"
                stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="2" fill="white"/>
              <circle cx="20" cy="13" r="2" fill="white"/>
              <path d="M10 21c2.5 3 7.5 3 10 0" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 text-balance">
          Code Smarter with{' '}
          <span style={{ color: THEME.accent }}>Claude Opus 8</span>
        </h1>

        <p className="text-lg max-w-2xl mx-auto mb-10 text-claude-text-secondary-light dark:text-claude-text-secondary-dark leading-relaxed">
          A premium AI-powered desktop coding platform. Chat, preview, and deploy — all in one minimalist workspace. Available on Windows, macOS, and Linux.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          {/* OS-Aware Download Button */}
          <a
            href={getDownloadLink(os)}
            className="btn-primary text-lg px-8 py-4 shadow-lg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
            </svg>
            {getDownloadText(os)}
          </a>

          <Link
            href="/dashboard"
            className="btn-secondary text-lg px-8 py-4"
          >
            Open Web Dashboard →
          </Link>
        </div>

        {os !== 'unknown' && (
          <p className="mt-4 text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
            Detected: {getOSDisplayName(os)} · Also available for other platforms
          </p>
        )}
      </section>

      {/* --- Features Grid --- */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard
            icon="💬"
            title="AI Chat Workspace"
            description="Streaming text generation with Claude Opus 8 Pro and Flash models. Real-time code preview as the AI writes."
          />
          <FeatureCard
            icon="⚡"
            title="Agentic Shell"
            description="Run Claude CLI and Ruflo swarms directly from the desktop app. Automated multi-agent workflows."
          />
          <FeatureCard
            icon="🎨"
            title="Premium UX"
            description="Warm cream light mode, charcoal dark mode, and terracotta accents. Stream animations with pulsing cursors."
          />
          <FeatureCard
            icon="💰"
            title="GCash Payments"
            description="Top up your balance with GCash. Pay-as-you-go with transparent per-token PHP billing."
          />
          <FeatureCard
            icon="🔐"
            title="BYOK Support"
            description="Bring your own API keys for free usage, or use platform balance for managed billing."
          />
          <FeatureCard
            icon="🖼️"
            title="Vision Routing"
            description="Upload images and the platform automatically routes them through vision processing."
          />
        </div>
      </section>

      {/* --- Pricing Section --- */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">Model Pricing (PHP)</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <PricingCard
            name="Claude Opus 8 Pro"
            description="Most capable for complex tasks"
            inputPrice="₱52.88"
            outputPrice="₱105.74"
            recommended
          />
          <PricingCard
            name="Claude Opus 8 Flash"
            description="Fast and efficient"
            inputPrice="₱17.02"
            outputPrice="₱34.04"
          />
          <PricingCard
            name="Claude Opus 8 Research"
            description="Free research model"
            inputPrice="Free"
            outputPrice="Free"
          />
        </div>
      </section>

      {/* --- Footer --- */}
      <footer className="border-t border-claude-border-light dark:border-claude-border-dark py-8 text-center text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
        <p>© {new Date().getFullYear()} Opus8 Platform. Built with Claude Opus 8.</p>
      </footer>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="card">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="font-semibold text-lg mb-2">{title}</h3>
      <p className="text-claude-text-secondary-light dark:text-claude-text-secondary-dark text-sm leading-relaxed">
        {description}
      </p>
    </div>
  );
}

function PricingCard({
  name, description, inputPrice, outputPrice, recommended
}: {
  name: string; description: string; inputPrice: string; outputPrice: string; recommended?: boolean;
}) {
  return (
    <div className={`card relative ${recommended ? 'ring-2' : ''}`}
      style={recommended ? { borderColor: THEME.accent } : undefined}>
      {recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-semibold text-white rounded-full"
          style={{ backgroundColor: THEME.accent }}>
          RECOMMENDED
        </span>
      )}
      <h3 className="font-bold text-xl mb-1 mt-2">{name}</h3>
      <p className="text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark mb-4">
        {description}
      </p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>Input / 1M tokens</span>
          <span className="font-mono font-semibold">{inputPrice}</span>
        </div>
        <div className="flex justify-between">
          <span>Output / 1M tokens</span>
          <span className="font-mono font-semibold">{outputPrice}</span>
        </div>
      </div>
    </div>
  );
}
