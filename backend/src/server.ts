import express from 'express';
import cors from 'cors';
import { healthRouter } from './api/health.js';
import projectsRouter from './api/projects.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api', healthRouter);
app.use('/api/projects', projectsRouter);

// Only start server if not imported for testing
if (import.meta.url === `file://${process.argv[1]}`) {
  app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
  });
}

export default app;
