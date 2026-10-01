require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { connectDatabase } = require('./config/db');
const certificateRoutes = require('./routes/certificates');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
const allowedOrigins = new Set([
  ...(process.env.FRONTEND_URL || '').split(',').map((origin) => origin.trim()).filter(Boolean),
  'http://localhost:5173',
  'http://localhost:5174',
]);
app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
app.use(express.json({ limit: '100kb' }));
app.use('/assets', express.static(path.resolve(__dirname, 'assets'), { maxAge: '1h' }));
app.use(morgan('combined'));
app.get('/', (_req, res) => {
  const frontendUrl = process.env.FRONTEND_URL || '';
  if (frontendUrl && !frontendUrl.includes('localhost')) return res.redirect(frontendUrl);
  return res.json({ service: 'Esports E-Certificate API', status: 'running', message: 'Open the frontend URL for the website.', frontend: frontendUrl || 'http://localhost:5173', health: '/api/health' });
});
app.use('/api/certificates/request', rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false }));
app.get('/api/health', (_req, res) => res.json({ success: true, service: 'esports-certificate-api' }));
app.use('/api/certificates', certificateRoutes);
app.use('/api/admin', adminRoutes);
app.use((error, _req, res, _next) => {
  console.error(error.message);
  if (error.name === 'ZodError') return res.status(400).json({ success: false, message: 'Please check the submitted values' });
  return res.status(500).json({ success: false, message: 'Something went wrong. Please try again.' });
});

const port = process.env.PORT || 4000;
if (require.main === module) {
  connectDatabase().then(() => app.listen(port, () => console.log(`API listening on port ${port}`))).catch((error) => {
    console.error(`Database connection failed: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = app;
