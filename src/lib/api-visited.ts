import { db } from './db';
import { visitedVacancies } from './schema';

export async function loadVisitedVacancies(): Promise<Set<string>> {
  try {
    const rows = await db.select({ vacancyId: visitedVacancies.vacancyId }).from(visitedVacancies);
    return new Set(rows.map((row: { vacancyId: string }) => row.vacancyId));
  } catch (error) {
    console.error('Ошибка загрузки посещенных вакансий из базы данных:', error);
    return new Set();
  }
}

export async function saveVisitedVacancy(vacancyId: string): Promise<void> {
  try {
    await db.insert(visitedVacancies).values({
      vacancyId,
    }).onConflictDoNothing();
  } catch (error) {
    console.error('Ошибка сохранения посещенной вакансии в базе данных:', error);
  }
}