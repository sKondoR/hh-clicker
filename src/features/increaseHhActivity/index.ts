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
        headless: true,
        // headless: process.env.NODE_ENV === 'production',
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
    console.log('close');
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

    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const page = await this.browserManager.getPage();
        
        // Проверяем, что браузер и страница доступны
        if (!page || page.isClosed()) {
          throw new Error('Браузер или страница закрыты');
        }

        await page.goto('https://spb.hh.ru/account/login', { 
          waitUntil: 'domcontentloaded',
          timeout: 30000 
        });

        // Клик по "Войти"
        await page.click('button:has-text("Войти")');

        // Клик по "Почта"
        await page.click('div[class^="magritte-label"]:has-text("Почта")');

        await page.click('button:has-text("Войти с паролем")');

        // Ожидание загрузки формы
        await page.waitForSelector('input[name="username"]', { timeout: 10000 });
        await page.fill('input[name="username"]', credentials.username);

        // Клик по разделу "Войти с паролем"
        await page.click('button:has-text("Войти с паролем")');
        
        // Ввод пароля
        await page.fill('input[name="password"]', credentials.password);
        
        // Нажатие кнопки входа
        await page.click('button:has-text("Войти")');
        
        // Используем более надежный подход вместо waitForURL
        try {
          await page.waitForLoadState('networkidle', { timeout: 10000 });
          await page.waitForURL('https://spb.hh.ru/', { timeout: 10000 });
        } catch (urlError) {
          console.warn('waitForURL не сработал, проверяем текущий URL:', urlError);
          // Проверяем текущий URL и при необходимости переходим
          const currentUrl = page.url();
          if (!currentUrl.includes('spb.hh.ru')) {
            await page.goto('https://spb.hh.ru/', { waitUntil: 'domcontentloaded' });
          }
        }

        // Проверка успешной авторизации
        const isLoggedIn = await this.checkLoginStatus();
        
        if (isLoggedIn) {
          console.log('Успешный вход в систему');
          return true;
        } else {
          console.error('Ошибка авторизации, попытка:', retryCount + 1);
          retryCount++;
          if (retryCount < maxRetries) {
            await this.browserManager.recreateBrowser();
            await new Promise(resolve => setTimeout(resolve, 2000)); // Пауза перед повторной попыткой
          }
        }
      } catch (error) {
        console.error(`Ошибка при попытке входа ${retryCount + 1}/${maxRetries}:`, error);
        retryCount++;
        if (retryCount < maxRetries) {
          try {
            await this.browserManager.recreateBrowser();
            await new Promise(resolve => setTimeout(resolve, 3000)); // Пауза перед повторной попыткой
          } catch (recreateError) {
            console.error('Ошибка при перезапуске браузера:', recreateError);
          }
        }
      }
    }

    console.error('Все попытки входа не удалась');
    return false;
  }

  async checkLoginStatus(): Promise<boolean> {
    try {
      const page = await this.browserManager.getPage();
      
      // Проверяем, что браузер и страница доступны
      if (!page || page.isClosed()) {
        return false;
      }

      // Используем несколько способов проверки успешного входа
      const checks = [
        // Проверка наличия кнопки "Создать резюме"
        async () => {
          const profileElements = await page.$$('[class^="magritte-button"]:has-text("Создать резюме")');
          return profileElements.length > 0;
        },
        // Проверка URL
        async () => {
          const currentUrl = page.url();
          return currentUrl.includes('spb.hh.ru') && !currentUrl.includes('login');
        },
        // Проверка наличия элементов личного кабинета
        async () => {
          const cabinetElements = await page.$$('.applicant-name, .user-name, [data-qa="header-user-name"]');
          return cabinetElements.length > 0;
        }
      ];

      // Выполняем проверки до первой успешной
      for (const check of checks) {
        try {
          const result = await check();
          if (result) {
            return true;
          }
        } catch (checkError) {
          console.warn('Проверка статуса не удалась:', checkError);
          continue;
        }
      }

      return false;
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
    try {
      const page = await this.browserManager.getPage();
      
      // Проверяем, что браузер и страница доступны
      if (!page || page.isClosed()) {
        console.log('Браузер закрыт');
        return {
          percentage: null,
          statusText: 'Браузер закрыт',
          lastUpdated: new Date()
        };
      }

      let broadcastProgress: ((progress: number, status: string) => void) | undefined;
      try {
        ({ broadcastProgress } = await import('../../lib/sse'));
      } catch (error) {
        console.warn('SSE progress broadcasting is not available:', error);
      }
      
      // Проверяем текущий URL перед поиском элементов
      const currentUrl = page.url();
      if (!currentUrl.includes('spb.hh.ru')) {
        console.log('Не на странице HH, текущий URL:', currentUrl);
        return {
          percentage: null,
          statusText: 'Не на странице HH',
          lastUpdated: new Date()
        };
      }
      
      const activityElements = await page.$$('.bloko-progress-bar, [data-qa*="activity"], .applicant-proficiency-rate');
      
      let percentage = 0;
      
      for (const element of activityElements) {
        try {
          const textContent = await element.textContent();
          const percentMatch = textContent?.match(/(\d+)%/);
          
          if (percentMatch) {
            percentage = parseInt(percentMatch[1]);
            break;
          }
        } catch (elementError) {
          console.warn('Ошибка при чтении элемента активности:', elementError);
          continue;
        }
      }
      
      // Если не нашли через поиск элементов, пробуем другие способы
      if (percentage === 0) {
        try {
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
        } catch (evalError) {
          console.warn('Ошибка при поиске активности через текст:', evalError);
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

  async startScrapingCycle(searchParams: SearchParams): Promise<number | null> {
    let broadcastProgress: ((progress: number | null, status: string) => void) | undefined;
    try {
      ({ broadcastProgress } = await import('../../lib/sse'));
    } catch (error) {
      console.warn('SSE progress broadcasting is not available:', error);
    }

    let activityStatus = await this.getActivityStatus();
    console.log(`Текущий уровень активности: ${activityStatus.percentage || 'null'}%`);
    if (activityStatus.percentage === null) {
      console.log(`Текущий уровень активности неизвестен`);
      return activityStatus.percentage;
    }

    let currentPercentage = activityStatus.percentage;
    const neededNewVacancies = Math.ceil((FULL_PROGRESS - currentPercentage) / 2);

     if (neededNewVacancies > 0) {
      console.log(`Нужно открыть ${neededNewVacancies} новых вакансий`);
     } else {
      console.log(`Увеличение активности не требуется`);
      return currentPercentage;
     }
      
    while (currentPercentage < FULL_PROGRESS) {
      const vacancyLinks = await this.searchVacancies(searchParams, neededNewVacancies);
      console.log(`Найдено ${vacancyLinks.length} новых вакансий`);
      
      // Если не нашлось вакансий, прерываем цикл
      if (vacancyLinks.length === 0) {
        console.log('Вакансии не найдены, прекращаем цикл');
        break;
      }
      
      for (const url of vacancyLinks) {
        if (currentPercentage >= FULL_PROGRESS) {
          break;
        }
        
        console.log(`Открываю вакансию: ${getIdFromUrl(url)}`);
        await this.openVacancy(url);
        
        // Задержка между открытием вакансий
        await (await this.browserManager.getPage()).waitForTimeout(this.config.delayBetweenViews);
        
        // Проверяем статус активности
        activityStatus = await this.getActivityStatus();
        const updatedPercentage = activityStatus.percentage;
        // if (updatedPercentage === null) {
        //   console.log(`Текущий уровень активности неизвестен`);
        //   return updatedPercentage;
        // }
        console.log(`Текущий уровень активности: ${updatedPercentage}%`);
        
        // Отправляем обновление прогресса клиенту через SSE
        if (broadcastProgress) {
          broadcastProgress(updatedPercentage, `Текущий уровень активности: ${updatedPercentage}%`);
        }
        
        if (updatedPercentage === null) {
          break;
        }
        if (updatedPercentage >= FULL_PROGRESS) {
          console.log('Достигнут максимальный уровень активности 100%');
        
          // Отправляем финальное обновление прогресса клиенту через SSE
          if (broadcastProgress) {
            broadcastProgress(100, 'Достигнут максимальный уровень активности 100%');
          }
          break;
        }
        
        // Обновляем currentPercentage для правильной работы цикла
        currentPercentage = updatedPercentage;
      }
    }

    const endActivityStatus = await this.getActivityStatus();
    return endActivityStatus.percentage;
  }

  async raiseCV(): Promise<boolean> {
    const page = await this.browserManager.getPage();
    const cvUrl = `https://spb.hh.ru/applicant/resumes`;
    
    // Переход на главную страницу
    await page.goto(cvUrl, { waitUntil: 'domcontentloaded' });

    const button = await page.$('button:has-text("Поднять в поиске")');
    if (button) {
      await page.click('button:has-text("Поднять в поиске")');
      console.log('Кликнул на Поднять в поиске');
      return true;
    } else {
      console.log('Кнопка "Поднять в поиске" не найдена');
    }
    return false;
  }

  async close(): Promise<void> {
    await this.browserManager.close();
  }
}
