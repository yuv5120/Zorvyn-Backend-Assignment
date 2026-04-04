import { execSync } from 'child_process';

export async function setup() {
  // Run Prisma migrations against the test DB before any tests run
  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: 'file:./test.db',
    },
    stdio: 'inherit',
  });
}

export async function teardown() {
  // Optional: delete the test DB file after test run
  const fs = await import('fs');
  if (fs.existsSync('./test.db')) {
    fs.unlinkSync('./test.db');
  }
}
