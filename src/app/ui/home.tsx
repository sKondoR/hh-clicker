'use client'

import React, { useState } from 'react';
import { useSSE } from '@/hooks/useSSE';

const Home: React.FC = () => {
  const [isScraping, setIsScraping] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('Готов');
  const [query, setQuery] = useState('java');

  useSSE(isScraping, setProgress, setStatus);

  const startScraping = async () => {
 
    setIsScraping(true);
    setStatus('Запуск процесса...');
    
    try {
       const response = await fetch(`/api/scrap?query=${query}`);
       if (response.ok) {
        setIsScraping(false);
        setStatus('Готов');
       }
       const { activityPercentage } = await response.json();
       setProgress(activityPercentage);
    } catch (error) {
      setStatus('Ошибка: ' + (error as Error).message);
      setIsScraping(false);
    }
  };

  const stopScraping = () => {
    setIsScraping(false);
    setStatus('Остановлено пользователем');
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
      <h1 className="text-2xl font-bold text-pink-700">
        HH Clicker
      </h1>
      <h2 className="text-xl font-bold text-gray-700 mb-8">
        Автоматическое повышение активности на HeadHunter
      </h2>
    
      <div> 
        <div className="mb-6">
          <input 
            type="text" 
            placeholder="Введите поисковый запрос" 
            className="w-full px-3 py-2 text-gray-700 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            onChange={(e) => setQuery(e.target.value)}
            value={query}
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium text-gray-700">Статус активности</span>
            <span className="text-sm font-medium text-gray-700">{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
        
        <div className="mb-6">
          <p className="text-sm text-gray-600">Статус: {status}</p>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={startScraping}
            disabled={isScraping}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isScraping ? 'Выполняется...' : 'Начать просмотр'}
          </button>
          
          <button
            onClick={stopScraping}
            disabled={!isScraping}
            className="flex-1 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50"
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

export default Home;