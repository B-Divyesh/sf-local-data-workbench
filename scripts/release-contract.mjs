/**
 * Validate the immutable identity shared by the GitHub release, its tag,
 * manifest, checksums, and downloadable packages.
 */
export function assertReleaseContract({ release, manifest, sumsText, taggedCommit, expectedTag, expectedCommit }) {
  if (release.tag_name !== expectedTag) {
    throw new Error(`Latest release is ${release.tag_name}; expected ${expectedTag}`);
  }
  if (!new RegExp(`^Source commit: ${expectedCommit}$`, 'm').test(release.body ?? '')) {
    throw new Error('Release notes do not identify this checkout.');
  }
  if (taggedCommit.sha !== expectedCommit) {
    throw new Error('Release tag does not identify this checkout.');
  }
  if (manifest.version !== expectedTag || manifest.commit !== expectedCommit) {
    throw new Error('latest.json does not identify this checkout.');
  }

  const byName = new Map(release.assets.map((asset) => [asset.name, asset]));
  const sums = new Map(sumsText.trim().split('\n').filter(Boolean).map((line) => {
    const match = line.match(/^([0-9a-f]{64})\s+(.+)$/);
    if (!match) throw new Error(`Malformed SHA256SUMS line: ${line}`);
    return [match[2].replace(/^\*?\.\//, ''), match[1]];
  }));

  const packages = release.assets.filter(({ name }) => name !== 'latest.json' && name !== 'SHA256SUMS');
  if (packages.length === 0) throw new Error('No desktop packages were published.');
  for (const asset of packages) {
    const expectedHash = sums.get(asset.name);
    if (!expectedHash || asset.digest !== `sha256:${expectedHash}`) {
      throw new Error(`${asset.name} differs between SHA256SUMS and GitHub's asset digest.`);
    }
  }
  for (const name of sums.keys()) {
    if (!byName.has(name)) throw new Error(`${name} is checksummed but was not published.`);
  }

  for (const platform of ['linux', 'mac-arm64', 'mac-x64', 'windows']) {
    const entry = manifest.platforms?.[platform];
    const asset = entry && byName.get(entry.name);
    if (!entry || !asset) throw new Error(`Missing ${platform} package.`);
    if (entry.sha256 !== sums.get(entry.name)) {
      throw new Error(`${platform} differs between latest.json and SHA256SUMS.`);
    }
    if (asset.digest !== `sha256:${entry.sha256}`) {
      throw new Error(`${platform} differs from GitHub's asset digest.`);
    }
    const url = new URL(entry.url);
    if (url.hostname !== 'github.com' || !url.pathname.includes(`/releases/download/${expectedTag}/`)
      || decodeURIComponent(url.pathname.split('/').at(-1)) !== entry.name) {
      throw new Error(`${platform} URL is not pinned to ${expectedTag}.`);
    }
  }

  return { byName, sums };
}
