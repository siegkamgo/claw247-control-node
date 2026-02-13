import { existsSync, copyFileSync } from 'fs';
import { dirname } from 'path';

const envExamplePath = '.env.example';
const envPath = '.env';

if (!existsSync(envPath)) {
  if (existsSync(envExamplePath)) {
    copyFileSync(envExamplePath, envPath);
    console.log(`✓ Created ${envPath} from ${envExamplePath}`);
  } else {
    console.error('No .env.example found; please create .env manually');
    process.exit(1);
  }
} else {
  console.log(`✓ ${envPath} already exists`);
}

// Initialize database
import db from '../src/db.js';
console.log('✓ Database initialized');

console.log('Bootstrap complete!');
