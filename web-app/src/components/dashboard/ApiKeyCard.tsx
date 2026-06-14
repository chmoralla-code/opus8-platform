'use client';

import { useState } from 'react';
import { maskApiKey } from '@/lib/crypto/api-keys';

interface Props {
  userId: string;
}

export function ApiKeyCard({ userId }: Props) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateKey = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/api-keys/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, label: 'Opus8 Desktop' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setApiKey(data.api_key);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copyKey = async () => {
    if (!apiKey) return;
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-lg">Desktop API Key</h2>
        {apiKey && (
          <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
            Active
          </span>
        )}
      </div>

      {apiKey ? (
        <div className="space-y-4">
          <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-claude-border-light dark:border-claude-border-dark">
            <p className="font-mono text-sm break-all mb-2">{maskApiKey(apiKey)}</p>
            <button
              onClick={copyKey}
              className={`text-sm font-medium transition-colors ${
                copied ? 'text-green-600' : 'text-claude-accent hover:text-claude-accent-hover'
              }`}
            >
              {copied ? '✓ Copied!' : '📋 Copy full key'}
            </button>
          </div>
          <p className="text-xs text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
            ⚠ Copy this key now. You won't be able to see it again. Paste it into your Opus8 Desktop App.
          </p>
          <button onClick={generateKey} className="text-sm text-claude-accent hover:underline">
            Generate New Key (revokes old key)
          </button>
        </div>
      ) : (
        <div>
          <button
            onClick={generateKey}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? 'Generating...' : 'Generate Desktop API Key'}
          </button>
          <p className="text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark mt-3">
            Generate a secure token to connect your desktop app. Format: sk_opus8_...
          </p>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 mt-3">Error: {error}</p>
      )}
    </div>
  );
}
