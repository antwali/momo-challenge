import path from 'path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(process.cwd(), '.env') });

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl:
    process.env.DATABASE_URL ?? 'postgresql://momo:momo@localhost:5432/momo_wallet?schema=public',
  notificationChannel: process.env.NOTIFICATION_CHANNEL ?? 'console',
} as const;
