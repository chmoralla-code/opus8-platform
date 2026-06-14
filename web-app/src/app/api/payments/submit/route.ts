import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { MIN_DEPOSIT_PHP, GCASH_REF_LENGTH } from '@shared/constants';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { user_id, amount, gcash_reference } = body;

  // Validation
  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }
  if (!amount || amount < MIN_DEPOSIT_PHP) {
    return NextResponse.json(
      { error: `Minimum deposit is ₱${MIN_DEPOSIT_PHP}` },
      { status: 400 }
    );
  }
  if (!gcash_reference || gcash_reference.length !== GCASH_REF_LENGTH) {
    return NextResponse.json(
      { error: `GCash reference must be exactly ${GCASH_REF_LENGTH} digits` },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('pending_payments')
    .insert({
      user_id,
      amount,
      gcash_reference,
      status: 'pending',
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    payment: data,
    message: 'Payment submitted. Awaiting verification.',
  });
}
