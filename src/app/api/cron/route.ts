import { NextRequest, NextResponse } from 'next/server';
import { IncreaseHhActivity } from '@/features/increaseHhActivity';
import { SearchParams } from '@/types/hh-types';
import { logApiExecution } from '@/lib/api-execution';

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  try {
    // Логирование начала выполнения cron задачи
    logApiExecution(pathname, 'cron job started');
    
    const scraper = new IncreaseHhActivity({ 
      delayBetweenViews: 1000, 
      maxRetries: 3 
    });
    
    await scraper.init();
    
    const scrapParams = {
      query: 'java',
    };
    
    await scraper.startScrapingCycle(scrapParams);
    await scraper.raiseCV();
    await scraper.close();
    
    // Логирование успешного выполнения
    logApiExecution(pathname, 'cron job completed successfully');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Cron job executed successfully' 
    });
    
  } catch (error) {
    // Детальное логирование ошибок
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logApiExecution(pathname, 'cron job failed', errorMessage);
    
    return NextResponse.json(
      { 
        error: 'Cron job failed', 
        details: errorMessage 
      },
      { status: 500 }
    );
  }
}
