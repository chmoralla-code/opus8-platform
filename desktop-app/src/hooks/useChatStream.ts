import { useState, useCallback, useRef } from 'react';
import type { ChatMessage, ThinkingBlock } from '@shared/types';
import { getModelTier } from '@/lib/model-brands';

interface UseChatStreamOptions {
  apiKey: string;
  billingMode: 'platform' | 'byok';
  model: string;
  centralDomain: string;
}

/**
 * Hook for streaming chat completions through the central proxy.
 * Handles token-by-token streaming with fade-in animations.
 */
export function useChatStream(options: UseChatStreamOptions) {
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingBlocks, setThinkingBlocks] = useState<ThinkingBlock[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    messages: ChatMessage[],
    onToken: (token: string) => void,
    onComplete: (fullMessage: ChatMessage) => void,
    onError: (error: string) => void,
  ) => {
    setIsStreaming(true);
    setThinkingBlocks([]);
    const abortController = new AbortController();
    abortRef.current = abortController;

    const tier = getModelTier(options.model);
    const proxyUrl = `${options.centralDomain}/api/v1/anthropic/chat/completions`;

    try {
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': options.apiKey,
        },
        body: JSON.stringify({
          model: options.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
          api_key: options.apiKey,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const err = await response.text();
        onError(`API error: ${response.status} — ${err}`);
        setIsStreaming(false);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) {
        onError('No response body');
        setIsStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let fullContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ') || line === 'data: [DONE]') continue;

          try {
            const parsed = JSON.parse(line.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              fullContent += delta;
              onToken(delta);
            }
          } catch {
            // Skip unparseable chunks
          }
        }
      }

      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID?.() ?? Date.now().toString(),
        role: 'assistant',
        content: fullContent,
        timestamp: Date.now(),
        model: options.model,
        thinking: thinkingBlocks.length > 0 ? thinkingBlocks : undefined,
      };

      onComplete(assistantMessage);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        onError(err.message);
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [options.apiKey, options.billingMode, options.model, options.centralDomain]);

  const abortStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { sendMessage, abortStream, isStreaming, thinkingBlocks };
}
