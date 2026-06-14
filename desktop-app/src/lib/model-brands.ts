/**
 * Model Brand Rebrand Map — hides all DeepSeek/OpenCode references.
 * All internal model IDs are mapped to "Claude Opus 8" brand names.
 */
export const modelBrands: Record<string, {
  id: string;
  displayName: string;
  description: string;
  tier: 'pro' | 'flash' | 'research';
}> = {
  'deepseek-v4-pro': {
    id: 'deepseek-v4-pro',
    displayName: 'Claude Opus 8 Pro',
    description: 'Most capable model for complex coding tasks with reasoning loops',
    tier: 'pro',
  },
  'deepseek-v4-flash': {
    id: 'deepseek-v4-flash',
    displayName: 'Claude Opus 8 Flash',
    description: 'Fast and efficient for everyday coding',
    tier: 'flash',
  },
  'pollinations-free': {
    id: 'pollinations-free',
    displayName: 'Claude Opus 8 Research (Free)',
    description: 'Free research-grade model via Pollinations AI',
    tier: 'research',
  },
};

/** Given a model ID, return the branded display name. */
export function getModelDisplayName(modelId: string): string {
  return modelBrands[modelId]?.displayName ?? modelId;
}

/** Given a model ID, return the model tier. */
export function getModelTier(modelId: string): 'pro' | 'flash' | 'research' {
  return modelBrands[modelId]?.tier ?? 'pro';
}
