# Deployment Guide

This guide covers deploying the MCP Student Analytics system using Docker Compose for local development.

**[← Back to README](./README.md)**

---

## Quick Start with Docker

### Prerequisites

- Docker 20.10+
- Docker Compose 2.0+
- 4GB RAM available

### One-Command Setup

```bash
# Clone the repository
git clone https://github.com/dicksarp09/mcp-agent-dashboard.git
cd mcp-agent-dashboard

# Copy environment template
cp .env.example .env

# Start all services
docker-compose up -d

# View logs
docker-compose logs -f
```

The application will be available at:
- Dashboard: http://localhost:3000
- API: http://localhost:8000
- API Docs: http://localhost:8000/docs
- Metrics: http://localhost:8000/metrics

---

## Docker Compose Configuration

Create a `docker-compose.yml` file:

```yaml
version: '3.8'

services:
  # MongoDB Database
  mongodb:
    image: mongo:6.0
    container_name: mcp-mongodb
    restart: unless-stopped
    ports:
      - "27017:27017"
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
      MONGO_INITDB_DATABASE: student-db
    volumes:
      - mongodb_data:/data/db
      - ./data/init-mongo.js:/docker-entrypoint-initdb.d/init-mongo.js:ro
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "mongosh", "--eval", "db.adminCommand('ping')"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Backend API
  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    container_name: mcp-backend
    restart: unless-stopped
    ports:
      - "8000:8000"
    environment:
      - MONGO_URI=mongodb://admin:password@mongodb:27017/student-db?authSource=admin
      - MONGO_DB=student-db
      - MONGO_COLLECTION=student_performance.records
      - GROQ_API_KEY=${GROQ_API_KEY}
      - PYTHONUNBUFFERED=1
    volumes:
      - ./src:/app/src:ro
    depends_on:
      mongodb:
        condition: service_healthy
    networks:
      - mcp-network
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Frontend Dashboard
  frontend:
    build:
      context: ./web
      dockerfile: Dockerfile.frontend
    container_name: mcp-frontend
    restart: unless-stopped
    ports:
      - "3000:80"
    environment:
      - VITE_API_URL=http://localhost:8000
    depends_on:
      - backend
    networks:
      - mcp-network

  # Prometheus (optional)
  prometheus:
    image: prom/prometheus:latest
    container_name: mcp-prometheus
    restart: unless-stopped
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--web.console.libraries=/etc/prometheus/console_libraries'
      - '--web.console.templates=/etc/prometheus/consoles'
      - '--web.enable-lifecycle'
    networks:
      - mcp-network

  # Grafana (optional)
  grafana:
    image: grafana/grafana:latest
    container_name: mcp-grafana
    restart: unless-stopped
    ports:
      - "3001:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/provisioning:/etc/grafana/provisioning:ro
      - ./monitoring/grafana/dashboards:/var/lib/grafana/dashboards:ro
    networks:
      - mcp-network

volumes:
  mongodb_data:
  prometheus_data:
  grafana_data:

networks:
  mcp-network:
    driver: bridge
```

---

## Dockerfile - Backend

Create `Dockerfile.backend`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY src/ ./src/
COPY start_server.py .

# Expose port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the server
CMD ["python", "start_server.py"]
```

---

## Dockerfile - Frontend

Create `web/Dockerfile.frontend`:

```dockerfile
# Build stage
FROM node:18-alpine as builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Expose port
EXPOSE 80

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
```

---

## Environment Variables

Create `.env.example`:

```bash
# MongoDB Configuration
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGO_DB=student-db
MONGO_COLLECTION=student_performance.records

# LLM Configuration (optional)
GROQ_API_KEY=your_groq_api_key_here

# For local Docker deployment
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=password
```

---

## Common Operations

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f mongodb
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart specific service
docker-compose restart backend
```

### Update Code

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

### Database Operations

```bash
# Access MongoDB shell
docker-compose exec mongodb mongosh -u admin -p password --authenticationDatabase admin

# Backup database
docker-compose exec mongodb mongodump --uri="mongodb://admin:password@localhost:27017/student-db?authSource=admin" --out=/data/backup

# Restore database (run from host)
docker cp backup/student-db mcp-mongodb:/data/restore/
docker-compose exec mongodb mongorestore --uri="mongodb://admin:password@localhost:27017/?authSource=admin" /data/restore/student-db
```

### Clean Up

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v

# Remove all images
docker-compose down --rmi all
```

---

## Health Checks

All services include health checks:

- **MongoDB**: Checks database connectivity every 10s
- **Backend**: HTTP health endpoint every 30s
- **Frontend**: Nginx built-in checks
- **Prometheus/Grafana**: Container health checks

Check service status:
```bash
docker-compose ps
```

---

## Troubleshooting

### Port Already in Use

```bash
# Find what's using port 8000
lsof -i :8000

# Or change ports in docker-compose.yml
ports:
  - "8080:8000"  # Use 8080 instead
```

### MongoDB Connection Issues

```bash
# Check MongoDB is running
docker-compose ps mongodb

# Check logs
docker-compose logs mongodb

# Verify network connectivity
docker-compose exec backend ping mongodb
```

### Permission Denied

```bash
# Fix permissions on volumes
sudo chown -R $USER:$USER .

# Or run with sudo (not recommended for production)
sudo docker-compose up -d
```

---

## Production Considerations

For production deployment, consider:

1. **Use external MongoDB Atlas** instead of containerized MongoDB
2. **Enable HTTPS** with reverse proxy (nginx/traefik)
3. **Set up log aggregation** (ELK stack or similar)
4. **Configure monitoring alerts** in Prometheus/Grafana
5. **Use secrets management** (Docker secrets, Kubernetes secrets, or cloud provider solutions)
6. **Enable backup automation** for MongoDB
7. **Set up CI/CD pipeline** for automated deployments
8. **Use multi-stage builds** for smaller production images

---

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)

---

*[Back to README](./README.md)*
