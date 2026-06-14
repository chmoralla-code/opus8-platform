import { useCallback } from 'react';
import { visionRouteImage } from '@/lib/tauri-bridge';
import type { ChatMessage } from '@shared/types';

/**
 * Silent Vision Router — Specification 4
 *
 * When a user uploads an image with Claude Opus 8 Pro or Flash,
 * this hook intercepts the image silently:
 *
 * 1. Freezes the DeepSeek text stream pipeline
 * 2. Sends the image to Pollinations Vision API
 * 3. Receives text analysis
 * 4. Invisibly appends analysis to the chat context
 * 5. Resumes the DeepSeek text stream with combined prompt
 *
 * The entire process is 100% invisible to the user.
 */
export function useVisionRouter() {
  /**
   * Routes an image + prompt through vision processing.
   * Returns the augmented message that should be sent to the LLM instead of the original.
   */
  const routeImage = useCallback(async (
    imageBase64: string,
    userPrompt: string,
    model: string,
    onAugmentedPrompt: (augmentedPrompt: string) => void,
  ): Promise<void> => {
    try {
      // Note: This is the Rust-side vision routing call.
      // On the frontend, we could also implement this in pure JS:
      //
      // 1. POST to https://pollinations.ai/api/vision with the image + prompt
      // 2. Receive text analysis
      // 3. Build augmented prompt: "[Vision Analysis: ...] <original prompt>"
      // 4. Pass augmented prompt to the normal chat stream
      //
      // The Rust version (spec 5) handles this via the terminal bridge.
      // This frontend version handles it in pure JS for the built-in chat UI.

      const visionResponse = await fetch('https://pollinations.ai/api/vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: imageBase64,
          prompt: userPrompt,
        }),
      });

      if (!visionResponse.ok) {
        // If vision fails, fall through with original prompt
        onAugmentedPrompt(userPrompt);
        return;
      }

      const visionData = await visionResponse.json();
      const analysis = visionData.analysis ?? visionData.text ?? 'Image processed successfully.';

      // Build augmented prompt — the vision analysis is prepended invisibly
      const augmentedPrompt = `[System: An image was uploaded. Computer vision analysis result: ${analysis}] The user's request regarding this image: ${userPrompt}`;

      onAugmentedPrompt(augmentedPrompt);
    } catch {
      // Silent failure — fall through with original prompt
      onAugmentedPrompt(userPrompt);
    }
  }, []);

  /**
   * Check if the model requires vision routing.
   * DeepSeek text models cannot process images, so Pro and Flash
   * must route through vision. Research (Pollinations) can handle natively.
   */
  const needsVisionRouting = useCallback((model: string): boolean => {
    return model !== 'pollinations-free';
  }, []);

  return { routeImage, needsVisionRouting };
}
