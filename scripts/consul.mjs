// Starts a REAL Consul server in dev mode, from inside this project.
//  - first run: downloads the official Consul program into ./consul/
//  - later runs: starts it right away
// Equivalent to typing:  consul agent -dev
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync, chmodSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const VERSION = '1.21.5';
const BASE = process.env.CONSUL_DOWNLOAD_BASE || 'https://releases.hashicorp.com/consul';
const root = fileURLToPath(new URL('../', import.meta.url));
const dir = path.join(root, 'consul');
const localExe = path.join(dir, process.platform === 'win32' ? 'consul.exe' : 'consul');

async function findConsul() {
  if (existsSync(localExe)) return localExe;                       // already downloaded into the project

  const installed = spawnSync('consul', ['version'], { stdio: 'ignore' });
  if (!installed.error && installed.status === 0) return 'consul';  // already installed on this computer

  const os = { win32: 'windows', darwin: 'darwin', linux: 'linux' }[process.platform];
  const arch = { x64: 'amd64', arm64: 'arm64', ia32: '386' }[process.arch];
  if (!os || !arch) throw new Error(`No Consul download for ${process.platform}/${process.arch}. Install it from https://developer.hashicorp.com/consul/install`);

  const url = `${BASE}/${VERSION}/consul_${VERSION}_${os}_${arch}.zip`;
  console.log(`Consul not found. Downloading Consul ${VERSION} (one time only)...\n  ${url}`);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Download failed: HTTP ${response.status}`);
  mkdirSync(dir, { recursive: true });
  const zip = path.join(dir, 'consul.zip');
  writeFileSync(zip, Buffer.from(await response.arrayBuffer()));

  const extract = process.platform === 'win32'
    ? spawnSync('powershell', ['-NoProfile', '-Command', `Expand-Archive -LiteralPath '${zip.replace(/'/g, "''")}' -DestinationPath '${dir.replace(/'/g, "''")}' -Force`], { stdio: 'inherit' })
    : spawnSync('unzip', ['-o', zip, '-d', dir], { stdio: 'inherit' });
  if (extract.error || extract.status !== 0) throw new Error('Could not unzip the download. On Linux, install "unzip"; or install Consul yourself from https://developer.hashicorp.com/consul/install');
  rmSync(zip);
  if (process.platform !== 'win32') chmodSync(localExe, 0o755);
  console.log('Consul downloaded into ./consul/');
  return localExe;
}

try {
  const consul = await findConsul();
  console.log('Starting Consul. Web UI: http://localhost:8500/ui   (Ctrl+C to stop)\n');
  const child = spawn(consul, ['agent', '-dev'], { stdio: 'inherit' });
  process.on('SIGINT', () => {});                                   // Ctrl+C reaches Consul directly; we just wait for it
  process.on('SIGTERM', () => child.kill('SIGTERM'));
  child.on('error', error => { console.error(`Could not start Consul: ${error.message}`); process.exit(1); });
  child.on('exit', code => process.exit(code ?? 0));
} catch (error) {
  console.error(`\n${error.message}`);
  process.exit(1);
}
