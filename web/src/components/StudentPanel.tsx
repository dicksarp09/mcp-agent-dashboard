import React from 'react';
import clsx from 'clsx';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { StudentDocument, AnalysisResult } from '../api/client';
import { Stat } from './KPICard';

interface StudentPanelProps {
  student: StudentDocument;
  analysis?: AnalysisResult;
  onClose: () => void;
}

export const StudentPanel: React.FC<StudentPanelProps> = ({
  student,
  analysis,
  onClose
}) => {
  const [activeTab, setActiveTab] = React.useState<'overview' | 'grades' | 'metrics'>('overview');

  const gradeData = [
    { period: 'G1 (1st)', grade: student.G1 || 0 },
    { period: 'G2 (2nd)', grade: student.G2 || 0 },
    { period: 'G3 (Final)', grade: student.G3 || 0 }
  ];

  const avgGrade = (((student.G1 || 0) + (student.G2 || 0) + (student.G3 || 0)) / 3).toFixed(1);

  const getRiskColor = (level?: string) => {
    switch (level) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gray-50 border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{student.name || 'Student'}</h2>
            <p className="text-sm text-gray-500 mt-1">ID: {student._id}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 font-bold text-xl"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
          <div className="flex gap-6">
            {(['overview', 'grades', 'metrics'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={clsx('py-4 px-1 border-b-2 font-medium text-sm capitalize', {
                  'border-blue-500 text-blue-600': activeTab === tab,
                  'border-transparent text-gray-600 hover:text-gray-900': activeTab !== tab
                })}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <h3 className="font-semibold text-gray-900 mb-3">Summary</h3>
                {analysis?.summary ? (
                  <div className="space-y-2">
                    <Stat label="Average Grade" value={analysis.summary.average_grade.toFixed(1)} />
                    <Stat label="Growth" value={analysis.summary.growth} />
                    <Stat
                      label="Study Efficiency"
                      value={analysis.summary.study_efficiency}
                    />
                    <Stat
                      label="At Risk"
                      value={analysis.summary.at_risk ? '⚠️ Yes' : '✓ No'}
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Stat label="Average Grade" value={avgGrade} />
                    <Stat label="Final Grade (G3)" value={student.G3 || '—'} />
                    <Stat label="Study Time" value={`${student.studytime || 0}h/week`} />
                  </div>
                )}
              </div>

              {analysis?.trend && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Trend</h3>
                  <p className="text-sm text-gray-700">
                    {analysis.trend.direction} {analysis.trend.sparkline}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'grades' && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-4">Grade Progression</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={gradeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis domain={[0, 20]} />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="grade"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      dot={{ fill: '#3b82f6', r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">1st Period</p>
                  <p className="text-2xl font-bold text-blue-600">{student.G1 || '—'}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">2nd Period</p>
                  <p className="text-2xl font-bold text-blue-600">{student.G2 || '—'}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600">Final</p>
                  <p className="text-2xl font-bold text-blue-600">{student.G3 || '—'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'metrics' && (
            <div className="space-y-4">
              {analysis?.metrics && (
                <>
                  <div className={clsx('rounded-lg p-4 border', {
                    'bg-green-50 border-green-200': analysis.metrics.risk_level === 'low',
                    'bg-yellow-50 border-yellow-200': analysis.metrics.risk_level === 'medium',
                    'bg-red-50 border-red-200': analysis.metrics.risk_level === 'high'
                  })}>
                    <h3 className="font-semibold text-gray-900 mb-2">Risk Assessment</h3>
                    <p className={clsx('text-sm font-medium', getRiskColor(analysis.metrics.risk_level))}>
                      {analysis.metrics.risk_level?.toUpperCase() || 'UNKNOWN'}
                    </p>
                  </div>

                  {analysis.metrics.alerts.length > 0 && (
                    <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <h3 className="font-semibold text-gray-900 mb-2">Alerts</h3>
                      <ul className="space-y-1">
                        {analysis.metrics.alerts.map((alert, idx) => (
                          <li key={idx} className="text-sm text-red-700 flex items-start gap-2">
                            <span className="text-red-600 font-bold">•</span>
                            {alert}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h3 className="font-semibold text-gray-900">Behavioral Metrics</h3>
                <Stat label="Absences" value={student.absences || 0} />
                <Stat label="Failures" value={student.failures || 0} />
                <Stat label="Workday Alcohol (Dalc)" value={`${student.Dalc || 0}/5`} />
                <Stat label="Weekend Alcohol (Walc)" value={`${student.Walc || 0}/5`} />
                <Stat label="Social Outings (goout)" value={`${student.goout || 0}/5`} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
