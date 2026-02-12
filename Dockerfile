# Multi-stage build for Railway deployment
# Stage 1: Build React frontend
FROM node:18-alpine as frontend-builder

WORKDIR /app/web

# Copy package files
COPY web/package*.json ./
RUN npm ci

# Copy frontend source and build
COPY web/ ./
RUN npm run build

# Stage 2: Python backend
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy Python requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY src/ ./src/
COPY start_server.py .

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/web/dist ./web/dist

# Debug: List what's in the web directory
RUN echo "=== Contents of /app ===" && ls -la /app && echo "=== Contents of /app/web ===" && ls -la /app/web || echo "web dir not found" && echo "=== Contents of /app/web/dist ===" && ls -la /app/web/dist || echo "dist dir not found"

# Create a simple startup script
RUN echo '#!/bin/bash\npython start_server.py' > start.sh && chmod +x start.sh

# Expose port (Railway will map this)
EXPOSE 8000

# Set environment variables for Railway
ENV HOST=0.0.0.0
ENV PORT=8000

# Health check (must use 0.0.0.0 for external, or localhost for internal)
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the server
CMD ["python", "start_server.py"]
