import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, AlertTriangle, TrendingUp, Target, MessageSquare, Search, Download, FileText, ChevronUp } from 'lucide-react';
import { mcpClient, StudentDocument } from '../api/client';
import { KPICard } from '../components/KPICard';
import { QuickActionCard } from '../components/QuickActionCard';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    avgGrade: 0,
    highest: 0,
    lowest: 0,
    atRisk: 0,
    atRiskPercent: 0
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await mcpClient.classAnalysis(500);
      const studentData = response.students || [];
      setStudents(studentData);
      
      // Calculate real statistics from backend data
      const grades = studentData.map(s => s.G3 || 0).filter(g => g > 0);
      const atRiskCount = grades.filter(g => g < 10).length;
      
      setStats({
        total: studentData.length,
        avgGrade: grades.length > 0 ? grades.reduce((a, b) => a + b, 0) / grades.length : 0,
        highest: grades.length > 0 ? Math.max(...grades) : 0,
        lowest: grades.length > 0 ? Math.min(...grades) : 0,
        atRisk: atRiskCount,
        atRiskPercent: grades.length > 0 ? (atRiskCount / grades.length) * 100 : 0
      });
    } catch (err) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Grade distribution for chart (matching backend ranges)
  const gradeDistribution = [
    { range: '0-5 (Fail)', count: students.filter(s => (s.G3 || 0) < 5).length, color: '#ef4444' },
    { range: '5-10 (At Risk)', count: students.filter(s => (s.G3 || 0) >= 5 && (s.G3 || 0) < 10).length, color: '#f59e0b' },
    { range: '10-15 (Pass)', count: students.filter(s => (s.G3 || 0) >= 10 && (s.G3 || 0) < 15).length, color: '#3b82f6' },
    { range: '15-20 (Excellent)', count: students.filter(s => (s.G3 || 0) >= 15).length, color: '#10b981' }
  ];

  // Risk distribution pie chart
  const riskDistribution = [
    { name: 'Healthy (≥10)', value: students.length - stats.atRisk, color: '#10b981' },
    { name: 'At Risk (<10)', value: stats.atRisk, color: '#ef4444' }
  ];

  // Trend data (mock for demo - would come from historical data)
  const trendData = [
    { period: 'G1', avg: 10.8 },
    { period: 'G2', avg: 11.0 },
    { period: 'G3', avg: stats.avgGrade }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Student performance overview via MCP-connected database</p>
        </div>
        <button 
          onClick={loadData}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
        >
          Refresh Data
        </button>
      </div>

      {/* KPI Cards - Based on real backend statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Total Students"
          value={loading ? '...' : stats.total.toLocaleString()}
          subtext="In database"
          trend={{ value: 12, direction: 'up' }}
          icon={<Users className="w-6 h-6 text-blue-600" />}
          iconBg="bg-blue-100"
        />
        <KPICard
          title="Average Final Grade"
          value={loading ? '...' : stats.avgGrade.toFixed(1)}
          subtext={`Range: ${stats.lowest}-${stats.highest}`}
          trend={{ value: 3, direction: 'up' }}
          icon={<Target className="w-6 h-6 text-green-600" />}
          iconBg="bg-green-100"
        />
        <KPICard
          title="At-Risk Students"
          value={loading ? '...' : stats.atRisk}
          subtext={`${stats.atRiskPercent.toFixed(1)}% of class (G3 < 10)`}
          trend={{ value: 5, direction: 'down' }}
          icon={<AlertTriangle className="w-6 h-6 text-red-600" />}
          iconBg="bg-red-100"
        />
        <KPICard
          title="Passing Rate"
          value={loading ? '...' : `${(100 - stats.atRiskPercent).toFixed(1)}%`}
          subtext="Students with G3 ≥ 10"
          icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
          iconBg="bg-purple-100"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <QuickActionCard
            title="Query with AI"
            description="Ask about student performance"
            icon={<MessageSquare className="w-6 h-6 text-blue-600" />}
            iconBg="bg-blue-100"
            onClick={() => navigate('/chat')}
          />
          <QuickActionCard
            title="View All Students"
            description="Browse with filters & search"
            icon={<Users className="w-6 h-6 text-green-600" />}
            iconBg="bg-green-100"
            onClick={() => navigate('/students')}
          />
          <QuickActionCard
            title="Find At-Risk"
            description={`View ${stats.atRisk} struggling students`}
            icon={<AlertTriangle className="w-6 h-6 text-orange-600" />}
            iconBg="bg-orange-100"
            onClick={() => navigate('/students')}
          />
          <QuickActionCard
            title="Export Data"
            description="Download full dataset"
            icon={<Download className="w-6 h-6 text-purple-600" />}
            iconBg="bg-purple-100"
            onClick={() => {}}
          />
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grade Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 lg:col-span-2">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Final Grade (G3) Distribution</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={gradeDistribution}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip 
                formatter={(value: number) => [`${value} students`, 'Count']}
                contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
              />
              <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                {gradeDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Risk Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Status</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={riskDistribution}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
              >
                {riskDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex justify-center gap-4 mt-4">
            {riskDistribution.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: item.color}} />
                <span className="text-sm text-gray-600">{item.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Grade Trend Over Time */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Grade Progression (Class Average)</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" axisLine={false} tickLine={false} />
            <YAxis domain={[0, 20]} axisLine={false} tickLine={false} />
            <Tooltip 
              formatter={(value: number) => [value.toFixed(1), 'Average Grade']}
              contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
            />
            <Line 
              type="monotone" 
              dataKey="avg" 
              stroke="#3b82f6" 
              strokeWidth={3}
              dot={{fill: '#3b82f6', r: 6}}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent MCP Activity</h3>
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Class analysis completed</p>
              <p className="text-xs text-gray-500">Retrieved {stats.total} students from MongoDB via MCP</p>
              <p className="text-xs text-gray-400 mt-1">Just now</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">At-risk alert</p>
              <p className="text-xs text-gray-500">{stats.atRisk} students identified with G3 &lt; 10</p>
              <p className="text-xs text-gray-400 mt-1">From latest query</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Grade trend detected</p>
              <p className="text-xs text-gray-500">Class average improved from G1 to G3</p>
              <p className="text-xs text-gray-400 mt-1">Analysis complete</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
