import { Router } from 'express';
import { z } from 'zod';
import db from '../db.js';
import { runSSHAllowlisted } from '../ssh.js';
import {
  getOpenClawStatus,
  tailOpenClawLogs,
  restartOpenClaw,
  rotateOpenClawToken,
} from '../openclaw.js';

const router = Router();

const AgentSchema = z.object({
  workerId: z.number().int().positive(),
  instanceId: z.string().min(1),
});

router.get('/', (req, res) => {
  try {
    const agents = db.prepare('SELECT * FROM agents').all();
    res.json(agents);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const data = AgentSchema.parse(req.body);
    const stmt = db.prepare(
      'INSERT INTO agents (worker_id, instance_id, status) VALUES (?, ?, ?)'
    );
    const result = stmt.run(data.workerId, data.instanceId, 'active');
    res.json({ id: result.lastInsertRowid, ...data, status: 'active' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/:agentId/action', async (req, res) => {
  try {
    const agentId = parseInt(req.params.agentId, 10);
    const { action } = req.body;

    const agent = db.prepare('SELECT * FROM agents WHERE id = ?').get(agentId);
    if (!agent) {
      return res.status(404).json({ error: 'Agent not found' });
    }

    let result;
    switch (action) {
      case 'status':
        result = await getOpenClawStatus(agent.worker_id);
        break;
      case 'logs':
        result = await tailOpenClawLogs(agent.worker_id);
        break;
      case 'restart':
        result = await restartOpenClaw(agent.worker_id);
        break;
      case 'rotate-token':
        result = await rotateOpenClawToken(agent.worker_id);
        break;
      default:
        return res.status(400).json({ error: 'Unknown action' });
    }

    res.json({ ok: true, action, result });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

export default router;
