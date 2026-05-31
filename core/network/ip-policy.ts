/** Política de endereços para fetch remoto (SSRF) e rede local. */

export function isPrivateIpv4(address: string): boolean {
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function ipv4ToInt(ip: string): number | null {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return (
    (((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0) >>> 0
  );
}

function ipv4InCidr(ip: string, base: string, prefix: number): boolean {
  const value = ipv4ToInt(ip);
  const baseValue = ipv4ToInt(base);
  if (value === null || baseValue === null) return false;
  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
  return (value & mask) === (baseValue & mask);
}

function decodeIpv4LiteralHost(host: string): string | null {
  const trimmed = host.trim();
  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    if (!Number.isFinite(n) || n < 0 || n > 0xffff_ffff) return null;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }
  if (/^0x[0-9a-f]+$/i.test(trimmed)) {
    const n = Number.parseInt(trimmed.slice(2), 16);
    if (!Number.isFinite(n) || n < 0 || n > 0xffff_ffff) return null;
    return [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.');
  }
  return null;
}

function expandIpv6(address: string): string | null {
  const lower = address.toLowerCase();
  if (!lower.includes('::')) {
    const parts = lower.split(':');
    if (parts.length !== 8 || parts.some((p) => !/^[0-9a-f]{1,4}$/.test(p))) return null;
    return parts.map((p) => p.padStart(4, '0')).join(':');
  }
  const [head, tail] = lower.split('::');
  const left = head ? head.split(':').filter(Boolean) : [];
  const right = tail ? tail.split(':').filter(Boolean) : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0) return null;
  const mid = Array.from({ length: missing }, () => '0000');
  const parts = [...left, ...mid, ...right];
  if (parts.length !== 8) return null;
  return parts.map((p) => p.padStart(4, '0')).join(':');
}

function ipv6StartsWith(expanded: string, prefix: string): boolean {
  return expanded.startsWith(prefix);
}

export function isBlockedIpv4(ip: string): boolean {
  if (isPrivateIpv4(ip)) return true;
  if (ipv4InCidr(ip, '127.0.0.0', 8)) return true;
  if (ipv4InCidr(ip, '169.254.0.0', 16)) return true;
  if (ipv4InCidr(ip, '100.64.0.0', 10)) return true;
  if (ip === '169.254.169.254') return true;
  if (ipv4InCidr(ip, '0.0.0.0', 8)) return true;
  if (ipv4InCidr(ip, '192.0.0.0', 24)) return true;
  if (ipv4InCidr(ip, '198.18.0.0', 15)) return true;
  if (ipv4InCidr(ip, '224.0.0.0', 4)) return true;
  if (ipv4InCidr(ip, '240.0.0.0', 4)) return true;
  return false;
}

export function isBlockedIpv6(ip: string): boolean {
  const expanded = expandIpv6(ip.replace(/^\[|\]$/g, ''));
  if (!expanded) return true;
  if (expanded === '0000:0000:0000:0000:0000:0000:0000:0001') return true;
  if (ipv6StartsWith(expanded, 'fe80:')) return true;
  if (ipv6StartsWith(expanded, 'fc') || ipv6StartsWith(expanded, 'fd')) return true;
  if (ipv6StartsWith(expanded, 'ff')) return true;
  if (expanded === 'fd00:0000:0000:0000:0000:0000:0000:0254') return true;
  if (expanded === '0000:0000:0000:0000:0000:0000:0000:0000') return true;
  if (ipv6StartsWith(expanded, '0100:')) return true;
  if (ipv6StartsWith(expanded, '2001:0db8:')) return true;

  const v4Mapped = expanded.match(/^0000:0000:0000:0000:0000:ffff:([0-9a-f]{4}):([0-9a-f]{4})$/);
  if (v4Mapped) {
    const hi = Number.parseInt(v4Mapped[1]!, 16);
    const lo = Number.parseInt(v4Mapped[2]!, 16);
    const ipv4 = `${(hi >> 8) & 255}.${hi & 255}.${(lo >> 8) & 255}.${lo & 255}`;
    return isBlockedIpv4(ipv4);
  }
  return false;
}

export function isBlockedIp(address: string): boolean {
  if (address.includes(':')) return isBlockedIpv6(address);
  return isBlockedIpv4(address);
}

export function assertSafeResolvedAddresses(ips: string[]): void {
  for (const ip of ips) {
    if (isBlockedIp(ip)) {
      throw new Error('ssrf_blocked');
    }
  }
}

export function normalizeHostnameForPolicy(host: string): string {
  const lower = host.toLowerCase().replace(/\.$/, '');
  const decoded = decodeIpv4LiteralHost(lower);
  return decoded ?? lower;
}

export function isDeniedHostname(hostname: string): boolean {
  const h = normalizeHostnameForPolicy(hostname);
  if (
    h === 'localhost' ||
    h === 'localhost.localdomain' ||
    h === 'metadata' ||
    h === 'metadata.google.internal'
  ) {
    return true;
  }
  if (h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) {
    return true;
  }
  return false;
}
