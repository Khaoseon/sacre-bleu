import { createServer } from 'node:https';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { networkInterfaces } from 'node:os';
import { pathToFileURL } from 'node:url';

export function options(args) {
  const values = new Map();
  for (let i = 0; i < args.length; i += 2) {
    if (
      !['--host', '--cert', '--key', '--allow'].includes(args[i]) ||
      !args[i + 1] ||
      args[i + 1].startsWith('--')
    )
      throw new Error(
        'Usage : npm run phone:serve -- --host IP_PC --cert certificat.pem --key cle.pem --allow IP_TELEPHONE [--allow IP_SECOND_TELEPHONE]',
      );
    if (args[i] !== '--allow' && values.has(args[i])) throw new Error('Option répétée.');
    values.set(args[i], [...(values.get(args[i]) ?? []), args[i + 1]]);
  }
  const host = values.get('--host')?.[0];
  const cert = values.get('--cert')?.[0];
  const key = values.get('--key')?.[0];
  const allowed = values.get('--allow') ?? [];
  const privateIp = (ip) => {
    if (!ip || !/^\d{1,3}(\.\d{1,3}){3}$/.test(ip)) return false;
    const [a, b, c, d] = ip.split('.').map(Number);
    return (
      [a, b, c, d].every((part) => part <= 255) &&
      (a === 10 || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168))
    );
  };
  if (!privateIp(host) || !cert || !key || !allowed.length || allowed.some((ip) => !privateIp(ip)))
    throw new Error(
      'Indiquez l’IP privée du PC, les deux fichiers TLS et les IP privées autorisées des téléphones.',
    );
  return { host, cert, key, allowed };
}

export function assetPath(root, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(url, 'https://local.invalid').pathname);
  } catch {
    return null;
  }
  if (
    pathname.includes('\\') ||
    pathname.includes('\0') ||
    pathname.split('/').some((part) => part.startsWith('.'))
  )
    return null;
  const target = resolve(root, `.${pathname}`);
  return target === root || target.startsWith(`${root}${sep}`) ? target : null;
}

async function main() {
  const config = options(process.argv.slice(2));
  if (
    !Object.values(networkInterfaces())
      .flat()
      .some((address) => address?.address === config.host && !address.internal)
  )
    throw new Error('Cette IP n’appartient pas à une interface réseau locale.');
  const root = await realpath('dist-cloud');
  await stat(resolve(root, 'index.html'));
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.webmanifest': 'application/manifest+json',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.woff2': 'font/woff2',
  };
  const server = createServer(
    { cert: await readFile(config.cert), key: await readFile(config.key), minVersion: 'TLSv1.2' },
    async (request, response) => {
      response.setHeader('Permissions-Policy', 'camera=(self), microphone=(), geolocation=()');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      response.setHeader('Referrer-Policy', 'no-referrer');
      response.setHeader('Cache-Control', 'no-store');
      if (
        !config.allowed.includes(request.socket.remoteAddress) ||
        request.headers.host !== `${config.host}:4443`
      ) {
        response.writeHead(403).end();
        return;
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        response.writeHead(405).end();
        return;
      }
      const target = assetPath(root, request.url);
      if (!target) {
        response.writeHead(400).end();
        return;
      }
      try {
        let file = target;
        try {
          if (!(await stat(file)).isFile()) file = resolve(root, 'index.html');
        } catch {
          if (extname(file)) throw new Error();
          file = resolve(root, 'index.html');
        }
        const actual = await realpath(file);
        if (!actual.startsWith(`${root}${sep}`)) throw new Error();
        const data = await readFile(actual);
        response.writeHead(200, {
          'Content-Type': types[extname(actual)] ?? 'application/octet-stream',
        });
        response.end(request.method === 'HEAD' ? undefined : data);
      } catch {
        response.writeHead(404).end();
      }
    },
  );
  server.on('error', (error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
  server.listen(4443, config.host, () =>
    console.log(`Recette privée : https://${config.host}:4443/ — Ctrl+C pour arrêter.`),
  );
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href)
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
