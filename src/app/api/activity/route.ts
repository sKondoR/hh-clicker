import { NextRequest, NextResponse } from 'next/server';
import { IncreaseHhActivity } from '../../../features/increaseHhActivity';
import { SearchParams } from '@/types/hh-types';
import { logApiExecution } from '@/lib/api-execution';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  let scraper: IncreaseHhActivity | null = null;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');

    scraper = new IncreaseHhActivity({ delayBetweenViews: 1000, maxRetries: 3 });
    await scraper.init();
    
    // Проверяем, не закрыт ли браузер, и при необходимости перезапускаем
    try {
      await scraper.getActivityStatus();
    } catch {
      console.log('Браузер закрыт, перезапуск...');
      await scraper.init();
    }

    // Проверяем статус входа и при необходимости выполняем вход
    let isLoggedIn = await scraper.login();
    
    // Если вход не удался, пробуем еще раз с перезапуском браузера
    if (!isLoggedIn) {
      console.log('Первый вход не удался, пробуем перезапустить браузер...');
      await scraper.init();
      isLoggedIn = await scraper.login();
    }
    
    if (!isLoggedIn) {
      return NextResponse.json(
        { error: 'Failed to login after multiple attempts' },
        { status: 500 }
      );
    }

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
    return NextResponse.json(data);
    
  } catch (error) {
    logApiExecution(pathname, 'error', error instanceof Error ? error.message : 'Unknown error');
    console.error('API Error:', error);
    
    // Если это ошибка закрытия браузера, возвращаем более конкретное сообщение
    if (error instanceof Error && error.message.includes('closed')) {
      return NextResponse.json(
        { error: 'Browser was closed during operation. Please try again.' },
        { status: 503 } // Service Unavailable
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get current activity status' },
      { status: 500 }
    );
  } finally {
    // Очищаем ресурсы в конце
    if (scraper) {
      try {
        await scraper.close();
      } catch (cleanupError) {
        console.warn('Error during cleanup:', cleanupError);
      }
    }
  }
}
