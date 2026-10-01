const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const XLSX = require('xlsx');
const { z } = require('zod');
const Participant = require('../models/Participant');
const Certificate = require('../models/Certificate');
const Branding = require('../models/Branding');
const { requireAdmin } = require('../middleware/auth');
const { createOrGetCertificate } = require('../services/certificateService');
const { assertRequiredLogos, getBranding } = require('../utils/branding');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const valid = email.toLowerCase() === process.env.ADMIN_EMAIL?.toLowerCase() && await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH || '');
    if (!valid) return res.status(401).json({ success: false, message: 'Invalid admin credentials' });
    const token = jwt.sign({ email, role: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
    return res.json({ success: true, token });
  } catch (error) {
    next(error);
  }
});

router.get('/participants', requireAdmin, async (req, res, next) => {
  try {
    const filter = {};
    if (req.query.event) filter.eventName = req.query.event;
    if (req.query.result) filter.result = req.query.result;
    if (req.query.attendance) filter.attendance = req.query.attendance === 'true';
    if (req.query.search) filter.$or = [{ participantId: new RegExp(req.query.search, 'i') }, { name: new RegExp(req.query.search, 'i') }];
    const participants = await Participant.find(filter).sort({ createdAt: -1 }).limit(500);
    return res.json({ success: true, participants });
  } catch (error) { next(error); }
});

const participantSchema = z.object({
  participantId: z.string().trim().min(3).max(64), name: z.string().trim().min(2),
  email: z.string().trim().optional().or(z.literal('')), eventName: z.string().trim().min(2),
  eventDate: z.coerce.date(), game: z.string().trim().min(2), teamName: z.string().trim().optional().or(z.literal('')),
  attendance: z.boolean(), result: z.enum(['PARTICIPATION', 'WINNER', 'RUNNER_UP']),
});

router.post('/participants', requireAdmin, async (req, res, next) => {
  try {
    const payload = participantSchema.parse(req.body);
    const participant = await Participant.create({ ...payload, participantId: payload.participantId.toUpperCase(), certificateEligible: payload.attendance });
    return res.status(201).json({ success: true, participant });
  } catch (error) { next(error); }
});

router.put('/participants/:id', requireAdmin, async (req, res, next) => {
  try {
    const payload = participantSchema.parse(req.body);
    const participant = await Participant.findByIdAndUpdate(req.params.id, { ...payload, participantId: payload.participantId.toUpperCase(), certificateEligible: payload.attendance }, { new: true, runValidators: true });
    if (!participant) return res.status(404).json({ success: false, message: 'Participant not found' });
    return res.json({ success: true, participant });
  } catch (error) { next(error); }
});

router.delete('/participants/:id', requireAdmin, async (req, res, next) => {
  try {
    const participant = await Participant.findByIdAndDelete(req.params.id);
    if (!participant) return res.status(404).json({ success: false, message: 'Participant not found' });
    if (participant.certificateId) await Certificate.deleteOne({ certificateId: participant.certificateId });
    return res.json({ success: true });
  } catch (error) { next(error); }
});

router.get('/statistics', requireAdmin, async (req, res, next) => {
  try {
    const [total, eligible, generated, participation, winner, runnerUp] = await Promise.all([
      Participant.countDocuments(), Participant.countDocuments({ attendance: true }), Certificate.countDocuments(),
      Certificate.countDocuments({ result: 'PARTICIPATION' }), Certificate.countDocuments({ result: 'WINNER' }), Certificate.countDocuments({ result: 'RUNNER_UP' }),
    ]);
    return res.json({ success: true, statistics: { total, eligible, generated, participation, winner, runnerUp } });
  } catch (error) { next(error); }
});

router.get('/certificates', requireAdmin, async (req, res, next) => {
  try {
    const certificates = await Certificate.find().sort({ issuedAt: -1 }).limit(500);
    return res.json({ success: true, certificates });
  } catch (error) { next(error); }
});

router.get('/branding', requireAdmin, async (req, res, next) => {
  try {
    const branding = await getBranding();
    return res.json({ success: true, branding });
  } catch (error) { next(error); }
});

router.put('/branding', requireAdmin, upload.fields([{ name: 'clubLogo', maxCount: 1 }, { name: 'sacLogo', maxCount: 1 }, { name: 'signature', maxCount: 1 }, { name: 'backgroundImage', maxCount: 1 }]), async (req, res, next) => {
  try {
    const allowedColors = /^#[0-9a-f]{6}$/i;
    const branding = await Branding.findOne({ key: 'default' }) || new Branding({ key: 'default' });
    for (const field of ['clubName', 'organizerName', 'website', 'participationTitle', 'winnerTitle', 'runnerUpTitle', 'introText', 'bodyText', 'verificationLabel', 'footerText']) if (typeof req.body[field] === 'string') branding[field] = req.body[field].trim();
    if (allowedColors.test(req.body.primaryColor || '')) branding.primaryColor = req.body.primaryColor;
    if (allowedColors.test(req.body.secondaryColor || '')) branding.secondaryColor = req.body.secondaryColor;
    for (const field of ['clubLogo', 'sacLogo', 'signature', 'backgroundImage']) {
      const file = req.files?.[field]?.[0];
      if (file) branding[field] = { data: file.buffer.toString('base64'), mimeType: file.mimetype, fileName: file.originalname };
    }
    for (const field of ['clubLogoWidth', 'clubLogoHeight', 'sacLogoWidth', 'sacLogoHeight', 'borderWidth', 'qrSize']) {
      const value = Number(req.body[field]);
      if (Number.isFinite(value)) branding[field] = value;
    }
    const opacity = Number(req.body.backgroundOpacity);
    if (Number.isFinite(opacity)) branding.backgroundOpacity = opacity;
    assertRequiredLogos(branding);
    await branding.save();
    return res.json({ success: true, branding });
  } catch (error) { next(error); }
});

router.post('/branding/reset-visuals', requireAdmin, async (req, res, next) => {
  try {
    const branding = await Branding.findOne({ key: 'default' }) || new Branding({ key: 'default' });
    Object.assign(branding, { clubLogoWidth: 86, clubLogoHeight: 62, sacLogoWidth: 86, sacLogoHeight: 62, backgroundOpacity: 0.22, borderWidth: 2, qrSize: 82 });
    await branding.save();
    return res.json({ success: true, branding });
  } catch (error) { next(error); }
});

router.post('/participants/:id/generate', requireAdmin, async (req, res, next) => {
  try {
    const participant = await Participant.findById(req.params.id);
    if (!participant) return res.status(404).json({ success: false, message: 'Participant not found' });
    if (!participant.attendance || !participant.certificateEligible) return res.status(403).json({ success: false, message: 'Participant is not eligible' });
    const certificate = await createOrGetCertificate(participant);
    return res.json({ success: true, certificate });
  } catch (error) { next(error); }
});

router.post('/import', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'Upload an .xlsx, .xls, or .csv file' });
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '' });
    const summary = { totalRows: rows.length, imported: 0, updated: 0, invalid: 0, duplicates: 0 };
    const seen = new Set();
    for (const row of rows) {
      const participantId = String(row.ID || row.Id || row.participantId || '').trim().toUpperCase();
      const name = String(row.Name || row.name || '').trim();
      const eventName = String(row.Event || row.eventName || '').trim();
      const result = String(row.Result || row.result || 'PARTICIPATION').trim().toUpperCase().replace('-', '_').replace(' ', '_');
      const attendance = ['YES', 'TRUE', '1'].includes(String(row.Attendance || row.attendance || '').trim().toUpperCase());
      const eventDate = new Date(row['Event Date'] || row.eventDate || Date.now());
      if (!participantId || !name || !eventName || !['PARTICIPATION', 'WINNER', 'RUNNER_UP'].includes(result) || Number.isNaN(eventDate.getTime())) { summary.invalid++; continue; }
      if (seen.has(participantId)) { summary.duplicates++; continue; }
      seen.add(participantId);
      const existing = await Participant.findOne({ participantId });
      await Participant.findOneAndUpdate({ participantId }, { participantId, name, eventName, eventDate, attendance, result, game: String(row.Game || row.game || 'Esports'), email: String(row.Email || row.email || '').trim(), teamName: String(row.Team || row.teamName || '').trim(), certificateEligible: attendance }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
      existing ? summary.updated++ : summary.imported++;
    }
    return res.json({ success: true, summary });
  } catch (error) { next(error); }
});

module.exports = router;
