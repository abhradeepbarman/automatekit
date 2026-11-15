import dns from 'dns';
import { BlockList, isIP } from 'net';

const blocked = new BlockList();
for (const [network, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
  ['224.0.0.0', 3],
] as const) {
  blocked.addSubnet(network, prefix, 'ipv4');
}
for (const [network, prefix] of [
  ['::', 127],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
] as const) {
  blocked.addSubnet(network, prefix, 'ipv6');
}

const isPrivate = (address: string) => {
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i)?.[1];
  if (mapped) return blocked.check(mapped, 'ipv4');
  return blocked.check(address, isIP(address) === 6 ? 'ipv6' : 'ipv4');
};

type Address = { address: string; family: 4 | 6 };

export const publicOnlyLookup = (
  hostname: string,
  _options: object,
  callback: (error: Error | null, addresses: Address[]) => void,
) =>
  dns.lookup(hostname, { all: true }, (error, addresses) => {
    if (error) return callback(error, []);
    if (addresses.some(({ address }) => isPrivate(address))) {
      return callback(
        new Error(
          `Requests to private addresses are not allowed (${hostname})`,
        ),
        [],
      );
    }
    callback(
      null,
      addresses.map(({ address, family }) => ({
        address,
        family: family === 6 ? 6 : 4,
      })),
    );
  });

export const assertPublicHost = (hostname: string) => {
  const host = hostname.replace(/^\[|\]$/g, '');
  if (isIP(host) && isPrivate(host)) {
    throw new Error(`Requests to private addresses are not allowed (${host})`);
  }
};
