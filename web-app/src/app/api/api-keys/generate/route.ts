import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateApiKey } from '@/lib/crypto/api-keys';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { user_id, label } = body;

  if (!user_id) {
    return NextResponse.json({ error: 'user_id required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Revoke all existing keys for this user
  await supabase
    .from('api_keys')
    .update({ revoked: true })
    .eq('user_id', user_id)
    .eq('revoked', false);

  // Generate new key
  const { fullKey, keyHash, keyPrefix } = generateApiKey();

  const { error } = await supabase
    .from('api_keys')
    .insert({
      user_id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      label: label ?? 'Opus8 Desktop',
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    api_key: fullKey,
    key_prefix: keyPrefix,
    message: 'Key generated successfully. Save it now — you will not see it again.',
  });
}
