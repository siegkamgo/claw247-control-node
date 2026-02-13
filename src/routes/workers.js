import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { runSSHAllowlisted } from '../ssh.js';
import {
  getOpenClawStatus,
  startOpenClaw,
  stopOpenClaw,
  restartOpenClaw,
  tailOpenClawLogs,
  rotateOpenClawToken,
} from '../openclaw.js';

const router = Router();

const WorkerSchema = z.object({
  hostname: z.string().min(1),
  user: z.string().optional().default('root'),
  port: z.number().optional().default(22),
  enabled: z.boolean().optional().default(true),
  tags: z.string().optional(),
});

router.get('/', (req, res) => {
  try {
    const workers = db.prepare('SELECT * FROM workers').all();
    res.json(workers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const data = WorkerSchema.parse(req.body);
    const stmt = db.prepare(
      'INSERT INTO workers (hostname, user, port, enabled, tags) VALUES (?, ?, ?, ?, ?)'
    );
    const result = stmt.run(data.hostname, data.user, data.port, data.enabled ? 1 : 0, data.tags || null);
    res.json({ id: result.lastInsertRowid, ...data });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:workerId/test-ssh', async (req, res) => {
  try {
    const workerId = parseInt(req.params.workerId, 10);
    const result = await runSSHAllowlisted(workerId, 'whoami');
    res.json({ ok: true, message: 'SSH connection successful', output: result.output });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

router.get('/:workerId/openclaw/status', async (req, res) => {
  try {
    const workerId = parseInt(req.params.workerId, 10);
    const result = await getOpenClawStatus(workerId);
    res.json({ ok: true, output: result.output });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

router.post('/:workerId/openclaw/restart', async (req, res) => {
  try {
    const workerId = parseInt(req.params.workerId, 10);
    await restartOpenClaw(workerId);
    res.json({ ok: true, message: 'OpenClaw restarted' });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

router.post('/:workerId/openclaw/rotate-token', async (req, res) => {
  try {
    const workerId = parseInt(req.params.workerId, 10);
    const result = await rotateOpenClawToken(workerId);
    res.json(result);
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

export default router;
