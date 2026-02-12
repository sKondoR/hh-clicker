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

    const scraper = new IncreaseHhActivity({ delayBetweenViews: 1000, maxRetries: 3 });
    await scraper.init();
    
    if (await scraper.login()) {
      let activityPercentage;
      if (!query) {
        const activityStatus = await scraper.getActivityStatus();
        activityPercentage = activityStatus.percentage;
        logApiExecution(pathname, `request activity - ${activityPercentage}%`);
      } else {
        const scrapParams: SearchParams = {
            query,
        };
        activityPercentage = await scraper.startScrapingCycle(scrapParams);
        await scraper.raiseCV();
        logApiExecution(pathname, `raise activity - ${activityPercentage}%`);
      }
      const data = { success: true, activityPercentage: activityPercentage };
      scraper.close();
      return NextResponse.json(data);
    } else {
      scraper.close();
      return NextResponse.json(
        { error: 'Failed to login for status check' },
        { status: 500 }
      );
    }
  } catch (error) {
    logApiExecution(pathname, 'error', error instanceof Error ? error.message : 'Unknown error');
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to get current activity status' },
      { status: 500 }
    );
  }
}
