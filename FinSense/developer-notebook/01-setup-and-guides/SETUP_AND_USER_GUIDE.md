# FinSense Setup Manual & User Guide

## Table of Contents

1. [Introduction](#introduction)
2. [System Requirements](#system-requirements)
3. [Installation & Setup](#installation--setup)
4. [Running the Application](#running-the-application)
5. [User Guide](#user-guide)
6. [Troubleshooting](#troubleshooting)
7. [FAQ](#faq)

---

## Introduction

**FinSense** is an AI-powered wealth intelligence system that transforms traditional expense tracking into predictive financial health analysis. The application uses machine learning to automatically categorize transactions, predict future financial outcomes, and provide actionable insights.

### Key Features
- 📊 Automatic transaction categorization using AI
- 📈 30-day balance predictions with LSTM neural networks
- ⚠️ Financial stress score and risk assessment
- 💡 Personalized recommendations and alerts
- 📱 Real-time dashboard updates
- 🔒 GDPR-compliant data management

---

## System Requirements

### Minimum Requirements
- **Operating System**: Windows 10/11, macOS 10.15+, or Linux
- **RAM**: 4 GB minimum, 8 GB recommended
- **Storage**: 2 GB free space
- **Internet**: Broadband connection

### Software Prerequisites
- **Node.js**: Version 18.x or higher
- **Python**: Version 3.9 or higher
- **MongoDB**: Version 5.0 or higher
- **npm**: Version 8.x or higher (comes with Node.js)

---

## Installation & Setup

### Step 1: Install Prerequisites

#### Install Node.js
1. Visit [nodejs.org](https://nodejs.org/)
2. Download the LTS version for your operating system
3. Run the installer and follow the prompts
4. Verify installation:
   ```bash
   node --version
   npm --version
   ```

#### Install Python
1. Visit [python.org](https://www.python.org/)
2. Download Python 3.9 or higher
3. During installation, check "Add Python to PATH"
4. Verify installation:
   ```bash
   python --version
   pip --version
   ```

#### Install MongoDB
1. Visit [mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
2. Download MongoDB Community Server
3. Install and start MongoDB service
4. Verify MongoDB is running:
   ```bash
   mongosh
   ```

### Step 2: Clone or Download the Project

```bash
# If using Git
git clone <repository-url>
cd FinSense

# Or extract the downloaded ZIP file
```
### Step 3: Install Dependencies

#### Backend Setup
```bash
cd backend
npm install
```

#### Frontend Setup
```bash
cd frontend
npm install
```

#### ML Service Setup
```bash
cd ml-service
pip install -r requirements.txt
```

### Step 4: Configure Environment Variables

#### Backend Configuration
Create `backend/.env` file:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/finsense

# JWT Secret (change this to a random string)
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_REFRESH_SECRET=your-refresh-secret-change-this

# ML Service
ML_SERVICE_URL=http://localhost:5001

# File Upload
MAX_FILE_SIZE=10485760
UPLOAD_DIR=./uploads

# Encryption
ENCRYPTION_KEY=your-32-character-encryption-key
```

#### Frontend Configuration
Create `frontend/.env` file:
```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000
```

#### ML Service Configuration
Create `ml-service/.env` file:
```env
FLASK_ENV=development
FLASK_PORT=5001
MODEL_STORAGE_PATH=./models
```

### Step 5: Initialize Database

```bash
cd backend
node src/config/seed.js
```

This will create necessary indexes and seed initial data.

---

## Running the Application

### Option 1: Run All Services Separately

#### Terminal 1: Start MongoDB
```bash
# Windows
mongod

# macOS/Linux
sudo systemctl start mongod
```

#### Terminal 2: Start Backend
```bash
cd backend
npm start
```
Backend will run on `http://localhost:5000`

#### Terminal 3: Start ML Service
```bash
cd ml-service
python app.py
```
ML Service will run on `http://localhost:5001`

#### Terminal 4: Start Frontend
```bash
cd frontend
npm start
```
Frontend will run on `http://localhost:3000`

### Option 2: Using Docker (if available)

```bash
docker-compose up
```

### Verify All Services Are Running

1. **Backend**: Visit `http://localhost:5000/api/health`
2. **ML Service**: Visit `http://localhost:5001/health`
3. **Frontend**: Visit `http://localhost:3000`

---

## User Guide

### Getting Started

#### 1. Create an Account

1. Open your browser and go to `http://localhost:3000`
2. Click **"Register"** in the top right corner
3. Fill in your details:
   - Email address
   - Password (minimum 6 characters)
   - First name (optional)
   - Last name (optional)
4. Click **"Create Account"**
5. You'll be automatically logged in and redirected to the dashboard

#### 2. Login to Existing Account

1. Go to `http://localhost:3000`
2. Click **"Sign In"**
3. Enter your email and password
4. Click **"Sign in"**

### Main Features

#### Dashboard

The dashboard is your financial command center, showing:

- **Current Balance**: Your latest balance based on transaction history
- **Monthly Spending**: Total expenses for the last 30 days
- **Financial Health**: Your overall financial status with stress score
- **Category Breakdown**: Pie chart showing spending by category
- **Recent Transactions**: Your latest 8 transactions
- **Alerts**: Important notifications about your financial health
- **Recommendations**: AI-generated advice to improve your finances

**How to use:**
1. After logging in, you'll see the dashboard automatically
2. Click on any stat card to see more details
3. Use the "Quick Actions" buttons to navigate to other features

#### Upload Transactions

Upload your bank statement CSV files to analyze your finances.

**Step-by-step:**

1. Click **"Upload"** in the navigation menu
2. You'll see two upload options:
   - **Drag and drop** your CSV file into the upload area
   - **Click to browse** and select your file

3. Supported CSV formats:
   ```csv
   Date,Description,Amount
   2024-01-15,Grocery Store,-45.50
   2024-01-16,Salary Deposit,2500.00
   ```

4. Click **"Upload and Process"**
5. Wait for processing (shows progress bar)
6. View results:
   - Number of transactions processed
   - Any errors or warnings
   - Automatic categorization results

**Tips:**
- Files can contain up to 10,000 transactions
- Dates should be in YYYY-MM-DD format
- Negative amounts = expenses, Positive = income
- The AI will automatically categorize your transactions

#### View Transactions

Browse, search, and manage all your transactions.

**Features:**

1. **Search**: Type keywords to find specific transactions
   - Example: "grocery", "amazon", "restaurant"

2. **Filter by Category**: Select a category from the dropdown
   - Categories are automatically assigned by AI
   - You can see all unique categories

3. **Pagination**: Navigate through pages
   - 20 transactions per page
   - Use "Previous" and "Next" buttons

4. **Transaction Details**:
   - Date: When the transaction occurred
   - Description: What the transaction was for
   - Category: AI-assigned category with confidence indicator
   - Amount: Green for income, Red for expenses

5. **Category Management**:
   - Click on a category to edit it
   - AI-assigned categories show "AI" badge
   - User-verified categories are marked

**Tips:**
- Use search to quickly find specific transactions
- Filter by category to see spending patterns
- The system learns from your category corrections

#### Financial Predictions

View AI-powered predictions of your future financial health.

**What you'll see:**

1. **Prediction Chart**:
   - Blue line: Historical balance
   - Orange line: Predicted balance (next 30 days)
   - Shaded area: Confidence interval (uncertainty range)

2. **Model Performance Metrics**:
   - **Accuracy**: How accurate the model is (0-100%)
   - **MAE**: Mean Absolute Error (lower is better)
   - **RMSE**: Root Mean Square Error (lower is better)

3. **Date Range Selector**:
   - 7 days: Short-term view
   - 30 days: Monthly view (default)
   - 60 days: Two-month view
   - 90 days: Quarterly view

**How to interpret:**

- **Rising trend**: Your balance is expected to increase
- **Falling trend**: You may be spending more than earning
- **Wide confidence interval**: Higher uncertainty in predictions
- **Narrow confidence interval**: More confident predictions

**Tips:**
- Upload more transactions for better predictions
- Check predictions regularly to stay informed
- Use predictions to plan major purchases

#### Alerts and Recommendations

Get personalized insights to improve your financial health.

**Types of Alerts:**

1. **Critical (Red)**: Immediate attention needed
   - Example: "Balance predicted to go negative"
   - Action: Review spending immediately

2. **High (Orange)**: Important warnings
   - Example: "Spending 20% above average"
   - Action: Consider reducing expenses

3. **Moderate (Yellow)**: Gentle reminders
   - Example: "Opportunity to save more"
   - Action: Review recommendations

**Recommendation Cards:**

Each recommendation includes:
- **Priority**: High, Medium, or Low
- **Category**: What area it affects (Savings, Spending, Budget)
- **Action**: Specific advice to follow
- **Impact**: Expected benefit

**Managing Alerts:**

1. **View All Alerts**: Scroll to the alerts section on dashboard
2. **Dismiss Alerts**: Click the X button to dismiss
3. **Configure Thresholds**: Click "Configure Alerts" to set your preferences
   - Set custom stress score thresholds
   - Enable/disable email notifications
   - Choose notification frequency

### Advanced Features

#### Alert Threshold Settings

Customize when you receive alerts:

1. Click **"Configure Alerts"** on the dashboard
2. Adjust settings:
   - **Critical Threshold**: When to show critical alerts (default: 70)
   - **Warning Threshold**: When to show warnings (default: 50)
   - **Email Notifications**: Enable/disable email alerts
   - **Push Notifications**: Enable/disable browser notifications
3. Click **"Save Settings"**

#### Data Export

Download your financial data:

1. Go to **Settings** (if available) or use API endpoint
2. Choose export format:
   - **JSON**: Complete data with metadata
   - **CSV**: Transactions and predictions
   - **Complete Package**: All data in multiple formats
3. Click **"Export Data"**
4. Your download will start automatically

**What's included:**
- All transactions
- Predictions history
- Financial stress scores
- Account information
- Export metadata (date, size, etc.)

#### Data Deletion

Remove your data from the system:

1. Go to **Settings** → **Privacy**
2. Choose deletion option:
   - **Delete Transactions**: Remove specific transactions
   - **Delete Predictions**: Remove prediction history
   - **Delete Account**: Remove everything (requires confirmation)
3. For account deletion:
   - Click **"Delete My Account"**
   - Confirm by typing your email
   - Click **"Permanently Delete"**

**Warning**: Account deletion is permanent and cannot be undone!

### Understanding Your Financial Health

#### Financial Stress Score

A number from 0-100 indicating your financial risk:

- **0-30 (Excellent)**: Strong financial position
  - Consistent savings
  - Low spending relative to income
  - Positive balance trends

- **31-50 (Good)**: Healthy finances
  - Balanced spending
  - Some savings
  - Stable balance

- **51-70 (Fair)**: Needs attention
  - High spending
  - Limited savings
  - Declining balance

- **71-100 (At Risk)**: Immediate action needed
  - Spending exceeds income
  - Negative balance predicted
  - High financial stress

#### Contributing Factors

The system analyzes multiple factors:

1. **Income vs. Expenses**: Are you earning more than spending?
2. **Spending Trends**: Is spending increasing or decreasing?
3. **Balance Trajectory**: Is your balance growing or shrinking?
4. **Category Patterns**: Which categories are problematic?
5. **Prediction Confidence**: How certain are the forecasts?

### Tips for Best Results

#### For Accurate Predictions

1. **Upload Complete Data**: Include at least 3 months of transactions
2. **Regular Updates**: Upload new transactions weekly or monthly
3. **Verify Categories**: Correct any miscategorized transactions
4. **Include All Accounts**: Upload data from all your bank accounts

#### For Better Financial Health

1. **Review Dashboard Daily**: Stay informed about your finances
2. **Act on Recommendations**: Follow the AI-generated advice
3. **Set Spending Limits**: Use alerts to stay within budget
4. **Track Progress**: Monitor your stress score over time
5. **Plan Ahead**: Use predictions to plan major expenses

---

## Troubleshooting

### Common Issues

#### Application Won't Start

**Problem**: Services fail to start

**Solutions**:
1. Check if all prerequisites are installed:
   ```bash
   node --version
   python --version
   mongosh
   ```

2. Verify MongoDB is running:
   ```bash
   # Windows
   net start MongoDB
   
   # macOS/Linux
   sudo systemctl status mongod
   ```

3. Check if ports are available:
   - Backend: 5000
   - ML Service: 5001
   - Frontend: 3000

4. Review error logs in terminal

#### Cannot Login

**Problem**: Login fails with error message

**Solutions**:
1. Verify email and password are correct
2. Check if backend is running (`http://localhost:5000/api/health`)
3. Clear browser cache and cookies
4. Try registering a new account
5. Check backend logs for authentication errors

#### CSV Upload Fails

**Problem**: File upload returns error

**Solutions**:
1. **Check file format**:
   - Must be .csv extension
   - Must have headers: Date, Description, Amount
   - Dates in YYYY-MM-DD format

2. **Check file size**:
   - Maximum 10 MB
   - Maximum 10,000 transactions

3. **Verify CSV structure**:
   ```csv
   Date,Description,Amount
   2024-01-15,Store Purchase,-45.50
   ```

4. **Common format issues**:
   - Remove extra commas in descriptions
   - Ensure no blank lines
   - Use UTF-8 encoding

#### Predictions Not Showing

**Problem**: Prediction page is empty

**Solutions**:
1. **Upload more data**: Need minimum 3 months of transactions
2. **Wait for processing**: Predictions take 5-10 seconds to generate
3. **Check ML service**: Visit `http://localhost:5001/health`
4. **Refresh the page**: Click the refresh button
5. **Check browser console**: Press F12 and look for errors

#### Dashboard Shows No Data

**Problem**: Dashboard is empty after uploading

**Solutions**:
1. **Verify upload succeeded**: Check for success message
2. **Refresh the page**: Press F5 or click refresh
3. **Check transactions page**: See if transactions are there
4. **Wait a moment**: Real-time updates may take a few seconds
5. **Clear cache**: Try hard refresh (Ctrl+F5)

#### Real-time Updates Not Working

**Problem**: Dashboard doesn't update automatically

**Solutions**:
1. **Check WebSocket connection**: Look for connection errors in console
2. **Verify backend WebSocket**: Backend must be running
3. **Check firewall**: Ensure WebSocket port is not blocked
4. **Try different browser**: Some browsers block WebSockets
5. **Refresh manually**: Use the refresh button

### Error Messages

#### "Service Temporarily Unavailable"

**Meaning**: Backend or ML service is down

**Fix**:
1. Check if all services are running
2. Restart the affected service
3. Check service logs for errors
4. Verify network connectivity

#### "Invalid CSV Format"

**Meaning**: CSV file doesn't match expected format

**Fix**:
1. Check CSV has required columns: Date, Description, Amount
2. Verify date format: YYYY-MM-DD
3. Ensure amounts are numbers
4. Remove special characters from descriptions

#### "Authentication Failed"

**Meaning**: Login credentials are incorrect or token expired

**Fix**:
1. Verify email and password
2. Try logging out and back in
3. Clear browser cookies
4. Reset password if forgotten

#### "Insufficient Data for Predictions"

**Meaning**: Not enough transaction history

**Fix**:
1. Upload at least 3 months of transactions
2. Ensure transactions span multiple months
3. Include both income and expenses
4. Wait for data processing to complete

---

## FAQ

### General Questions

**Q: Is my financial data secure?**
A: Yes! FinSense uses industry-standard encryption (JWT, bcrypt, AES) to protect your data. All data is encrypted at rest and in transit. We comply with GDPR regulations.

**Q: Can I use FinSense offline?**
A: No, FinSense requires an internet connection to function. However, the dashboard will show cached data if the service is temporarily unavailable.

**Q: How accurate are the predictions?**
A: Prediction accuracy depends on the amount and quality of your transaction data. With 3+ months of data, accuracy typically ranges from 85-95%. The system shows accuracy metrics on the predictions page.

**Q: Does FinSense connect to my bank?**
A: No, FinSense does not connect directly to banks. You manually upload CSV files exported from your bank's website.

**Q: How often should I upload transactions?**
A: For best results, upload new transactions weekly or monthly. More frequent updates lead to more accurate predictions.

### Data & Privacy

**Q: Who can see my financial data?**
A: Only you can see your data. Each user's data is completely isolated and encrypted. Even administrators cannot access your financial information.

**Q: Can I delete my data?**
A: Yes! You can export all your data and delete your account at any time. Deletion is permanent and complies with GDPR "Right to Erasure."

**Q: How long is my data stored?**
A: Data is stored indefinitely until you delete it. You can delete specific transactions, predictions, or your entire account.

**Q: Is my data backed up?**
A: In production environments, yes. For local development, you should backup your MongoDB database regularly.

### Features

**Q: How does automatic categorization work?**
A: FinSense uses machine learning (KMeans and DBSCAN clustering) to group similar transactions based on description patterns and amounts. The system learns from your corrections.

**Q: Can I manually categorize transactions?**
A: Yes! Click on any transaction's category to change it. The system will learn from your corrections and improve future categorizations.

**Q: What if the predictions are wrong?**
A: Predictions improve with more data. Upload more transactions and the model will retrain automatically. You can also check the confidence intervals to understand uncertainty.

**Q: Can I set custom alert thresholds?**
A: Yes! Click "Configure Alerts" on the dashboard to set custom thresholds for when you receive notifications.

**Q: Does the system support multiple currencies?**
A: Currently, the system displays amounts in USD. Multi-currency support is planned for future releases.

### Technical

**Q: What browsers are supported?**
A: FinSense works best on modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Q: Can I run FinSense on a server?**
A: Yes! FinSense can be deployed to any server that supports Node.js, Python, and MongoDB. See deployment documentation for details.

**Q: How do I update FinSense?**
A: Pull the latest code from the repository and run:
```bash
cd backend && npm install
cd frontend && npm install
cd ml-service && pip install -r requirements.txt
```

**Q: Can I contribute to FinSense?**
A: Yes! FinSense is open for contributions. Check the repository for contribution guidelines.

---

## Getting Help

### Support Resources

1. **Documentation**: Read this guide and other README files
2. **GitHub Issues**: Report bugs or request features
3. **Community Forum**: Ask questions and share tips
4. **Email Support**: contact@finsense.app (if available)

### Reporting Bugs

When reporting bugs, include:
1. Steps to reproduce the issue
2. Expected behavior
3. Actual behavior
4. Screenshots (if applicable)
5. Browser and OS information
6. Error messages from console (F12)

### Feature Requests

We welcome feature requests! Please include:
1. Description of the feature
2. Use case / why it's needed
3. How it should work
4. Any examples or mockups

---

## Appendix

### CSV Format Examples

#### Basic Format
```csv
Date,Description,Amount
2024-01-15,Grocery Store,-45.50
2024-01-16,Salary Deposit,2500.00
2024-01-17,Electric Bill,-120.00
```

#### With Additional Columns (ignored)
```csv
Date,Description,Amount,Balance,Category
2024-01-15,Grocery Store,-45.50,1954.50,Food
2024-01-16,Salary Deposit,2500.00,4454.50,Income
```

### Keyboard Shortcuts

- **Ctrl/Cmd + K**: Quick search (if implemented)
- **Ctrl/Cmd + U**: Go to upload page
- **Ctrl/Cmd + D**: Go to dashboard
- **Ctrl/Cmd + T**: Go to transactions
- **Ctrl/Cmd + P**: Go to predictions
- **F5**: Refresh current page
- **Ctrl/Cmd + F5**: Hard refresh (clear cache)

### API Endpoints (for developers)

- `GET /api/health`: Check backend health
- `POST /api/auth/register`: Register new user
- `POST /api/auth/login`: Login user
- `POST /api/transactions/upload`: Upload CSV
- `GET /api/transactions`: Get transactions
- `GET /api/ml/predictions`: Get predictions
- `GET /api/ml/dashboard`: Get dashboard data

---

## Conclusion

FinSense is designed to make financial management easy and insightful. By leveraging AI and machine learning, it provides you with the tools to understand your financial health and make better decisions.

**Remember**:
- Upload transactions regularly for best results
- Review your dashboard daily
- Act on recommendations
- Monitor your financial stress score
- Use predictions to plan ahead

**Happy Financial Planning! 💰📊**

---

*Last Updated: January 14, 2026*
*Version: 1.0.0*
