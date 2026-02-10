'use client';

import { ApiExecution } from '@/lib/types';
import { useState, useEffect } from 'react';

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

    // Poll every 5 minutes (300000 ms)
    const interval = setInterval(() => {
      fetchLogs();
    }, 300000);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="logs-container mx-20 text-2xl">Загрузка логов...</div>;
  }

  return (
    <div className="logs-container mx-20">
      <h2 className="text-xl">Логи за неделю:</h2>
      {logs.length === 0 ? (
        <p className="text-sm">Нет доступных логов за последние 7 дней.</p>
      ) : (
        <table className="logs-table text-sm text-left">
          <thead>
            <tr className="text-pink-700 text-bold">
              <th className="pr-6">Endpoint</th>
              <th className="pr-6">Status</th>
              <th className="pr-6">Time</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="log-entry">
                <td className="pr-6">{log.endpoint}</td>
                <td className="pr-6">{log.status}</td>
                <td className="pr-6">{new Date(log.executedAt).toLocaleString()}</td>
                <td>{log.details && <span><strong>Details:</strong> {log.details}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}