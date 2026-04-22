const mongoose = require('mongoose');

const FinancialStressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  score: { type: Number },
  stressScore: { type: Number },
  level: { type: String },
  riskLevel: { type: String },
  factors: [{ type: mongoose.Schema.Types.Mixed }],
  recommendations: [{ type: mongoose.Schema.Types.Mixed }],
  alerts: [{ type: mongoose.Schema.Types.Mixed }],
  basedOnPeriod: {
    startDate: { type: Date },
    endDate: { type: Date },
    transactionCount: { type: Number }
  },
  metrics: { type: mongoose.Schema.Types.Mixed },
  calculatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.models.FinancialStress || mongoose.model('FinancialStress', FinancialStressSchema);

