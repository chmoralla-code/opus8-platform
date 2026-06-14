/**
 * Model Brand Rebrand Map — hides all DeepSeek/OpenCode references.
 * All internal model IDs are mapped to "Claude Opus 8" brand names.
 */
export const modelBrands: Record<string, {
  id: string;
  displayName: string;
  description: string;
  tier: 'pro' | 'flash' | 'research' | 'gemini-pro' | 'gemini-flash';
  provider: 'deepseek' | 'google' | 'pollinations';
}> = {
  'deepseek-v4-pro': {
    id: 'deepseek-v4-pro',
    displayName: 'Claude Opus 8 Pro',
    description: 'Most capable model for complex coding tasks with reasoning loops',
    tier: 'pro',
    provider: 'deepseek',
  },
  'deepseek-v4-flash': {
    id: 'deepseek-v4-flash',
    displayName: 'Claude Opus 8 Flash',
    description: 'Fast and efficient for everyday coding',
    tier: 'flash',
    provider: 'deepseek',
  },
  'pollinations-free': {
    id: 'pollinations-free',
    displayName: 'Claude Opus 8 Research (Free)',
    description: 'Free research-grade model via Pollinations AI',
    tier: 'research',
    provider: 'pollinations',
  },
  'gemini-2.5-flash': {
    id: 'gemini-2.5-flash',
    displayName: 'Gemini 2.5 Flash',
    description: "Google's fast multimodal model — images, code, text",
    tier: 'gemini-flash',
    provider: 'google',
  },
  'gemini-2.5-pro': {
    id: 'gemini-2.5-pro',
    displayName: 'Gemini 2.5 Pro',
    description: "Google's most capable model for complex reasoning",
    tier: 'gemini-pro',
    provider: 'google',
  },
};

/** Given a model ID, return the branded display name. */
export function getModelDisplayName(modelId: string): string {
  return modelBrands[modelId]?.displayName ?? modelId;
}

/** Given a model ID, return the model tier. */
export function getModelTier(modelId: string): 'pro' | 'flash' | 'research' | 'gemini-pro' | 'gemini-flash' {
  return modelBrands[modelId]?.tier ?? 'pro';
}
