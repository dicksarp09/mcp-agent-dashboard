#!/bin/bash

# MCP Student Analytics - One-Line Installer
# This script installs and sets up the MCP Agent Dashboard

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/dicksarp09/mcp-agent-dashboard.git"
PROJECT_NAME="mcp-agent-dashboard"

# Helper functions
print_header() {
    echo -e "${BLUE}"
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "║   MCP Student Analytics Dashboard - Installer          ║"
    echo "╚══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}!${NC} $1"
}

print_info() {
    echo -e "${BLUE}→${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    # Check git
    if ! command -v git &> /dev/null; then
        print_error "Git is not installed. Please install Git first."
        exit 1
    fi
    print_success "Git is installed"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi
    print_success "Docker is installed"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
    print_success "Docker Compose is installed"
    
    echo ""
}

# Clone repository
clone_repo() {
    print_info "Cloning repository..."
    
    if [ -d "$PROJECT_NAME" ]; then
        print_warning "Directory $PROJECT_NAME already exists."
        read -p "Do you want to update it? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            cd "$PROJECT_NAME"
            git pull origin main
            print_success "Repository updated"
        else
            print_info "Using existing directory"
            cd "$PROJECT_NAME"
        fi
    else
        git clone "$REPO_URL"
        cd "$PROJECT_NAME"
        print_success "Repository cloned"
    fi
    
    echo ""
}

# Setup environment
setup_environment() {
    print_info "Setting up environment..."
    
    if [ -f ".env" ]; then
        print_warning ".env file already exists."
        read -p "Do you want to reconfigure it? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Keeping existing .env file"
            return
        fi
    fi
    
    # Create .env file
    cat > .env <<EOF
# MongoDB Configuration
# For local Docker deployment (uses containerized MongoDB)
MONGO_URI=mongodb://admin:password@mongodb:27017/student-db?authSource=admin
MONGO_DB=student-db
MONGO_COLLECTION=student_performance.records

# For MongoDB Atlas (uncomment and configure if using Atlas instead)
# MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
# MONGO_DB=student-db
# MONGO_COLLECTION=student_performance.records

# LLM Configuration (optional - for AI intent parsing)
GROQ_API_KEY=your_groq_api_key_here

# Docker MongoDB credentials
MONGO_INITDB_ROOT_USERNAME=admin
MONGO_INITDB_ROOT_PASSWORD=password
EOF

    print_success "Environment file created (.env)"
    
    # Prompt for configuration
    echo ""
    print_info "Configuration options:"
    echo ""
    
    # Ask about MongoDB
    echo "1. Database Setup:"
    echo "   a) Use local Docker MongoDB (recommended for testing)"
    echo "   b) Use MongoDB Atlas (for production)"
    read -p "   Select option (a/b): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Bb]$ ]]; then
        print_info "Please configure MongoDB Atlas credentials in .env file"
        read -p "   MongoDB Atlas URI: " mongo_uri
        read -p "   MongoDB Database name (default: student-db): " mongo_db
        mongo_db=${mongo_db:-student-db}
        read -p "   MongoDB Collection (default: student_performance.records): " mongo_collection
        mongo_collection=${mongo_collection:-student_performance.records}
        
        # Update .env file
        sed -i.bak "s|^# MONGO_URI=mongodb+srv://.*|MONGO_URI=$mongo_uri|" .env
        sed -i.bak "s|^# MONGO_DB=student-db|MONGO_DB=$mongo_db|" .env
        sed -i.bak "s|^# MONGO_COLLECTION=student_performance.records|MONGO_COLLECTION=$mongo_collection|" .env
        rm -f .env.bak
        
        print_success "MongoDB Atlas configured"
    else
        print_success "Using local Docker MongoDB"
    fi
    
    echo ""
    
    # Ask about LLM
    echo "2. LLM Configuration (optional):"
    read -p "   Do you have a Groq API key? (y/n) " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        read -p "   Enter Groq API key: " groq_key
        sed -i.bak "s/GROQ_API_KEY=your_groq_api_key_here/GROQ_API_KEY=$groq_key/" .env
        rm -f .env.bak
        print_success "Groq API key configured"
    else
        print_warning "No LLM configured - system will use heuristic fallback only"
    fi
    
    echo ""
}

# Start services
start_services() {
    print_info "Starting services..."
    
    # Build and start
    docker-compose up -d --build
    
    print_success "Services started successfully"
    echo ""
}

# Wait for health checks
wait_for_health() {
    print_info "Waiting for services to be ready..."
    
    local retries=30
    local count=0
    
    while [ $count -lt $retries ]; do
        if curl -s http://localhost:8000/health > /dev/null 2>&1; then
            print_success "All services are healthy"
            return 0
        fi
        
        count=$((count + 1))
        echo -n "."
        sleep 2
    done
    
    print_error "Services failed to start within 60 seconds"
    print_info "Check logs with: docker-compose logs"
    return 1
}

# Display success message
show_success() {
    echo ""
    print_success "Installation complete!"
    echo ""
    echo -e "${GREEN}╔══════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                     Ready to Use!                        ║${NC}"
    echo -e "${GREEN}╚══════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Access your applications:"
    echo "  • Dashboard:    http://localhost:3000"
    echo "  • API Docs:     http://localhost:8000/docs"
    echo "  • API:          http://localhost:8000"
    echo "  • Prometheus:   http://localhost:9090 (if enabled)"
    echo "  • Grafana:      http://localhost:3001 (if enabled)"
    echo ""
    echo "Useful commands:"
    echo "  docker-compose logs -f    # View logs"
    echo "  docker-compose ps         # Check status"
    echo "  docker-compose down       # Stop services"
    echo ""
    echo "Next steps:"
    echo "  1. Open http://localhost:3000 in your browser"
    echo "  2. Try the AI Assistant with sample queries"
    echo "  3. Explore the student dashboard"
    echo ""
}

# Cleanup on error
cleanup() {
    if [ $? -ne 0 ]; then
        echo ""
        print_error "Installation failed"
        print_info "Cleaning up..."
        docker-compose down 2>/dev/null || true
    fi
}

trap cleanup EXIT

# Main installation flow
main() {
    print_header
    check_prerequisites
    clone_repo
    setup_environment
    start_services
    wait_for_health
    show_success
}

# Run main function
main
