'use client';

import { ApiExecution } from '@/lib/types';
import { useState, useEffect } from 'react';

// Define polling interval constant
const POLLING_INTERVAL = 60000; // 1 minute in milliseconds

export default function Logs() {
  const [logs, setLogs] = useState<ApiExecution[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/log');
      if (!response.ok) {
        throw new Error('Failed to fetch logs');
      }
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    // Set up polling
    const interval = setInterval(fetchLogs, POLLING_INTERVAL);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="logs-container mx-20 text-2xl">Загрузка логов...</div>;
  }

  return (
    <div className="logs-container mx-20">
      <h2 className="text-xl mb-2">Логи за неделю:</h2>
      {logs.length === 0 ? (
        <p className="text-sm">Нет доступных логов за последние 7 дней.</p>
      ) : (
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
              {logs.map((log) => (
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
      )}
    </div>
  );
}