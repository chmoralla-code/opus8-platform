'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';
import { LoginForm } from '@/components/auth/LoginForm';

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);

  // If already logged in, redirect to dashboard
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.push('/dashboard');
      } else {
        setChecking(false);
      }
    });
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-claude-cream dark:bg-claude-charcoal">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-claude-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-claude-cream dark:bg-claude-charcoal px-4">
      <div className="card max-w-md w-full animate-slide-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-claude-accent flex items-center justify-center mx-auto mb-4">
            <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2z"
                stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="2" fill="white"/>
              <circle cx="20" cy="13" r="2" fill="white"/>
              <path d="M10 21c2.5 3 7.5 3 10 0" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold">Welcome to Opus8</h1>
          <p className="text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark mt-1">
            Sign in to access your AI coding workspace
          </p>
        </div>

        {/* Google Sign-In */}
        <div className="mb-6">
          <GoogleSignInButton />
        </div>

        {/* Divider */}
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-claude-border-light dark:border-claude-border-dark" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-white dark:bg-claude-surface-dark text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
              or continue with email
            </span>
          </div>
        </div>

        {/* Email/Password Login */}
        <LoginForm />
      </div>
    </div>
  );
}
