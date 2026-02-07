import React, { ReactNode } from 'react';

interface QuickActionCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  iconBg: string;
  onClick?: () => void;
}

export const QuickActionCard: React.FC<QuickActionCardProps> = ({
  title,
  description,
  icon,
  iconBg,
  onClick
}) => {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-5 bg-white rounded-xl border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all group"
    >
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </button>
  );
};
