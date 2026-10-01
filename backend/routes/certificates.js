const express = require('express');
const { z } = require('zod');
const Participant = require('../models/Participant');
const Certificate = require('../models/Certificate');
const { createOrGetCertificate, renderCertificatePdf } = require('../services/certificateService');

const router = express.Router();
const requestSchema = z.object({ participantId: z.string().trim().min(3).max(64) });

router.post('/request', async (req, res, next) => {
  try {
    const { participantId } = requestSchema.parse(req.body);
    const participant = await Participant.findOne({ participantId: participantId.toUpperCase() });
    if (!participant) return res.status(404).json({ success: false, message: 'Certificate not available' });
    if (!participant.attendance) return res.status(403).json({ success: false, message: 'You are not eligible because attendance was not recorded.' });
    if (!participant.certificateEligible) return res.status(403).json({ success: false, message: 'This participant is not eligible for a certificate.' });

    const certificate = await createOrGetCertificate(participant);
    return res.json({
      success: true,
      certificateId: certificate.certificateId,
      downloadUrl: `/api/certificates/${certificate.certificateId}/download`,
      certificate: { participantName: certificate.participantName, eventName: certificate.eventName, game: certificate.game, result: certificate.result },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/verify/:certificateId', async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.certificateId }).select('-_id -participant -__v');
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found' });
    return res.json({
      success: true,
      certificate: {
        certificateId: certificate.certificateId,
        participantName: certificate.participantName,
        eventName: certificate.eventName,
        eventDate: certificate.eventDate,
        game: certificate.game,
        achievement: certificate.result,
        issuedAt: certificate.issuedAt,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.get('/:certificateId/download', async (req, res, next) => {
  try {
    const certificate = await Certificate.findOne({ certificateId: req.params.certificateId });
    if (!certificate) return res.status(404).json({ success: false, message: 'Certificate not found' });
    await Certificate.updateOne({ _id: certificate._id }, { $inc: { downloadCount: 1 } });
    const pdf = await renderCertificatePdf(certificate);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${certificate.certificateId}.pdf"` });
    return res.send(pdf);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
