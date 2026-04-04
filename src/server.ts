import { env } from './config/env';
import { prisma } from './config/prisma';
import app from './app';

async function bootstrap() {
  // Verify DB connectivity before accepting traffic
  await prisma.$connect();
  console.log('✅  Database connected');

  const server = app.listen(env.PORT, () => {
    console.log(`\n🚀  Zorvyn Finance API running on http://localhost:${env.PORT}`);
    console.log(`📖  API Docs: http://localhost:${env.PORT}/api/docs`);
    console.log(`❤️   Health:   http://localhost:${env.PORT}/health`);
    console.log(`\n   Environment: ${env.NODE_ENV}\n`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      console.log('Database disconnected. Bye!');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap().catch((err) => {
  console.error('Fatal error during startup:', err);
  process.exit(1);
});
