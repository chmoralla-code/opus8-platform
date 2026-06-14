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

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [gcashOpen, setGcashOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
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
