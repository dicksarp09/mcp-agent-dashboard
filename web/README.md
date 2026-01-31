# MCP Student Analytics Dashboard

A modern, responsive React frontend for the LangGraph MCP student performance analysis system.

## Features

- **KPI Dashboard**: Real-time class statistics (avg grade, at-risk count, grade distribution)
- **Class Ranking Table**: Sortable, paginated leaderboard with student performance and risk status
- **Individual Student Panel**: Detailed view with grade trends, behavioral metrics, and risk assessment
- **Interactive Charts**: Grade distribution, risk status pie chart, trend analysis
- **Advanced Filters**: Grade range, risk status, study time, attendance
- **Responsive Design**: Desktop, tablet, and mobile support
- **Real-time Data**: Fetches and caches data from MCP backend

## Quick Start

### Prerequisites

- Node.js 16+ and npm/yarn
- Backend MCP server running on `http://127.0.0.1:8000`

### Setup

```bash
cd web
npm install
npm run dev
```

Dashboard runs on `http://localhost:3000` and proxies API calls to the backend.

### Build for Production

```bash
npm run build
npm run preview
```

## Architecture

- **Client**: React 18 + TypeScript + Vite
- **Styling**: TailwindCSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **API**: Custom MCP client with local TTL caching

## Components

- `Navbar` – Sticky header with search and user profile
- `Sidebar` – Collapsible filters (grade range, risk status, study time)
- `KPICard` – High-level metrics with color coding
- `Leaderboard` – Sortable student table with pagination
- `StudentPanel` – Modal with detailed student analysis (3 tabs: Overview, Grades, Metrics)
- `App` – Main layout orchestrator

## API Integration

The dashboard calls two MCP endpoints:

- `POST /query` – Fetch single student data with projections
- `POST /class_analysis` – Fetch bulk class data with filtering and pagination

See [../README.md](../README.md) for backend documentation.

## Customization

### Color Scheme

Edit `tailwind.config.js` to customize status colors:

```javascript
colors: {
  status: {
    success: '#10b981',     // Green
    warning: '#f59e0b',     // Yellow
    critical: '#ef4444',    // Red
    info: '#3b82f6'         // Blue
  }
}
```

### Filter Options

Modify `Sidebar.tsx` to add or change filter logic (e.g., absences, alcohol consumption metrics).

### Chart Defaults

Update `App.tsx` to adjust chart types, colors, or data aggregation logic.

## Performance Tips

- The API client implements a 1-minute TTL cache to reduce backend calls
- Pagination defaults to 20 students per page; adjust `pageSize` in `Leaderboard`
- Use `npm run build` for optimized production builds (~100KB gzipped)

## Troubleshooting

**Dashboard shows "Failed to load class data"**

- Ensure backend MCP server is running on `http://127.0.0.1:8000`
- Check browser console for CORS or network errors
- Try clearing the cache: Press F12 → Application → Local Storage → Clear

**Slow data loads**

- Increase backend timeout in `src/api/client.ts` (currently 30s)
- For large datasets (1000+ students), implement server-side pagination

## Next Steps

- Add authentication & role-based access control (student vs. teacher views)
- Export data as CSV / PDF reports
- Add predictive alerts (e.g., "Student may become at-risk in 2 weeks")
- Integrate with real-time notifications (WebSocket)
- Add dark mode toggle
