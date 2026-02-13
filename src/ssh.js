import { spawn } from 'child_process';
import { existsSync } from 'fs';

const allowlist = new Map([
  [1, { host: '195.201.138.109', user: 'root', port: 22 }],
  [2, { host: '46.225.108.205', user: 'root', port: 22 }],
]);

export function getWorkerSSHConfig(workerId) {
  return allowlist.get(workerId);
}

export function buildSSHArgs(workerId, command = '') {
  const config = allowlist.get(workerId);
  if (!config) {
    throw new Error(`Worker ${workerId} not in allowlist`);
  }

  const keyPath = process.env.SSH_KEY_PATH || '/root/.ssh/clawra_pool';
  const args = [
    '-o', 'StrictHostKeyChecking=yes',
    '-o', `UserKnownHostsFile=${process.cwd()}/data/known_hosts`,
    '-i', keyPath,
    '-p', config.port.toString(),
  ];

  if (command) {
    args.push(`${config.user}@${config.host}`, command);
  } else {
    args.push(`${config.user}@${config.host}`);
  }

  return args;
}

export function runSSHAllowlisted(workerId, command) {
  return new Promise((resolve, reject) => {
    const config = allowlist.get(workerId);
    if (!config) {
      reject(new Error(`Worker ${workerId} not in allowlist`));
      return;
    }

    const args = buildSSHArgs(workerId, command);
    const ssh = spawn('ssh', args, { stdio: 'pipe', shell: false });

    let stdout = '';
    let stderr = '';

    ssh.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    ssh.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    ssh.on('close', (code) => {
      if (code === 0) {
        resolve({ ok: true, output: stdout.trim() });
      } else {
        reject(new Error(`SSH failed with code ${code}: ${stderr}`));
      }
    });

    ssh.on('error', (err) => {
      reject(err);
    });
  });
}
