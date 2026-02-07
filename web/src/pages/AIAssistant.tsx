import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, AlertCircle } from 'lucide-react';
import { mcpClient } from '../api/client';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  isError?: boolean;
}

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hello! I'm your AI assistant connected to the student database via MCP. I can help you with:\n\n**Individual Students:**\n• Grade trends and progression (G1 → G2 → G3)\n• Risk factor analysis\n• Complete performance summaries\n\n**Class Overview:**\n• Rankings and statistics\n• At-risk student identification\n• Performance breakdowns\n\nTry asking:\n• 'What's the grade trend for student 689cef602490264c7f2dd235?'\n• 'Show me class rankings'\n• 'Who is at risk?'",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Helper to extract student ID from query
  const extractStudentId = (text: string): string | null => {
    const match = text.match(/[0-9a-fA-F]{24}/);
    return match ? match[0] : null;
  };

  // Helper to calculate trend
  const calculateTrend = (G1: number, G2: number, G3: number) => {
    if (G3 > G2 && G2 > G1) return { direction: 'improving', icon: '📈', color: 'green' };
    if (G3 < G2 && G2 < G1) return { direction: 'declining', icon: '📉', color: 'red' };
    return { direction: 'stable', icon: '➡️', color: 'gray' };
  };

  // Helper to get risk level
  const getRiskLevel = (G3: number) => {
    if (G3 < 10) return { level: 'HIGH', label: 'At Risk', icon: '🔴', color: 'red' };
    if (G3 < 12) return { level: 'MEDIUM', label: 'Warning', icon: '🟡', color: 'yellow' };
    return { level: 'LOW', label: 'Healthy', icon: '🟢', color: 'green' };
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Check for student ID in query
      const studentId = extractStudentId(input);
      const lowerInput = input.toLowerCase();
      
      // Handle individual student queries
      if (studentId) {
        try {
          const student = await mcpClient.query(studentId);
          const G1 = student.G1 || 0;
          const G2 = student.G2 || 0;
          const G3 = student.G3 || 0;
          const avg = ((G1 + G2 + G3) / 3).toFixed(1);
          const trend = calculateTrend(G1, G2, G3);
          const risk = getRiskLevel(G3);
          
          if (lowerInput.includes('trend') || lowerInput.includes('progress')) {
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `**Student Grade Trend** ${trend.icon}\n\n📊 **Grade Progression:**\n• G1 (Period 1): ${G1}/20\n• G2 (Period 2): ${G2}/20\n• G3 (Final): ${G3}/20\n\n📈 **Analysis:**\n• Trend: **${trend.direction}**\n• Average: ${avg}/20\n• Growth: ${G3 > G1 ? '+' : ''}${G3 - G1} points\n\n${trend.direction === 'improving' ? '✅ Student is showing positive progress!' : trend.direction === 'declining' ? '⚠️ Student performance is declining. Consider intervention.' : '➡️ Performance is consistent.'}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
          }
          else if (lowerInput.includes('risk') || lowerInput.includes('factor') || lowerInput.includes('alert')) {
            const alerts = [];
            if (G3 < 10) alerts.push(`• Final grade (${G3}) below passing threshold`);
            if ((student.failures || 0) > 0) alerts.push(`• ${student.failures} past failures`);
            if ((student.absences || 0) > 10) alerts.push(`• High absence rate (${student.absences})`);
            if ((student.studytime || 0) < 2) alerts.push(`• Low study time (${student.studytime}h/week)`);
            
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `**Risk Assessment** ${risk.icon}\n\n🎯 **Risk Level:** ${risk.level} (${risk.label})\n\n📋 **Current Status:**\n• Final Grade (G3): ${G3}/20\n• Study Time: ${student.studytime || 0} hours/week\n• Absences: ${student.absences || 0}\n• Past Failures: ${student.failures || 0}\n\n${alerts.length > 0 ? `⚠️ **Alerts:**\n${alerts.join('\n')}` : '✅ No immediate risk factors identified.'}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
          }
          else {
            // General summary
            const assistantMessage: Message = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: `**Student Summary** 👤\n\n🎓 **Grades:**\n• G1: ${G1}/20 | G2: ${G2}/20 | G3: ${G3}/20\n• Average: ${avg}/20\n\n📈 **Performance:**\n• Trend: ${trend.direction} ${trend.icon}\n• Risk Level: ${risk.level} ${risk.icon}\n\n📊 **Additional Metrics:**\n• Study Time: ${student.studytime || 0}h/week\n• Absences: ${student.absences || 0}\n• Past Failures: ${student.failures || 0}\n\n${G3 >= 10 ? '✅ Student is passing.' : '⚠️ Student is at risk (G3 < 10).'}`,
              timestamp: new Date()
            };
            setMessages(prev => [...prev, assistantMessage]);
          }
        } catch (error: any) {
          console.error('Query error:', error);
          const errorMessage: Message = {
            id: (Date.now() + 1).toString(),
            role: 'assistant',
            content: `❌ Error querying student: **${studentId}**\n\nError: ${error.message || 'Unknown error'}\n\nPlease verify:\n• Backend server is running on port 8000\n• Student ID is correct (24 hex characters)\n• MongoDB connection is active`,
            timestamp: new Date(),
            isError: true
          };
          setMessages(prev => [...prev, errorMessage]);
        }
      }
      else if (lowerInput.includes('class') || lowerInput.includes('ranking') || lowerInput.includes('all students')) {
        // Fetch class analysis
        const response = await mcpClient.classAnalysis(20); // Top 20
        const students = response.students || [];
        
        const atRiskCount = students.filter(s => (s.G3 || 0) < 10).length;
        const avgGrade = students.length > 0 
          ? (students.reduce((sum, s) => sum + (s.G3 || 0), 0) / students.length).toFixed(1)
          : '0';
        
        const topStudents = students
          .sort((a, b) => (b.G3 || 0) - (a.G3 || 0))
          .slice(0, 5)
          .map((s, i) => `${i + 1}. ${s.name || 'Student'}: G3=${s.G3}`)
          .join('\n');
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `**Class Overview**\n\n📊 **Statistics:**\n• Total students: ${students.length}\n• Average G3: ${avgGrade}\n• At-risk (G3 < 10): ${atRiskCount}\n\n🏆 **Top 5 Students:**\n${topStudents}\n\n💡 Use the Students page to view all ${students.length} students and apply filters.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      } 
      else if (lowerInput.includes('at risk') || lowerInput.includes('struggling')) {
        const response = await mcpClient.classAnalysis(500);
        const allStudents = response.students || [];
        const atRisk = allStudents.filter(s => (s.G3 || 0) < 10);
        
        const riskList = atRisk
          .slice(0, 10)
          .map(s => `• ${s.name || 'Student'} (${s._id.slice(-6)}): G3=${s.G3}, G2=${s.G2}, G1=${s.G1}`)
          .join('\n');
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `**At-Risk Students Alert** ⚠️\n\nFound **${atRisk.length} students** with G3 < 10\n\n${riskList}\n\n${atRisk.length > 10 ? `... and ${atRisk.length - 10} more at-risk students` : ''}\n\n📍 Navigate to the Students page and filter by "At Risk" to see the full list and take action.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
      else if (lowerInput.includes('summary') || lowerInput.includes('average') || lowerInput.includes('stats')) {
        const response = await mcpClient.classAnalysis(500);
        const students = response.students || [];
        const grades = students.map(s => s.G3 || 0);
        
        const avg = (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1);
        const highest = Math.max(...grades);
        const lowest = Math.min(...grades);
        const atRisk = grades.filter(g => g < 10).length;
        const passing = grades.filter(g => g >= 10).length;
        
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `**Class Performance Summary** 📈\n\n📊 **Overall Statistics:**\n• Total Students: ${students.length}\n• Average Final Grade (G3): ${avg}/20\n• Highest Grade: ${highest}/20\n• Lowest Grade: ${lowest}/20\n\n✅ **Performance Breakdown:**\n• Passing (G3 ≥ 10): ${passing} students (${((passing/students.length)*100).toFixed(1)}%)\n• At Risk (G3 < 10): ${atRisk} students (${((atRisk/students.length)*100).toFixed(1)}%)\n\n💡 The class average is ${avg >= 10 ? 'above' : 'below'} the passing threshold of 10.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
      else {
        // General response with student query examples
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `I can help you analyze the student database. Try asking:

**Individual Student Queries:**
• "What's the grade trend for student [ID]?" - Grade progression analysis
• "Show risk factors for student [ID]" - Risk assessment
• "Summarize student [ID]" - Complete student overview

**Class-Level Queries:**
• "Show me class rankings" - Top performing students
• "Who is at risk?" - Students with G3 < 10
• "Class summary" - Overall statistics

Or navigate to the Dashboard or Students pages for visual analytics.`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error connecting to the MCP backend. Please make sure the backend server is running on port 8000.`,
        timestamp: new Date(),
        isError: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const formatContent = (content: string) => {
    return content.split('\n').map((line, i) => {
      // Bold text
      const boldLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      // Bullet points
      if (line.startsWith('•')) {
        return <li key={i} className="ml-4" dangerouslySetInnerHTML={{ __html: boldLine.slice(1) }} />;
      }
      return <p key={i} className={line.startsWith('🏆') || line.startsWith('📊') || line.startsWith('✅') || line.startsWith('💡') || line.startsWith('⚠️') || line.startsWith('📍') || line.startsWith('📈') ? "mt-3 font-medium" : line === '' ? "h-2" : ""} dangerouslySetInnerHTML={{ __html: boldLine }} />;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">AI Assistant</h1>
        <p className="text-gray-600 mt-1">Ask questions about your student database via MCP</p>
      </div>

      {/* Chat Container */}
      <div className="flex-1 bg-white rounded-xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                message.role === 'assistant' 
                  ? message.isError ? 'bg-red-600' : 'bg-blue-600'
                  : 'bg-gray-200'
              }`}>
                {message.role === 'assistant' ? (
                  message.isError ? <AlertCircle className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />
                ) : (
                  <User className="w-5 h-5 text-gray-600" />
                )}
              </div>

              {/* Message Content */}
              <div className={`max-w-[75%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`rounded-2xl px-5 py-3 ${
                  message.role === 'assistant'
                    ? message.isError 
                      ? 'bg-red-50 text-red-900 border border-red-200'
                      : 'bg-gray-100 text-gray-900'
                    : 'bg-blue-600 text-white'
                }`}>
                  {message.role === 'user' ? (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  ) : (
                    <div className="text-sm leading-relaxed space-y-1">
                      {formatContent(message.content)}
                    </div>
                  )}
                </div>
                <span className="text-xs text-gray-400 mt-1 block">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-gray-100 rounded-2xl px-5 py-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about a student (with ID), class rankings, or at-risk students..."
              className="flex-1 px-4 py-3 bg-gray-100 border-0 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">
            AI retrieves data from the student database via MCP protocol on port 8000
          </p>
        </div>
      </div>
    </div>
  );
};
