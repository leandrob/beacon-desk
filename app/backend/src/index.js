import express from 'express';
import cors from 'cors';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { initSchema } from './db/index.js';
import { migrate } from './db/migrate.js';
import { seed } from './db/seed.js';
import { initWebSocket } from './websocket/hub.js';
import { requireAuth } from './middleware/auth.js';

import authRoutes from './routes/auth.js';
import ticketsRoutes from './routes/tickets.js';
import customersRoutes from './routes/customers.js';
import agentsRoutes from './routes/agents.js';
import tagsRoutes from './routes/tags.js';
import macrosRoutes from './routes/macros.js';
import slaRoutes from './routes/sla.js';
import articlesRoutes from './routes/articles.js';
import activitiesRoutes from './routes/activities.js';
import dashboardRoutes from './routes/dashboard.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 4100;

// Initialize database, run migrations, and seed demo data on first run.
initSchema();
migrate();
await seed();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Public auth routes.
app.use('/api/auth', authRoutes);

// Everything below requires a valid token.
app.use('/api/tickets', requireAuth, ticketsRoutes);
app.use('/api/customers', requireAuth, customersRoutes);
app.use('/api/agents', requireAuth, agentsRoutes);
app.use('/api/tags', requireAuth, tagsRoutes);
app.use('/api/macros', requireAuth, macrosRoutes);
app.use('/api/sla', requireAuth, slaRoutes);
app.use('/api/articles', requireAuth, articlesRoutes);
app.use('/api/activities', requireAuth, activitiesRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);

// Serve the built frontend (single-container production setup).
const clientDir = path.join(__dirname, '../public');
if (fs.existsSync(clientDir)) {
  app.use(express.static(clientDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
    res.sendFile(path.join(clientDir, 'index.html'));
  });
}

const server = http.createServer(app);
initWebSocket(server);

server.listen(PORT, () => {
  console.log(`Beacon Desk backend listening on http://localhost:${PORT}`);
});
