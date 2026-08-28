const SLUG = 'local-data-workbench';
const LICENSE_KEY = `sb_license:${SLUG}`;
const VERDICT_KEY = `${LICENSE_KEY}:verdict`;
const VERIFY_URL = `https://api.sociobot.in/api/v1/products/${SLUG}/verify`;
const DAY = 86_400_000;

interface Verdict { valid: boolean; checkedAt: number; reason?: string }

export function captureReturnedLicense(): void {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('license');
  if (!token) return;
  localStorage.setItem(LICENSE_KEY, token);
  localStorage.setItem(VERDICT_KEY, JSON.stringify({ valid: true, checkedAt: 0 } satisfies Verdict));
  url.searchParams.delete('license');
  history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
}

export function getLicenseToken(): string { return localStorage.getItem(LICENSE_KEY) ?? ''; }

export function optimisticUnlock(): boolean {
  if (!getLicenseToken()) return false;
  try { return Boolean((JSON.parse(localStorage.getItem(VERDICT_KEY) ?? '{}') as Verdict).valid); }
  catch { return false; }
}

export async function verifyLicense(token = getLicenseToken(), force = false): Promise<Verdict> {
  if (!token) return { valid: false, checkedAt: Date.now(), reason: 'missing' };
  let cached: Verdict | undefined;
  try { cached = JSON.parse(localStorage.getItem(VERDICT_KEY) ?? '') as Verdict; } catch { /* no cache */ }
  if (!force && cached && Date.now() - cached.checkedAt < DAY) return cached;
  try {
    const response = await fetch(`${VERIFY_URL}?license=${encodeURIComponent(token)}`, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Verification returned ${response.status}`);
    const result = await response.json() as { valid: boolean; reason?: string };
    const verdict = { valid: result.valid, reason: result.reason, checkedAt: Date.now() };
    localStorage.setItem(LICENSE_KEY, token);
    localStorage.setItem(VERDICT_KEY, JSON.stringify(verdict));
    return verdict;
  } catch {
    return cached ?? { valid: false, checkedAt: 0, reason: 'offline' };
  }
}

export function storeLicense(token: string): void {
  localStorage.setItem(LICENSE_KEY, token.trim());
  localStorage.removeItem(VERDICT_KEY);
}
