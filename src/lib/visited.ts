import fs from 'fs/promises';
import path from 'path';

const VISITED_FILE = path.join(process.cwd(), 'src', 'lib', 'visited-vacancies.json');

export async function loadVisitedVacancies(): Promise<Set<string>> {
  try {
    const data = await fs.readFile(VISITED_FILE, 'utf8');
    const urls: string[] = JSON.parse(data);
    return new Set(urls);
  } catch (error) {
    // Если файл не существует или ошибка чтения, начнем с пустого множества
    return new Set();
  }
}

export async function saveVisitedVacancies(visitedVacancies: Set<string>): Promise<void> {
  try {
    const urls = Array.from(visitedVacancies);
    await fs.writeFile(VISITED_FILE, JSON.stringify(urls, null, 2), 'utf8');
  } catch (error) {
    console.error('Ошибка сохранения списка посещенных вакансий:', error);
  }
}