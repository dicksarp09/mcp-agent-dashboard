module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        status: {
          success: '#10b981',
          warning: '#f59e0b',
          critical: '#ef4444',
          info: '#3b82f6',
        }
      }
    },
  },
  plugins: [],
}
