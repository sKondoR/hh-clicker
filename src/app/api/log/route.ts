import { getApiExecutionsLog } from '@/lib/api-execution';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const logs = await getApiExecutionsLog(sevenDaysAgo);
    return NextResponse.json(logs);
  } catch (error) {
    console.error('Ошибка при получении логов API:', error);
    return NextResponse.json(
      { error: 'Failed to fetch API execution logs' },
      { status: 500 }
    );
  }
}