@echo off
echo 🚀 Setting up FinSense Development Environment

REM Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed. Please install Node.js 18+ first.
    exit /b 1
)

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Python is not installed. Please install Python 3.11+ first.
    exit /b 1
)

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  Docker is not installed. You can still run the services individually.
)

echo 📦 Installing dependencies...

REM Install root dependencies
npm install

REM Install backend dependencies
echo Installing backend dependencies...
cd backend
npm install
cd ..

REM Install frontend dependencies
echo Installing frontend dependencies...
cd frontend
npm install
cd ..

REM Install ML service dependencies
echo Installing ML service dependencies...
cd ml-service
pip install -r requirements.txt
cd ..

REM Copy environment files
echo 📝 Setting up environment files...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo ✅ Created backend/.env from example
)

if not exist ml-service\.env (
    copy ml-service\.env.example ml-service\.env
    echo ✅ Created ml-service/.env from example
)

REM Create necessary directories
echo 📁 Creating necessary directories...
if not exist backend\logs mkdir backend\logs
if not exist backend\uploads mkdir backend\uploads
if not exist ml-service\logs mkdir ml-service\logs
if not exist ml-service\models mkdir ml-service\models

echo ✅ Setup complete!
echo.
echo 🎯 Next steps:
echo 1. Update the .env files with your configuration
echo 2. Start MongoDB (or use Docker Compose)
echo 3. Run 'npm run dev' to start all services
echo 4. Or use 'docker-compose up -d' to run with Docker
echo.
echo 📚 Useful commands:
echo   npm run dev          - Start all services in development mode
echo   npm test             - Run all tests
echo   docker-compose up -d - Start with Docker

pause