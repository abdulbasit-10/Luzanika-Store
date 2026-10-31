import { isIP } from "node:net";

/**
 * Brings an IP into one comparable form for rate limiting:
 * - IPv4-mapped IPv6 (::ffff:1.2.3.4) becomes plain IPv4.
 * - IPv6 is reduced to its /64 network, because one visitor normally owns a
 *   whole /64 and could otherwise rotate through billions of addresses.
 */
export function normalizeIp(ip: string): string | undefined {
  const version = isIP(ip);
  if (version === 4) return ip;
  if (version !== 6) return undefined;

  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(ip);
  if (mapped && isIP(mapped[1]) === 4) return mapped[1];

  let address = ip.toLowerCase();
  const zone = address.indexOf("%");
  if (zone !== -1) address = address.slice(0, zone);

  const [head, tail] = address.split("::");
  const headGroups = head ? head.split(":") : [];
  const tailGroups = tail ? tail.split(":") : [];
  const missing = 8 - headGroups.length - tailGroups.length;
  const groups =
    address.includes("::") && missing > 0
      ? [...headGroups, ...Array<string>(missing).fill("0"), ...tailGroups]
      : headGroups;

  if (groups.length < 4) return undefined;
  return `${groups
    .slice(0, 4)
    .map((group) => group.padStart(4, "0"))
    .join(":")}::/64`;
}

/**
 * The visitor's address as set by our own reverse proxy. Without a trusted
 * proxy the headers are attacker-controlled, so they are ignored and every
 * visitor shares the "unknown" bucket (fine for local development only).
 */
export function getClientIp(headers: Headers, trustProxy: boolean): string {
  if (!trustProxy) return "unknown";

  const realIp = headers.get("x-real-ip")?.trim();
  const forwarded = headers.get("x-forwarded-for")?.split(",");
  // The last entry is the one our proxy appended; earlier ones can be forged.
  const candidate = realIp || forwarded?.[forwarded.length - 1]?.trim();

  return (candidate && normalizeIp(candidate)) || "unknown";
}
