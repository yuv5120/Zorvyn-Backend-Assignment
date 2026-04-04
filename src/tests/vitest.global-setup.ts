import { execSync } from 'child_process';

export async function setup() {
  // Run Prisma migrations against the test DB before any tests run
  execSync('npx prisma migrate deploy', {
    env: {
      ...process.env,
      DATABASE_URL: 'postgresql://postgres:postgres@localhost:5432/zorvyn_test?schema=public',
    },
    stdio: 'inherit',
  });
}

export async function teardown() {
  // PostgreSQL handles state, we just leave it for the next run.
  // Tests clear their own tables in beforeEach().
}
