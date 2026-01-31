import React, { ReactNode } from 'react';
import clsx from 'clsx';

interface KPICardProps {
  title: string;
  value: ReactNode;
  subtext?: string;
  status?: 'success' | 'warning' | 'critical' | 'info';
  icon?: ReactNode;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtext,
  status = 'info',
  icon
}) => {
  const statusColors = {
    success: 'bg-green-50 border-green-200',
    warning: 'bg-yellow-50 border-yellow-200',
    critical: 'bg-red-50 border-red-200',
    info: 'bg-blue-50 border-blue-200'
  };

  const textColors = {
    success: 'text-green-700',
    warning: 'text-yellow-700',
    critical: 'text-red-700',
    info: 'text-blue-700'
  };

  return (
    <div className={clsx('rounded-lg border p-6', statusColors[status])}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-600">{title}</p>
          <p className={clsx('mt-2 text-3xl font-bold', textColors[status])}>
            {value}
          </p>
          {subtext && <p className="mt-1 text-xs text-gray-500">{subtext}</p>}
        </div>
        {icon && <div className="text-2xl">{icon}</div>}
      </div>
    </div>
  );
};

interface StatProps {
  label: string;
  value: string | number;
  change?: { value: number; trend: 'up' | 'down' | 'stable' };
}

export const Stat: React.FC<StatProps> = ({ label, value, change }) => (
  <div className="flex items-center justify-between">
    <span className="text-sm text-gray-600">{label}</span>
    <div className="flex items-center gap-2">
      <span className="font-semibold text-gray-900">{value}</span>
      {change && (
        <span className={clsx('text-xs', {
          'text-green-600': change.trend === 'up',
          'text-red-600': change.trend === 'down',
          'text-gray-600': change.trend === 'stable'
        })}>
          {change.trend === 'up' && '↑'}
          {change.trend === 'down' && '↓'}
          {change.trend === 'stable' && '→'}
          {change.value}%
        </span>
      )}
    </div>
  </div>
);
