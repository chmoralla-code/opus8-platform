'use client';

import { useMemo } from 'react';
import type { UsageBarState } from '@shared/types';

interface Props {
  walletBalance: number;
  lastDepositAmount: number;
}

export function UsageBar({ walletBalance, lastDepositAmount }: Props) {
  const state: UsageBarState = useMemo(() => {
    const percentage = lastDepositAmount > 0
      ? Math.max(0, (walletBalance / lastDepositAmount) * 100)
      : 0;

    const color = percentage > 50 ? 'green' : percentage >= 15 ? 'orange' : 'red';

    const statusText = `₱${walletBalance.toFixed(2)} remaining out of your ₱${lastDepositAmount.toFixed(2)} top-up`;

    return { percentage, walletBalance, lastDepositAmount, color, statusText };
  }, [walletBalance, lastDepositAmount]);

  const barColorClass = state.color === 'green'
    ? 'usage-bar-green'
    : state.color === 'orange'
    ? 'usage-bar-orange'
    : 'usage-bar-red';

  return (
    <div className="space-y-2">
      {/* Percentage Label */}
      <div className="flex justify-between items-center">
        <span className="text-xs font-medium text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
          Usage Remaining
        </span>
        <span className={`text-xs font-bold font-mono ${
          state.color === 'green' ? 'text-green-600' :
          state.color === 'orange' ? 'text-yellow-600' :
          'text-red-600 animate-pulse'
        }`}>
          {state.percentage.toFixed(1)}%
        </span>
      </div>

      {/* Progress Bar Track */}
      <div className="h-3 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColorClass}`}
          style={{ width: `${Math.min(100, state.percentage)}%` }}
        />
      </div>

      {/* Status Text */}
      <p className="text-xs text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
        {state.statusText}
      </p>

      {/* Low Balance Warning */}
      {state.color === 'red' && (
        <p className="text-xs text-red-600 font-semibold animate-pulse">
          ⚠ Low balance! Top up to continue using Claude Opus 8.
        </p>
      )}
    </div>
  );
}
