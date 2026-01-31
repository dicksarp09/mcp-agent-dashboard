import React, { useState } from 'react';
import clsx from 'clsx';
import { ChevronDown } from 'lucide-react';

interface SidebarProps {
  onFilterChange: (filters: FilterState) => void;
  isOpen: boolean;
}

export interface FilterState {
  gradeMin: number;
  gradeMax: number;
  riskStatus: '' | 'at-risk' | 'healthy' | 'improving' | 'declining';
  studytimeMin: number;
  studytimeMax: number;
}

export const Sidebar: React.FC<SidebarProps> = ({ onFilterChange, isOpen }) => {
  const [filters, setFilters] = useState<FilterState>({
    gradeMin: 0,
    gradeMax: 20,
    riskStatus: '',
    studytimeMin: 0,
    studytimeMax: 4
  });

  const [expandedSections, setExpandedSections] = useState({
    grades: true,
    risk: true,
    studytime: true
  });

  const handleFilterChange = (newFilters: Partial<FilterState>) => {
    const updated = { ...filters, ...newFilters };
    setFilters(updated);
    onFilterChange(updated);
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  return (
    <aside className={clsx(
      'fixed lg:static inset-y-0 left-0 z-30 w-64 bg-white border-r border-gray-200 overflow-y-auto transition-transform lg:translate-x-0',
      isOpen ? 'translate-x-0' : '-translate-x-full'
    )}>
      <div className="p-6 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4">Filters</h2>
          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm">
            📥 Export Data
          </button>
        </div>

        {/* Grade Range */}
        <div className="space-y-3">
          <button
            onClick={() => toggleSection('grades')}
            className="flex items-center justify-between w-full font-semibold text-gray-900"
          >
            Grade Range
            <ChevronDown size={18} className={expandedSections.grades ? 'rotate-180' : ''} />
          </button>
          {expandedSections.grades && (
            <div className="space-y-3 pl-3">
              <div>
                <label className="text-xs text-gray-600">Min: {filters.gradeMin}</label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={filters.gradeMin}
                  onChange={(e) => handleFilterChange({ gradeMin: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Max: {filters.gradeMax}</label>
                <input
                  type="range"
                  min="0"
                  max="20"
                  value={filters.gradeMax}
                  onChange={(e) => handleFilterChange({ gradeMax: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        {/* Risk Status */}
        <div className="space-y-3">
          <button
            onClick={() => toggleSection('risk')}
            className="flex items-center justify-between w-full font-semibold text-gray-900"
          >
            Risk Status
            <ChevronDown size={18} className={expandedSections.risk ? 'rotate-180' : ''} />
          </button>
          {expandedSections.risk && (
            <div className="space-y-2 pl-3">
              {['at-risk', 'healthy', 'improving', 'declining'].map((status) => (
                <label key={status} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="riskStatus"
                    value={status}
                    checked={filters.riskStatus === status}
                    onChange={(e) => handleFilterChange({ riskStatus: e.target.value as any })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700 capitalize">{status}</span>
                </label>
              ))}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="riskStatus"
                  value=""
                  checked={filters.riskStatus === ''}
                  onChange={(e) => handleFilterChange({ riskStatus: '' })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-gray-700">All</span>
              </label>
            </div>
          )}
        </div>

        {/* Study Time */}
        <div className="space-y-3">
          <button
            onClick={() => toggleSection('studytime')}
            className="flex items-center justify-between w-full font-semibold text-gray-900"
          >
            Study Time (hours/week)
            <ChevronDown size={18} className={expandedSections.studytime ? 'rotate-180' : ''} />
          </button>
          {expandedSections.studytime && (
            <div className="space-y-3 pl-3">
              <div>
                <label className="text-xs text-gray-600">Min: {filters.studytimeMin}h</label>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={filters.studytimeMin}
                  onChange={(e) => handleFilterChange({ studytimeMin: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600">Max: {filters.studytimeMax}h</label>
                <input
                  type="range"
                  min="0"
                  max="4"
                  step="1"
                  value={filters.studytimeMax}
                  onChange={(e) => handleFilterChange({ studytimeMax: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>
            </div>
          )}
        </div>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">Backend: MCP + LangGraph</p>
          <p className="text-xs text-gray-500">Updated: Real-time</p>
        </div>
      </div>
    </aside>
  );
};
