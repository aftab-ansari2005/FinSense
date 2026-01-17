# CORS Error Fix - Frontend Port Mismatch ✅

## Issue Identified

**CORS Error**: `The 'Access-Control-Allow-Origin' header has a value 'http://localhost:3000' that is not equal to the supplied origin.`

**Root Cause**: 
- Your **frontend is running on port 3001** 
- But the **backend CORS is configured for port 3000**
- This causes the browser to block the API requests

## Solution Applied ✅

### 1. Updated Backend CORS Configuration

Modified `backend/server.js` to allow both ports:

```javascript
// Before (only port 3000)
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// After (both ports 3000 and 3001)
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'http://localhost:3001', // Allow port 3001 as well
    'http://localhost:3000'  // Keep port 3000 for compatibility
  ],
  credentials: true
}));
```

### 2. Updated Environment Variable

Modified `backend/.env`:

```env
# Added frontend URL for port 3001
FRONTEND_URL=http://localhost:3001
```

## Next Steps Required

### 1. Start Docker Desktop

**You need to start Docker Desktop first:**

1. **Open Docker Desktop** from your Start menu or desktop
2. **Wait for it to fully start** (you'll see "Docker Desktop is running" in the system tray)
3. **Verify it's running** by opening a terminal and typing: `docker ps`

### 2. Start MongoDB

Once Docker Desktop is running, start MongoDB:

```powershell
# Remove any existing container (if it exists)
docker rm -f mongodb-finsense

# Start fresh MongoDB container
docker run -d -p 27017:27017 --name mongodb-finsense -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:7.0
```

### 3. Restart Backend

The backend will automatically connect to MongoDB once it's available.

## Current Status

| Service | Status | Port | Notes |
|---------|--------|------|-------|
| **Frontend** | ✅ Running | 3001 | http://localhost:3001 |
| **Backend** | ⚠️ Starting | 5000 | Waiting for MongoDB |
| **MongoDB** | ❌ Not Started | 27017 | Need Docker Desktop |
| **ML Service** | ❓ Unknown | 5001 | Check separately |

## Quick Fix Commands

### Option 1: Start Docker Desktop GUI
1. Click Start menu → Search "Docker Desktop" → Open it
2. Wait for it to start (green icon in system tray)
3. Then run: `docker run -d -p 27017:27017 --name mongodb-finsense -e MONGO_INITDB_ROOT_USERNAME=admin -e MONGO_INITDB_ROOT_PASSWORD=password mongo:7.0`

### Option 2: Alternative - Use Local MongoDB
If you have MongoDB installed locally:
1. Start MongoDB service: `net start MongoDB`
2. Update `backend/.env`: `MONGODB_URI=mongodb://localhost:27017/finsense`

## Test the Fix

Once MongoDB is running:

1. **Backend should connect** automatically
2. **Go to your frontend**: http://localhost:3001
3. **Try registration** with a strong password like `Aftab@1234`
4. **Should work without CORS errors!**

## Files Modified

1. ✅ `backend/server.js` - Updated CORS to allow port 3001
2. ✅ `backend/.env` - Set FRONTEND_URL to port 3001

---

**Status**: ✅ CORS Fixed, ⏳ Waiting for Docker Desktop  
**Date**: January 17, 2026

**Next Step**: Start Docker Desktop, then start MongoDB, then try registration again!