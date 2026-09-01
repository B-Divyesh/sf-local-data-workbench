import './site.css';

const RELEASE_API = 'https://api.github.com/repos/B-Divyesh/sf-local-data-workbench/releases/latest';
const BUILD_ID = import.meta.env.VITE_BUILD_ID ?? 'source checkout';
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.1.3';

interface PlatformAsset { url: string; sha256?: string; name?: string }
interface Manifest { version: string; platforms: Record<string, PlatformAsset> }
interface GithubAsset { name: string; browser_download_url: string; digest?: string }
interface GithubRelease { tag_name: string; target_commitish: string; body?: string; assets: GithubAsset[] }

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
  const macSigned = release.body?.includes('macOS signing: verified') ?? false;
  const windowsSigned = release.body?.includes('Windows signing: verified') ?? false;
  const windows = windowsSigned ? (find((name) => name.endsWith('-setup.exe')) ?? find((name) => name.endsWith('.msi'))) : undefined;
  const arm = macSigned ? find((name) => name.includes('aarch64') && name.endsWith('.dmg')) : undefined;
  const x64 = macSigned ? find((name) => name.endsWith('.dmg') && !name.includes('aarch64')) : undefined;
  if (linux) platforms.linux = linux;
  if (windows) platforms.windows = windows;
  if (arm) platforms['mac-arm64'] = arm;
  if (x64) platforms['mac-x64'] = x64;
  return { version: release.tag_name, platforms };
}

function platformLabel(platform: string): string {
  if (platform === 'windows') return 'Windows';
  if (platform.startsWith('mac')) return 'macOS';
  return 'Linux';
}

function setPlatformLink(link: HTMLAnchorElement, asset: PlatformAsset | undefined): void {
  const unavailable = document.querySelector<HTMLElement>(`[data-platform-unavailable="${link.dataset.platform === 'windows' ? 'windows' : link.dataset.platform?.startsWith('mac') ? 'macos' : 'linux'}"]`);
  if (asset) {
    link.href = asset.url;
    link.hidden = false;
    if (unavailable) unavailable.hidden = true;
  } else {
    link.removeAttribute('href');
    link.hidden = true;
    if (unavailable) unavailable.hidden = false;
  }
}

function setPrimaryUnavailable(primary: HTMLAnchorElement, platform: string): void {
  primary.removeAttribute('href');
  primary.setAttribute('aria-disabled', 'true');
  primary.textContent = platform === 'linux' ? 'Linux build is being published' : `Signed ${platformLabel(platform)} build unavailable`;
}

async function loadRelease(): Promise<void> {
  const primary = document.querySelector<HTMLAnchorElement>('#primary-download');
  const detail = document.querySelector('#download-detail');
  const releaseState = document.querySelector('#release-state');
  const platform = await detectPlatform();
  if (!navigator.onLine) {
    if (detail) detail.textContent = 'You are offline. Open the releases page when you reconnect.';
    if (releaseState) releaseState.textContent = 'Latest release details are unavailable while offline.';
    return;
  }
  try {
    const response = await fetch(RELEASE_API, {
      cache: 'no-cache',
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!response.ok) throw new Error('No release metadata');
    const release = await response.json() as GithubRelease;
    const manifest = releaseManifest(release);
    const preferred = assetFor(manifest, platform);
    if (primary && preferred) {
      primary.href = preferred.url;
      primary.removeAttribute('aria-disabled');
      const label = platformLabel(platform);
      primary.textContent = `Download for ${label}`;
      if (detail) detail.textContent = `${manifest.version} · ${preferred.name ?? 'installer'} · SHA-256 published`;
    } else if (primary) {
      setPrimaryUnavailable(primary, platform);
      if (detail) detail.textContent = `No verified ${platformLabel(platform)} installer is published yet.`;
    }
    document.querySelectorAll<HTMLAnchorElement>('[data-platform]').forEach((link) => {
      const asset = assetFor(manifest, link.dataset.platform ?? '');
      setPlatformLink(link, asset);
    });
    if (releaseState) releaseState.textContent = `${manifest.version} release loaded from ${release.target_commitish}. SHA256SUMS and latest.json are available beside every installer.`;
  } catch {
    if (primary) setPrimaryUnavailable(primary, platform);
    if (detail) detail.textContent = 'Release information is unavailable. Verified installers stay hidden until release details load.';
    if (releaseState) releaseState.textContent = 'Could not read the latest release. No installer link was enabled.';
  }
}

document.querySelectorAll<HTMLElement>('[data-build-id]').forEach((element) => { element.textContent = `${APP_VERSION} · ${BUILD_ID}`; });
void loadRelease();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}
