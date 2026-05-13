import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { getDb } from './db/connection.js';
import { seed } from './db/seed.js';
import { getPublicDir } from './utils/paths.js';
import healthRouter from './routes/health.js';
import partsRouter from './routes/parts.js';
import dashboardRouter from './routes/dashboard.js';
import recordsRouter from './routes/records.js';
import materialsRouter from './routes/materials.js';
import tasksRouter from './routes/tasks.js';
import timelineRouter from './routes/timeline.js';
import subjectsRouter from './routes/subjects.js';
import extractRouter from './routes/extract.js';
import calculateRouter from './routes/calculate.js';
import academicBaseScoreRouter from './routes/academicBaseScore.js';
import academicRulesRouter from './routes/academicRules.js';
import exportRouter from './routes/exportRoutes.js';
import { createTemplateRouter } from './routes/templateExport.js';
import settingsRouter from './routes/settings.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.post('/api/setup', async (_req, res) => {
  await seed();
  res.json({ status: 'ok', message: 'Database seeded' });
});

// Existing routes
app.use('/api', healthRouter);
app.use('/api', partsRouter);
app.use('/api', dashboardRouter);
app.use('/api', recordsRouter);
app.use('/api', materialsRouter);
app.use('/api', tasksRouter);
app.use('/api', timelineRouter);

// New zongce routes
app.use('/api', subjectsRouter);
app.use('/api', extractRouter);
app.use('/api', calculateRouter);
app.use('/api', academicBaseScoreRouter);
app.use('/api', academicRulesRouter);
app.use('/api', exportRouter);
app.use('/api/export/template', createTemplateRouter());
app.use('/api', settingsRouter);

// In production, serve the frontend static files
const publicDir = getPublicDir();
app.use(express.static(publicDir));
// SPA fallback: serve index.html for non-API GET requests
app.use((req, res, next) => {
  if (req.method === 'GET' && !req.path.startsWith('/api/')) {
    res.sendFile(path.join(publicDir, 'index.html'));
  } else {
    next();
  }
});

async function start() {
  await getDb();
  await seed();
  app.listen(PORT, () => {
    const mode = (process as any).pkg ? 'pkg' : process.env.NODE_ENV || 'development';
    console.log(`[${mode}] Server running on http://localhost:${PORT}`);
  });
}

start();
