import { type ReactNode } from 'react';

interface Props {
  sidebar: ReactNode;
  header: ReactNode;
  children: ReactNode;
}

/**
 * AppShell — Three-column desktop layout
 *
 * ┌──────────────────────────────────────────────┐
 * │                  HEADER                      │
 * ├────────┬───────────────────────┬─────────────┤
 * │ SIDEBAR│     CHAT WORKSPACE    │  PREVIEW    │
 * │ 240px  │      flex-1           │  flex-1     │
 * │        │    (Left Pane)        │ (Right Pane)│
 * └────────┴───────────────────────┴─────────────┘
 */
export function AppShell({ sidebar, header, children }: Props) {
  return (
    <div className="h-full flex flex-col bg-claude-cream dark:bg-claude-charcoal text-claude-text-primary-light dark:text-claude-text-primary-dark">
      {/* Header Bar */}
      <header className="h-12 border-b border-claude-border-light dark:border-claude-border-dark flex items-center bg-white dark:bg-claude-surface-dark shrink-0">
        {header}
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-60 border-r border-claude-border-light dark:border-claude-border-dark overflow-y-auto shrink-0 bg-white dark:bg-claude-surface-dark">
          {sidebar}
        </aside>

        {/* Center Content */}
        <main className="flex-1 flex overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
