import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';

import { errorMiddleware } from './middleware/error.middleware';
import authRouter from './modules/auth/auth.router';
import usersRouter from './modules/users/users.router';
import recordsRouter from './modules/records/records.router';
import dashboardRouter from './modules/dashboard/dashboard.router';

const app = express();



app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global rate limit — generous ceiling; tighter limits on auth routes
const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { message: 'Too many requests' } },
});
app.use(globalLimiter);



const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Zorvyn Finance API',
      version: '1.0.0',
      description:
        'Finance Data Processing and Access Control Backend. ' +
        'Use POST /api/auth/login with seeded credentials to get a Bearer token.',
      contact: { name: 'Zorvyn Engineering' },
    },
    servers: [{ url: 'http://localhost:3000', description: 'Local development' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication and token management' },
      { name: 'Users', description: 'User management (Admin only)' },
      { name: 'Records', description: 'Financial records CRUD' },
      { name: 'Dashboard', description: 'Aggregated analytics and insights' },
    ],
  },
  apis: ['./src/modules/**/*.router.ts', './src/modules/**/*.router.js'],
});

app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get('/api/docs.json', (_req, res) => res.json(swaggerSpec));



app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});



app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/records', recordsRouter);
app.use('/api/dashboard', dashboardRouter);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { message: 'Route not found' },
  });
});



app.use(errorMiddleware);

export default app;
