// ============================================================
// Opus8 — Central Proxy API Route
// Endpoint: POST /api/v1/anthropic/chat/completions
//
// This hides the main DeepSeek Developer Key and handles:
// 1. API key verification against Supabase
// 2. Forwarding payload to DeepSeek
// 3. 2x PHP ROI markup billing
// 4. Balance enforcement (terminate stream at ₱0)
// ============================================================

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { calculateBilling, canAfford } from '@/lib/billing/calculator';
import { verifyApiKey } from '@/lib/crypto/api-keys';
import { RATES } from '@shared/constants';
import type { ProxyRequest, TokenUsage } from '@shared/types';

export async function POST(request: NextRequest) {
  const body: ProxyRequest = await request.json();
  const { model, messages, stream, api_key } = body;

  // ---- 1. Validate API Key format ----
  if (!api_key || !api_key.startsWith('sk_opus8_')) {
    return NextResponse.json(
      { error: 'Invalid API key format. Expected sk_opus8_...' },
      { status: 401 }
    );
  }

  // ---- 2. Verify API key against Supabase ----
  const supabaseService = createServiceClient();

  // Find user by API key hash
  const { data: keyRecords, error: keyError } = await supabaseService
    .from('api_keys')
    .select('id, user_id, key_hash, revoked')
    .eq('revoked', false);

  if (keyError || !keyRecords) {
    return NextResponse.json(
      { error: 'Authentication service unavailable' },
      { status: 500 }
    );
  }

  let authenticatedUserId: string | null = null;
  for (const keyRecord of keyRecords) {
    if (verifyApiKey(api_key, keyRecord.key_hash)) {
      authenticatedUserId = keyRecord.user_id;
      // Update last_used_at
      await supabaseService
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyRecord.id);
      break;
    }
  }

  if (!authenticatedUserId) {
    return NextResponse.json(
      { error: 'Invalid API key. Generate a valid key from your dashboard.' },
      { status: 401 }
    );
  }

  // ---- 3. Check wallet balance ----
  const { data: profile, error: profileError } = await supabaseService
    .from('profiles')
    .select('wallet_balance')
    .eq('id', authenticatedUserId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json(
      { error: 'Account not found' },
      { status: 404 }
    );
  }

  const walletBalance = Number(profile.wallet_balance);

  if (walletBalance <= 0) {
    return NextResponse.json(
      { error: 'Insufficient balance. Please top up via GCash in your dashboard.' },
      { status: 402 }
    );
  }

  // ---- 4. Determine model tier & provider ----
  const modelLower = model.toLowerCase();
  const isGemini = modelLower.includes('gemini');

  const tier =
    isGemini && modelLower.includes('pro') ? 'gemini-pro' :
    isGemini && modelLower.includes('flash') ? 'gemini-flash' :
    modelLower.includes('deepseek-v4-pro') || modelLower.includes('pro') ? 'pro' :
    modelLower.includes('deepseek-v4-flash') || modelLower.includes('flash') ? 'flash' :
    modelLower.includes('pollinations') || modelLower.includes('free') ? 'research' :
    'pro';

  const rates = tier === 'research'
    ? RATES.flash
    : RATES[tier as keyof typeof RATES] ?? RATES.pro;

  try {
    // ---- 5a. Route to Gemini (Google AI API) ----
    if (isGemini) {
      return handleGeminiRequest(
        body,
        supabaseService,
        authenticatedUserId,
        tier as 'gemini-pro' | 'gemini-flash',
        walletBalance,
      );
    }

    // ---- 5b. Route to DeepSeek ----
    const deepseekPayload = {
      model: tier === 'pro' ? 'deepseek-v4-pro' : 'deepseek-v4-flash',
      messages: messages,
      stream: stream ?? true,
      temperature: 0.7,
      max_tokens: 4096,
    };

    const deepseekResponse = await fetch(
      process.env.DEEPSEEK_BASE_URL + '/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        },
        body: JSON.stringify(deepseekPayload),
      }
    );

    if (!deepseekResponse.ok) {
      const errorText = await deepseekResponse.text();
      return NextResponse.json(
        { error: `DeepSeek API error: ${deepseekResponse.status}`, detail: errorText },
        { status: deepseekResponse.status }
      );
    }

    // ---- 6. Stream handler with billing ----
    if (stream) {
      return handleStreamingResponse(
        deepseekResponse,
        supabaseService,
        authenticatedUserId,
        tier as 'pro' | 'flash' | 'research',
        walletBalance,
        body.model,
        'deepseek'
      );
    }

    // Non-streaming response
    const dsResult = await deepseekResponse.json();
    const usage = dsResult.usage ?? { prompt_tokens: 0, completion_tokens: 0 };

    const tokenUsage: TokenUsage = {
      inputTokens: usage.prompt_tokens,
      outputTokens: usage.completion_tokens,
      model: tier as TokenUsage['model'],
    };

    const billing = calculateBilling(tokenUsage);
    const cost = billing.costPhp;

    // Deduct from balance
    const newBalance = Math.max(0, walletBalance - cost);
    await supabaseService
      .from('profiles')
      .update({ wallet_balance: newBalance })
      .eq('id', authenticatedUserId);

    // Log usage
    await supabaseService.from('token_usage_log').insert({
      user_id: authenticatedUserId,
      model: body.model,
      input_tokens: tokenUsage.inputTokens,
      output_tokens: tokenUsage.outputTokens,
      cost_php: cost,
    });

    return NextResponse.json({
      ...dsResult,
      billing: { ...billing, remainingBalance: newBalance },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'Proxy error', detail: error.message },
      { status: 500 }
    );
  }
}

/**
 * Handle Gemini API request — converts OpenAI-format messages to Google AI format,
 * sends to Gemini endpoint, and handles the different response/stream format.
 */
async function handleGeminiRequest(
  body: ProxyRequest,
  supabaseService: any,
  userId: string,
  tier: 'gemini-pro' | 'gemini-flash',
  initialBalance: number,
): Promise<Response> {
  const geminiModel = tier === 'gemini-pro' ? 'gemini-2.5-pro' : 'gemini-2.5-flash';
  const geminiUrl = `${process.env.GEMINI_BASE_URL}/models/${geminiModel}:${
    body.stream ? 'streamGenerateContent' : 'generateContent'
  }?key=${process.env.GEMINI_API_KEY}`;

  // Convert OpenAI-style messages to Google Gemini format
  const contents = body.messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : msg.role,
    parts: [{ text: msg.content }],
  }));

  const geminiPayload = {
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  const geminiResponse = await fetch(geminiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(geminiPayload),
  });

  if (!geminiResponse.ok) {
    const errorText = await geminiResponse.text();
    return NextResponse.json(
      { error: `Gemini API error: ${geminiResponse.status}`, detail: errorText },
      { status: geminiResponse.status }
    );
  }

  if (body.stream) {
    return handleGeminiStreamingResponse(
      geminiResponse,
      supabaseService,
      userId,
      tier,
      initialBalance,
      geminiModel,
    );
  }

  // Non-streaming Gemini response
  const geminiResult: any = await geminiResponse.json();
  const candidate = geminiResult.candidates?.[0];
  const text = candidate?.content?.parts?.[0]?.text ?? '';
  const inputTokens = geminiResult.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = geminiResult.usageMetadata?.candidatesTokenCount ?? 0;

  const tokenUsage: TokenUsage = { inputTokens, outputTokens, model: tier };
  const billing = calculateBilling(tokenUsage);
  const cost = billing.costPhp;

  const newBalance = Math.max(0, initialBalance - cost);
  await supabaseService
    .from('profiles')
    .update({ wallet_balance: newBalance })
    .eq('id', userId);

  await supabaseService.from('token_usage_log').insert({
    user_id: userId,
    model: geminiModel,
    input_tokens: tokenUsage.inputTokens,
    output_tokens: tokenUsage.outputTokens,
    cost_php: cost,
  });

  // Return in OpenAI-compatible format
  return NextResponse.json({
    id: `gemini-${Date.now()}`,
    object: 'chat.completion',
    choices: [{
      index: 0,
      message: { role: 'assistant', content: text },
      finish_reason: candidate?.finishReason ?? 'STOP',
    }],
    usage: {
      prompt_tokens: inputTokens,
      completion_tokens: outputTokens,
      total_tokens: inputTokens + outputTokens,
    },
    billing: { ...billing, remainingBalance: newBalance },
  });
}

/**
 * Handle Gemini streaming SSE response and convert to OpenAI-compatible SSE format.
 */
function handleGeminiStreamingResponse(
  geminiResponse: Response,
  supabaseService: any,
  userId: string,
  tier: 'gemini-pro' | 'gemini-flash',
  initialBalance: number,
  modelName: string,
): Response {
  let outputTokens = 0;
  let inputTokens = 0;
  let streamKilled = false;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      const reader = geminiResponse.body?.getReader();
      if (!reader) { controller.close(); return; }

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) {
            await finalizeGeminiBilling();
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });

          // Gemini returns JSON lines, not SSE
          // Each line is a JSON object with candidates[]
          try {
            const parsed = JSON.parse(chunk);
            const candidate = parsed.candidates?.[0];

            if (candidate?.content?.parts) {
              for (const part of candidate.content.parts) {
                if (part.text) {
                  outputTokens += Math.ceil(part.text.length / 4); // rough token estimate
                  const sseChunk = JSON.stringify({
                    choices: [{ delta: { content: part.text }, index: 0, finish_reason: null }],
                  });
                  controller.enqueue(encoder.encode(`data: ${sseChunk}\n\n`));
                }
              }
            }

            if (parsed.usageMetadata?.promptTokenCount) {
              inputTokens = parsed.usageMetadata.promptTokenCount;
              outputTokens = parsed.usageMetadata.candidatesTokenCount ?? outputTokens;
            }

            // Balance enforcement every ~50 estimated tokens
            if (!streamKilled && outputTokens > 0 && outputTokens % 50 === 0) {
              const rates = RATES[tier];
              const estimatedCost =
                (inputTokens / 1_000_000) * rates.inputPerMillion * 2 +
                (outputTokens / 1_000_000) * rates.outputPerMillion * 2;

              const { data: freshProfile } = await supabaseService
                .from('profiles')
                .select('wallet_balance')
                .eq('id', userId)
                .single();

              const remaining = Number(freshProfile?.wallet_balance ?? 0);
              if (remaining <= 0) {
                streamKilled = true;
                await finalizeGeminiBilling();
                const killMsg = JSON.stringify({
                  choices: [{
                    delta: { content: '\n\n⚠️ *Balance depleted. Please top up via GCash.*' },
                    index: 0,
                    finish_reason: 'balance_limit',
                  }],
                });
                controller.enqueue(encoder.encode(`data: ${killMsg}\n\n`));
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      } catch (error) {
        controller.error(error);
      }

      async function finalizeGeminiBilling() {
        if (outputTokens === 0) return;
        const tokenUsage: TokenUsage = {
          inputTokens: Math.max(inputTokens, 1),
          outputTokens,
          model: tier,
        };
        const billing = calculateBilling(tokenUsage);
        const cost = billing.costPhp;
        const newBalance = Math.max(0, initialBalance - cost);
        await supabaseService
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', userId);
        await supabaseService.from('token_usage_log').insert({
          user_id: userId,
          model: modelName,
          input_tokens: tokenUsage.inputTokens,
          output_tokens: tokenUsage.outputTokens,
          cost_php: cost,
        });
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'x-model': modelName,
      'x-provider': 'google',
    },
  });
}

/**
 * Handle streaming response with real-time billing and balance enforcement.
 */
function handleStreamingResponse(
  deepseekResponse: Response,
  supabaseService: any,
  userId: string,
  tier: 'pro' | 'flash' | 'research' | 'gemini-pro' | 'gemini-flash',
  initialBalance: number,
  modelName: string,
  provider: 'deepseek' | 'google' = 'deepseek',
): Response {
  let inputTokens = 0;
  let outputTokens = 0;
  let remainingBalance = initialBalance;
  let streamKilled = false;

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const readable = new ReadableStream({
    async start(controller) {
      const reader = deepseekResponse.body?.getReader();
      if (!reader) {
        controller.close();
        return;
      }

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) {
            // --- STREAM COMPLETE: Calculate final billing ---
            await finalizeBilling();
            controller.close();
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6);

            if (data === '[DONE]') {
              await finalizeBilling();
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const choice = parsed.choices?.[0];

              // Track output tokens
              if (choice?.delta?.content) {
                outputTokens++;
              }

              // Track input tokens from usage if available
              if (parsed.usage?.prompt_tokens) {
                inputTokens = parsed.usage.prompt_tokens;
              }

              // --- Real-time balance check (every ~50 tokens) ---
              if (!streamKilled && outputTokens > 0 && outputTokens % 50 === 0) {
                const rates = RATES[tier];
                const estimatedCost =
                  (inputTokens / 1_000_000) * rates.inputPerMillion * 2 +
                  (outputTokens / 1_000_000) * rates.outputPerMillion * 2;

                const { data: freshProfile } = await supabaseService
                  .from('profiles')
                  .select('wallet_balance')
                  .eq('id', userId)
                  .single();

                remainingBalance = Number(freshProfile?.wallet_balance ?? 0);

                if (remainingBalance <= 0) {
                  streamKilled = true;
                  await finalizeBilling();

                  const killMessage = JSON.stringify({
                    choices: [{
                      delta: {
                        content: '\n\n⚠️ *Balance depleted. Please top up via GCash to continue.*'
                      },
                      index: 0,
                      finish_reason: 'balance_limit',
                    }],
                  });

                  controller.enqueue(encoder.encode(`data: ${killMessage}\n\n`));
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  controller.close();
                  return;
                }
              }

              controller.enqueue(encoder.encode(`${line}\n\n`));
            } catch {
              // Pass through unparseable chunks
              controller.enqueue(encoder.encode(`${line}\n\n`));
            }
          }
        }
      } catch (error) {
        controller.error(error);
      }

      async function finalizeBilling() {
        if (outputTokens === 0) return;

        const tokenUsage: TokenUsage = {
          inputTokens: Math.max(inputTokens, 1),
          outputTokens,
          model: tier,
        };

        const billing = calculateBilling(tokenUsage);
        const cost = billing.costPhp;

        const newBalance = Math.max(0, initialBalance - cost);
        await supabaseService
          .from('profiles')
          .update({ wallet_balance: newBalance })
          .eq('id', userId);

        await supabaseService.from('token_usage_log').insert({
          user_id: userId,
          model: modelName,
          input_tokens: tokenUsage.inputTokens,
          output_tokens: tokenUsage.outputTokens,
          cost_php: cost,
        });
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'x-model': modelName,
    },
  });
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    },
  });
}
