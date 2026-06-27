import { useState, useEffect, useCallback } from 'react';
import { AppShell } from './components/layout/AppShell';
import { useBilling } from './hooks/useBilling';
import { modelBrands } from './lib/model-brands';
import type { ChatMessage, AppSettings } from '@shared/types';

declare global {
  interface Window {
    __opus8ExportChat?: (messages: ChatMessage[]) => void;
  }
}

function previewSourceFrom(text: string) {
  const localUrl = text.match(/\bhttps?:\/\/(?:localhost|127\.0\.0\.1):\d+(?:\/[^\s"'<>)]*)?/i)?.[0];
  if (localUrl) return localUrl;

  const fileUrl = text.match(/\bfile:\/\/\/?[A-Za-z]:\/[^\s"'<>)]*?\.(?:html?|svg)\b/i)?.[0];
  if (fileUrl) return fileUrl;

  const filePath = text.match(/\b[A-Za-z]:\\[^\r\n"'<>|]+?\.(?:html?|svg)\b/i)?.[0];
  return filePath ? `file:///${filePath.replace(/\\/g, '/')}` : '';
}

export default function App() {
  // ---- State ----
  const [settings, setSettings] = useState<AppSettings>(() => {
    const stored = localStorage.getItem('opus8-desktop-settings');
    return stored ? JSON.parse(stored) : {
      billingMode: 'platform',
      platformApiKey: '',
      byokApiKey: '',
      selectedModel: 'deepseek-v4-pro',
      theme: 'light',
    };
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(() => (
    localStorage.getItem('opus8-live-preview-url') || 'http://localhost:3000'
  ));

  const billing = useBilling(settings);

  // Persist settings
  useEffect(() => {
    localStorage.setItem('opus8-desktop-settings', JSON.stringify(settings));
  }, [settings]);

  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle('dark', settings.theme === 'dark');
  }, [settings.theme]);

  useEffect(() => {
    const latest = [...messages].reverse().map((msg) => previewSourceFrom(msg.content)).find(Boolean);
    if (latest) {
      setPreviewUrl(latest);
      localStorage.setItem('opus8-live-preview-url', latest);
    }
  }, [messages]);

  useEffect(() => {
    const onPreviewTarget = (event: Event) => {
      const detail = (event as CustomEvent<{ target?: string }>).detail;
      const target = detail?.target ? previewSourceFrom(detail.target) || detail.target : '';
      if (target) {
        setPreviewUrl(target);
        localStorage.setItem('opus8-live-preview-url', target);
      }
    };
    window.addEventListener('opus8-preview-target', onPreviewTarget);
    return () => window.removeEventListener('opus8-preview-target', onPreviewTarget);
  }, []);

  // ---- Model Selection ----
  const currentModel = modelBrands[settings.selectedModel] ?? modelBrands['deepseek-v4-pro'];

  return (
    <AppShell
      sidebar={
        <div className="p-4 space-y-6">
          {/* Claude Logo + Branding */}
          <div className="flex items-center gap-2 mb-8">
            <ClaudeLogo size={28} />
            <div>
              <h1 className="font-bold text-sm">Claude Opus 8</h1>
              <p className="text-[10px] text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
                AI Coding Platform
              </p>
            </div>
          </div>

          {/* Model Selector */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
              Model
            </label>
            <select
              value={settings.selectedModel}
              onChange={(e) => setSettings({ ...settings, selectedModel: e.target.value })}
              className="input-field text-sm py-2"
            >
              {Object.entries(modelBrands).map(([key, brand]) => (
                <option key={key} value={key}>{brand.displayName}</option>
              ))}
            </select>
          </div>

          {/* Usage Bar (hidden in BYOK mode) */}
          {settings.billingMode === 'platform' && (
            <div className="card p-3">
              <div className="text-xs font-medium mb-2">Balance</div>
              <div className="text-lg font-bold text-claude-accent">
                ₱{billing.walletBalance.toFixed(2)}
              </div>
              <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    billing.color === 'green' ? 'usage-bar-green' :
                    billing.color === 'orange' ? 'usage-bar-orange' :
                    'usage-bar-red'
                  }`}
                  style={{ width: `${billing.percentage}%` }}
                />
              </div>
              <p className="text-[10px] text-claude-text-secondary-light dark:text-claude-text-secondary-dark mt-1">
                {billing.percentage.toFixed(1)}% remaining
              </p>
            </div>
          )}

          {/* Export Chat Logs */}
          <button
            onClick={() => window.__opus8ExportChat?.(messages)}
            className="btn-secondary text-xs w-full py-2"
          >
            📥 Export Chat (.md)
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowSettings(true)}
            className="btn-secondary text-xs w-full py-2"
          >
            ⚙ Settings
          </button>
        </div>
      }
      header={
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ClaudeLogo size={20} />
            <span className="font-semibold text-sm">{currentModel.displayName}</span>
            {isStreaming && <span className="streaming-cursor text-xs" />}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSettings({
                ...settings,
                theme: settings.theme === 'light' ? 'dark' : 'light',
              })}
              className="text-xs text-claude-accent hover:underline"
            >
              {settings.theme === 'light' ? '🌙 Dark' : '☀️ Light'}
            </button>
          </div>
        </div>
      }
    >
      {/* Settings Modal */}
      {/* Center: Chat Workspace + Preview Pane */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Pane: AI Chat Workspace */}
        <div className="flex-1 flex flex-col border-r border-claude-border-light dark:border-claude-border-dark">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-sm">
                  <ClaudeLogo size={48} />
                  <h2 className="text-lg font-semibold mt-4 mb-2">Claude Opus 8</h2>
                  <p className="text-sm text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
                    Start a conversation. Ask me to write code, explain concepts, or help debug your project.
                  </p>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`message-row flex ${msg.role === 'user' ? 'user-message-row' : 'assistant-message-row'}`}
                >
                  <div className={`rounded-xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'user-message'
                      : 'assistant-message'
                  }`}>
                    {msg.role !== 'user' && (
                      <div className="assistant-meta">
                        <span className="assistant-avatar">AI</span>
                        <span>{msg.model ?? currentModel.displayName}</span>
                        <span>Reply</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {msg.content}
                      {isStreaming && msg.id === messages[messages.length - 1]?.id && (
                        <span className="streaming-cursor" />
                      )}
                    </p>
                    {msg.thinking && msg.thinking.length > 0 && (
                      <details className="tool-code-details" open>
                        <summary>
                          Agentic execution ({msg.thinking.length} steps)
                        </summary>
                        <pre>
                          {msg.thinking.map((block) => (
                            `[${block.type}] ${block.content}`
                          )).join('\n\n')}
                        </pre>
                      </details>
                    )}
                  </div>
                </div>
              ))
            )}
            {isStreaming && messages.length === 0 && (
              <div className="streaming-cursor text-claude-text-secondary-light dark:text-claude-text-secondary-dark">
                Thinking...
              </div>
            )}
          </div>

          {/* Chat Input */}
          <div className="p-4 border-t border-claude-border-light dark:border-claude-border-dark">
            <div className="flex gap-2">
              <textarea
                className="input-field resize-none text-sm"
                rows={2}
                placeholder={`Ask ${currentModel.displayName} to code...`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    // Send message logic would go here
                  }
                }}
              />
              <button className="btn-primary px-4 self-end" disabled={isStreaming}>
                {isStreaming ? '•••' : 'Send'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Pane: Live Preview */}
        <div className="flex-1 flex flex-col">
          <div className="h-8 border-b border-claude-border-light dark:border-claude-border-dark flex items-center px-3 gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs font-medium">Preview</span>
            <span className="text-[10px] text-claude-text-secondary-light dark:text-claude-text-secondary-dark truncate">
              {previewUrl}
            </span>
          </div>
          <iframe
            src={previewUrl}
            className="flex-1 border-0 bg-white"
            title="Live Preview"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
          />
        </div>
      </div>

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={(s) => { setSettings(s); setShowSettings(false); }}
          onClose={() => setShowSettings(false)}
        />
      )}
    </AppShell>
  );
}

// Inline Claude abstract logo
function ClaudeLogo({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#111111" />
      <path d="M16 6C10.477 6 6 10.477 6 16s4.477 10 10 10 10-4.477 10-10S21.523 6 16 6z"
        stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="13" cy="14" r="1.5" fill="white"/>
      <circle cx="19" cy="14" r="1.5" fill="white"/>
      <path d="M11 20c2 2.5 6 2.5 8 0" stroke="white" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

// Inline Settings Panel
function SettingsPanel({
  settings,
  onSave,
  onClose,
}: {
  settings: AppSettings;
  onSave: (s: AppSettings) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState<AppSettings>({ ...settings });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="card max-w-md w-full mx-4 animate-slide-up">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">Settings</h2>
          <button onClick={onClose} className="text-claude-text-secondary-light dark:text-claude-text-secondary-dark">✕</button>
        </div>

        {/* Billing Mode */}
        <div className="space-y-3 mb-4">
          <label className="flex items-center gap-3 p-3 rounded border border-claude-border-light dark:border-claude-border-dark cursor-pointer">
            <input type="radio" checked={draft.billingMode === 'platform'}
              onChange={() => setDraft({ ...draft, billingMode: 'platform' })}
              className="accent-claude-accent" />
            <div>
              <div className="text-sm font-medium">Use Platform Balance (PHP)</div>
              <div className="text-xs text-claude-text-secondary-light dark:text-claude-text-secondary-dark">Pay per token with GCash top-ups</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-3 rounded border border-claude-border-light dark:border-claude-border-dark cursor-pointer">
            <input type="radio" checked={draft.billingMode === 'byok'}
              onChange={() => setDraft({ ...draft, billingMode: 'byok' })}
              className="accent-claude-accent" />
            <div>
              <div className="text-sm font-medium">Bring Your Own Key (BYOK)</div>
              <div className="text-xs text-claude-text-secondary-light dark:text-claude-text-secondary-dark">Use your own API key — free of charge</div>
            </div>
          </label>
        </div>

        {draft.billingMode === 'platform' ? (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1">Platform API Key</label>
            <input type="password" value={draft.platformApiKey}
              onChange={(e) => setDraft({ ...draft, platformApiKey: e.target.value })}
              className="input-field text-sm font-mono" placeholder="sk_opus8_..." />
          </div>
        ) : (
          <div className="mb-4">
            <label className="block text-xs font-medium mb-1">Your Developer API Key</label>
            <input type="password" value={draft.byokApiKey}
              onChange={(e) => setDraft({ ...draft, byokApiKey: e.target.value })}
              className="input-field text-sm font-mono" placeholder="Your personal key..." />
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => onSave(draft)} className="btn-primary flex-1 text-sm">Save</button>
          <button onClick={onClose} className="btn-secondary flex-1 text-sm">Cancel</button>
        </div>
      </div>
    </div>
  );
}
