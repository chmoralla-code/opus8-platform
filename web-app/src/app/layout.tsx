import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeProvider';

export const metadata: Metadata = {
  title: 'Opus8 — AI Coding Platform',
  description: 'A premium AI-powered coding platform with Claude Opus 8 branding. Ship faster with intelligent code generation.',
  icons: { icon: '/favicon.ico' },
  openGraph: {
    title: 'Opus8 — AI Coding Platform',
    description: 'Premium AI-powered coding powered by Claude Opus 8.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-claude-cream text-claude-text-primary-light dark:bg-claude-charcoal dark:text-claude-text-primary-dark transition-colors duration-300">
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
