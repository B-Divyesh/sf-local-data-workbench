import './site.css';

const RELEASE_API = 'https://api.github.com/repos/B-Divyesh/sf-local-data-workbench/releases/latest';
const BUILD_ID = import.meta.env.VITE_BUILD_ID ?? 'source checkout';
const APP_VERSION = import.meta.env.VITE_APP_VERSION ?? '0.1.10';

interface PlatformAsset { url: string; sha256: string; name: string }
interface Manifest {
  version: string;
  sourceCommit: string;
  signing: { macos: boolean; windows: boolean };
  platforms: Record<string, PlatformAsset>;
  manifestUrl?: string;
  sumsUrl?: string;
}
interface GithubAsset { name: string; browser_download_url: string; digest?: string }
interface GithubRelease { tag_name: string; body?: string; assets: GithubAsset[] }

async function detectPlatform(): Promise<string> {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('windows')) return 'windows';
  if (ua.includes('mac')) {
    const nav = navigator as Navigator & { userAgentData?: { getHighEntropyValues: (hints: string[]) => Promise<{ architecture?: string }> } };
    const architecture = await nav.userAgentData?.getHighEntropyValues(['architecture']).then((value) => value.architecture).catch(() => undefined);
    return architecture === 'x86' ? 'mac-x64' : 'mac-arm64';
  }
  return 'linux';
}

function sourceCommit(body = ''): string | undefined {
  return body.match(/^Source commit: ([0-9a-f]{40})$/mi)?.[1]?.toLowerCase();
}

function signingStatus(body = '', platform: 'macos' | 'windows'): boolean {
  return new RegExp(`^${platform === 'macos' ? 'macOS' : 'Windows'} signing: verified`, 'mi').test(body);
}

function releaseManifest(release: GithubRelease): Manifest | undefined {
  const releasePath = `/B-Divyesh/sf-local-data-workbench/releases/download/${release.tag_name}/`;
  const find = (predicate: (name: string) => boolean): PlatformAsset | undefined => {
    const asset = release.assets.find(({ name, digest, browser_download_url }) => {
      try {
        const url = new URL(browser_download_url);
        return url.protocol === 'https:' && url.hostname === 'github.com' && url.pathname.startsWith(releasePath)
          && decodeURIComponent(url.pathname.split('/').at(-1) ?? '') === name
          && predicate(name.toLowerCase()) && /^sha256:[0-9a-f]{64}$/i.test(digest ?? '');
      } catch { return false; }
    });
    if (!asset || !asset.digest) return undefined;
    return { name: asset.name, url: asset.browser_download_url, sha256: asset.digest.replace(/^sha256:/i, '') };
  };
  const commit = sourceCommit(release.body);
  const versionMatches = release.tag_name === `v${APP_VERSION}`;
  if (!commit || commit !== BUILD_ID.toLowerCase() || !versionMatches) return undefined;

  const linux = find((name) => name.endsWith('.appimage'));
  const windows = find((name) => name.endsWith('-setup.exe')) ?? find((name) => name.endsWith('.msi'));
  const arm = find((name) => name.endsWith('.dmg') && (name.includes('aarch64') || name.includes('arm64')));
  const x64 = find((name) => name.endsWith('.dmg') && !name.includes('aarch64') && !name.includes('arm64'));
  const manifest = find((name) => name === 'latest.json');
  const sums = find((name) => name === 'sha256sums');
  if (!linux || !windows || !arm || !x64 || !manifest || !sums) return undefined;

  return {
    version: release.tag_name,
    sourceCommit: commit,
    signing: { macos: signingStatus(release.body, 'macos'), windows: signingStatus(release.body, 'windows') },
    platforms: { linux, windows, 'mac-arm64': arm, 'mac-x64': x64 },
    manifestUrl: manifest.url,
    sumsUrl: sums.url
  };
}

function platformLabel(platform: string): string {
  if (platform === 'windows') return 'Windows';
  if (platform.startsWith('mac')) return 'macOS';
  return 'Linux';
}

function isUnsigned(platform: string, signing: Manifest['signing']): boolean {
  return (platform.startsWith('mac') && !signing.macos) || (platform === 'windows' && !signing.windows);
}

function setPlatformLink(link: HTMLAnchorElement, asset: PlatformAsset | undefined, signing: Manifest['signing']): void {
  const platform = link.dataset.platform ?? '';
  const unavailable = document.querySelector<HTMLElement>(`[data-platform-unavailable="${platform === 'windows' ? 'windows' : platform.startsWith('mac') ? 'macos' : 'linux'}"]`);
  if (asset) {
    link.href = asset.url;
    link.hidden = false;
    link.dataset.sha256 = asset.sha256;
    if (isUnsigned(platform, signing)) link.setAttribute('data-unsigned', 'true'); else link.removeAttribute('data-unsigned');
    if (unavailable) unavailable.hidden = true;
  } else {
    link.removeAttribute('href');
    link.hidden = true;
    link.removeAttribute('data-unsigned');
    if (unavailable) unavailable.hidden = false;
  }
}

function setPrimaryUnavailable(primary: HTMLAnchorElement, message: string): void {
  primary.removeAttribute('href');
  primary.setAttribute('aria-disabled', 'true');
  primary.textContent = message;
}

function setSigningText(manifest: Manifest): void {
  const mac = document.querySelector<HTMLElement>('[data-signing-status="macos"]');
  const windows = document.querySelector<HTMLElement>('[data-signing-status="windows"]');
  if (mac) mac.textContent = manifest.signing.macos ? 'Signed and notarized.' : 'Unsigned package — certificate unavailable.';
  if (windows) windows.textContent = manifest.signing.windows ? 'Signature verified.' : 'Unsigned package — certificate unavailable.';
}

function setChecksumLinks(manifest: Manifest): void {
  const links: Array<[string, string | undefined]> = [['#release-manifest', manifest.manifestUrl], ['#release-sums', manifest.sumsUrl]];
  links.forEach(([selector, url]) => {
    const link = document.querySelector<HTMLAnchorElement>(selector);
    if (!link || !url) return;
    link.href = url;
    link.removeAttribute('aria-disabled');
  });
}

function setInstallerCommandAvailable(available: boolean): void {
  const region = document.querySelector<HTMLElement>('[data-installer-command]');
  if (region) region.hidden = !available;
}

async function loadRelease(): Promise<void> {
  const primary = document.querySelector<HTMLAnchorElement>('#primary-download');
  const detail = document.querySelector('#download-detail');
  const releaseState = document.querySelector('#release-state');
  const platform = await detectPlatform();
  if (!navigator.onLine) {
    if (primary) setPrimaryUnavailable(primary, 'Downloads need a connection');
    if (detail) detail.textContent = 'You are offline. Open the release page when you reconnect.';
    if (releaseState) releaseState.textContent = 'Latest release details are unavailable while offline.';
    return;
  }
  try {
    const response = await fetch(RELEASE_API, { cache: 'no-cache', headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error('No release metadata');
    const manifest = releaseManifest(await response.json() as GithubRelease);
    if (!manifest) throw new Error('Release does not match this site build');
    const preferred = manifest.platforms[platform];
    if (primary && preferred) {
      primary.href = preferred.url;
      primary.removeAttribute('aria-disabled');
      primary.textContent = `Download for ${platformLabel(platform)}${isUnsigned(platform, manifest.signing) ? ' (unsigned)' : ''}`;
      if (detail) detail.textContent = `${manifest.version} · ${preferred.name} · SHA-256 published`;
    } else if (primary) {
      setPrimaryUnavailable(primary, `${platformLabel(platform)} build is being published`);
      if (detail) detail.textContent = `No ${platformLabel(platform)} installer is published yet.`;
    }
    document.querySelectorAll<HTMLAnchorElement>('[data-platform]').forEach((link) => setPlatformLink(link, manifest.platforms[link.dataset.platform ?? ''], manifest.signing));
    setSigningText(manifest);
    setChecksumLinks(manifest);
    setInstallerCommandAvailable(Boolean(manifest.platforms.linux));
    if (releaseState) releaseState.textContent = `${manifest.version} matches this page’s source commit. GitHub publishes SHA-256 for every asset.`;
  } catch {
    setInstallerCommandAvailable(false);
    if (primary) setPrimaryUnavailable(primary, 'Downloads are being published');
    if (detail) detail.textContent = 'No release matching this page’s source revision is published yet.';
    if (releaseState) releaseState.textContent = 'Release metadata did not match this page. Installer links stay disabled.';
  }
}

document.querySelectorAll<HTMLElement>('[data-build-id]').forEach((element) => { element.textContent = `${APP_VERSION} · ${BUILD_ID}`; });
void loadRelease();

if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === '127.0.0.1' || location.hostname === 'localhost')) {
  window.addEventListener('load', () => void navigator.serviceWorker.register('/sw.js'));
}
