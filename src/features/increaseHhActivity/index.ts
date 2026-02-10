// eslint-disable-next-line no-restricted-imports
import { chromium, Browser, Page } from 'playwright';
import { HHCredentials, SearchParams, ActivityStatus, ScrapingConfig } from '../../types/hh-types';
import { getIdFromUrl } from '@/utils/getIdFromUrl';
import { loadVisitedVacancies, saveVisitedVacancy } from '@/lib/api-visited';

const FULL_PROGRESS = 100;

export class IncreaseHhActivity {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private config: ScrapingConfig;
  private visitedVacancies: Set<string> = new Set();

  constructor(config: ScrapingConfig = { delayBetweenViews: 3000, maxRetries: 3 }) {
    this.config = config;
  }

  async init(): Promise<void> {
    this.browser = await chromium.launch({ 
      headless: false,
      args: ['--disable-blink-features=AutomationControlled']
    });
    
    this.page = await this.browser.newPage();
    
    // Установка дополнительных заголовков для имитации реального пользователя
    await this.page.setExtraHTTPHeaders({
      'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7'
    });
  }

  async login(): Promise<boolean> {
    const credentials: HHCredentials = {
      username: process.env.HH_USERNAME || '',
      password: process.env.HH_PASSWORD || ''
    };
    if (!credentials.username || !credentials.password) {
      throw new Error('Credentials not found in environment variables');
    }
    if (!this.page) throw new Error('Browser not initialized');

    await this.page.goto('https://spb.hh.ru/account/login');

    // Клик по "Войти"
    await this.page.click('button:has-text("Войти")');

    // Клик по "Почта"
    await this.page.click('div[class^="magritte-label"]:has-text("Почта")');

    // // Ждём появления радио-кнопки для EMAIL
    // await this.page.waitForSelector('input[data-qa="credential-type-EMAIL"]');
    await this.page.click('button:has-text("Войти с паролем")');

    // Ожидание загрузки формы
    await this.page.waitForSelector('input[name="username"]');
    await this.page.fill('input[name="username"]', credentials.username);

    // Клик по разделу "Войти с паролем"
    await this.page.click('button:has-text("Войти с паролем")');
    
    // Ввод пароля
    await this.page.fill('input[name="password"]', credentials.password);
    
    // Нажатие кнопки входа
    await Promise.all([
      this.page.click('button:has-text("Войти")'),
      this.page.waitForNavigation({ waitUntil: 'networkidle' })
    ]);

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
    if (!this.page) return false;
    try {
      // Проверяем наличие элементов, присутствующих только после входа
      const profileElements = await this.page.$$('[class^="magritte-button"]:has-text("Создать резюме")');
      return profileElements.length > 0;
    } catch (error) {
      console.error('Ошибка проверки статуса входа:', error);
      return false;
    }
  }

  async getPagesCount(): Promise<number> {
    if (!this.page) throw new Error('Browser not initialized');

    const pagerPages = await this.page.locator('[data-qa="pager-page"]').all();
    const lastPageElement = pagerPages[pagerPages.length - 1];
    const lastPageText = await lastPageElement.textContent();
    return parseInt(lastPageText || '1');
  }  

  async searchVacancies(params: SearchParams, neededNewVacancies: number): Promise<string[]> {
    if (!this.page) throw new Error('Browser not initialized');

    // Загружаем список уже посещенных вакансий
    this.visitedVacancies = await loadVisitedVacancies();

    const searchUrl = `https://spb.hh.ru/search/vacancy?salary=&ored_clusters=true&hhtmFrom=vacancy_search_list&hhtmFromLabel=vacancy_search_line`;
    
    // Переход на главную страницу
    await this.page.goto(`${searchUrl}&text=${params.query}`);
    await this.page.waitForSelector('[data-qa="vacancy-serp__results"]');
  
    // Проверка, есть ли еще страницы с результатами
    const pageCount = await this.getPagesCount();
    
    const newVacancies = [];
    let currentPage = pageCount - 1;
    
    while (newVacancies.length < neededNewVacancies && currentPage >= 0) {
      await this.page.goto(`${searchUrl}&text=${params.query}&page=${currentPage}`);
      await this.page.waitForSelector('[data-qa="vacancy-serp__results"]');
      
      const vacancyLinks = await this.page.evaluate(() => {
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
    if (!this.page) throw new Error('Page not initialized');

    try {
      // Просто переходим по ссылке (в текущей вкладке)
      await Promise.all([
        this.page.click(`a[href="${vacancyUrl}"]`)
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
    if (!this.page) throw new Error('Browser not initialized');

    // Поиск элемента, содержащего информацию об активности
    try {
      // Попробуем найти элемент, связанный с активностью соискателя
      const activityElements = await this.page.$$('.bloko-progress-bar, [data-qa*="activity"], .applicant-proficiency-rate');
      
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
        // Возможно, информация об активности находится в другом месте
        const textBasedSearch = await this.page.evaluate(() => {
          // Ищем текст, содержащий слова, связанные с активностью
          const bodyText = document.body.innerText.toLowerCase();
          
          if (bodyText.includes('активность') || bodyText.includes('activity')) {
            const percentMatches = bodyText.match(/(\d+)%/g);
            if (percentMatches) {
              // Возвращаем наибольший найденный процент
              return Math.max(...percentMatches.map(match => parseInt(match)));
            }
          }
          return 0;
        });
        
        if (textBasedSearch > 0) {
          percentage = textBasedSearch;
        }
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
    // Импортируем broadcastProgress только если он доступен
    let broadcastProgress: ((progress: number, status: string) => void) | undefined;
    try {
      ({ broadcastProgress } = await import('../../lib/sse'));
    } catch (error) {
      console.warn('SSE progress broadcasting is not available:', error);
    }
    if (!(await this.login())) {
      throw new Error('Failed to login');
    }

    let activityStatus = await this.getActivityStatus();
    console.log(`Начальный уровень активности: ${activityStatus.percentage}%`);
    
    // Отправляем начальный прогресс клиенту через SSE
    if (broadcastProgress) {
      broadcastProgress(activityStatus.percentage, `Начальный уровень активности: ${activityStatus.percentage}%`);
    }
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
        // toDo: comment for testing
        if (activityStatus.percentage >= FULL_PROGRESS) {
          break;
        }
        
        console.log(`Открываю вакансию: ${getIdFromUrl(url)}`);
        await this.openVacancy(url);
        
        // Задержка между открытиями вакансий
        await this.page!.waitForTimeout(this.config.delayBetweenViews);
        
        // Проверяем статус активности
        activityStatus = await this.getActivityStatus();
        console.log(`Текущий уровень активности: ${activityStatus.percentage}%`);
        
        // Отправляем обновление прогресса клиенту через SSE
        if (broadcastProgress) {
          broadcastProgress(activityStatus.percentage, `Текущий уровень активности: ${activityStatus.percentage}%`);
        }
        
        // toDo: comment for testing
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
    if (!this.page) throw new Error('Browser not initialized');
    const cvUrl = `https://spb.hh.ru/applicant/resumes`;
    
    // Переход на главную страницу
    await this.page.goto(cvUrl);
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
    }
  }
}

