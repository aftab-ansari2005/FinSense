const DEMO_USER_ID = '66c0d1f00f00000000000001';
const DEMO_EMAIL = 'demo@finsense.com';
const DEMO_PASSWORD = 'DemoPassword123!';
const DEMO_TOKENS = { accessToken: 'demo-access-token', refreshToken: 'demo-refresh-token' };

const DEMO_USER = {
  _id: DEMO_USER_ID,
  email: DEMO_EMAIL,
  profile: { firstName: 'Demo', lastName: 'User', preferences: { currency: 'USD', alertThreshold: 0.8 } },
  emailVerified: true,
  isActive: true,
  role: 'user'
};

function isDemoMode() {
  const value = String(process.env.DEMO_MODE || '').trim().replace(/^['"]|['"]$/g, '').toLowerCase();
  return value === 'true' || value === '1' || value === 'yes' || value === 'on';
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function toIsoDate(offsetDays) {
  const date = new Date(Date.now() - offsetDays * 86400000);
  date.setHours(12, 0, 0, 0);
  return date.toISOString();
}

const templates = [
  { amount: 3500, description: 'Salary Deposit', category: 'Income', source: 'bank', recurring: true },
  { amount: -1240, description: 'Monthly Rent Payment', category: 'Housing', source: 'bank', recurring: true },
  { amount: -86.4, description: 'Grocery Shopping', category: 'Groceries', source: 'card' },
  { amount: -48.2, description: 'Gas Station Fuel', category: 'Transportation', source: 'card' },
  { amount: -24.99, description: 'Streaming Subscription', category: 'Entertainment', source: 'card', recurring: true },
  { amount: -67.15, description: 'Restaurant Dinner', category: 'Dining', source: 'card' },
  { amount: 650, description: 'Freelance Client Payment', category: 'Income', source: 'bank' },
  { amount: -164.32, description: 'Electric Bill', category: 'Utilities', source: 'bank', recurring: true },
  { amount: -58.9, description: 'Coffee and Snacks', category: 'Dining', source: 'card' },
  { amount: -210, description: 'Health Insurance', category: 'Healthcare', source: 'bank', recurring: true },
  { amount: -132.5, description: 'Online Shopping', category: 'Shopping', source: 'card' },
  { amount: -300, description: 'Savings Transfer', category: 'Savings', source: 'bank', recurring: true }
];

const DEMO_TRANSACTIONS = (() => {
  const items = [];
  for (let i = 0; i < 36; i += 1) {
	const template = templates[i % templates.length];
	const cycle = Math.floor(i / templates.length);
	const amount = Number((template.amount + (template.amount > 0 ? cycle * 25 : cycle * -3)).toFixed(2));

	items.push({
	  _id: `demo-tx-${String(i + 1).padStart(3, '0')}`,
	  userId: DEMO_USER_ID,
	  date: toIsoDate(i * 3 + (i % 2)),
	  amount,
	  description: template.description,
	  category: {
		name: template.category,
		confidence: template.category === 'Income' ? 0.99 : 0.88,
		isUserVerified: Boolean(template.recurring)
	  },
	  rawData: { originalDescription: template.description.toUpperCase(), source: template.source },
	  isRecurring: Boolean(template.recurring),
	  recurringPattern: template.recurring ? { frequency: 'monthly', nextDate: toIsoDate(i * 3 - 27) } : undefined,
	  createdAt: toIsoDate(i * 3 + 1),
	  updatedAt: toIsoDate(i * 3 + 1)
	});
  }

  return items.sort((a, b) => new Date(b.date) - new Date(a.date));
})();

function getDemoTransactions() {
  return DEMO_TRANSACTIONS.map(clone);
}

function filterTransactions(transactions, { startDate, endDate, category, search, sortBy = 'date', sortOrder = 'desc' } = {}) {
  let results = [...transactions];
  if (startDate) results = results.filter(transaction => new Date(transaction.date) >= new Date(startDate));
  if (endDate) results = results.filter(transaction => new Date(transaction.date) <= new Date(endDate));
  if (category) results = results.filter(transaction => transaction.category?.name === category);
  if (search) {
	const term = String(search).toLowerCase();
	results = results.filter(transaction => transaction.description.toLowerCase().includes(term) || transaction.category?.name.toLowerCase().includes(term));
  }

  results.sort((a, b) => {
	const left = sortBy === 'date' ? new Date(a.date).getTime() : Number(a[sortBy] ?? 0);
	const right = sortBy === 'date' ? new Date(b.date).getTime() : Number(b[sortBy] ?? 0);
	return sortOrder === 'desc' ? right - left : left - right;
  });

  return results;
}

function paginate(items, page = 1, limit = 50) {
  const currentPage = Math.max(1, Number(page) || 1);
  const pageSize = Math.max(1, Number(limit) || 50);
  const totalCount = items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const start = (currentPage - 1) * pageSize;

  return {
	items: items.slice(start, start + pageSize),
	pagination: { currentPage, totalPages, totalCount, hasNextPage: currentPage < totalPages, hasPrevPage: currentPage > 1 }
  };
}

function getDemoTransactionPage(options = {}) {
  const filtered = filterTransactions(getDemoTransactions(), options);
  const { items, pagination } = paginate(filtered, options.page, options.limit);
  return { transactions: items, pagination };
}

function getDemoTransactionById(id) {
  return getDemoTransactions().find(transaction => transaction._id === id) || null;
}

function buildBalanceData(transactions) {
  const ordered = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  let balance = 2400;
  return ordered.map(transaction => {
	balance = Number((balance + transaction.amount).toFixed(2));
	return { date: transaction.date, balance };
  });
}

function buildPredictions(balanceData, days = 30) {
  const lastBalance = balanceData[balanceData.length - 1]?.balance ?? 2400;
  const window = balanceData.slice(-7).map(point => point.balance);
  const trend = window.length > 1 ? (window[window.length - 1] - window[0]) / (window.length - 1) : -18;
  const predictions = [];

  for (let i = 1; i <= days; i += 1) {
	const predictedBalance = Number((lastBalance + trend * i - i * 8 + (i % 7 === 0 ? 45 : 0) - (i % 5 === 0 ? 25 : 0)).toFixed(2));
	predictions.push({
	  date: toIsoDate(-i),
	  predicted_balance: predictedBalance,
	  confidence_interval: { lower: Number((predictedBalance - 140).toFixed(2)), upper: Number((predictedBalance + 140).toFixed(2)) },
	  risk_level: predictedBalance < 1000 ? 'high' : predictedBalance < 1800 ? 'medium' : 'low'
	});
  }

  return predictions;
}

function buildStressScore(balanceData) {
  const lastBalance = balanceData[balanceData.length - 1]?.balance ?? 2400;
  const score = Math.max(0.12, Math.min(0.88, Number((1 - lastBalance / 5000).toFixed(2))));
  const risk_level = score >= 0.7 ? 'high' : score >= 0.4 ? 'moderate' : 'low';

  return {
	score,
	risk_level,
	factors: [
	  { category: 'cash_flow', impact: 0.34, description: 'Spending remains slightly above the ideal pace', severity: 'medium' },
	  { category: 'balance_projection', impact: 0.29, description: 'Projected balance softens over the next 30 days', severity: 'medium' }
	],
	recommendations: [
	  { type: 'reduce_discretionary_spending', priority: 'high', title: 'Trim dining and shopping spend', description: 'Small reductions improve the projected balance quickly', potentialImpact: 0.21, actionItems: ['Reduce dining out to 2 times per week', 'Set a weekly shopping cap'] }
	],
	alerts: [
	  { id: 'demo-alert-001', type: 'overspending_warning', severity: 'medium', title: 'Projected balance trending downward', message: 'Your balance is expected to dip below the comfort threshold if current spending continues.', acknowledged: false }
	],
	calculated_at: new Date().toISOString(),
	alert_summary: { total: 1, unread: 1 },
	recommendation_summary: { total: 1, highPriority: 1 }
  };
}

function getDemoCategorizationResponse(transactions = []) {
  const source = transactions.length ? transactions : getDemoTransactions().slice(0, 12);
  return {
	results: source.map(transaction => ({ transaction_id: transaction._id, category: transaction.category?.name || 'Uncategorized', confidence: transaction.category?.confidence ?? 0.9, is_verified: Boolean(transaction.category?.isUserVerified) })),
	model_version: 'demo-cluster-v1',
	processing_time: 0.18,
	total_processed: source.length,
	clustering_stats: { clusters_found: 8, silhouette_score: 0.71, outliers: 1 }
  };
}

function getDemoPredictionResponse(balanceData = [], predictionDays = 30) {
  const source = balanceData.length ? balanceData : buildBalanceData(getDemoTransactions());
  const predictions = buildPredictions(source, predictionDays);
  return {
	predictions,
	model_version: 'demo-lstm-v2',
	model_accuracy: 0.93,
	confidence_intervals: predictions.map(prediction => prediction.confidence_interval),
	preprocessing_stats: { input_points: source.length, missing_values_filled: 0, normalization: 'minmax' },
	generated_at: new Date().toISOString()
  };
}

function getDemoStressScoreResponse(currentBalance = 0, predictions = [], transactionHistory = []) {
  const source = transactionHistory.length ? transactionHistory : getDemoTransactions();
  const balanceData = buildBalanceData(source);
  const score = buildStressScore(balanceData);
  return {
	stress_score: score.score,
	risk_level: score.risk_level,
	factors: score.factors,
	recommendations: score.recommendations,
	alerts: score.alerts,
	calculated_at: score.calculated_at,
	alert_summary: score.alert_summary,
	recommendation_summary: score.recommendation_summary,
	input_summary: { current_balance: currentBalance, prediction_points: predictions.length, transaction_points: transactionHistory.length }
  };
}

function getDemoLearningStats() {
  return { user_stats: { corrections_submitted: 4, categories_learned: 7, model_feedback_score: 0.86, last_updated: new Date().toISOString() } };
}

function getDemoAlerts() {
  return { active_alerts: buildStressScore(buildBalanceData(getDemoTransactions())).alerts, total_count: 1 };
}

function getDemoRecommendations() {
  const recommendations = buildStressScore(buildBalanceData(getDemoTransactions())).recommendations;
  return { data: { recommendations, total_count: recommendations.length } };
}

function getDemoDashboardData(days = 30) {
  const transactions = getDemoTransactions();
  const balance_data = buildBalanceData(transactions);
  const stress = buildStressScore(balance_data);
  return {
	transactions: transactions.slice(0, 30),
	balance_data: balance_data.slice(-30),
	predictions: buildPredictions(balance_data, days),
	stress_score: { score: stress.score, risk_level: stress.risk_level, factors: stress.factors, calculated_at: stress.calculated_at },
	alerts: stress.alerts,
	recommendations: stress.recommendations,
	metadata: { data_period_days: days, last_updated: new Date().toISOString(), ml_service_status: { predictions: true, stress_score: true, alerts: true, recommendations: true } }
  };
}

function getDemoTransactionStats() {
  const transactions = getDemoTransactions();
  const ordered = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
  const categoryMap = new Map();
  const monthlyMap = new Map();

  ordered.forEach(transaction => {
	const category = transaction.category?.name || 'Uncategorized';
	const categoryEntry = categoryMap.get(category) || { _id: category, totalAmount: 0, count: 0 };
	categoryEntry.totalAmount = Number((categoryEntry.totalAmount + transaction.amount).toFixed(2));
	categoryEntry.count += 1;
	categoryMap.set(category, categoryEntry);

	const d = new Date(transaction.date);
	const monthKey = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
	const monthEntry = monthlyMap.get(monthKey) || { _id: { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 }, totalIncome: 0, totalExpenses: 0, netAmount: 0, transactionCount: 0 };
	if (transaction.amount >= 0) monthEntry.totalIncome = Number((monthEntry.totalIncome + transaction.amount).toFixed(2));
	else monthEntry.totalExpenses = Number((monthEntry.totalExpenses + Math.abs(transaction.amount)).toFixed(2));
	monthEntry.netAmount = Number((monthEntry.netAmount + transaction.amount).toFixed(2));
	monthEntry.transactionCount += 1;
	monthlyMap.set(monthKey, monthEntry);
  });

  return {
    period: { start: ordered[0]?.date || new Date().toISOString(), end: ordered[ordered.length - 1]?.date || new Date().toISOString() },
	categoryBreakdown: Array.from(categoryMap.values()).map(entry => ({ ...entry, avgAmount: Number((entry.totalAmount / entry.count).toFixed(2)) })),
	monthlyTrends: Array.from(monthlyMap.values())
  };
}

function getDemoUploadResult(fileName = 'demo-transactions.csv') {
  const transactions = getDemoTransactions().slice(0, 10);
  return {
	success: true,
	message: 'Demo CSV processed successfully',
	data: {
	  jobId: 'demo-upload-job',
	  importBatch: { id: 'demo-import-batch', source: fileName, mode: 'demo' },
	  processedCount: transactions.length,
	  errorCount: 0,
	  validation: { detectedFormat: 'csv', totalRows: transactions.length, fileSize: 2048, warnings: ['Demo mode is serving precomputed data'] },
	  transactions: transactions.map(transaction => ({ _id: transaction._id, date: transaction.date, amount: transaction.amount, description: transaction.description, category: transaction.category }))
	}
  };
}

function getDemoUploadValidation() {
  return {
	success: true,
	message: 'CSV validation completed',
	data: { isValid: true, detectedFormat: { name: 'csv', delimiter: ',', hasHeader: true }, totalRows: 10, fileSize: 2048, sampleRows: getDemoTransactions().slice(0, 3), errors: [], warnings: ['Demo mode validation uses precomputed sample rows'] }
  };
}

function getDemoJobStatus(jobId = 'demo-upload-job') {
  return {
	success: true,
	data: { id: jobId, status: 'completed', progress: { totalRows: 10, successfulRows: 10, errorRows: 0, percentage: 100 }, duration: 120, results: { importBatch: { id: 'demo-import-batch', mode: 'demo' }, errors: [] } }
  };
}

function getDemoJobResults(jobId = 'demo-upload-job') {
  const job = getDemoJobStatus(jobId);
  return {
	success: true,
	data: { jobId: job.data.id, status: job.data.status, progress: job.data.progress, duration: job.data.duration, importBatch: job.data.results.importBatch, errorSummary: { totalErrors: 0, errors: [] } }
  };
}

function getDemoHealth() {
  return {
	ml_service_status: 'healthy',
	ml_service_data: { mode: 'demo', status: 'ready', model_version: 'demo-suite-v1' },
	service_stats: { demoMode: true, requests: 0 },
	service_discovery: { demoMode: true, instances: 1 },
	connection_pools: { demoMode: true, pools: 0 },
	timestamp: new Date().toISOString()
  };
}

function getDemoServiceStats() {
  return { baseURL: 'demo://finsense', timeout: 0, maxRetries: 0, health: { isHealthy: true, lastHealthCheck: new Date().toISOString(), consecutiveFailures: 0, responseTime: 0 }, circuitBreakers: {}, demoMode: true, timestamp: new Date().toISOString() };
}

module.exports = {
  DEMO_USER_ID,
  DEMO_EMAIL,
  DEMO_PASSWORD,
  DEMO_USER,
  DEMO_TOKENS,
  isDemoMode,
  getDemoTransactions,
  getDemoTransactionPage,
  getDemoTransactionById,
  buildBalanceData,
  buildPredictions,
  buildStressScore,
  getDemoCategorizationResponse,
  getDemoPredictionResponse,
  getDemoStressScoreResponse,
  getDemoLearningStats,
  getDemoAlerts,
  getDemoRecommendations,
  getDemoDashboardData,
  getDemoTransactionStats,
  getDemoUploadResult,
  getDemoUploadValidation,
  getDemoJobStatus,
  getDemoJobResults,
  getDemoHealth,
  getDemoServiceStats
};


