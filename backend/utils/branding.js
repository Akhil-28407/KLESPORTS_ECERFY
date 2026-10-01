const Branding = require('../models/Branding');
const fs = require('fs');
const path = require('path');

const assetDirectory = path.resolve(__dirname, '../assets');
const defaultAssets = {
  clubLogo: 'kl esports logo.png',
  sacLogo: 'sac logo.png',
};

function readDefaultAsset(fileName) {
  const filePath = path.join(assetDirectory, fileName);
  if (!fs.existsSync(filePath)) return null;
  const extension = path.extname(fileName).toLowerCase();
  const mimeType = extension === '.jpg' || extension === '.jpeg' ? 'image/jpeg' : 'image/png';
  return { data: fs.readFileSync(filePath).toString('base64'), mimeType, fileName };
}

async function getBranding() {
  let branding = await Branding.findOne({ key: 'default' });
  if (!branding) branding = new Branding({ key: 'default' });

  let changed = false;
  if (branding.primaryColor === '#55e6c1') { branding.primaryColor = '#e21f26'; changed = true; }
  if (branding.secondaryColor === '#101522') { branding.secondaryColor = '#120b0d'; changed = true; }
  for (const [field, fileName] of Object.entries(defaultAssets)) {
    if (!branding[field]?.data) {
      const asset = readDefaultAsset(fileName);
      if (asset) { branding[field] = asset; changed = true; }
    }
  }
  if (changed || branding.isNew) await branding.save();
  return branding;
}

function assertRequiredLogos(branding) {
  if (!branding?.clubLogo?.data || !branding?.sacLogo?.data) {
    throw new Error('Required club and SAC logos are not configured');
  }
}

function assetToBuffer(asset) {
  if (!asset?.data) return null;
  try { return Buffer.from(asset.data, 'base64'); } catch { return null; }
}

module.exports = { getBranding, assetToBuffer, assertRequiredLogos };
