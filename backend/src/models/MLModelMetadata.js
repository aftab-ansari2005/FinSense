const mongoose = require('mongoose');

const MLModelMetadataSchema = new mongoose.Schema({
  modelType: { type: String, required: true },
  version: { type: String, required: true },
  name: { type: String, required: true },
  description: { type: String },
  algorithm: { type: String },
  framework: { type: String },
  trainingDate: { type: Date },
  trainingDuration: { type: Number },
  datasetInfo: { type: mongoose.Schema.Types.Mixed },
  parameters: { type: mongoose.Schema.Types.Mixed },
  performance: { type: mongoose.Schema.Types.Mixed },
  deployment: { type: mongoose.Schema.Types.Mixed },
  files: { type: mongoose.Schema.Types.Mixed },
  tags: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.models.MLModelMetadata || mongoose.model('MLModelMetadata', MLModelMetadataSchema);

