// API client for MCP backend
const API_BASE = '/api';

export interface StudentDocument {
  _id: string;
  name?: string;
  G1: number;
  G2: number;
  G3: number;
  studytime: number;
  absences: number;
  failures: number;
  Dalc: number;
  Walc: number;
  goout: number;
  [key: string]: any;
}

export interface ClassAnalysisResponse {
  count: number;
  students: StudentDocument[];
  class_summary?: {
    average: number;
    highest: number;
    lowest: number;
    at_risk_count: number;
  };
}

export interface AnalysisResult {
  summary?: {
    average_grade: number;
    growth: string;
    at_risk: boolean;
    study_efficiency: string;
  };
  trend?: {
    direction: string;
    sparkline: string;
  };
  metrics?: {
    alerts: string[];
    has_alerts: boolean;
    risk_level: string;
  };
}

export interface StudentAnalysis extends StudentDocument {
  analysis_result?: AnalysisResult;
}

class MCPClient {
  private cache = new Map<string, { data: any; timestamp: number }>();
  private cacheTTL = 60000; // 1 minute

  async query(studentId: string): Promise<StudentDocument> {
    const cacheKey = `query:${studentId}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const res = await fetch(`${API_BASE}/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: studentId,
        fields: ['name', 'G1', 'G2', 'G3', 'studytime', 'absences', 'failures', 'goout', 'Dalc', 'Walc']
      })
    });

    if (!res.ok) throw new Error(`Query failed: ${res.statusText}`);
    const data = await res.json();
    
    // Handle MCP backend response format: {student_id, result, error}
    if (data.error) {
      throw new Error(data.error);
    }
    if (!data.result) {
      throw new Error('Student not found');
    }
    
    // Map result to StudentDocument format (backend uses _id, frontend expects _id)
    const studentData = {
      ...data.result,
      _id: data.student_id || data.result._id
    };
    
    this.cache.set(cacheKey, { data: studentData, timestamp: Date.now() });
    return studentData;
  }

  async classAnalysis(topN = 500, page = 1, atRiskOnly = false, gradeThreshold?: number): Promise<ClassAnalysisResponse> {
    const cacheKey = `class:${topN}:${page}:${atRiskOnly}:${gradeThreshold}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.data;
    }

    const res = await fetch(`${API_BASE}/class_analysis`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        limit: topN
      })
    });

    if (!res.ok) throw new Error(`Class analysis failed: ${res.statusText}`);
    const data = await res.json();
    this.cache.set(cacheKey, { data: data.students || [], timestamp: Date.now() });
    return { count: data.count || 0, students: data.students || [] };
  }

  clearCache() {
    this.cache.clear();
  }
}

export const mcpClient = new MCPClient();
