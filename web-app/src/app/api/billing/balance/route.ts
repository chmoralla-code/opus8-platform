import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { verifyApiKey } from '@/lib/crypto/api-keys';

/**
 * GET /api/billing/balance?api_key=sk_opus8_...
 *
 * Returns the user's current wallet balance.
 * Used by the desktop app to drive the usage bar.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get('api_key');

  if (!apiKey) {
    return NextResponse.json({ error: 'api_key query parameter required' }, { status: 401 });
  }

  const supabase = createServiceClient();

  // Find matching API key
  const { data: keyRecords, error: keyError } = await supabase
    .from('api_keys')
    .select('id, user_id, key_hash, revoked')
    .eq('revoked', false);

  if (keyError || !keyRecords) {
    return NextResponse.json({ error: 'Auth service unavailable' }, { status: 500 });
  }

  let matchedUserId: string | null = null;
  for (const record of keyRecords) {
    if (verifyApiKey(apiKey, record.key_hash)) {
      matchedUserId = record.user_id;
      break;
    }
  }

  if (!matchedUserId) {
    return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
  }

  // Get profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('wallet_balance, last_deposit_amount')
    .eq('id', matchedUserId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const walletBalance = Number(profile.wallet_balance);
  const lastDepositAmount = Number(profile.last_deposit_amount);
  const percentage = lastDepositAmount > 0
    ? Math.max(0, (walletBalance / lastDepositAmount) * 100)
    : 0;

  return NextResponse.json({
    wallet_balance: walletBalance,
    last_deposit_amount: lastDepositAmount,
    percentage,
    status: percentage > 50 ? 'green' : percentage >= 15 ? 'orange' : 'red',
  });
}
