'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { MIN_DEPOSIT_PHP, GCASH_REF_LENGTH } from '@shared/constants';

interface Props {
  open: boolean;
  onClose: () => void;
  userId: string;
  onSuccess: () => void;
}

export function GcashModal({ open, onClose, userId, onSuccess }: Props) {
  const [amount, setAmount] = useState<string>('100');
  const [reference, setReference] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const supabase = createClient();

  if (!open) return null;

  const amountValue = parseInt(amount) || 0;
  const isValid = amountValue >= MIN_DEPOSIT_PHP && reference.length === GCASH_REF_LENGTH;

  const handleSubmit = async () => {
    if (!isValid) return;
    setSubmitting(true);
    setError(null);

    const { error: submitError } = await supabase
      .from('pending_payments')
      .insert({
        user_id: userId,
        amount: amountValue,
        gcash_reference: reference,
        status: 'pending',
      });

    setSubmitting(false);

    if (submitError) {
      setError(submitError.message);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onSuccess();
        setSuccess(false);
        setAmount('100');
        setReference('');
      }, 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative card max-w-md w-full mx-4 z-10 animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-claude-text-secondary-light dark:text-claude-text-secondary-dark hover:text-claude-accent"
        >
          ✕
        </button>

        <h2 className="text-xl font-bold mb-2">₱ GCash Top-Up</h2>
        <p className="text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark mb-6">
          Minimum deposit: ₱{MIN_DEPOSIT_PHP} PHP
        </p>

        {success ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">✅</div>
            <h3 className="font-semibold text-lg text-green-700 dark:text-green-400">
              Payment Submitted!
            </h3>
            <p className="text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark mt-2">
              Your payment is pending verification. Balance will update once approved.
            </p>
          </div>
        ) : (
          <>
            {/* GCash QR Placeholder */}
            <div className="mb-6 p-4 border-2 border-dashed border-claude-border-light dark:border-claude-border-dark rounded-lg text-center">
              <div className="w-48 h-48 mx-auto bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-2">
                <span className="text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
                  [ GCash QR Code ]
                </span>
              </div>
              <p className="text-xs text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
                Scan with your GCash app to pay
              </p>
            </div>

            {/* Amount Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Amount (PHP)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min={MIN_DEPOSIT_PHP}
                className="input-field"
                placeholder={`Enter amount (min ₱${MIN_DEPOSIT_PHP})`}
              />
            </div>

            {/* Reference Number */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-1">
                GCash Reference Number (13 digits)
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value.replace(/\D/g, '').slice(0, 13))}
                maxLength={GCASH_REF_LENGTH}
                className="input-field font-mono"
                placeholder="1234567890123"
              />
              <p className="text-xs text-claude-text-secondary-light dark:text-claude-text-secondary-dark mt-1">
                {reference.length}/13 digits entered
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 mb-4">Error: {error}</p>
            )}

            <button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : `Submit ₱${amountValue}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
