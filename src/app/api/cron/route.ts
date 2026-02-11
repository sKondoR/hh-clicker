import { NextRequest, NextResponse } from 'next/server';
import { IncreaseHhActivity } from '@/features/increaseHhActivity';
import { SearchParams } from '@/types/hh-types';
import { logApiExecution } from '@/lib/api-execution';

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  try {
    const scraper = new IncreaseHhActivity({ delayBetweenViews: 1000, maxRetries: 3 });
    await scraper.init();
    const scrapParams: SearchParams = {
        query: 'java',
    };
    await scraper.startScrapingCycle(scrapParams);
    await scraper.raiseCV();
    await scraper.close();
    await logApiExecution(pathname, 'success');
    return NextResponse.json({ success: true, message: 'Cron job executed' });
  } catch (error) {
    await logApiExecution(pathname, 'error', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
