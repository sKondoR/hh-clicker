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
    <thead className="sticky top-0 z-10 bg-slate-200">
      <tr>
        {columns.map((column) => (
          <th
            key={column.key}
            className={`pr-6 whitespace-nowrap px-2 py-1 font-semibold ${column.className || ''}`}
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
    <tr className="hover:bg-white/30 border-t border-black/80 transition-colors duration-150">
      <td className="pr-6 whitespace-nowrap align-top px-2 py-1">{log.endpoint}</td>
      <td className="pr-6 whitespace-nowrap align-top px-2 py-1">{log.status}</td>
      <td className="pr-6 whitespace-nowrap align-top px-2 py-1">
        {new Date(log.executedAt).toLocaleString('ru-RU')}
      </td>
      <td className="align-top px-2 py-1">{log.details}</td>
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
    <div className="text-xs h-50 overflow-y-auto bg-slate-200/50">
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
    <div className="flex items-center gap-2">
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