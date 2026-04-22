 const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  date: { type: Date, required: true, index: true },
  amount: { type: Number, required: true },
  description: { type: String, required: true, trim: true },
  category: {
    name: { type: String, default: 'Uncategorized', index: true },
    confidence: { type: Number, default: 0 },
    isUserVerified: { type: Boolean, default: false }
  },
  rawData: {
    originalDescription: { type: String, default: '' },
    source: { type: String, default: 'manual' }
  },
  isRecurring: { type: Boolean, default: false },
  recurringPattern: {
    frequency: { type: String },
    nextDate: { type: Date }
  }
}, { timestamps: true });

TransactionSchema.statics.getSpendingSummary = function getSpendingSummary(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        userId,
        date: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$category.name',
        totalAmount: { $sum: '$amount' },
        count: { $sum: 1 },
        avgAmount: { $avg: '$amount' }
      }
    },
    { $sort: { totalAmount: -1 } }
  ]);
};

TransactionSchema.statics.getMonthlyTrends = function getMonthlyTrends(userId, months = 12) {
  return this.aggregate([
    { $match: { userId } },
    {
      $group: {
        _id: {
          year: { $year: '$date' },
          month: { $month: '$date' }
        },
        totalIncome: {
          $sum: {
            $cond: [{ $gte: ['$amount', 0] }, '$amount', 0]
          }
        },
        totalExpenses: {
          $sum: {
            $cond: [{ $lt: ['$amount', 0] }, { $abs: '$amount' }, 0]
          }
        },
        netAmount: { $sum: '$amount' },
        transactionCount: { $sum: 1 }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } },
    { $limit: months }
  ]);
};

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);


