import { NextRequest, NextResponse } from 'next/server';
import { HhScraper } from '../../../lib/hh-scraper';
import { SearchParams } from '@/types/hh-types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    
    if (!query) {
      return NextResponse.json(
        { error: 'search query parameter is required' },
        { status: 400 }
      );
    }

    const scraper = new HhScraper({ delayBetweenViews: 1000, maxRetries: 3 });
    await scraper.init();
    const scrapParams: SearchParams = {
        query,
    };
    const activityPercentage = await scraper.startScrapingCycle(scrapParams);
    await scraper.close();
    // Для демонстрации, используем фиктивные данные, так как у нас нет реальных учетных данных
    const data = { success: true, activityPercentage: activityPercentage };
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Failed to scrape data' },
      { status: 500 }
    );
  }
}
