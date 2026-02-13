import { spawn } from 'child_process';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import db from '../src/db.js';
import { dirname } from 'path';

const knownHostsPath = 'data/known_hosts';

if (!existsSync('data')) {
  mkdirSync('data', { recursive: true });
}

const workers = db.prepare('SELECT hostname, port FROM workers WHERE enabled = 1').all();

async function getSSHKey(hostname, port) {
  return new Promise((resolve) => {
    const keyscan = spawn('ssh-keyscan', ['-p', port.toString(), hostname], {
      stdio: 'pipe',
      shell: false,
    });

    let output = '';
    keyscan.stdout.on('data', (data) => {
      output += data.toString();
    });

    keyscan.on('close', () => {
      resolve(output);
    });

    keyscan.on('error', () => {
      console.warn(`⚠ Failed to scan ${hostname}:${port}`);
      resolve('');
    });
  });
}

async function generateKnownHosts() {
  let knownHosts = '';

  for (const worker of workers) {
    console.log(`Scanning ${worker.hostname}:${worker.port}...`);
    const key = await getSSHKey(worker.hostname, worker.port);
    if (key) {
      knownHosts += key;
    }
  }

  writeFileSync(knownHostsPath, knownHosts);
  console.log(`✓ Generated ${knownHostsPath}`);
}

generateKnownHosts().catch(console.error);
