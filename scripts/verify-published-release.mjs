import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const repository = 'B-Divyesh/sf-local-data-workbench';
const site = 'https://local-data-workbench.sociobot.in';
const { version } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const tag = `v${version}`;
const headers = { Accept: 'application/vnd.github+json', 'User-Agent': 'local-data-workbench-release-verifier' };
if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

async function checkedFetch(url) {
  const response = await fetch(url, { headers, redirect: 'follow' });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);
  return response;
}

const release = await (await checkedFetch(`https://api.github.com/repos/${repository}/releases/latest`)).json();
if (release.tag_name !== tag) throw new Error(`Latest release is ${release.tag_name}; expected ${tag}`);
if (!new RegExp(`^Source commit: ${commit}$`, 'm').test(release.body ?? '')) throw new Error('Release notes do not identify this checkout.');

const byName = new Map(release.assets.map((asset) => [asset.name, asset]));
const manifestAsset = byName.get('latest.json');
const sumsAsset = byName.get('SHA256SUMS');
if (!manifestAsset || !sumsAsset) throw new Error('latest.json or SHA256SUMS is missing.');
const manifest = await (await checkedFetch(manifestAsset.browser_download_url)).json();
const sumsText = await (await checkedFetch(sumsAsset.browser_download_url)).text();
const sums = new Map(sumsText.trim().split('\n').filter(Boolean).map((line) => {
  const match = line.match(/^([0-9a-f]{64})\s+(.+)$/);
  if (!match) throw new Error(`Malformed SHA256SUMS line: ${line}`);
  return [match[2].replace(/^\*?\.\//, ''), match[1]];
}));

if (manifest.version !== tag || manifest.commit !== commit) throw new Error('latest.json does not identify this checkout.');
for (const platform of ['linux', 'mac-arm64', 'mac-x64', 'windows']) {
  const entry = manifest.platforms?.[platform];
  const asset = entry && byName.get(entry.name);
  if (!entry || !asset) throw new Error(`Missing ${platform} package.`);
  if (entry.sha256 !== sums.get(entry.name)) throw new Error(`${platform} differs between latest.json and SHA256SUMS.`);
  if (asset.digest !== `sha256:${entry.sha256}`) throw new Error(`${platform} differs from GitHub's asset digest.`);
  const url = new URL(entry.url);
  if (url.hostname !== 'github.com' || !url.pathname.includes(`/releases/download/${tag}/`) || decodeURIComponent(url.pathname.split('/').at(-1)) !== entry.name) {
    throw new Error(`${platform} URL is not pinned to ${tag}.`);
  }
}

const linux = manifest.platforms.linux;
const linuxBytes = new Uint8Array(await (await checkedFetch(linux.url)).arrayBuffer());
const linuxHash = createHash('sha256').update(linuxBytes).digest('hex');
if (linuxHash !== linux.sha256) throw new Error('Downloaded Linux package failed its published SHA-256.');

const home = await (await checkedFetch(`${site}/`)).text();
const scripts = [...home.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) => new URL(match[1], site).href);
const bundles = await Promise.all(scripts.map(async (url) => (await checkedFetch(url)).text()));
if (!bundles.some((bundle) => bundle.includes(commit) && bundle.includes(version))) throw new Error('Live site does not identify this checkout.');
for (const installer of ['install.sh', 'install.ps1']) {
  const source = await (await checkedFetch(`${site}/${installer}`)).text();
  if (!source.includes(commit) || !source.includes(tag) || source.includes('/releases/latest/download') || source.includes('__LDW_')) {
    throw new Error(`Live ${installer} is not pinned to this release.`);
  }
}

console.log(`Verified ${tag} at ${commit}: ${release.assets.length} assets; Linux SHA-256 ${linuxHash}; live site and installers match.`);
