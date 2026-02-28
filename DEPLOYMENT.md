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

## AWS ECS Deployment

This section covers deploying the MCP Student Analytics system to AWS ECS Fargate with CI/CD.

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Internet                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ Port 80
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  Application Load Balancer (Public Subnet)                     │
│  - DNS: mcp-agent-alb-*.elb.us-east-1.amazonaws.com            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      │ Port 8000
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  ECS Fargate Service (Private Subnet)                          │
│  - Task Definition: mcp-agent-api                               │
│  - Container: mcp-agent-api: latest                             │
│  - Auto-scaling: CPU 70%, Memory 80%                            │
└─────────────────────────────────────────────────────────────────┘
                      │
                      │ Outbound via NAT Gateway
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  VPC (10.0.0.0/16)                                              │
│  - Public Subnet: 10.0.1.0/24                                   │
│  - Private Subnet: 10.0.2.0/24                                  │
│  - NAT Gateway: 10.0.1.5                                        │
└─────────────────────────────────────────────────────────────────┘
```

### Prerequisites

1. **AWS Account** with appropriate permissions
2. **GitHub Repository** with OIDC configured
3. **AWS CLI** installed locally
4. **Terraform** >= 1.7.0

### AWS Bootstrap Instructions

#### Step 1: Create S3 Bucket for Terraform State

```bash
aws s3 mb s3://mcp-agent-terraform-state --region us-east-1

aws s3api put-bucket-versioning \
  --bucket mcp-agent-terraform-state \
  --versioning-configuration Status=Enabled
```

#### Step 2: Create DynamoDB Table for State Locking

```bash
aws dynamodb create-table \
  --table-name mcp-agent-terraform-locks \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

#### Step 3: Configure GitHub OIDC Provider

```bash
# Get GitHub OpenID Connect provider URL from GitHub
# https://token.actions.githubusercontent.com

# Create OIDC provider in AWS
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list "6938FD4D98BABEC35D82C6E9D5D8B8D3F8E3B3A9"
```

#### Step 4: Configure GitHub Secrets

In your GitHub repository, go to **Settings > Secrets and variables > Actions** and add:

| Secret Name | Value |
|-------------|-------|
| `AWS_ROLE_ARN` | `arn:aws:iam::ACCOUNT_ID:role/mcp-agent-github-deploy-role` |
| `AWS_REGION` | `us-east-1` |

Add a **Variable**:
| Variable Name | Value |
|---------------|-------|
| `AWS_REGION` | `us-east-1` |
| `GITHUB_OIDC_PROVIDER_ARN` | `arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com` |

#### Step 5: Configure AWS Region Variable

In your GitHub repository, go to **Settings > Secrets and variables > Actions > Variables** and add:
- `AWS_REGION`: `us-east-1`
- `GITHUB_OIDC_PROVIDER_ARN`: `arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com`

### Local Development with Terraform

#### Initialize Terraform

```bash
cd infrastructure
terraform init
```

#### Validate Configuration

```bash
terraform validate
```

#### Plan Infrastructure Changes

```bash
terraform plan -out=tfplan
```

#### Apply Infrastructure

```bash
terraform apply -auto-approve tfplan
```

### GitHub Actions Deployment

The CI/CD pipeline automatically deploys when code is pushed to `main`:

1. **Test** - Runs pytest on the backend
2. **Build & Push** - Builds Docker image and pushes to ECR
3. **Terraform** - Provisions/updates AWS infrastructure
4. **Deploy** - Updates ECS service with new image

### Deployment Outputs

After `terraform apply`, you'll see:
- `alb_dns_name`: ALB DNS endpoint (e.g., `mcp-agent-alb-123456789.us-east-1.elb.amazonaws.com`)
- `ecs_cluster_name`: ECS cluster name
- `ecr_repository_url`: ECR repository URL

### Rollback ECS Deployment

To rollback to a previous version:

```bash
# List task definitions
aws ecs list-task-definitions --family-name mcp-agent-api

# Get previous task definition ARN
PREVIOUS_TASK_DEF=$(aws ecs list-task-definitions --family-name mcp-agent-api --sort DESC --max-items 2 --query 'taskDefinitionArns[1]')

# Update service to use previous task definition
aws ecs update-service \
  --cluster mcp-agent-cluster \
  --service mcp-agent-api-service \
  --task-definition $PREVIOUS_TASK_DEF \
  --force-new-deployment
```

### Connect Monitoring (EC2)

Deploy Prometheus + Grafana on EC2 for metrics collection:

```bash
# Launch EC2 instance in public subnet
aws ec2 run-instances \
  --image-id ami-0c55b159cbfafe1f0 \
  --instance-type t3.small \
  --key-name your-key-pair \
  --security-group-ids sg-monitoring \
  --subnet-id public-subnet-id \
  --tag-specifications 'ResourceType=instance,Tags=[{Key=Name,Value=monitoring-server}]'

# SSH into instance and run
git clone your-repo
cd your-repo
docker-compose -f docker-compose.monitoring.yml up -d
```

### Monitoring Access

- **Prometheus**: http://monitoring-ec2-public-ip:9090
- **Grafana**: http://monitoring-ec2-public-ip:3000
- **Default Credentials**: admin/admin

Update Prometheus config to scrape ECS service:
```yaml
scrape_configs:
  - job_name: 'mcp-agent-ecs'
    static_configs:
      - targets: ['ecs-private-ip:8000']
    metrics_path: '/metrics'
```

### Environment Variables

The ECS task receives these environment variables:
- `ENVIRONMENT`: production
- `HOST`: 0.0.0.0
- `PORT`: 8000

Additional variables should be stored in **AWS Systems Manager Parameter Store**:
```bash
aws ssm put-parameter \
  --name /mcp-agent/MONGO_URI \
  --value "mongodb+srv://..." \
  --type SecureString
```

### Troubleshooting

#### Check ECS Service Status
```bash
aws ecs describe-services \
  --cluster mcp-agent-cluster \
  --services mcp-agent-api-service
```

#### View CloudWatch Logs
```bash
aws logs tail /ecs/mcp-agent-api --follow
```

#### Check ALB Target Health
```bash
aws elbv2 describe-target-health \
  --target-group-arn $(aws elbv2 describe-target-groups --names mcp-agent-ecs-tg --query 'TargetGroups[0].TargetGroupArn' --output text)
```

### Infrastructure Cleanup

```bash
# Destroy all resources
cd infrastructure
terraform destroy -auto-approve

# Delete ECR images
aws ecr batch-delete-image \
  --repository-name mcp-agent-api \
  --image-ids all

# Delete S3 buckets (empty first)
aws s3 rb s3://mcp-agent-terraform-state --force
aws s3 rb s3://mcp-agent-model-artifacts-ACCOUNT_ID --force
aws s3 rb s3://mcp-agent-logs-backup-ACCOUNT_ID --force

# Delete DynamoDB table
aws dynamodb delete-table --table-name mcp-agent-terraform-locks
```

---

## Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [MongoDB Docker Hub](https://hub.docker.com/_/mongo)
- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)

---

*[Back to README](./README.md)*
