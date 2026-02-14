// eslint-disable-next-line no-restricted-imports
import { chromium as plChromium, Browser, Page  } from 'playwright';
import { HHCredentials, SearchParams, ActivityStatus, ScrapingConfig } from '../../types/hh-types';
import { getIdFromUrl } from '@/utils/getIdFromUrl';
import { loadVisitedVacancies, saveVisitedVacancy } from '@/lib/api-visited';

// require важно на vercel 
// eslint-disable-next-line @typescript-eslint/no-require-imports
const chromium = require('@sparticuz/chromium');
const FULL_PROGRESS = 100;

// Синглтон для управления браузером на Vercel
export class BrowserManager {
  private static instance: BrowserManager;
  private browser: Browser | null = null;
  private page: Page | null = null;
  private isInitializing = false;
  private initializationPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager();
    }
    return BrowserManager.instance;
  }

  async init(): Promise<void> {
    if (this.browser && this.page) {
      return;
    }

    if (this.isInitializing) {
      await this.initializationPromise;
      return;
    }

    this.isInitializing = true;
    this.initializationPromise = this.createBrowser();
    await this.initializationPromise;
    this.isInitializing = false;
    this.initializationPromise = null;
  }

  private async createBrowser(): Promise<void> {
    const executablePath = process.env.VERCEL
      ? await chromium.executablePath()
      : plChromium.executablePath();

    try {
      this.browser = await plChromium.launch({ 
        executablePath,
        headless: process.env.NODE_ENV === 'production',
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--disable-web-security',
          '--disable-features=IsolateOrigins,site-per-process',
          '--single-process',
          '--disable-background-timer-throttling',
          '--disable-backgrounding-occluded-windows',
          '--disable-renderer-backgrounding',
          '--window-size=1920,1080',
          '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        ],
        timeout: 30000
      });

      this.page = await this.browser.newPage();

      // Блокировка ресурсов для ускорения
      await this.page.route('**/*', (route) => {
        const resourceType = route.request().resourceType();
        const blockedResources = ['image', 'font', 'media'];
        if (blockedResources.includes(resourceType)) {
          route.abort();
        } else {
          route.continue();
        }
      });
      
      // Установка дополнительных заголовков для имитации реального пользователя
      await this.page.setExtraHTTPHeaders({
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
      });

      console.log('Браузер успешно инициализирован');
    } catch (error) {
      console.error('Ошибка при запуске браузера:', error);
      await this.recreateBrowser();
      throw error;
    }
  }

  async recreateBrowser(): Promise<void> {
    console.log('Перезапуск браузера...');
    
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error('Ошибка при закрытии браузера:', error);
      }
    }

    this.browser = null;
    this.page = null;
    await this.createBrowser();
  }

  async getPage(): Promise<Page> {
    if (!this.page) {
      await this.init();
    }
    return this.page!;
  }

  async close(): Promise<void> {
    if (this.browser) {
      try {
        await this.browser.close();
        console.log('Браузер закрыт');
      } catch (error) {
        console.error('Ошибка при закрытии браузера:', error);
      }
      this.browser = null;
      this.page = null;
    }
  }
}

export class IncreaseHhActivity {
  private config: ScrapingConfig;
  private visitedVacancies: Set<string> = new Set();
  private browserManager = BrowserManager.getInstance();

  constructor(config: ScrapingConfig = { delayBetweenViews: 3000, maxRetries: 3 }) {
    this.config = config;
  }

  async init(): Promise<void> {
    await this.browserManager.init();
  }

  async login(): Promise<boolean> {
    const credentials: HHCredentials = {
      username: process.env.HH_USERNAME || '',
      password: process.env.HH_PASSWORD || ''
    };
    if (!credentials.username || !credentials.password) {
      throw new Error('Credentials not found in environment variables');
    }

    const page = await this.browserManager.getPage();
    await page.goto('https://spb.hh.ru/account/login');

    // Клик по "Войти"
    await page.click('button:has-text("Войти")');

    // Клик по "Почта"
    await page.click('div[class^="magritte-label"]:has-text("Почта")');

    await page.click('button:has-text("Войти с паролем")');

    // Ожидание загрузки формы
    await page.waitForSelector('input[name="username"]');
    await page.fill('input[name="username"]', credentials.username);

    // Клик по разделу "Войти с паролем"
    await page.click('button:has-text("Войти с паролем")');
    
    // Ввод пароля
    await page.fill('input[name="password"]', credentials.password);
    
    // Нажатие кнопки входа
    await page.click('button:has-text("Войти")');
    await page.waitForURL('https://spb.hh.ru/');

    // Проверка успешной авторизации
    const isLoggedIn = await this.checkLoginStatus();
    
    if (isLoggedIn) {
      console.log('Успешный вход в систему');
      return true;
    } else {
      console.error('Ошибка авторизации');
      return false;
    }
  }

  async checkLoginStatus(): Promise<boolean> {
    const page = await this.browserManager.getPage();
    try {
      const profileElements = await page.$$('[class^="magritte-button"]:has-text("Создать резюме")');
      return profileElements.length > 0;
    } catch (error) {
      console.error('Ошибка проверки статуса входа:', error);
      return false;
    }
  }

  async getPagesCount(): Promise<number> {
    const page = await this.browserManager.getPage();
    const pagerPages = await page.locator('[data-qa="pager-page"]').all();
    const lastPageElement = pagerPages[pagerPages.length - 1];
    const lastPageText = await lastPageElement.textContent();
    return parseInt(lastPageText || '1');
  }  

  async searchVacancies(params: SearchParams, neededNewVacancies: number): Promise<string[]> {
    const page = await this.browserManager.getPage();

    // Загружаем список уже посещенных вакансий
    this.visitedVacancies = await loadVisitedVacancies();

    const searchUrl = `https://spb.hh.ru/search/vacancy?salary=&ored_clusters=true&hhtmFrom=vacancy_search_list&hhtmFromLabel=vacancy_search_line`;
    
    // Переход на главную страницу
    await page.goto(`${searchUrl}&text=${params.query}`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('[data-qa="vacancy-serp__results"]');
  
    // Проверка, есть ли еще страницы с результатами
    const pageCount = await this.getPagesCount();
    
    const newVacancies = [];
    let currentPage = pageCount - 1;
    
    while (newVacancies.length < neededNewVacancies && currentPage >= 0) {
      await page.goto(`${searchUrl}&text=${params.query}&page=${currentPage}`);
      await page.waitForSelector('[data-qa="vacancy-serp__results"]');
      
      const vacancyLinks = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll<HTMLLinkElement>('a[data-qa="serp-item__title"]'));
        return links.map(link => link.href);
      });
      
      // Фильтруем вакансии, которые уже посещали
      for (const link of vacancyLinks) {
        if (newVacancies.length >= neededNewVacancies) {
          break;
        }
        const vacancyId = getIdFromUrl(link);
        if (vacancyId && !this.visitedVacancies.has(vacancyId)) {
          newVacancies.push(link);
        }
      }
      
      // Переходим на предыдущую страницу
      currentPage--;
    }

    return newVacancies;
  }

  async openVacancy(vacancyUrl: string): Promise<void> {
    const page = await this.browserManager.getPage();

    try {
      // Просто переходим по ссылке (в текущей вкладке)
      await Promise.all([
        page.click(`a[href="${vacancyUrl}"]`)
      ]);

      console.log(`Открыта вакансия: ${getIdFromUrl(vacancyUrl)}`);
      
      const vacancyId = getIdFromUrl(vacancyUrl);
      if (vacancyId) {
        this.visitedVacancies.add(vacancyId);
        // Сохраняем обновленный список посещенных вакансий
        await saveVisitedVacancy(vacancyId);        
      }
    } catch (error) {
      console.error(`Ошибка при открытии вакансии ${vacancyUrl}:`, error);
    }
  }

  async getActivityStatus(): Promise<ActivityStatus> {
    const page = await this.browserManager.getPage();

    // Поиск элемента, содержащего информацию об активности
    try {
      let broadcastProgress: ((progress: number, status: string) => void) | undefined;
      try {
        ({ broadcastProgress } = await import('../../lib/sse'));
      } catch (error) {
        console.warn('SSE progress broadcasting is not available:', error);
      }
      
      const activityElements = await page.$$('.bloko-progress-bar, [data-qa*="activity"], .applicant-proficiency-rate');
      
      let percentage = 0;
      
      for (const element of activityElements) {
        const textContent = await element.textContent();
        const percentMatch = textContent?.match(/(\d+)%/);
        
        if (percentMatch) {
          percentage = parseInt(percentMatch[1]);
          break;
        }
      }
      
      // Если не нашли через поиск элементов, пробуем другие способы
      if (percentage === 0) {
        const textBasedSearch = await page.evaluate(() => {
          const bodyText = document.body.innerText.toLowerCase();
          
          if (bodyText.includes('активность') || bodyText.includes('activity')) {
            const percentMatches = bodyText.match(/(\d+)%/g);
            if (percentMatches) {
              return Math.max(...percentMatches.map(match => parseInt(match)));
            }
          }
          return 0;
        });
        
        if (textBasedSearch > 0) {
          percentage = textBasedSearch;
        }
      }
       console.log('getActivityStatus: ', percentage, broadcastProgress);
      if (broadcastProgress) {
        console.log('SSE sends percentage: ', percentage);
        broadcastProgress(percentage, `Текущий уровень активности: ${percentage}%`);
      }
      return {
        percentage,
        statusText: `${percentage}%`,
        lastUpdated: new Date()
      };
    } catch (error) {
      console.error('Ошибка получения статуса активности:', error);
      return {
        percentage: 0,
        statusText: 'Не удалось определить',
        lastUpdated: new Date()
      };
    }
  }

  async startScrapingCycle(searchParams: SearchParams): Promise<number> {
    let broadcastProgress: ((progress: number, status: string) => void) | undefined;
    try {
      ({ broadcastProgress } = await import('../../lib/sse'));
    } catch (error) {
      console.warn('SSE progress broadcasting is not available:', error);
    }

    let activityStatus = await this.getActivityStatus();
    console.log(`Текущий уровень активности: ${activityStatus.percentage}%`);

    const neededNewVacancies = Math.ceil((FULL_PROGRESS - activityStatus.percentage) / 2);

     if (neededNewVacancies > 0) {
      console.log(`Нужно открыть ${neededNewVacancies} новых вакансий`);
     } else {
      console.log(`Увеличение активности не требуется`);
      return activityStatus.percentage;
     }
      
    while (activityStatus.percentage < FULL_PROGRESS) {
      const vacancyLinks = await this.searchVacancies(searchParams, neededNewVacancies);
      console.log(`Найдено ${vacancyLinks.length} новых вакансий`);
      
      for (const url of vacancyLinks) {
        if (activityStatus.percentage >= FULL_PROGRESS) {
          break;
        }
        
        console.log(`Открываю вакансию: ${getIdFromUrl(url)}`);
        await this.openVacancy(url);
        
        // Задержка между открытием вакансий
        await (await this.browserManager.getPage()).waitForTimeout(this.config.delayBetweenViews);
        
        // Проверяем статус активности
        activityStatus = await this.getActivityStatus();
        console.log(`Текущий уровень активности: ${activityStatus.percentage}%`);
        
        // Отправляем обновление прогресса клиенту через SSE
        if (broadcastProgress) {
          broadcastProgress(activityStatus.percentage, `Текущий уровень активности: ${activityStatus.percentage}%`);
        }
        
        if (activityStatus.percentage >= FULL_PROGRESS) {
          console.log('Достигнут максимальный уровень активности 100%');
        
        // Отправляем финальное обновление прогресса клиенту через SSE
        if (broadcastProgress) {
          broadcastProgress(100, 'Достигнут максимальный уровень активности 100%');
        }
          break;
        }
      }
    }

    const endActivityStatus = await this.getActivityStatus();
    return endActivityStatus.percentage;
  }

  async raiseCV(): Promise<void> {
    const page = await this.browserManager.getPage();
    const cvUrl = `https://spb.hh.ru/applicant/resumes`;
    
    // Переход на главную страницу
    await page.goto(cvUrl, { waitUntil: 'domcontentloaded' });

    const button = await page.$('button:has-text("Поднять в поиске")');
    if (button) {
      await page.click('button:has-text("Поднять в поиске")');
      console.log('Кликнул на Поднять в поиске');
    } else {
      console.log('Кнопка "Поднять в поиске" не найдена');
    }
  }

  async close(): Promise<void> {
    await this.browserManager.close();
  }
}
