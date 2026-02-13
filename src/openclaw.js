import { runSSHAllowlisted } from './ssh.js';

export async function getOpenClawVersion(workerId) {
  return runSSHAllowlisted(workerId, 'openclaw --version');
}

export async function getOpenClawStatus(workerId) {
  return runSSHAllowlisted(workerId, 'sudo systemctl status openclaw');
}

export async function startOpenClaw(workerId) {
  return runSSHAllowlisted(workerId, 'sudo systemctl start openclaw');
}

export async function stopOpenClaw(workerId) {
  return runSSHAllowlisted(workerId, 'sudo systemctl stop openclaw');
}

export async function restartOpenClaw(workerId) {
  return runSSHAllowlisted(workerId, 'sudo systemctl restart openclaw');
}

export async function tailOpenClawLogs(workerId, lines = 50) {
  return runSSHAllowlisted(workerId, `sudo journalctl -u openclaw -n ${lines}`);
}

export async function rotateOpenClawToken(workerId) {
  const tokenCmd = `openssl rand -hex 24`;
  const { output: token } = await runSSHAllowlisted(workerId, tokenCmd);
  const newToken = token.trim();
  await runSSHAllowlisted(workerId, `sudo -u openclaw sh -c "echo ${newToken} > ~/.openclaw/token.txt"`);
  return { ok: true, token: newToken };
}

export async function installOpenClaw(workerId) {
  // Advisory warning - actual install handled by ops team
  return {
    ok: false,
    message: 'OpenClaw installation requires manual approval and tooling. Please contact ops.',
  };
}
