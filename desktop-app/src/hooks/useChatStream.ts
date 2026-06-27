import { useState, useCallback, useRef } from 'react';
import { open } from '@tauri-apps/plugin-shell';
import type { ChatMessage, ThinkingBlock } from '@shared/types';
import { getModelTier } from '@/lib/model-brands';

interface UseChatStreamOptions {
  apiKey: string;
  billingMode: 'platform' | 'byok';
  model: string;
  centralDomain: string;
}

function isSafeExecutableTarget(target: string) {
  const normalized = target.replace(/\//g, '\\');
  return /\.(exe|msi|bat|cmd)$/i.test(normalized) &&
    /^[A-Za-z]:\\Users\\/i.test(normalized) &&
    !/\\(Windows|Program Files|Program Files \(x86\)|AppData)\\/i.test(normalized);
}

function normalizeFileUrl(target: string) {
  return decodeURI(target).replace(/^file:\/\/\/?/i, '').replace(/\//g, '\\');
}

function addFileTarget(targets: Set<string>, target: string) {
  const normalized = target.replace(/\//g, '\\');
  if (/\.(html?)$/i.test(normalized) || isSafeExecutableTarget(normalized)) {
    targets.add(normalized);
  }
}

function collectOpenTargets(text: string) {
  const targets = new Set<string>();
  const urlMatches = text.match(/\bhttps?:\/\/(?:localhost|127\.0\.0\.1):\d+(?:\/[^\s"'<>)]*)?/gi) ?? [];
  const fileMatches = text.match(/\b[A-Za-z]:\\[^\r\n"'<>|]+?\.(?:html?|exe|msi|bat|cmd)\b/gi) ?? [];
  const fileUrlMatches = text.match(/\bfile:\/\/\/?[A-Za-z]:\/[^\s"'<>)]*?\.(?:html?|exe|msi|bat|cmd)\b/gi) ?? [];

  urlMatches.forEach((target) => targets.add(target));
  fileMatches.forEach((target) => addFileTarget(targets, target));
  fileUrlMatches.forEach((target) => addFileTarget(targets, normalizeFileUrl(target)));

  return Array.from(targets).slice(0, 3);
}

async function autoOpenLocalArtifacts(text: string) {
  const targets = collectOpenTargets(text);
  for (const target of targets) {
    try {
      window.dispatchEvent(new CustomEvent('opus8-preview-target', { detail: { target } }));
      await open(target);
    } catch {
      // Preview opening is best-effort; the chat response should still complete.
    }
  }
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
      await autoOpenLocalArtifacts(fullContent);
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
