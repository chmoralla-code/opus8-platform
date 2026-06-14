// ============================================================
// Opus8 Platform — Shared Type Definitions
// ============================================================

// --- Supabase Database Types ---
export interface UserProfile {
  id: string;
  email: string;
  wallet_balance: number;
  last_deposit_amount: number;
  created_at: string;
  updated_at: string;
}

export interface PendingPayment {
  id: string;
  user_id: string;
  amount: number;
  gcash_reference: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  reviewed_at: string | null;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_hash: string;
  key_prefix: string;
  label: string;
  last_used_at: string | null;
  created_at: string;
  revoked: boolean;
}

// --- Billing Types ---
export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  model: 'pro' | 'flash' | 'research' | 'gemini-pro' | 'gemini-flash';
}

export interface BillingResult {
  costPhp: number;
  inputTokens: number;
  outputTokens: number;
  rateApplied: { input: number; output: number };
  remainingBalance: number;
}

// --- Chat Types ---
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  model?: string;
  thinking?: ThinkingBlock[];
  hasImage?: boolean;
  imageUrl?: string;
}

export interface ThinkingBlock {
  id: string;
  type: 'reasoning' | 'tool_call' | 'token_calc';
  content: string;
  timestamp: number;
}

// --- API Request/Response Types ---
export interface ProxyRequest {
  model: string;
  messages: { role: string; content: string }[];
  stream: boolean;
  api_key: string;  // User's sk_opus8_ key
}

export interface ProxyResponse {
  id: string;
  object: 'chat.completion.chunk';
  choices: {
    delta: { content?: string; role?: string };
    index: number;
    finish_reason: string | null;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// --- Desktop App — Settings ---
export type BillingMode = 'platform' | 'byok';

export interface AppSettings {
  billingMode: BillingMode;
  platformApiKey: string;
  byokApiKey: string;
  selectedModel: string;
  theme: 'light' | 'dark';
}

// --- Usage Bar State ---
export interface UsageBarState {
  percentage: number;
  walletBalance: number;
  lastDepositAmount: number;
  color: 'green' | 'orange' | 'red';
  statusText: string;
}

// --- OS Detection ---
export type OperatingSystem = 'windows' | 'macos' | 'linux' | 'unknown';

// --- Download Links ---
export interface DesktopDownloadLinks {
  windows: string;
  macos: string;
  linux: string;
}
