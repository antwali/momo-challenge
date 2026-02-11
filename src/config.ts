import path from 'path';
import { config as loadEnv } from 'dotenv';

const cwd = process.cwd();
const envName = process.env.NODE_ENV;

// Base env (shared defaults)
loadEnv({ path: path.resolve(cwd, '.env') });

// Environment-specific overrides (dev / test)
if (envName === 'development' || envName === 'test') {
  const envPath = path.resolve(cwd, `.env.${envName}`);
  loadEnv({ path: envPath });
}

export const config = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  databaseUrl:
    process.env.DATABASE_URL ??
    (envName === 'test'
      ? 'postgresql://momo:momo@localhost:5432/momo_wallet_test?schema=public'
      : 'postgresql://momo:momo@localhost:5432/momo_wallet?schema=public'),
  notificationChannel: process.env.NOTIFICATION_CHANNEL ?? 'console',
} as const;
