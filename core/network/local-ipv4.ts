import os from 'node:os';
import { isPrivateIpv4 } from './ip-policy.js';

function isIpv4Family(family: string | number): boolean {
  return family === 'IPv4' || family === 4;
}

function interfacePriority(name: string): number {
  const n = name.toLowerCase();
  if (/^(eth|en|wlan|wlp|wl|wifi|wi-fi)/.test(n)) return 0;
  if (/^(bond|br)/.test(n)) return 1;
  if (/^(docker|veth|virbr|vmnet|lo|tun|tap)/.test(n)) return 9;
  return 5;
}

/** IPv4 local principal (não loopback), preferindo interfaces físicas e RFC1918. */
export function getPrimaryLocalIpv4(
  interfaces: NodeJS.Dict<os.NetworkInterfaceInfo[]> = os.networkInterfaces(),
): string | null {
  const candidates: { address: string; priority: number; private: boolean }[] = [];

  for (const [name, addrs] of Object.entries(interfaces)) {
    if (!addrs) continue;
    for (const addr of addrs) {
      if (!isIpv4Family(addr.family)) continue;
      if (addr.internal || addr.address.startsWith('127.')) continue;
      candidates.push({
        address: addr.address,
        priority: interfacePriority(name),
        private: isPrivateIpv4(addr.address),
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    if (a.private !== b.private) return a.private ? -1 : 1;
    return 0;
  });

  return candidates[0]!.address;
}
