'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function SettingsPage() {
  const [billingMode, setBillingMode] = useState<'platform' | 'byok'>('platform');
  const [platformKey, setPlatformKey] = useState('');
  const [byokKey, setByokKey] = useState('');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem('opus8-billing-mode', billingMode);
    localStorage.setItem('opus8-platform-key', platformKey);
    localStorage.setItem('opus8-byok-key', byokKey);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="min-h-screen bg-claude-cream dark:bg-claude-charcoal">
      <header className="border-b border-claude-border-light dark:border-claude-border-dark">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-claude-accent hover:underline text-sm">
              ← Back to Dashboard
            </Link>
          </div>
          <span className="font-semibold">Settings</span>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Billing Mode */}
        <div className="card mb-6">
          <h2 className="text-lg font-semibold mb-4">Billing Mode</h2>

          <div className="space-y-4">
            {/* Platform Balance Option */}
            <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              billingMode === 'platform'
                ? 'border-claude-accent bg-claude-accent/5'
                : 'border-claude-border-light dark:border-claude-border-dark'
            }`}>
              <input
                type="radio"
                name="billing"
                value="platform"
                checked={billingMode === 'platform'}
                onChange={() => setBillingMode('platform')}
                className="mt-0.5 accent-claude-accent"
              />
              <div>
                <div className="font-medium">Use Platform Balance (PHP)</div>
                <p className="text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark mt-1">
                  Top up via GCash and pay per token with transparent PHP billing. Requires your unique platform API key.
                </p>
              </div>
            </label>

            {/* BYOK Option */}
            <label className={`flex items-start gap-4 p-4 rounded-lg border-2 cursor-pointer transition-all ${
              billingMode === 'byok'
                ? 'border-claude-accent bg-claude-accent/5'
                : 'border-claude-border-light dark:border-claude-border-dark'
            }`}>
              <input
                type="radio"
                name="billing"
                value="byok"
                checked={billingMode === 'byok'}
                onChange={() => setBillingMode('byok')}
                className="mt-0.5 accent-claude-accent"
              />
              <div>
                <div className="font-medium">Bring Your Own Key (BYOK)</div>
                <p className="text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark mt-1">
                  Use your personal developer tokens. Bypasses platform billing — use the tool for free.
                </p>
              </div>
            </label>
          </div>

          {/* Key Input */}
          {billingMode === 'platform' ? (
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">Platform API Key</label>
              <input
                type="password"
                value={platformKey}
                onChange={(e) => setPlatformKey(e.target.value)}
                className="input-field font-mono"
                placeholder="sk_opus8_..."
              />
              <p className="text-xs text-claude-text-secondary-light dark:text-claude-text-secondary-dark mt-1">
                Generate this key from your dashboard. It connects your desktop app to your account balance.
              </p>
            </div>
          ) : (
            <div className="mt-6">
              <label className="block text-sm font-medium mb-2">Your Developer API Key</label>
              <input
                type="password"
                value={byokKey}
                onChange={(e) => setByokKey(e.target.value)}
                className="input-field font-mono"
                placeholder="Your personal Anthropic/DeepSeek API key..."
              />
              <p className="text-xs text-claude-text-secondary-light dark:text-claude-text-secondary-dark mt-1">
                Your key is stored locally on your machine and sent directly to the provider. Not stored on our servers.
              </p>
            </div>
          )}

          <button onClick={handleSave} className="btn-primary mt-4">
            {saved ? '✓ Saved' : 'Save Settings'}
          </button>
        </div>

        {/* Desktop Download */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-2">Desktop App</h2>
          <p className="text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark mb-4">
            Download the Opus8 Desktop App for your operating system.
          </p>
          <div className="flex flex-wrap gap-3">
            <a href="/downloads/opus8-setup.exe" className="btn-secondary text-sm">Windows</a>
            <a href="/downloads/opus8-setup.dmg" className="btn-secondary text-sm">macOS</a>
            <a href="/downloads/opus8-setup.AppImage" className="btn-secondary text-sm">Linux</a>
          </div>
        </div>
      </div>
    </div>
  );
}
