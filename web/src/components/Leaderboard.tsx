import React, { useState, useMemo } from 'react';
import clsx from 'clsx';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { StudentDocument } from '../api/client';

interface LeaderboardProps {
  students: StudentDocument[];
  onSelectStudent: (student: StudentDocument) => void;
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
}

type SortKey = 'name' | 'G3' | 'trend';
type SortOrder = 'asc' | 'desc';

export const Leaderboard: React.FC<LeaderboardProps> = ({
  students,
  onSelectStudent,
  currentPage = 1,
  pageSize = 20,
  onPageChange
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('G3');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const getTrend = (g1: number, g2: number, g3: number) => {
    if (g3 > g2 && g2 > g1) return 'improving';
    if (g3 < g2 && g2 < g1) return 'declining';
    return 'stable';
  };

  const getRiskStatus = (g3: number) => {
    if (g3 < 10) return { label: 'critical', color: 'text-red-600 bg-red-50' };
    if (g3 < 12) return { label: 'at-risk', color: 'text-yellow-600 bg-yellow-50' };
    return { label: 'healthy', color: 'text-green-600 bg-green-50' };
  };

  const sortedStudents = useMemo(() => {
    return [...students].sort((a, b) => {
      let aVal, bVal;

      if (sortKey === 'G3') {
        aVal = a.G3 || 0;
        bVal = b.G3 || 0;
      } else if (sortKey === 'name') {
        aVal = (a.name || '').toLowerCase();
        bVal = (b.name || '').toLowerCase();
      } else {
        const aTrend = getTrend(a.G1 || 0, a.G2 || 0, a.G3 || 0);
        const bTrend = getTrend(b.G1 || 0, b.G2 || 0, b.G3 || 0);
        aVal = aTrend;
        bVal = bTrend;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' ? aVal.localeCompare(bVal as string) : (bVal as string).localeCompare(aVal);
      }

      return sortOrder === 'asc' ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
    });
  }, [students, sortKey, sortOrder]);

  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedStudents.slice(start, start + pageSize);
  }, [sortedStudents, currentPage, pageSize]);

  const totalPages = Math.ceil(sortedStudents.length / pageSize);

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <div className="w-4 h-4" />;
    return sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />;
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
      <table className="w-full">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Rank</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('name')}>
              <div className="flex items-center gap-2">
                Name / ID <SortIcon column="name" />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('G3')}>
              <div className="flex items-center gap-2">
                Final Grade (G3) <SortIcon column="G3" />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider cursor-pointer hover:bg-gray-100" onClick={() => handleSort('trend')}>
              <div className="flex items-center gap-2">
                Trend <SortIcon column="trend" />
              </div>
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Risk Status</th>
          </tr>
        </thead>
        <tbody>
          {paginatedStudents.map((student, idx) => {
            const rank = (currentPage - 1) * pageSize + idx + 1;
            const trend = getTrend(student.G1 || 0, student.G2 || 0, student.G3 || 0);
            const risk = getRiskStatus(student.G3 || 0);

            return (
              <tr
                key={student._id}
                className="border-b border-gray-200 hover:bg-blue-50 cursor-pointer transition"
                onClick={() => onSelectStudent(student)}
              >
                <td className="px-6 py-4 text-sm font-semibold text-gray-900">{rank}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="font-medium text-gray-900">{student.name || 'N/A'}</div>
                  <div className="text-xs text-gray-500">{student._id}</div>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-gray-900">{student.G3 || '—'}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={clsx('px-2 py-1 rounded text-xs font-medium', {
                    'bg-green-100 text-green-800': trend === 'improving',
                    'bg-red-100 text-red-800': trend === 'declining',
                    'bg-gray-100 text-gray-800': trend === 'stable'
                  })}>
                    {trend}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={clsx('px-2 py-1 rounded text-xs font-medium', risk.color)}>
                    {risk.label}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {totalPages > 1 && (
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {currentPage} of {totalPages} ({sortedStudents.length} students)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 rounded text-sm font-medium bg-gray-200 text-gray-700 disabled:opacity-50 hover:bg-gray-300"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 rounded text-sm font-medium bg-gray-200 text-gray-700 disabled:opacity-50 hover:bg-gray-300"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
