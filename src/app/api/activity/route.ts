import { NextRequest, NextResponse } from 'next/server';
import { IncreaseHhActivity } from '../../../features/increaseHhActivity';
import { SearchParams } from '@/types/hh-types';
import { logApiExecution } from '@/lib/api-execution';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    
    if (!query) {
      await logApiExecution(pathname, 'error', 'search query parameter is required');
      return NextResponse.json(
        { error: 'search query parameter is required' },
        { status: 400 }
      );
    }

    const scraper = new IncreaseHhActivity({ delayBetweenViews: 1000, maxRetries: 3 });
    await scraper.init();
    const scrapParams: SearchParams = {
        query,
    };
    const activityPercentage = await scraper.startScrapingCycle(scrapParams);
    await scraper.raiseCV();
    await scraper.close();
    await logApiExecution(pathname, `success - ${activityPercentage}%`);
    // Для демонстрации, используем фиктивные данные, так как у нас нет реальных учетных данных
    const data = { success: true, activityPercentage: activityPercentage };
    
    return NextResponse.json(data);
  } catch (error) {
    await logApiExecution(pathname, 'error', error instanceof Error ? error.message : 'Unknown error');
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape data' },
      { status: 500 }
    );
  }
}
