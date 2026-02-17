'use client';

import { ApiExecution } from '@/lib/types';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useQuery } from '@tanstack/react-query';

interface LogsTableProps {
  logs: ApiExecution[];
}

interface LogsTableHeaderProps {
  columns: { key: string; label: string; className?: string }[];
}

interface LogsTableRowProps {
  log: ApiExecution;
}

const LogsTableHeader = ({ columns }: LogsTableHeaderProps) => {
  return (
    <thead className="sticky top-0 z-10">
      <tr className="border-b border-white/10 bg-linear-to-b from-slate-900 via-indigo-950 to-slate-900">
        {columns.map((column) => (
          <th
            key={column.key}
            className={`pr-6 whitespace-nowrap px-2 py-3 text-left text-slate-200 font-semibold text-sm ${column.className || ''}`}
          >
            {column.label}
          </th>
        ))}
      </tr>
    </thead>
  );
};

const LogsTableRow = ({ log }: LogsTableRowProps) => {
  return (
    <tr className="border-b border-white/10 hover:bg-white/10 transition-colors duration-200">
      <td className="pr-6 whitespace-nowrap align-top px-2 py-2">{log.endpoint}</td>
      <td className="pr-6 whitespace-nowrap align-top px-2 py-2">{log.status}</td>
      <td className="pr-6 whitespace-nowrap align-top px-2 py-2">
        {new Date(log.executedAt).toLocaleString('ru-RU')}
      </td>
      <td className="align-top px-2 py-2">{log.details}</td>
    </tr>
  );
};

const LogsTable = ({ logs }: LogsTableProps) => {
  const columns = [
    { key: 'endpoint', label: 'Endpoint' },
    { key: 'status', label: 'Status' },
    { key: 'time', label: 'Time' },
    { key: 'details', label: 'Details' },
  ];

  return (
    <div className="text-slate-200 text-xs h-50 overflow-y-auto">
      <table className="text-left w-full relative">
        <LogsTableHeader columns={columns} />
        <tbody>
          {logs.map((log) => (
            <LogsTableRow key={log.id} log={log} />
        ))}
        </tbody>
      </table>
    </div>
  );
};

const LoadingState = () => {
  return (
    <div className="flex items-center gap-2 text-slate-200">
      <FontAwesomeIcon icon={faSpinner} size="1x" spin />
      <span>Загрузка логов...</span>
    </div>
  );
};

const EmptyState = () => {
  return <div>Нет доступных логов за последние 7 дней.</div>;
};

export default function Logs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['logs'],
    queryFn: () => fetch('/api/log').then((res) => res.json()),
    refetchInterval: 60000, // Poll every 60 seconds
    staleTime: 55000, // Consider data stale after 55 seconds
  });

  if (isLoading) {
    return <LoadingState />;
  }

  if (!logs || logs.length === 0) {
    return <EmptyState />;
  }

  return <LogsTable logs={logs} />;
}