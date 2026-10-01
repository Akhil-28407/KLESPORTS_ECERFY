const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const Certificate = require('../models/Certificate');
const Participant = require('../models/Participant');
const { assetToBuffer, assertRequiredLogos, getBranding } = require('../utils/branding');

function slug(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 18);
}

async function createOrGetCertificate(participant) {
  if (participant.certificateId) {
    return Certificate.findOne({ certificateId: participant.certificateId });
  }

  const sequence = (await Certificate.countDocuments()) + 1;
  const certificateId = `ESPORTS-${new Date().getFullYear()}-${slug(participant.game)}-${String(sequence).padStart(6, '0')}`;
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const verificationUrl = `${frontendUrl}/verify/${certificateId}`;

  const certificate = await Certificate.create({
    certificateId,
    participant: participant._id,
    participantName: participant.name,
    eventName: participant.eventName,
    eventDate: participant.eventDate,
    game: participant.game,
    result: participant.result,
    verificationUrl,
  });

  await Participant.updateOne(
    { _id: participant._id },
    { $set: { certificateId, certificateGeneratedAt: certificate.issuedAt, certificateEligible: true } }
  );
  return certificate;
}

function achievement(result) {
  if (result === 'WINNER') return 'Winner - 1st Place';
  if (result === 'RUNNER_UP') return 'Runner-up - 2nd Place';
  return 'Official Participant';
}

async function renderCertificatePdf(certificate) {
  const qr = await QRCode.toDataURL(certificate.verificationUrl, { margin: 1, width: 180 });
  const branding = await getBranding();
  assertRequiredLogos(branding);
  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 0 });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const finished = new Promise((resolve, reject) => {
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });

  doc.rect(0, 0, 842, 595).fill(branding.secondaryColor || '#120b0d');
  doc.rect(28, 28, 786, 539).lineWidth(branding.borderWidth || 2).stroke(branding.primaryColor || '#e21f26');
  const clubLogo = assetToBuffer(branding.clubLogo);
  const sacLogo = assetToBuffer(branding.sacLogo);
  const backgroundImage = assetToBuffer(branding.backgroundImage);
  if (backgroundImage) { doc.save(); doc.opacity(branding.backgroundOpacity || 0.22); doc.image(backgroundImage, 0, 0, { cover: [842, 595], align: 'center', valign: 'center' }); doc.restore(); }
  if (clubLogo) doc.image(clubLogo, 65, 54, { fit: [branding.clubLogoWidth || 86, branding.clubLogoHeight || 62], align: 'center', valign: 'center' });
  if (sacLogo) doc.image(sacLogo, 691, 54, { fit: [branding.sacLogoWidth || 86, branding.sacLogoHeight || 62], align: 'center', valign: 'center' });
  doc.fillColor(branding.primaryColor || '#e21f26').fontSize(13).font('Helvetica-Bold').text(branding.clubName || 'KL ESPORTS CLUB', 175, 69, { width: 492, align: 'center', characterSpacing: 2 });
  doc.fillColor('#f4f7fb').fontSize(28).font('Helvetica-Bold').text(resultTitle(certificate.result, branding), 70, 135, { width: 702, align: 'center' });
  doc.fillColor('#aab5c7').fontSize(11).font('Helvetica').text(branding.introText || 'This certificate is proudly presented to', 70, 199, { width: 702, align: 'center' });
  doc.fillColor('#ffffff').fontSize(34).font('Helvetica-Bold').text(certificate.participantName, 70, 225, { width: 702, align: 'center' });
  doc.fillColor(branding.primaryColor || '#e21f26').fontSize(15).font('Helvetica-Bold').text(achievement(certificate.result), 70, 282, { width: 702, align: 'center' });
  doc.fillColor('#aab5c7').fontSize(11).font('Helvetica').text(branding.bodyText || 'In recognition of your achievement and participation in this official esports event.', 120, 316, { width: 602, align: 'center' });
  doc.fillColor('#f4f7fb').fontSize(13).font('Helvetica-Bold').text(certificate.eventName, 70, 354, { width: 702, align: 'center' });
  doc.fillColor('#aab5c7').fontSize(11).font('Helvetica').text(`${certificate.game}  /  ${new Date(certificate.eventDate).toLocaleDateString()}`, 70, 378, { width: 702, align: 'center' });
  doc.image(qr, 690, 420, { width: branding.qrSize || 82, height: branding.qrSize || 82 });
  const signature = assetToBuffer(branding.signature);
  if (signature) doc.image(signature, 80, 435, { fit: [130, 42], align: 'left', valign: 'center' });
  doc.moveTo(80, 487).lineTo(210, 487).lineWidth(1).stroke('#59636f');
  if (branding.organizerName) doc.fillColor('#aab5c7').fontSize(9).text(branding.organizerName, 80, 495);
  doc.fillColor('#8390a5').fontSize(8).text(branding.verificationLabel || 'SCAN TO VERIFY', 681, 511, { width: 100, align: 'center' });
  doc.fillColor('#8390a5').fontSize(8).text(`${branding.footerText || 'Official digital record'}  /  ${certificate.certificateId}`, 70, 532, { width: 580 });
  doc.end();
  return finished;
}

function resultTitle(result, branding) {
  if (result === 'WINNER') return branding.winnerTitle || 'WINNER CERTIFICATE';
  if (result === 'RUNNER_UP') return branding.runnerUpTitle || 'RUNNER-UP CERTIFICATE';
  return branding.participationTitle || 'CERTIFICATE OF PARTICIPATION';
}

module.exports = { createOrGetCertificate, renderCertificatePdf };
