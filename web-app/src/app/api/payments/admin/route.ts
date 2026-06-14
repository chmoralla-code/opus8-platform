import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// GET: List all pending payments (for admin verification table)
export async function GET(request: NextRequest) {
  const supabase = createServiceClient();

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') ?? 'pending';

  const { data, error } = await supabase
    .from('pending_payments')
    .select(`
      id,
      user_id,
      amount,
      gcash_reference,
      status,
      created_at,
      profiles:user_id (email)
    `)
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ payments: data });
}

// POST: Approve a pending payment
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { payment_id, action } = body; // action: 'approve' | 'reject'

  if (!payment_id || !action) {
    return NextResponse.json(
      { error: 'payment_id and action required' },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  if (action === 'approve') {
    // Get the payment
    const { data: payment, error: fetchError } = await supabase
      .from('pending_payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (fetchError || !payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status !== 'pending') {
      return NextResponse.json(
        { error: `Payment already ${payment.status}` },
        { status: 400 }
      );
    }

    // Get current profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('wallet_balance, last_deposit_amount')
      .eq('id', payment.user_id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    const newBalance = Number(profile.wallet_balance) + Number(payment.amount);

    // Update profile: add funds AND set last_deposit_amount to reset usage bar to 100%
    await supabase
      .from('profiles')
      .update({
        wallet_balance: newBalance,
        last_deposit_amount: Number(payment.amount),
      })
      .eq('id', payment.user_id);

    // Mark payment as approved
    await supabase
      .from('pending_payments')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', payment_id);

    return NextResponse.json({
      message: `Payment approved. ₱${payment.amount} added to user balance.`,
      new_balance: newBalance,
    });
  }

  if (action === 'reject') {
    await supabase
      .from('pending_payments')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', payment_id);

    return NextResponse.json({ message: 'Payment rejected.' });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
