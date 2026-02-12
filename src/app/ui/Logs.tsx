'use client';


import { ApiExecution } from '@/lib/types';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';


export default function Logs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['logs'],
    queryFn: () => fetch('/api/log').then(res => res.json()),
    refetchInterval: 60000, // Poll every 60 seconds
    staleTime: 55000, // Consider data stale after 55 seconds
  });

  if (isLoading) {
    return <><FontAwesomeIcon icon={faSpinner} size="1x" spin /> Загрузка логов...</>;
  }

  if (!logs || logs.length === 0) {
    return <>Нет доступных логов за последние 7 дней.</>;
  }

  return (
    <div className="text-xs h-50 overflow-y-auto text bg-slate-200/50">
      <table className="text-left w-full relative">
        <thead className="sticky top-0 z-10 bg-slate-200">
          <tr className="text-bold">
            <th className="pr-6 whitespace-nowrap px-2 py-1">Endpoint</th>
            <th className="pr-6 whitespace-nowrap px-2 py-1">Status</th>
            <th className="pr-6 whitespace-nowrap px-2 py-1">Time</th>
            <th className="whitespace-nowrap px-2 py-1">Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log: ApiExecution) => (
            <tr key={log.id} className="log-entry hover:bg-white/30 border-t border-black/80">
              <td className="pr-6 whitespace-nowrap align-top px-2 py-1">{log.endpoint}</td>
              <td className="pr-6 whitespace-nowrap align-top px-2 py-1">{log.status}</td>
              <td className="pr-6 whitespace-nowrap align-top px-2 py-1">
                {new Date(log.executedAt).toLocaleString('ru-RU')}
              </td>
              <td className="align-top px-2 py-1">{log.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}