import { seed } from './db/seed.js';

seed().then(() => {
  console.log('Database initialized and seeded.');
});
