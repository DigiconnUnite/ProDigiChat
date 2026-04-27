import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { get } from '@/lib/cache';
import { createLogger } from '@/lib/logger';

const logger = createLogger('Health');

export async function GET() {
  try {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        database: 'unknown',
        cache: 'unknown',
      },
    };

    // Check database connection
    try {
      await prisma.user.findFirst({ take: 1 });
      health.checks.database = 'healthy';
    } catch (error) {
      health.checks.database = 'unhealthy';
      health.status = 'degraded';
      logger.error('Database health check failed', { error });
    }

    // Check cache connection
    try {
      await get('health-check');
      health.checks.cache = 'healthy';
    } catch (error) {
      health.checks.cache = 'unhealthy';
      health.status = 'degraded';
      logger.error('Cache health check failed', { error });
    }

    const statusCode = health.status === 'healthy' ? 200 : 503;
    return NextResponse.json(health, { status: statusCode });
  } catch (error) {
    logger.error('Health check failed', { error });
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 503 }
    );
  }
}
