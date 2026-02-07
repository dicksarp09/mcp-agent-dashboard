import React, { ReactNode } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string | number;
  subtext?: string;
  trend?: { value: number; direction: 'up' | 'down' };
  icon: ReactNode;
  iconBg: string;
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  subtext,
  trend,
  icon,
  iconBg
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center`}>
          {icon}
        </div>
      </div>
      
      {trend && (
        <div className="flex items-center gap-1">
          {trend.direction === 'up' ? (
            <>
              <ChevronUp className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-green-500">{trend.value}%</span>
              <span className="text-sm text-gray-400 ml-1">from last month</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-red-500">{trend.value}%</span>
              <span className="text-sm text-gray-400 ml-1">from last month</span>
            </>
          )}
        </div>
      )}
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
        <span className={`text-xs ${
          change.trend === 'up' ? 'text-green-600' : 
          change.trend === 'down' ? 'text-red-600' : 'text-gray-600'
        }`}>
          {change.trend === 'up' && '↑'}
          {change.trend === 'down' && '↓'}
          {change.trend === 'stable' && '→'}
          {change.value}%
        </span>
      )}
    </div>
  </div>
);
