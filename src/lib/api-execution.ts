import { db } from './db';
import { apiExecutions } from './schema';
import { eq, gte } from 'drizzle-orm';

export async function getApiExecutionsLog(from?: Date) {
  try {
    if (from) {
      return await db.select().from(apiExecutions).where(gte(apiExecutions.executedAt, from));
    }
    
    return await db.select().from(apiExecutions);
  } catch (error) {
    console.error('Ошибка при получении логов выполнения API:', error);
    throw error;
  }
}

export async function getApiExecutionsLogByEndpoint(endpoint: string) {
  try {
    return await db.select().from(apiExecutions).where(eq(apiExecutions.endpoint, endpoint));
  } catch (error) {
    console.error(`Ошибка при получении логов выполнения API для эндпоинта ${endpoint}:`, error);
    throw error;
  }
}

export async function logApiExecution(endpoint: string, status: string, details?: string): Promise<void> {
  try {
    await db.insert(apiExecutions).values({
      endpoint,
      status,
      details,
    });
  } catch (error) {
    console.error(`Ошибка при логировании выполнения API ${endpoint}:`, error);
  }
}