const mongoose = require('mongoose');

const PredictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  predictionDate: { type: Date, default: Date.now },
  targetDate: { type: Date, required: true, index: true },
  predictionType: { type: String, default: 'balance' },
  predictedBalance: { type: Number, required: true },
  confidenceInterval: {
    lower: { type: Number },
    upper: { type: Number },
    level: { type: Number, default: 0.95 }
  },
  modelVersion: { type: String, default: '1.0.0' },
  accuracy: {
    mae: { type: Number },
    rmse: { type: Number },
    r2Score: { type: Number }
  },
  features: {
    historicalPeriod: { type: Number },
    seasonality: { type: Boolean },
    trendStrength: { type: Number }
  },
  categoryBreakdown: [
    {
      category: { type: String },
      predictedAmount: { type: Number },
      confidence: { type: Number }
    }
  ]
}, { timestamps: true });

module.exports = mongoose.models.Prediction || mongoose.model('Prediction', PredictionSchema);

