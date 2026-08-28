import './site.css';

const RELEASE_API = 'https://api.github.com/repos/B-Divyesh/sf-local-data-workbench/releases/latest';

interface PlatformAsset { url: string; sha256?: string; name?: string }
interface Manifest { version: string; platforms: Record<string, PlatformAsset> }
interface GithubAsset { name: string; browser_download_url: string; digest?: string }
interface GithubRelease { tag_name: string; assets: GithubAsset[] }

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

function releaseManifest(release: GithubRelease): Manifest {
  const find = (predicate: (name: string) => boolean): PlatformAsset | undefined => {
    const asset = release.assets.find(({ name }) => predicate(name.toLowerCase()));
    if (!asset) return undefined;
    return {
      name: asset.name,
      url: asset.browser_download_url,
      sha256: asset.digest?.replace(/^sha256:/, ''),
    };
  };
  const platforms: Record<string, PlatformAsset> = {};
  const linux = find((name) => name.endsWith('.appimage'));
  const windows = find((name) => name.endsWith('-setup.exe')) ?? find((name) => name.endsWith('.msi'));
  const arm = find((name) => name.includes('aarch64') && name.endsWith('.dmg'));
  const x64 = find((name) => name.endsWith('.dmg') && !name.includes('aarch64'));
  if (linux) platforms.linux = linux;
  if (windows) platforms.windows = windows;
  if (arm) platforms['mac-arm64'] = arm;
  if (x64) platforms['mac-x64'] = x64;
  return { version: release.tag_name, platforms };
}

async function loadRelease(): Promise<void> {
  const primary = document.querySelector<HTMLAnchorElement>('#primary-download');
  const detail = document.querySelector('#download-detail');
  const releaseState = document.querySelector('#release-state');
  const platform = await detectPlatform();
  try {
    const response = await fetch(RELEASE_API, {
      cache: 'no-cache',
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw new Error('No release metadata');
    const manifest = releaseManifest(await response.json() as GithubRelease);
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
    if (releaseState) releaseState.textContent = `${manifest.version} release loaded. SHA256SUMS and latest.json are available beside every installer.`;
  } catch {
    if (detail) detail.textContent = 'Release information unavailable offline. Open the releases page to choose an installer.';
    if (releaseState) releaseState.textContent = 'Could not read the latest release. The release-page links still work.';
  }
}

void loadRelease();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}
