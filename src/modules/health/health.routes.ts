import { Router } from 'express';
import { livenessHandler, readinessHandler, metricsHandler } from './health.controller';

export const healthRoutes = Router();

healthRoutes.get('/live', livenessHandler);
healthRoutes.get('/ready', readinessHandler);
healthRoutes.get('/metrics', metricsHandler);
