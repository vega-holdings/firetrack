const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Resetting database...');
    
    // Reset the database using Prisma
    console.log('Running database reset...');
    execSync('npx prisma migrate reset --force', { stdio: 'inherit' });

    console.log('Database initialization complete');
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
