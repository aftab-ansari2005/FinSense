# Quick Start Guide - Running FinSense Locally

## Prerequisites Check

Before starting, you need:
- ✅ Node.js (you have this)
- ✅ Docker (you have this)
- ❌ MongoDB (not installed) OR Docker Desktop (not running)

## Option 1: Use Docker Desktop (EASIEST - Recommended)

### Step 1: Start Docker Desktop
1. Open Docker Desktop application on your Windows machine
2. Wait for it to fully start (whale icon in system tray should be steady)
3. Verify it's running:
   ```powershell
   docker ps
   ```

### Step 2: Start All Services with Docker Compose
```powershell
# From the FinSense root directory
docker-compose up
```

This will start:
- MongoDB on port 27017
- Backend API on port 5000
- ML Service on port 5001
- Frontend on port 3000

### Step 3: Access the Application
Open your browser and go to: **http://localhost:3000**

### To Stop Services
Press `Ctrl+C` in the terminal, then run:
```powershell
docker-compose down
```

---

## Option 2: Install MongoDB and Run Locally

### Step 1: Install MongoDB

#### Download MongoDB
1. Go to: https://www.mongodb.com/try/download/community
2. Select:
   - Version: 7.0.x (latest)
   - Platform: Windows
   - Package: MSI
3. Download and run the installer
4. During installation:
   - Choose "Complete" installation
   - Install MongoDB as a Service (check this option)
   - Install MongoDB Compass (optional, but helpful)

#### Verify MongoDB Installation
```powershell
# Check if MongoDB service is running
Get-Service MongoDB

# Or try connecting
mongosh
```

### Step 2: Configure Environment Variables

Make sure these files exist with correct values:

#### backend/.env
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/finsense
JWT_SECRET=your-super-secret-jwt-key-change-this-to-something-random
JWT_REFRESH_SECRET=your-refresh-secret-change-this-to-something-random
ML_SERVICE_URL=http://localhost:5001
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads
ENCRYPTION_KEY=your-32-character-encryption-key-here-change-this
```

#### frontend/.env
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
```

#### ml-service/.env
```env
FLASK_ENV=development
FLASK_PORT=5001
MODEL_STORAGE_PATH=./models
```

### Step 3: Install Dependencies (if not done)

```powershell
# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..

# Install ML service dependencies
cd ml-service
pip install -r requirements.txt
cd ..
```

### Step 4: Start All Services

#### Option A: Use the Convenient Script (Recommended)
```powershell
# From the root directory
npm run dev
```

This starts all three services at once!

#### Option B: Start Services Manually in Separate Terminals

**Terminal 1 - Backend:**
```powershell
cd backend
npm start
```

**Terminal 2 - ML Service:**
```powershell
cd ml-service
python app.py
```

**Terminal 3 - Frontend:**
```powershell
cd frontend
npm start
```

### Step 5: Access the Application
Open your browser and go to: **http://localhost:3000**

---

## Verification Steps

### Check if Services are Running

1. **Backend Health Check:**
   - Open: http://localhost:5000/api/health
   - Should see: `{"status":"ok"}`

2. **ML Service Health Check:**
   - Open: http://localhost:5001/health
   - Should see: `{"status":"healthy"}`

3. **Frontend:**
   - Open: http://localhost:3000
   - Should see the FinSense login/register page

### Check Service Logs

If something isn't working, check the terminal logs for errors:
- Backend logs show database connection status
- ML service logs show model loading status
- Frontend logs show compilation status

---

## Common Issues & Solutions

### Issue: "Cannot connect to MongoDB"

**Solution:**
1. Check if MongoDB service is running:
   ```powershell
   Get-Service MongoDB
   ```
2. If not running, start it:
   ```powershell
   Start-Service MongoDB
   ```
3. Or use Docker for MongoDB only:
   ```powershell
   docker run -d -p 27017:27017 --name mongodb mongo:7.0
   ```

### Issue: "Port already in use"

**Solution:**
1. Check what's using the port:
   ```powershell
   netstat -ano | findstr :5000
   netstat -ano | findstr :5001
   netstat -ano | findstr :3000
   ```
2. Kill the process or change the port in .env files

### Issue: "Module not found" errors

**Solution:**
```powershell
# Reinstall dependencies
cd backend
rm -r node_modules
npm install

cd ../frontend
rm -r node_modules
npm install

cd ../ml-service
pip install -r requirements.txt --force-reinstall
```

### Issue: Frontend shows "Cannot connect to backend"

**Solution:**
1. Verify backend is running on port 5000
2. Check frontend/.env has correct REACT_APP_API_URL
3. Check browser console (F12) for CORS errors
4. Restart frontend: `npm start`

---

## Quick Commands Reference

```powershell
# Start everything (requires MongoDB installed)
npm run dev

# Start with Docker (requires Docker Desktop running)
docker-compose up

# Stop Docker services
docker-compose down

# View Docker logs
docker-compose logs -f

# Restart a specific service
docker-compose restart backend

# Check running Docker containers
docker ps

# Check MongoDB status
Get-Service MongoDB

# Start MongoDB service
Start-Service MongoDB
```

---

## What to Do Next

Once all services are running:

1. **Register an Account:**
   - Go to http://localhost:3000
   - Click "Register"
   - Create your account

2. **Upload Transactions:**
   - Click "Upload" in the navigation
   - Upload a CSV file with your transactions
   - Format: Date,Description,Amount

3. **View Dashboard:**
   - See your financial overview
   - Check predictions
   - Review recommendations

4. **Explore Features:**
   - View all transactions
   - See financial predictions
   - Check alerts and recommendations

---

## Need Help?

- Check SETUP_AND_USER_GUIDE.md for detailed user guide
- Check README.md for project overview
- Look at terminal logs for error messages
- Check browser console (F12) for frontend errors

---

**Recommended: Use Docker Desktop for the easiest setup!**

Just start Docker Desktop, then run:
```powershell
docker-compose up
```

That's it! Everything will be configured and running.
