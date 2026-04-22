 const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  profile: {
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    preferences: {
      currency: { type: String, default: 'USD' },
      alertThreshold: { type: Number, default: 0.8 }
    }
  },
  emailVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  role: { type: String, default: 'user' },
  lastLogin: { type: Date },
  emailVerificationToken: { type: String },
  passwordResetToken: { type: String },
  passwordResetExpires: { type: Date }
}, { timestamps: true });

UserSchema.pre('save', async function hashPassword(next) {
  try {
    if (!this.isModified('passwordHash')) return next();
    if (this.passwordHash && this.passwordHash.startsWith('$2')) return next();
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
    next();
  } catch (error) {
    next(error);
  }
});

UserSchema.methods.comparePassword = function comparePassword(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

UserSchema.methods.updateLastLogin = function updateLastLogin() {
  this.lastLogin = new Date();
  return this.save();
};

UserSchema.methods.toJSON = function toJSON() {
  const user = this.toObject({ virtuals: true });
  delete user.passwordHash;
  delete user.passwordResetToken;
  delete user.passwordResetExpires;
  delete user.emailVerificationToken;
  return user;
};

UserSchema.statics.findByEmail = function findByEmail(email) {
  return this.findOne({ email: String(email).toLowerCase().trim() });
};

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);

