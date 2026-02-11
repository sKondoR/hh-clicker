'use client'

import React, { useState, useEffect } from 'react';
import { useSSE } from '@/hooks/useSSE';

const DEFAULT_QUERY = 'java';
const MAX_PROGRESS = 100;
const HIGH_ACTIVITY_THRESHOLD = 80;

const HomeForm: React.FC = () => {
  const [isScraping, setIsScraping] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [status, setStatus] = useState('Готов');
  const [query, setQuery] = useState(DEFAULT_QUERY);

  // Запрос начального статуса активности при монтировании компонента
  useEffect(() => {
    const fetchInitialActivity = async () => {
      try {
        await fetch('/api/activity');
      } catch (error) {
        setStatus(`Ошибка загрузки активности: ${(error as Error).message}`);
      }
    };

    fetchInitialActivity();
  }, []);

  useSSE(setProgress, setStatus);

  const startScraping = async () => {
    setIsScraping(true);
    setStatus('Запуск процесса...');
    
    try {
      const response = await fetch(`/api/activity?query=${encodeURIComponent(query)}`);
      if (!response.ok) {
        const err = await response.text();
        throw new Error(`Error for request /api/activity: ${err}`);
      }
      
      const { activityPercentage } = await response.json();
      setProgress(activityPercentage);
      setStatus('Готов');
    } catch (error) {
      setStatus('Ошибка: ' + (error as Error).message);
    } finally {
      setIsScraping(false);
    }
  };

  const stopScraping = () => {
    setIsScraping(false);
    setStatus('Остановлено пользователем');
  };

  // Button disabled logic
  const isStartButtonDisabled = progress === null || progress === MAX_PROGRESS || isScraping;
  const isStopButtonDisabled = !isScraping;

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-3xl font-bold text-teal-700">
        HH Clicker
      </h1>
      <h2 className="text-xl text-gray-500 mb-8 leading-none">
        Автоматическое повышение активности на <span className="font-bold text-red-500">HeadHunter</span>
      </h2>
    
      <div> 
        <div className="mb-6">
          <input 
            type="text" 
            placeholder="Введите поисковый запрос" 
            className="w-full px-3 py-2 text-gray-700 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            onChange={(e) => setQuery(e.target.value)}
            value={query}
            disabled={isScraping}
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Статус активности</span>
            <span className="text-sm font-medium text-gray-700">{progress !== null ? `${progress}%` : 'Загрузка...'}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`${progress !== null && progress > HIGH_ACTIVITY_THRESHOLD ? 'bg-green-600 ' : 'bg-red-600'}
                h-2.5 rounded-full transition-all duration-300`}
              style={{ width: `${progress !== null ? progress : 0}%` }}
            ></div>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600">Статус: {status}</p>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={startScraping}
            disabled={isStartButtonDisabled}
            className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50
              ${isStartButtonDisabled ? '' : ' cursor-pointer hover:bg-green-700'}
            `}
          >
            {isScraping ? 'Выполняется...' : 'Повысить активность'}
          </button>
          
          <button
            onClick={stopScraping}
            disabled={isStopButtonDisabled}
            className={`flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50
              ${isStopButtonDisabled ? '' : ' cursor-pointer hover:bg-red-700'}
            `}
          >
            Остановить
          </button>
        </div>
        
        <div className="mt-6 text-sm text-gray-500">
          <p>Приложение будет автоматически открывать вакансии по запросу (например &quot;java&quot;) до достижения 100% активности.</p>
        </div>
      </div>
    </div>
  );
};

export default HomeForm;