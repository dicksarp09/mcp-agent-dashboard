import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';

export const Analytics: React.FC = () => {
  const gradeTrendData = [
    { month: 'Jan', avg: 12.5 },
    { month: 'Feb', avg: 12.8 },
    { month: 'Mar', avg: 13.1 },
    { month: 'Apr', avg: 12.9 },
    { month: 'May', avg: 13.4 },
    { month: 'Jun', avg: 13.6 }
  ];

  const riskData = [
    { category: 'Low Risk', count: 145 },
    { category: 'Medium Risk', count: 68 },
    { category: 'High Risk', count: 42 }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <p className="text-gray-600 mt-1">Detailed insights into student performance</p>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Average Grade Trend</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={gradeTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[10, 15]} />
              <Tooltip />
              <Line type="monotone" dataKey="avg" stroke="#3b82f6" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={riskData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Total Queries</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">1,247</p>
          <p className="text-xs text-green-600 mt-1">+23% this month</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">AI Responses</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">1,189</p>
          <p className="text-xs text-green-600 mt-1">95.3% success rate</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">At-Risk Alerts</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">42</p>
          <p className="text-xs text-red-600 mt-1">+5 from last week</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <p className="text-sm text-gray-500">Avg Response Time</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">1.2s</p>
          <p className="text-xs text-green-600 mt-1">-0.3s improvement</p>
        </div>
      </div>
    </div>
  );
};
