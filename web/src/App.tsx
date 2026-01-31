import './index.css';
import React, { useState, useEffect } from 'react';
import { mcpClient, StudentDocument, ClassAnalysisResponse } from './api/client';
import { Navbar } from './components/Navbar';
import { Sidebar, FilterState } from './components/Sidebar';
import { KPICard } from './components/KPICard';
import { Leaderboard } from './components/Leaderboard';
import { StudentPanel } from './components/StudentPanel';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [students, setStudents] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentDocument | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    gradeMin: 0,
    gradeMax: 20,
    riskStatus: '',
    studytimeMin: 0,
    studytimeMax: 4
  });

  useEffect(() => {
    loadClassData();
  }, []);

  const loadClassData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await mcpClient.classAnalysis(500);
      setStudents(response.students || []);
      setCurrentPage(1);
    } catch (err) {
      setError(`Failed to load class data: ${err instanceof Error ? err.message : 'Unknown error'}`);
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(s => {
    const g3 = s.G3 || 0;
    if (g3 < filters.gradeMin || g3 > filters.gradeMax) return false;

    if (filters.riskStatus) {
      if (filters.riskStatus === 'at-risk' && g3 >= 10) return false;
      if (filters.riskStatus === 'healthy' && g3 < 12) return false;
    }

    const st = s.studytime || 0;
    if (st < filters.studytimeMin || st > filters.studytimeMax) return false;

    return true;
  });

  const classStats = {
    avgGrade: (filteredStudents.reduce((sum, s) => sum + (s.G3 || 0), 0) / (filteredStudents.length || 1)).toFixed(1),
    highest: Math.max(...filteredStudents.map(s => s.G3 || 0), 0),
    lowest: Math.min(...filteredStudents.map(s => s.G3 || 0), 20),
    atRiskCount: filteredStudents.filter(s => (s.G3 || 0) < 10).length,
    atRiskPercent: ((filteredStudents.filter(s => (s.G3 || 0) < 10).length / (filteredStudents.length || 1)) * 100).toFixed(1)
  };

  // Grade distribution
  const gradeDistribution = [
    { range: '0-5', count: filteredStudents.filter(s => (s.G3 || 0) < 5).length },
    { range: '5-10', count: filteredStudents.filter(s => (s.G3 || 0) >= 5 && (s.G3 || 0) < 10).length },
    { range: '10-15', count: filteredStudents.filter(s => (s.G3 || 0) >= 10 && (s.G3 || 0) < 15).length },
    { range: '15-20', count: filteredStudents.filter(s => (s.G3 || 0) >= 15).length }
  ];

  // Risk distribution
  const riskDistribution = [
    { name: 'Healthy (≥12)', value: filteredStudents.filter(s => (s.G3 || 0) >= 12).length },
    { name: 'At Risk (<10)', value: filteredStudents.filter(s => (s.G3 || 0) < 10).length },
    { name: 'Warning (10-12)', value: filteredStudents.filter(s => (s.G3 || 0) >= 10 && (s.G3 || 0) < 12).length }
  ];

  const COLORS = ['#10b981', '#ef4444', '#f59e0b'];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar
        onSearch={(query) => console.log('Search:', query)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        sidebarOpen={sidebarOpen}
      />

      <div className="flex">
        <Sidebar
          onFilterChange={setFilters}
          isOpen={sidebarOpen}
        />

        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                {error}
                <button onClick={loadClassData} className="ml-4 underline font-medium">Retry</button>
              </div>
            )}

            {loading ? (
              <div className="flex items-center justify-center h-96">
                <div className="text-center">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                  <p className="text-gray-600">Loading class data...</p>
                </div>
              </div>
            ) : (
              <>
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                  <KPICard
                    title="Avg Final Grade"
                    value={classStats.avgGrade}
                    status={parseFloat(classStats.avgGrade) >= 12 ? 'success' : 'warning'}
                    icon="📊"
                  />
                  <KPICard
                    title="Highest Grade"
                    value={classStats.highest}
                    status="success"
                    icon="⬆️"
                  />
                  <KPICard
                    title="Lowest Grade"
                    value={classStats.lowest}
                    status={classStats.lowest < 10 ? 'critical' : 'warning'}
                    icon="⬇️"
                  />
                  <KPICard
                    title="At-Risk Students"
                    value={classStats.atRiskCount}
                    subtext={`${classStats.atRiskPercent}% of class`}
                    status="critical"
                    icon="⚠️"
                  />
                  <KPICard
                    title="Total Students"
                    value={filteredStudents.length}
                    status="info"
                    icon="👥"
                  />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Grade Distribution */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={gradeDistribution}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Risk Distribution */}
                  <div className="bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Status Distribution</h3>
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={riskDistribution}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {riskDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Leaderboard */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Class Ranking</h3>
                    <p className="text-sm text-gray-500 mt-1">Showing {filteredStudents.length} students</p>
                  </div>
                  <Leaderboard
                    students={filteredStudents}
                    onSelectStudent={setSelectedStudent}
                    currentPage={currentPage}
                    pageSize={20}
                    onPageChange={setCurrentPage}
                  />
                </div>
              </>
            )}
          </div>
        </main>
      </div>

      {selectedStudent && (
        <StudentPanel
          student={selectedStudent}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
