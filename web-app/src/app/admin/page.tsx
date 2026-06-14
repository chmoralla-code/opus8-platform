'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ADMIN_CREDENTIALS } from '@shared/constants';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (
      username === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      // Store admin session token in localStorage
      localStorage.setItem('opus8_admin_auth', 'true');
      router.push('/admin/dashboard');
    } else {
      setError('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-claude-cream dark:bg-claude-charcoal px-4">
      <div className="card max-w-sm w-full animate-slide-up">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-claude-accent flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2z"
                stroke="white" strokeWidth="2" strokeLinecap="round"/>
              <path d="M10 16l4 4 8-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold">Admin Access</h1>
          <p className="text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark mt-1">
            Opus8 Payment Verification Panel
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input-field"
              placeholder="admin"
              autoComplete="username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 dark:bg-red-950 p-2 rounded">
              {error}
            </p>
          )}

          <button type="submit" className="btn-primary w-full">
            Sign In
          </button>
        </form>

        <p className="text-xs text-claude-text-secondary-light dark:text-claude-text-secondary-dark text-center mt-4">
          Protected area. Unauthorized access is prohibited.
        </p>
      </div>
    </div>
  );
}
