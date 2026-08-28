import './site.css';

const RELEASE_BASE = 'https://github.com/B-Divyesh/sf-local-data-workbench/releases/latest/download';

interface PlatformAsset { url: string; sha256?: string; name?: string }
interface Manifest { version: string; platforms: Record<string, PlatformAsset> }

async function detectPlatform(): Promise<string> {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) {
    const nav = navigator as Navigator & { userAgentData?: { getHighEntropyValues: (hints: string[]) => Promise<{ architecture?: string }> } };
    const architecture = await nav.userAgentData?.getHighEntropyValues(['architecture']).then((value) => value.architecture).catch(() => undefined);
    return architecture === 'x86' ? 'mac-x64' : 'mac-arm64';
  }
  if (ua.includes('linux')) return 'linux';
  return 'linux';
}

function assetFor(manifest: Manifest, key: string): PlatformAsset | undefined {
  return manifest.platforms[key] ?? (key.startsWith('mac') ? manifest.platforms.mac : undefined);
}

async function loadRelease(): Promise<void> {
  const primary = document.querySelector<HTMLAnchorElement>('#primary-download');
  const detail = document.querySelector('#download-detail');
  const releaseState = document.querySelector('#release-state');
  const platform = await detectPlatform();
  if (!location.hostname.endsWith('.sociobot.in')) {
    if (detail) detail.textContent = 'Latest installers and checksums are published on the GitHub releases page.';
    if (releaseState) releaseState.textContent = 'Local preview: release manifest lookup is disabled.';
    return;
  }
  try {
    const response = await fetch(`${RELEASE_BASE}/latest.json`, { cache: 'no-cache' });
    if (!response.ok) throw new Error('No release manifest');
    const manifest = await response.json() as Manifest;
    const preferred = assetFor(manifest, platform);
    if (primary && preferred) {
      primary.href = preferred.url;
      const label = platform === 'windows' ? 'Windows' : platform.startsWith('mac') ? 'macOS' : 'Linux';
      primary.textContent = `Download for ${label}`;
      if (detail) detail.textContent = `${manifest.version} · ${preferred.name ?? 'installer'} · SHA-256 published`;
    }
    document.querySelectorAll<HTMLAnchorElement>('[data-platform]').forEach((link) => {
      const asset = assetFor(manifest, link.dataset.platform ?? '');
      if (asset) link.href = asset.url;
    });
    if (releaseState) releaseState.textContent = `${manifest.version} release manifest loaded. SHA256SUMS is available beside every installer.`;
  } catch {
    if (detail) detail.textContent = 'Release manifest unavailable offline. Open the releases page to choose an installer.';
    if (releaseState) releaseState.textContent = 'Could not read the release manifest. The release-page links still work.';
  }
}

void loadRelease();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}
