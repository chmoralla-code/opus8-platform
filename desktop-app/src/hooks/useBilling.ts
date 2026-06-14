import { useState, useEffect, useCallback } from 'react';
import { checkBalance } from '@/lib/tauri-bridge';
import type { AppSettings } from '@shared/types';

interface BillingState {
  walletBalance: number;
  lastDepositAmount: number;
  percentage: number;
  color: 'green' | 'orange' | 'red';
  loading: boolean;
  error: string | null;
}

/**
 * Hook that polls the central server for wallet balance
 * and drives the dynamic usage bar display.
 */
export function useBilling(settings: AppSettings) {
  const [state, setState] = useState<BillingState>({
    walletBalance: 0,
    lastDepositAmount: 0,
    percentage: 100,
    color: 'green',
    loading: false,
    error: null,
  });

  const refresh = useCallback(async () => {
    // Don't poll if in BYOK mode or no key
    if (settings.billingMode === 'byok' || !settings.platformApiKey) {
      return;
    }

    setState((s) => ({ ...s, loading: true }));
    try {
      const result: any = await checkBalance(settings.platformApiKey);
      const percentage = Number(result.percentage) || 0;
      const walletBalance = Number(result.wallet_balance) || 0;
      const lastDepositAmount = Number(result.last_deposit_amount) || 0;
      const color = percentage > 50 ? 'green' : percentage >= 15 ? 'orange' : 'red';

      setState({
        walletBalance,
        lastDepositAmount,
        percentage,
        color,
        loading: false,
        error: null,
      });
    } catch (err: any) {
      setState((s) => ({
        ...s,
        loading: false,
        error: err.toString(),
      }));
    }
  }, [settings.platformApiKey, settings.billingMode]);

  // Auto-refresh every 30 seconds (in platform mode)
  useEffect(() => {
    if (settings.billingMode === 'platform' && settings.platformApiKey) {
      refresh();
      const interval = setInterval(refresh, 30000);
      return () => clearInterval(interval);
    }
  }, [settings.billingMode, settings.platformApiKey, refresh]);

  return state;
}
