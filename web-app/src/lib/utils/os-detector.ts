// ============================================================
// Opus8 — Automatic OS Detection for Desktop Download
// ============================================================

import type { OperatingSystem } from '@shared/types';

/**
 * Detect the user's operating system from User-Agent or navigator.
 */
export function detectOS(userAgent?: string): OperatingSystem {
  const ua = userAgent ?? (typeof navigator !== 'undefined' ? navigator.userAgent : '');

  if (/windows/i.test(ua)) return 'windows';
  if (/macintosh|mac os x/i.test(ua)) return 'macos';
  if (/linux/i.test(ua) && !/android/i.test(ua)) return 'linux';

  // Try navigator.platform as fallback
  if (typeof navigator !== 'undefined') {
    const platform = navigator.platform?.toLowerCase() ?? '';
    if (platform.includes('win')) return 'windows';
    if (platform.includes('mac')) return 'macos';
    if (platform.includes('linux')) return 'linux';
  }

  return 'unknown';
}

/**
 * Get the OS display name.
 */
export function getOSDisplayName(os: OperatingSystem): string {
  switch (os) {
    case 'windows': return 'Windows';
    case 'macos': return 'macOS';
    case 'linux': return 'Linux';
    default: return 'Desktop';
  }
}

/**
 * Get the download button text based on detected OS.
 */
export function getDownloadText(os: OperatingSystem): string {
  switch (os) {
    case 'windows': return 'Download for Windows';
    case 'macos': return 'Download for macOS';
    case 'linux': return 'Download for Linux';
    default: return 'Download Opus8 Desktop';
  }
}

/**
 * Get the download link for the detected OS.
 * Points to GitHub Releases until we have a CDN.
 */
const GITHUB_RELEASES = 'https://github.com/chmoralla-code/opus8-platform/releases';
const GITHUB_LATEST = 'https://github.com/chmoralla-code/opus8-platform/releases/latest';

export function getDownloadLink(os: OperatingSystem): string {
  // Always point to GitHub Releases — the build artifacts will be there
  // once the GitHub Actions pipeline runs (build-desktop.yml)
  return GITHUB_LATEST;
}

/**
 * Check if a desktop build exists. For now always returns false
 * until the CI pipeline has run at least once.
 */
export async function checkDesktopBuildExists(): Promise<boolean> {
  try {
    const res = await fetch('https://api.github.com/repos/chmoralla-code/opus8-platform/releases/latest');
    return res.ok;
  } catch {
    return false;
  }
}
