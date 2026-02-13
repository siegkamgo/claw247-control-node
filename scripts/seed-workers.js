import db from '../src/db.js';

const workers = [
  { hostname: '195.201.138.109', user: 'root', port: 22, enabled: 1, tags: 'hetzner,openclaw,worker' },
  { hostname: '46.225.108.205', user: 'root', port: 22, enabled: 1, tags: 'hetzner,openclaw,worker' },
];

const stmt = db.prepare(
  'INSERT OR IGNORE INTO workers (hostname, user, port, enabled, tags) VALUES (?, ?, ?, ?, ?)'
);

workers.forEach((w) => {
  const result = stmt.run(w.hostname, w.user, w.port, w.enabled, w.tags);
  if (result.changes > 0) {
    console.log(`✓ Seeded worker: ${w.hostname}`);
  } else {
    console.log(`- Worker already exists: ${w.hostname}`);
  }
});

console.log('Seed complete!');
