import dotenv from 'dotenv';

dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  apiKey: process.env.CLAW247_API_KEY,
  apiUrl: process.env.CLAW247_API_URL,
  base44Origin: process.env.BASE44_ORIGIN,
  sshKeyPath: process.env.SSH_KEY_PATH || '/root/.ssh/clawra_pool',
  dbPath: process.env.DB_PATH || 'data/claw247.db',
};
