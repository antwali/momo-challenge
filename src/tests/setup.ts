// Ensure test environment before any config/env is loaded
process.env.NODE_ENV = 'test';

import path from 'path';
import { config as loadEnv } from 'dotenv';

loadEnv({ path: path.resolve(process.cwd(), '.env') });
loadEnv({ path: path.resolve(process.cwd(), '.env.test') });

jest.setTimeout(15000);
