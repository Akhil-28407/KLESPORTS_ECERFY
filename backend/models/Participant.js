const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema(
  {
    participantId: { type: String, required: true, unique: true, index: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    eventName: { type: String, required: true, trim: true },
    eventDate: { type: Date, required: true },
    game: { type: String, required: true, trim: true },
    teamName: { type: String, trim: true },
    attendance: { type: Boolean, default: false },
    result: { type: String, enum: ['PARTICIPATION', 'WINNER', 'RUNNER_UP'], default: 'PARTICIPATION' },
    certificateEligible: { type: Boolean, default: false },
    certificateId: { type: String, unique: true, sparse: true, index: true },
    certificateGeneratedAt: Date,
  },
  { timestamps: true }
);

participantSchema.pre('save', function setEligibility(next) {
  this.certificateEligible = this.attendance === true;
  next();
});

module.exports = mongoose.model('Participant', participantSchema);
