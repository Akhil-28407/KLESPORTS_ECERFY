const mongoose = require('mongoose');

const assetSchema = new mongoose.Schema({
  data: { type: String, default: '' },
  mimeType: { type: String, default: '' },
  fileName: { type: String, default: '' },
}, { _id: false });

const brandingSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  clubName: { type: String, default: 'KL Esports Club' },
  organizerName: { type: String, default: '' },
  website: { type: String, default: '' },
  primaryColor: { type: String, default: '#e21f26' },
  secondaryColor: { type: String, default: '#120b0d' },
  participationTitle: { type: String, default: 'CERTIFICATE OF PARTICIPATION' },
  winnerTitle: { type: String, default: 'WINNER CERTIFICATE' },
  runnerUpTitle: { type: String, default: 'RUNNER-UP CERTIFICATE' },
  introText: { type: String, default: 'This certificate is proudly presented to' },
  bodyText: { type: String, default: 'In recognition of your achievement and participation in this official esports event.' },
  verificationLabel: { type: String, default: 'SCAN TO VERIFY' },
  footerText: { type: String, default: 'Official digital record' },
  clubLogoWidth: { type: Number, default: 86, min: 30, max: 180 },
  clubLogoHeight: { type: Number, default: 62, min: 20, max: 120 },
  sacLogoWidth: { type: Number, default: 86, min: 30, max: 180 },
  sacLogoHeight: { type: Number, default: 62, min: 20, max: 120 },
  backgroundOpacity: { type: Number, default: 0.22, min: 0.05, max: 1 },
  borderWidth: { type: Number, default: 2, min: 1, max: 6 },
  qrSize: { type: Number, default: 82, min: 55, max: 130 },
  clubLogo: { type: assetSchema, default: () => ({}) },
  sacLogo: { type: assetSchema, default: () => ({}) },
  signature: { type: assetSchema, default: () => ({}) },
  backgroundImage: { type: assetSchema, default: () => ({}) },
}, { timestamps: true });

module.exports = mongoose.model('Branding', brandingSchema);
