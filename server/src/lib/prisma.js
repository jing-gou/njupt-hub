import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is not set in environment variables');
}

// Prisma 7 的 PrismaMariaDb 适配器会自动创建连接池
// 只需要传入连接字符串即可
const adapter = new PrismaMariaDb(connectionString);
const prisma = new PrismaClient({ adapter });

export default prisma;
