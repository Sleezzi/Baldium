import ipaddr from "ipaddr.js";
import { timingSafeEqual } from "node:crypto";

const CloudflareRanges = [
	// https://www.cloudflare.com/ips-v4
	"173.245.48.0/20",
	"103.21.244.0/22",
	"103.22.200.0/22",
	"103.31.4.0/22",
	"141.101.64.0/18",
	"108.162.192.0/18",
	"190.93.240.0/20",
	"188.114.96.0/20",
	"197.234.240.0/22",
	"198.41.128.0/17",
	"162.158.0.0/15",
	"104.16.0.0/13",
	"104.24.0.0/14",
	"172.64.0.0/13",
	"131.0.72.0/22",

	// https://www.cloudflare.com/ips-v6
	"2400:cb00::/32",
	"2606:4700::/32",
	"2803:f800::/32",
	"2405:b500::/32",
	"2405:8100::/32",
	"2a06:98c0::/29",
	"2c0f:f248::/32",
].map((cidr) => ipaddr.parseCIDR(cidr));

export function isCloudflareIp(ip: string): boolean {
	try {
		const addr = ipaddr.process(ip); // process() normalize IPv4-mapped-IPv6 (::ffff:x.x.x.x)
		return CloudflareRanges.some(([range, bits]) => {
			if (range.kind() !== addr.kind()) return false;
			return addr.match([range, bits]);
		});
	} catch {
		return false;
	}
}

export function isCloudflare(key: string): boolean {
	if (process.env.CLOUDFLARE_ORIGIN_VERIFY!.length !== key.length) return false;
	return timingSafeEqual(Buffer.from(key), Buffer.from(process.env.CLOUDFLARE_ORIGIN_VERIFY!));
}