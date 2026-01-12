#!/bin/bash

echo "🚀 Setting up FinSense Development Environment"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ first."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "❌ Python 3 is not installed. Please install Python 3.11+ first."
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker is not installed. You can still run the services individually."
fi

echo "📦 Installing dependencies..."

# Install root dependencies
npm install

# Install backend dependencies
echo "Installing backend dependencies..."
cd backend && npm install && cd ..

# Install frontend dependencies
echo "Installing frontend dependencies..."
cd frontend && npm install && cd ..

# Install ML service dependencies
echo "Installing ML service dependencies..."
cd ml-service && pip install -r requirements.txt && cd ..

# Copy environment files
echo "📝 Setting up environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "✅ Created backend/.env from example"
fi

if [ ! -f ml-service/.env ]; then
    cp ml-service/.env.example ml-service/.env
    echo "✅ Created ml-service/.env from example"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p backend/logs
mkdir -p backend/uploads
mkdir -p ml-service/logs
mkdir -p ml-service/models

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Update the .env files with your configuration"
echo "2. Start MongoDB (or use Docker Compose)"
echo "3. Run 'npm run dev' to start all services"
echo "4. Or use 'docker-compose up -d' to run with Docker"
echo ""
echo "📚 Useful commands:"
echo "  npm run dev          - Start all services in development mode"
echo "  npm test             - Run all tests"
echo "  docker-compose up -d - Start with Docker"