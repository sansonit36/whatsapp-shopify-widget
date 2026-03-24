const { PrismaClient } = require('@prisma/client');

let prisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  // Reuse client in development to avoid too many connections
  if (!global.__prisma) {
    global.__prisma = new PrismaClient({ log: ['query'] });
  }
  prisma = global.__prisma;
}

module.exports = prisma;
