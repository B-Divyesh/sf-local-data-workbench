import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { assertPublishedSite, assertReleaseContract } from './release-contract.mjs';

// @claim:release-candidate-provenance

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
const byName = new Map(release.assets.map((asset) => [asset.name, asset]));
const manifestAsset = byName.get('latest.json');
const sumsAsset = byName.get('SHA256SUMS');
if (!manifestAsset || !sumsAsset) throw new Error('latest.json or SHA256SUMS is missing.');
const [manifest, sumsText, taggedCommit] = await Promise.all([
  checkedFetch(manifestAsset.browser_download_url).then((response) => response.json()),
  checkedFetch(sumsAsset.browser_download_url).then((response) => response.text()),
  checkedFetch(`https://api.github.com/repos/${repository}/commits/${encodeURIComponent(tag)}`).then((response) => response.json())
]);
assertReleaseContract({ release, manifest, sumsText, taggedCommit, expectedTag: tag, expectedCommit: commit });

const linux = manifest.platforms.linux;
const linuxBytes = new Uint8Array(await (await checkedFetch(linux.url)).arrayBuffer());
const linuxHash = createHash('sha256').update(linuxBytes).digest('hex');
if (linuxHash !== linux.sha256) throw new Error('Downloaded Linux package failed its published SHA-256.');

const home = await (await checkedFetch(`${site}/`)).text();
if (!home.includes('data-build-id')) throw new Error('Live site footer has no build identity target.');
const scripts = [...home.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((match) => new URL(match[1], site).href);
const bundles = await Promise.all(scripts.map(async (url) => (await checkedFetch(url)).text()));
const installers = await Promise.all(['install.sh', 'install.ps1'].map((name) => checkedFetch(`${site}/${name}`).then((response) => response.text())));
assertPublishedSite({ bundles, installers, expectedCommit: commit, expectedTag: tag, expectedVersion: version });

console.log(`Verified ${tag} at ${commit}: ${release.assets.length} assets; Linux SHA-256 ${linuxHash}; live site and installers match.`);
