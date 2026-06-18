import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { testConnection } from './config/database.js';

// Route imports
import authRoutes from './routes/auth.js';

import groupRoutes from './routes/groups.js';
import whitelistRoutes from './routes/whitelist.js';
import evaluationRoutes from './routes/evaluations.js';
import uploadRoutes from './routes/upload.js';
import scheduleRoutes from './routes/schedules.js';
import guideRoutes from './routes/guide.js';
import { chatRouter } from './routes/chat.js';
import { cronTasksRouter } from './routes/cronTasks.js';
import tasksRoutes from './routes/tasks.js';
import peerEvaluationRoutes from './routes/peerEvaluations.js';
import resourcesRoutes from './routes/resources.js';
import notesRoutes from './routes/notes.js';
import notificationsRoutes from './routes/notifications.js';
import settingsRoutes from './routes/settings.js';
import analyticsRoutes from './routes/analytics.js';
import coordinatorActionRoutes from './routes/coordinator.js';
import rubricsRoutes from './routes/rubrics.js';
import committeeRoutes from './routes/committee.js';
import topicsRoutes from './routes/topics.js';
import milestonesRoutes from './routes/milestones.js';
import reportsRoutes from './routes/reports.js';
import { initCronJobs } from './cron/reminders.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow only localhost and the specific production Vercel URL
const ALLOWED_ORIGINS = [
  'https://pro-track-auto-academic-project-lif.vercel.app',
  process.env.CORS_ORIGIN, // optional extra origin from env
  'http://localhost:5173',
  'http://localhost:5001',
].filter(Boolean) as string[];
const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) return callback(null, true); // allow non-browser requests (Postman, server-to-server)
    if (/localhost/.test(origin) || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    // Return false (403) instead of Error (500) for blocked origins
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};
const CORS_ORIGIN = corsOptions.origin;

// Socket.IO Server
export const io = new SocketIOServer(httpServer, {
    cors: { origin: CORS_ORIGIN, methods: ['GET', 'POST'], credentials: true }
});

// ─── Socket.IO: Group Chat Rooms ──────────────────────────────────────────────
io.on('connection', (socket) => {
    // Client joins a specific group room
    socket.on('join_group', (groupId: string) => {
        socket.join(`group:${groupId}`);
    });

    // Client sends a message; broadcast to all in the room
    socket.on('send_message', ({ groupId, message }: { groupId: string; message: any }) => {
        io.to(`group:${groupId}`).emit('new_message', message);
    });

    socket.on('disconnect', () => {});
});

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.options('*', cors(corsOptions)); // Handle preflight OPTIONS requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logger
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// ─── Health Check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────

// Auth
app.use('/api/auth', authRoutes);





// Groups (includes /proposals, /logbooks, /members, /allocation sub-routes)
app.use('/api/groups', groupRoutes);

// Guide specific endpoints
app.use('/api/guide', guideRoutes);

// Whitelist (student + faculty)
// Mounts: POST /api/coordinator/whitelist/upload
//          GET  /api/coordinator/whitelist
//          POST /api/coordinator/whitelist/faculty/upload
//          GET  /api/coordinator/whitelist/faculty
app.use('/api/coordinator/whitelist', whitelistRoutes);

// Coordinator actions (export report, orphans, auto-group)
// Mounts: GET  /api/coordinator/action/export-report
//          GET  /api/coordinator/action/orphans
//          POST /api/coordinator/action/auto-group
app.use('/api/coordinator/action', coordinatorActionRoutes);

// Cron tasks (manual trigger)
// Mounts: POST /api/coordinator/trigger-reminders
app.use('/api/coordinator', cronTasksRouter);

// Evaluations (committee submissions + reads)
// Mounts: POST /api/evaluations
//          GET  /api/evaluations
app.use('/api/evaluations', evaluationRoutes);

// File upload
// Mounts: POST /api/upload
app.use('/api/upload', uploadRoutes);

// Presentation schedules
// Mounts: POST /api/schedules
//          GET  /api/schedules
//          GET  /api/schedules/smart-slots
app.use('/api/schedules', scheduleRoutes);

// Tasks
// Mounts: GET    /api/tasks/:group_id
//          POST   /api/tasks
//          PATCH  /api/tasks/:task_id/status
//          DELETE /api/tasks/:task_id
app.use('/api/tasks', tasksRoutes);

// Peer evaluations
// Mounts: POST /api/peer-evaluations
//          GET  /api/peer-evaluations/group/:group_id
app.use('/api/peer-evaluations', peerEvaluationRoutes);

// Resources
// Mounts: GET  /api/resources/:group_id
//          POST /api/resources
app.use('/api/resources', resourcesRoutes);

// Notes
// Mounts: GET  /api/notes
//          POST /api/notes
app.use('/api/notes', notesRoutes);


// Settings
// Mounts: GET  /api/settings
//          POST /api/settings
app.use('/api/settings', settingsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Analytics
// Mounts: GET /api/analytics/guide
app.use('/api/analytics', analyticsRoutes);

// Rubrics
// Mounts: POST /api/rubrics
//          GET  /api/rubrics
app.use('/api/rubrics', rubricsRoutes);

// Committee
// Mounts: GET /api/committee/historic-projects
app.use('/api/committee', committeeRoutes);

// Topic Approval Workflow (SPPU 3-priority model)
// POST /api/topics/:group_id            — student submits P1/P2/P3
// GET  /api/topics/group/:group_id      — read topics with history
// GET  /api/topics/pending/:stage       — stage queue
// POST /api/topics/review               — guide/committee/coordinator decision
// GET  /api/topics/all                  — coordinator overview
// GET  /api/topics/compare              — similarity search
app.use('/api/topics', topicsRoutes);

// Batch Milestones (SPPU project lifecycle deadlines)
// GET    /api/milestones/:batch_year                — get all milestones for a batch
// GET    /api/milestones/:batch_year/upcoming      — get next upcoming milestone
// GET    /api/milestones/batch-years/list          — get all batch years
// POST   /api/milestones                           — create/update milestone (coordinator)
// PATCH  /api/milestones/:milestone_id/complete    — mark complete (coordinator)
// DELETE /api/milestones/:milestone_id             — delete milestone (coordinator)
app.use('/api/milestones', milestonesRoutes);

// PDF Report Generation — server-side SPPU-format PDFs
// GET /api/reports/marksheet/:group_id  → marksheet (all roles)
// GET /api/reports/batch?year=2024      → batch summary (coordinator)
// GET /api/reports/compliance?year=2024 → compliance  (coordinator)
app.use('/api/reports', reportsRoutes);


// Chat (WebSocket-compatible REST fallback)
// Mounts: GET  /api/chat/group/:group_id
//          POST /api/chat/group/:group_id
//          GET  /api/chat/announcements
//          POST /api/chat/announcements
app.use('/api/chat', chatRouter);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
// Must be registered AFTER all routes
app.use((req: Request, res: Response) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.path,
        timestamp: new Date().toISOString()
    });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
app.use((err: { status?: number; message?: string }, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(err.status || 500).json({
        error: err.message || 'Internal Server Error',
        timestamp: new Date().toISOString()
    });
});

// ─── Server Bootstrap ─────────────────────────────────────────────────────────
async function autoInitDb() {
    try {
        const { pool } = await import('./config/database.js');
        // Check if users table exists
        const result = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_schema = 'public' AND table_name = 'users'
            )
        `);
        const tablesExist = result.rows[0].exists;
        if (!tablesExist) {
            console.log('🔧 Tables not found — running database initialization...');
            const { readFileSync } = await import('fs');
            const { join } = await import('path');
            // Try multiple paths to handle both dev (src/) and prod (dist/) environments
            const possiblePaths = [
                join(__dirname, 'db', 'init.sql'),       // dist/db/init.sql
                join(__dirname, '..', 'db', 'init.sql'), // backend/db/init.sql
                join(__dirname, '..', 'src', 'db', 'init.sql'), // backend/src/db/init.sql
            ];
            const sqlPath = possiblePaths.find(p => { try { readFileSync(p); return true; } catch { return false; } });
            if (!sqlPath) throw new Error('init.sql not found in any expected path');
            const sql = readFileSync(sqlPath, 'utf-8');
            await pool.query(sql);
            console.log('✓ Database schema initialized successfully');
        } else {
            console.log('✓ Database tables already exist');
        }
    } catch (err) {
        console.error('⚠ DB auto-init error:', err);
    }
}

async function startServer() {
    try {
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.warn('⚠ Warning: Database connection failed. Ensure PostgreSQL is running.');
            console.log('  Run: npm run db:init');
        } else {
            await autoInitDb();
        }

        httpServer.listen(PORT, () => {
            console.log(`✓ ProTrack backend running on http://localhost:${PORT}`);
            console.log(`✓ CORS enabled for: ${CORS_ORIGIN}`);
            console.log(`✓ Socket.IO real-time chat enabled`);
            initCronJobs();
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();
