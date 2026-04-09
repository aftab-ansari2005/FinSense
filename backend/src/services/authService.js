const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { logger } = require('../config/logger');
const { User } = require('../models');

class AuthService {
  /**
   * Generate JWT access token
   */
  generateAccessToken(userId, email) {
    return jwt.sign(
      { userId, email },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '24h' }
    );
  }

  /**
   * Generate JWT refresh token
   */
  generateRefreshToken(userId, email) {
    return jwt.sign(
      { userId, email, type: 'refresh' },
      process.env.JWT_REFRESH_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );
  }

  /**
   * Generate both access and refresh tokens
   */
  generateTokens(userId, email) {
    return {
      accessToken: this.generateAccessToken(userId, email),
      refreshToken: this.generateRefreshToken(userId, email)
    };
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      if (decoded.type !== 'refresh') {
        throw new Error('Invalid token type');
      }
      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Register new user
   */
  async register(userData) {
    try {
      const { email, password, firstName, lastName, currency, alertThreshold } = userData;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new Error('User already exists with this email');
      }

      // Create new user
      const user = new User({
        email,
        passwordHash: password, // Will be hashed by pre-save middleware
        profile: {
          firstName,
          lastName,
          preferences: {
            currency: currency || 'USD',
            alertThreshold: alertThreshold || 0.8
          }
        },
        emailVerificationToken: crypto.randomBytes(32).toString('hex')
      });

      await user.save();

      // Generate tokens
      const tokens = this.generateTokens(user._id, user.email);

      logger.info('User registered successfully', { userId: user._id, email: user.email });

      return {
        user: user.toJSON(),
        tokens
      };
    } catch (error) {
      logger.error('Registration failed:', error);
      throw error;
    }
  }

  /**
   * Login user
   */
  async login(email, password) {
    try {
      // Find user by email
      const user = await User.findByEmail(email);
      if (!user) {
        throw new Error('Invalid email or password');
      }

      // Check if user is active
      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      // Update last login
      await user.updateLastLogin();

      // Generate tokens
      const tokens = this.generateTokens(user._id, user.email);

      logger.info('User logged in successfully', { userId: user._id, email: user.email });

      return {
        user: user.toJSON(),
        tokens
      };
    } catch (error) {
      logger.error('Login failed:', error);
      throw error;
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = this.verifyRefreshToken(refreshToken);

      // Check if user still exists and is active
      const user = await User.findById(decoded.userId);
      if (!user || !user.isActive) {
        throw new Error('User not found or inactive');
      }

      // Generate new access token
      const accessToken = this.generateAccessToken(user._id, user.email);

      logger.info('Token refreshed successfully', { userId: user._id });

      return {
        accessToken,
        user: user.toJSON()
      };
    } catch (error) {
      logger.error('Token refresh failed:', error);
      throw error;
    }
  }

  /**
   * Change user password
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Verify current password
      const isCurrentPasswordValid = await user.comparePassword(currentPassword);
      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }

      // Update password
      user.passwordHash = newPassword; // Will be hashed by pre-save middleware
      await user.save();

      logger.info('Password changed successfully', { userId });

      return { message: 'Password changed successfully' };
    } catch (error) {
      logger.error('Password change failed:', error);
      throw error;
    }
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email) {
    try {
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not
        return { message: 'If the email exists, a reset link has been sent' };
      }

      // Generate reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour

      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetExpires;
      await user.save({ validateBeforeSave: false });

      logger.info('Password reset requested', { userId: user._id, email });

      // In a real application, you would send an email here
      // For now, we'll just return the token (remove in production)
      return {
        message: 'Password reset token generated',
        resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
      };
    } catch (error) {
      logger.error('Password reset request failed:', error);
      throw error;
    }
  }

  /**
   * Reset password with token
   */
  async resetPassword(resetToken, newPassword) {
    try {
      const user = await User.findOne({
        passwordResetToken: resetToken,
        passwordResetExpires: { $gt: Date.now() }
      });

      if (!user) {
        throw new Error('Invalid or expired reset token');
      }

      // Update password and clear reset token
      user.passwordHash = newPassword; // Will be hashed by pre-save middleware
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      logger.info('Password reset successfully', { userId: user._id });

      return { message: 'Password reset successfully' };
    } catch (error) {
      logger.error('Password reset failed:', error);
      throw error;
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token) {
    try {
      const user = await User.findOne({ emailVerificationToken: token });
      if (!user) {
        throw new Error('Invalid verification token');
      }

      user.emailVerified = true;
      user.emailVerificationToken = undefined;
      await user.save({ validateBeforeSave: false });

      logger.info('Email verified successfully', { userId: user._id });

      return { message: 'Email verified successfully' };
    } catch (error) {
      logger.error('Email verification failed:', error);
      throw error;
    }
  }

  /**
   * Get user profile
   */
  async getProfile(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return user.toJSON();
    } catch (error) {
      logger.error('Get profile failed:', error);
      throw error;
    }
  }

  /**
   * Update user profile
   */
  async updateProfile(userId, updateData) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Update allowed fields
      const allowedUpdates = ['firstName', 'lastName', 'currency', 'alertThreshold'];
      const updates = {};

      Object.keys(updateData).forEach(key => {
        if (allowedUpdates.includes(key)) {
          if (key === 'currency' || key === 'alertThreshold') {
            updates[`profile.preferences.${key}`] = updateData[key];
          } else {
            updates[`profile.${key}`] = updateData[key];
          }
        }
      });

      const updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updates },
        { new: true, runValidators: true }
      );

      logger.info('Profile updated successfully', { userId });

      return updatedUser.toJSON();
    } catch (error) {
      logger.error('Profile update failed:', error);
      throw error;
    }
  }

  /**
   * Deactivate user account
   */
  async deactivateAccount(userId) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { isActive: false },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      logger.info('Account deactivated', { userId });

      return { message: 'Account deactivated successfully' };
    } catch (error) {
      logger.error('Account deactivation failed:', error);
      throw error;
    }
  }
}

module.exports = new AuthService();