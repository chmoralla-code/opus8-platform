'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { UsageBar } from '@/components/dashboard/UsageBar';
import { GcashModal } from '@/components/dashboard/GcashModal';
import { ApiKeyCard } from '@/components/dashboard/ApiKeyCard';
import { ChatLogExport } from '@/components/dashboard/ChatLogExport';
import type { UserProfile } from '@shared/types';
import type { User } from '@supabase/supabase-js';

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [gcashOpen, setGcashOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      setProfile(profile as UserProfile);
      setLoading(false);
    };
    checkAuth();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-claude-accent border-t-transparent" />
      </div>
    );
  }

  if (!profile) return null;

  return (
    <div className="min-h-screen bg-claude-cream dark:bg-claude-charcoal">
      {/* Header */}
      <header className="border-b border-claude-border-light dark:border-claude-border-dark">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: '#CC5A37' }}>
              <svg width="18" height="18" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 2C8.268 2 2 8.268 2 16s6.268 14 14 14 14-6.268 14-14S23.732 2 16 2z"
                  stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="12" cy="13" r="2" fill="white"/>
                <circle cx="20" cy="13" r="2" fill="white"/>
              </svg>
            </div>
            <span className="font-bold text-lg">Opus8 Dashboard</span>
          </div>
          <div className="flex items-center gap-4">
            {/* User Info */}
            {user && (
              <div className="flex items-center gap-2">
                {/* Avatar */}
                {user.user_metadata?.avatar_url ? (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt=""
                    className="w-7 h-7 rounded-full ring-2 ring-claude-accent-light"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-claude-accent flex items-center justify-center text-white text-xs font-semibold">
                    {user.email?.charAt(0).toUpperCase() ?? '?'}
                  </div>
                )}
                <div className="hidden md:block text-xs">
                  <div className="font-medium">{user.email}</div>
                  <div className="text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
                    {user.app_metadata?.provider === 'google' ? (
                      <span className="flex items-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                        </svg>
                        Google
                      </span>
                    ) : (
                      'Email'
                    )}
                  </div>
                </div>
              </div>
            )}
            <Link href="/dashboard/settings" className="text-sm text-claude-accent hover:underline">
              Settings
            </Link>
            <button onClick={handleSignOut} className="text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark hover:text-claude-accent">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column — Usage Bar + Actions */}
          <div className="lg:col-span-1 space-y-6">
            {/* Wallet Card */}
            <div className="card">
              <h2 className="font-semibold mb-4">Wallet Balance</h2>
              <div className="text-4xl font-bold mb-2" style={{ color: '#CC5A37' }}>
                ₱{profile.wallet_balance.toFixed(2)}
              </div>
              <UsageBar
                walletBalance={profile.wallet_balance}
                lastDepositAmount={profile.last_deposit_amount}
              />
            </div>

            {/* GCash Refill */}
            <button
              onClick={() => setGcashOpen(true)}
              className="btn-primary w-full"
            >
              ₱ Top Up via GCash
            </button>

            <ChatLogExport userId={profile.id} />
          </div>

          {/* Right Column — API Key + Info */}
          <div className="lg:col-span-2 space-y-6">
            <ApiKeyCard userId={profile.id} />

            <div className="card">
              <h2 className="font-semibold mb-4">How to Connect</h2>
              <ol className="space-y-3 text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
                <li>1. Generate your Desktop API Key above.</li>
                <li>2. Download and install the Opus8 Desktop App.</li>
                <li>3. Paste your key into the app to authenticate.</li>
                <li>4. Start coding with Claude Opus 8!</li>
              </ol>
            </div>

            {/* Recent Payments */}
            <PendingPaymentsList userId={profile.id} />
          </div>
        </div>
      </div>

      <GcashModal
        open={gcashOpen}
        onClose={() => setGcashOpen(false)}
        userId={profile.id}
        onSuccess={() => {
          setGcashOpen(false);
          // Refresh profile
          supabase.from('profiles').select('*').eq('id', profile.id).single()
            .then(({ data }) => data && setProfile(data as UserProfile));
        }}
      />
    </div>
  );
}

function PendingPaymentsList({ userId }: { userId: string }) {
  const [payments, setPayments] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('pending_payments')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(5)
      .then(({ data }) => setPayments(data ?? []));
  }, [userId]);

  if (payments.length === 0) return null;

  return (
    <div className="card">
      <h2 className="font-semibold mb-4">Recent Top-Ups</h2>
      <div className="space-y-2">
        {payments.map((p: any) => (
          <div key={p.id} className="flex justify-between items-center py-2 border-b border-claude-border-light dark:border-claude-border-dark last:border-0">
            <div>
              <span className="font-medium">₱{p.amount}</span>
              <span className="text-xs text-claude-text-secondary-light dark:text-claude-text-secondary-dark ml-2">
                Ref: {p.gcash_reference}
              </span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              p.status === 'approved' ? 'bg-green-100 text-green-800' :
              p.status === 'rejected' ? 'bg-red-100 text-red-800' :
              'bg-yellow-100 text-yellow-800'
            }`}>
              {p.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
