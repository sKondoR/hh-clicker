'use client'

import React, { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';

import { useSSE } from '@/hooks/useSSE';

const DEFAULT_QUERY = 'java';
const MAX_PROGRESS = 100;
const HIGH_ACTIVITY_THRESHOLD = 80;

const HomeForm: React.FC = () => {
  const [isScraping, setIsScraping] = useState(false);
  const [progress, setProgress] = useState<number | null | undefined>(undefined);
  const [status, setStatus] = useState('Готов');
  const [query, setQuery] = useState(DEFAULT_QUERY);

  // Запрос начального статуса активности при монтировании компонента
  useEffect(() => {
    const fetchInitialActivity = async () => {
      try {
        const response = await fetch('/api/activity');
        if (!response.ok) {
          const err = await response.text();
          throw new Error(`Error for request /api/activity: ${err}`);
        }
        const { activityPercentage } = await response.json();
        setProgress(activityPercentage);
        setStatus('Готов');
      } catch (error) {
        setStatus(`Ошибка загрузки активности: ${(error as Error).message}`);
        setProgress(null);
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
  const isStartButtonDisabled = progress === undefined || progress === MAX_PROGRESS || isScraping;
  const isStopButtonDisabled = !isScraping;

  return (
    <div className="max-w-lg mx-auto backdrop-blur-2xl bg-white/10 border border-white/20 rounded-lg shadow-2xl p-6">
      <h1 className="text-center text-4xl font-bold bg-linear-to-r from-red-500 via-red-500 to-pink-300 bg-clip-text text-transparent mb-2">
        HH Clicker
      </h1>
      <h2 className="text-center text-slate-300 text-sm mb-8 leading-none">
        Автоматическое повышение активности на <span className="font-bold text-red-500">HeadHunter</span>
      </h2>
    
      <div> 
        <div className="mb-6">
          <div className="text-slate-200 text-sm font-medium mb-2">Поиск вакансий по ключевому слову</div>
          <input 
            type="text" 
            placeholder="Введите поисковый запрос" 
            className="w-full px-3 py-2 bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900 backdrop-blur-sm border border-white/40 rounded-lg 
                       text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/70 
                       focus:border-cyan-400/50 transition-all duration-300"
            onChange={(e) => setQuery(e.target.value)}
            value={query}
            disabled={isScraping}
          />
        </div>

        <div className="mb-6">
          <div className="flex justify-between">
            <div className="text-slate-200 text-sm font-medium mb-2">Статус активности</div>
            <div className={`font-bold text-lg 
                ${progress && progress > 80 ? ' text-green-400' : ' text-red-400'}
              `}>
              {progress === null && '?'}
              {progress === undefined && <FontAwesomeIcon icon={faSpinner} spin />}
              {progress !== null && progress !== undefined && `${progress}%`}
            </div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className={`
                ${progress === null || progress === undefined ? 'from-gray-300 via-gray-600 to-gray-300 ' : ''}
                ${progress && (progress > HIGH_ACTIVITY_THRESHOLD ? 'from-green-300 via-green-600 to-green-300 ' : 'from-red-300 via-red-600 to-red-300 ')}
                h-2.5 bg-linear-to-r  rounded-lg transition-all duration-500 shadow-lg shadow-cyan-500/50`}
              style={{ width: `${progress !== null ? progress : 0}%` }}
            ></div>
          </div>
        </div>
        <div className="mb-6">
          <p className="text-slate-200 text-sm font-medium">Статус: {status}</p>
        </div>
        
        <div className="flex space-x-4">
          <button
            onClick={startScraping}
            disabled={isStartButtonDisabled}
            className={`flex-1 px-3 py-3
              bg-linear-to-r from-emerald-400 to-cyan-400 hover:from-emerald-500 hover:to-cyan-500 
              disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed disabled:opacity-50
              text-white font-semibold rounded-lg transition-all duration-300 
              shadow-xl shadow-emerald-400/30 hover:not(:disabled):shadow-emerald-400/50 hover:not(:disabled):scale-[1.02]
              active:not(:disabled):scale-[0.98]
            `}
          >
            {isScraping ? <><FontAwesomeIcon icon={faSpinner} spin /> Выполняется...</> : 'Повысить активность'}
          </button>
          
          <button
            onClick={stopScraping}
            disabled={isStopButtonDisabled}
            className={`flex-1 px-3 py-3
              bg-linear-to-r from-pink-400 to-red-400 hover:from-pink-500 hover:to-red-500 
              disabled:from-slate-600 disabled:to-slate-700 disabled:cursor-not-allowed disabled:opacity-50
              text-white font-semibold rounded-lg transition-all duration-300 
              shadow-xl shadow-pink-400/30 hover:not(:disabled):shadow-pink-400/50 hover:not(:disabled):scale-[1.02]
              active:not(:disabled):scale-[0.98]'}
            `}
          >
            Остановить
          </button>
        </div>
        
        <div className="mt-6 text-slate-200 text-sm font-medium ">
          <p>Приложение будет автоматически открывать вакансии по запросу (например &quot;java&quot;) до достижения 100% активности.</p>
        </div>
      </div>
    </div>
  );
};

export default HomeForm;