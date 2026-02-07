import React, { useState, useEffect } from 'react';
import { Search, Filter, TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle } from 'lucide-react';
import { mcpClient, StudentDocument } from '../api/client';

interface EnrichedStudent extends StudentDocument {
  trend: 'improving' | 'declining' | 'stable';
  trendIcon: React.ReactNode;
  riskStatus: 'at-risk' | 'warning' | 'healthy';
  riskLabel: string;
}

export const Students: React.FC = () => {
  const [students, setStudents] = useState<EnrichedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'all' | 'at-risk' | 'warning' | 'healthy'>('all');
  const [sortBy, setSortBy] = useState<'G3' | 'trend' | 'name'>('G3');
  const [selectedStudent, setSelectedStudent] = useState<EnrichedStudent | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const calculateTrend = (G1: number, G2: number, G3: number): {trend: EnrichedStudent['trend'], icon: React.ReactNode} => {
    if (G3 > G2 && G2 > G1) {
      return { trend: 'improving', icon: <TrendingUp className="w-4 h-4 text-green-600" /> };
    } else if (G3 < G2 && G2 < G1) {
      return { trend: 'declining', icon: <TrendingDown className="w-4 h-4 text-red-600" /> };
    }
    return { trend: 'stable', icon: <Minus className="w-4 h-4 text-gray-400" /> };
  };

  const getRiskStatus = (G3: number): {status: EnrichedStudent['riskStatus'], label: string} => {
    if (G3 < 10) return { status: 'at-risk', label: 'At Risk' };
    if (G3 < 12) return { status: 'warning', label: 'Warning' };
    return { status: 'healthy', label: 'Healthy' };
  };

  const loadStudents = async () => {
    try {
      setLoading(true);
      const response = await mcpClient.classAnalysis(500);
      
      const enrichedData: EnrichedStudent[] = (response.students || []).map((s, i) => {
        const trendData = calculateTrend(s.G1 || 0, s.G2 || 0, s.G3 || 0);
        const riskData = getRiskStatus(s.G3 || 0);
        
        return {
          ...s,
          trend: trendData.trend,
          trendIcon: trendData.icon,
          riskStatus: riskData.status,
          riskLabel: riskData.label,
          name: s.name || `Student ${i + 1}`
        };
      });
      
      setStudents(enrichedData);
    } catch (err) {
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students
    .filter(s => {
      const matchesSearch = !searchQuery || 
        s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s._id?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRisk = riskFilter === 'all' || s.riskStatus === riskFilter;
      
      return matchesSearch && matchesRisk;
    })
    .sort((a, b) => {
      if (sortBy === 'G3') return (b.G3 || 0) - (a.G3 || 0);
      if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
      // Sort by trend priority: declining first
      const trendPriority = { declining: 0, stable: 1, improving: 2 };
      return trendPriority[a.trend] - trendPriority[b.trend];
    });

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getAvatarColor = (id: string) => {
    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-teal-500'];
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
      hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 mt-1">Browse and analyze student performance records</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full">
            {students.length} total
          </span>
          <span className="px-3 py-1 bg-red-50 text-red-700 rounded-full">
            {students.filter(s => s.riskStatus === 'at-risk').length} at-risk
          </span>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        
        <div className="flex gap-3">
          <select
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value as any)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Students</option>
            <option value="at-risk">At Risk (G3 &lt; 10)</option>
            <option value="warning">Warning (10-12)</option>
            <option value="healthy">Healthy (≥12)</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="G3">Sort by Final Grade</option>
            <option value="trend">Sort by Trend</option>
            <option value="name">Sort by Name</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <p className="text-sm text-gray-500">
        Showing {filteredStudents.length} of {students.length} students
        {riskFilter !== 'all' && ` • Filtered by: ${riskFilter}`}
      </p>

      {/* Students Grid */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-600">Loading students from MCP...</p>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No students found matching your criteria</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredStudents.map((student) => (
            <div
              key={student._id}
              onClick={() => setSelectedStudent(student)}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  {/* Avatar */}
                  <div className={`w-12 h-12 ${getAvatarColor(student._id)} rounded-full flex items-center justify-center text-white font-semibold text-sm`}>
                    {getInitials(student.name || 'ST')}
                  </div>
                  
                  {/* Info */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900">{student.name}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        student.riskStatus === 'at-risk' ? 'bg-red-100 text-red-700' :
                        student.riskStatus === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {student.riskLabel}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">{student._id}</p>
                    
                    {/* Grade Progression */}
                    <div className="flex items-center gap-3 mt-3">
                      <div className="text-center">
                        <p className="text-xs text-gray-400">G1</p>
                        <p className={`text-sm font-bold ${(student.G1 || 0) < 10 ? 'text-red-600' : 'text-gray-700'}`}>
                          {student.G1 || 0}
                        </p>
                      </div>
                      <div className="text-gray-300">→</div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">G2</p>
                        <p className={`text-sm font-bold ${(student.G2 || 0) < 10 ? 'text-red-600' : 'text-gray-700'}`}>
                          {student.G2 || 0}
                        </p>
                      </div>
                      <div className="text-gray-300">→</div>
                      <div className="text-center">
                        <p className="text-xs text-gray-400">G3</p>
                        <p className={`text-lg font-bold ${(student.G3 || 0) < 10 ? 'text-red-600' : 'text-blue-600'}`}>
                          {student.G3 || 0}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Trend & Stats */}
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2 mb-2">
                    {student.trendIcon}
                    <span className={`text-sm capitalize ${
                      student.trend === 'improving' ? 'text-green-600' :
                      student.trend === 'declining' ? 'text-red-600' :
                      'text-gray-500'
                    }`}>
                      {student.trend}
                    </span>
                  </div>
                  
                  <div className="space-y-1 text-xs text-gray-500">
                    <p>Absences: {student.absences || 0}</p>
                    <p>Study: {student.studytime || 0}h/week</p>
                    <p>Failures: {student.failures || 0}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Student Detail Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 ${getAvatarColor(selectedStudent._id)} rounded-full flex items-center justify-center text-white font-bold text-xl`}>
                    {getInitials(selectedStudent.name || 'ST')}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">{selectedStudent.name}</h2>
                    <p className="text-sm text-gray-500 font-mono">{selectedStudent._id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              {/* Risk Status */}
              <div className={`p-4 rounded-xl mb-6 ${
                selectedStudent.riskStatus === 'at-risk' ? 'bg-red-50 border border-red-200' :
                selectedStudent.riskStatus === 'warning' ? 'bg-yellow-50 border border-yellow-200' :
                'bg-green-50 border border-green-200'
              }`}>
                <div className="flex items-center gap-2">
                  {selectedStudent.riskStatus === 'healthy' ? <CheckCircle className="w-5 h-5 text-green-600" /> : <AlertTriangle className="w-5 h-5 text-red-600" />}
                  <span className={`font-semibold ${
                    selectedStudent.riskStatus === 'at-risk' ? 'text-red-700' :
                    selectedStudent.riskStatus === 'warning' ? 'text-yellow-700' :
                    'text-green-700'
                  }`}>
                    {selectedStudent.riskLabel}
                  </span>
                </div>
              </div>

              {/* Grades */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Period 1 (G1)</p>
                  <p className={`text-3xl font-bold ${(selectedStudent.G1 || 0) < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                    {selectedStudent.G1 || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-500 mb-1">Period 2 (G2)</p>
                  <p className={`text-3xl font-bold ${(selectedStudent.G2 || 0) < 10 ? 'text-red-600' : 'text-gray-900'}`}>
                    {selectedStudent.G2 || 0}
                  </p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-xl border-2 border-blue-200">
                  <p className="text-xs text-blue-600 mb-1">Final (G3)</p>
                  <p className={`text-3xl font-bold ${(selectedStudent.G3 || 0) < 10 ? 'text-red-600' : 'text-blue-600'}`}>
                    {selectedStudent.G3 || 0}
                  </p>
                </div>
              </div>

              {/* Trend */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl mb-6">
                <span className="text-gray-600">Grade Trend</span>
                <div className="flex items-center gap-2">
                  {selectedStudent.trendIcon}
                  <span className={`font-semibold capitalize ${
                    selectedStudent.trend === 'improving' ? 'text-green-600' :
                    selectedStudent.trend === 'declining' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {selectedStudent.trend}
                  </span>
                </div>
              </div>

              {/* Additional Metrics */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Additional Metrics</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Study Time</span>
                    <span className="font-medium">{selectedStudent.studytime || 0} hours/week</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Absences</span>
                    <span className="font-medium">{selectedStudent.absences || 0}</span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Past Failures</span>
                    <span className={`font-medium ${(selectedStudent.failures || 0) > 0 ? 'text-red-600' : ''}`}>
                      {selectedStudent.failures || 0}
                    </span>
                  </div>
                  <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600">Social Activity</span>
                    <span className="font-medium">{selectedStudent.goout || 0}/5</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
