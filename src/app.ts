import 'express-async-errors';
import path from 'path';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import accountsRoutes from './routes/accounts';
import transactionsRoutes from './routes/transactions';
import merchantsRoutes from './routes/merchants';

export function createApp() {
  const app = express();
  app.use(express.json());

  const specPath = path.join(process.cwd(), 'docs', 'openapi.yaml');
  try {
    const spec = YAML.load(specPath) as Record<string, unknown>;
    app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(spec));
  } catch {
    // OpenAPI spec optional (e.g. when docs/ not present)
  }

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/v1/accounts', accountsRoutes);
  app.use('/v1/auth', authRoutes);
  app.use('/v1/transactions', transactionsRoutes);
  app.use('/v1/merchants', merchantsRoutes);

  app.use(errorHandler);
  return app;
}
