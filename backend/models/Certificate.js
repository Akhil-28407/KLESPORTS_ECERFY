const mongoose = require('mongoose');

const certificateSchema = new mongoose.Schema(
  {
    certificateId: { type: String, required: true, unique: true, index: true },
    participant: { type: mongoose.Schema.Types.ObjectId, ref: 'Participant', required: true, unique: true },
    participantName: { type: String, required: true },
    eventName: { type: String, required: true },
    eventDate: { type: Date, required: true },
    game: { type: String, required: true },
    result: { type: String, enum: ['PARTICIPATION', 'WINNER', 'RUNNER_UP'], required: true },
    verificationUrl: { type: String, required: true },
    issuedAt: { type: Date, default: Date.now },
    downloadCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Certificate', certificateSchema);
