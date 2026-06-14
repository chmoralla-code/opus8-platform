'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface Payment {
  id: string;
  user_id: string;
  amount: number;
  gcash_reference: string;
  status: string;
  created_at: string;
  profiles?: { email: string } | null;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  // Admin auth check
  useEffect(() => {
    const auth = localStorage.getItem('opus8_admin_auth');
    if (auth !== 'true') {
      router.push('/admin');
    }
  }, []);

  // Fetch pending payments
  const fetchPayments = async () => {
    try {
      const res = await fetch('/api/payments/admin?status=pending');
      const data = await res.json();
      setPayments(data.payments ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayments();
    // Poll every 30 seconds
    const interval = setInterval(fetchPayments, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (paymentId: string, action: 'approve' | 'reject') => {
    setActionLoading(paymentId);
    setMessage(null);
    try {
      const res = await fetch('/api/payments/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payment_id: paymentId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Payment ${action}d successfully.`);
        setPayments((prev) => prev.filter((p) => p.id !== paymentId));
      } else {
        setMessage(`Error: ${data.error}`);
      }
    } catch {
      setMessage('Network error. Please try again.');
    } finally {
      setActionLoading(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('opus8_admin_auth');
    router.push('/admin');
  };

  return (
    <div className="min-h-screen bg-claude-cream dark:bg-claude-charcoal">
      {/* Header */}
      <header className="border-b border-claude-border-light dark:border-claude-border-dark bg-white dark:bg-claude-surface-dark">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center">
              <span className="text-white text-xs font-bold">A</span>
            </div>
            <span className="font-bold text-lg">Admin Dashboard</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-claude-accent hover:underline"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {message && (
          <div className={`p-4 rounded-lg mb-6 text-sm ${
            message.startsWith('Error')
              ? 'bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200'
              : 'bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200'
          }`}>
            {message}
          </div>
        )}

        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-xl font-bold">GCash Payment Verification</h1>
            <span className="text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
              {payments.length} pending
            </span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-claude-accent border-t-transparent mx-auto" />
            </div>
          ) : payments.length === 0 ? (
            <div className="text-center py-12 text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
              <p className="text-lg mb-1">No pending payments</p>
              <p className="text-sm">All GCash top-ups have been reviewed.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left border-b border-claude-border-light dark:border-claude-border-dark">
                    <th className="py-3 px-4 text-sm font-semibold">User ID</th>
                    <th className="py-3 px-4 text-sm font-semibold">Amount</th>
                    <th className="py-3 px-4 text-sm font-semibold">GCash Ref #</th>
                    <th className="py-3 px-4 text-sm font-semibold">Submitted</th>
                    <th className="py-3 px-4 text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-claude-border-light dark:border-claude-border-dark last:border-0"
                    >
                      <td className="py-3 px-4 font-mono text-xs">
                        {payment.user_id.slice(0, 12)}...
                      </td>
                      <td className="py-3 px-4 font-semibold" style={{ color: '#CC5A37' }}>
                        ₱{payment.amount.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">
                        {payment.gcash_reference}
                      </td>
                      <td className="py-3 px-4 text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
                        {new Date(payment.created_at).toLocaleDateString('en-PH', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAction(payment.id, 'approve')}
                            disabled={actionLoading === payment.id}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
                          >
                            {actionLoading === payment.id ? '...' : '✓ Approve'}
                          </button>
                          <button
                            onClick={() => handleAction(payment.id, 'reject')}
                            disabled={actionLoading === payment.id}
                            className="px-3 py-1.5 text-xs font-semibold rounded-md bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950 dark:text-red-300 disabled:opacity-50 transition-colors"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
