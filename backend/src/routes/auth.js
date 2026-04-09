const express = require('express');
const rateLimit = require('express-rate-limit');
const { validationSets, validationRules, handleValidationErrors } = require('../config/validation');
const { authenticateToken } = require('../middleware/auth');
const authService = require('../services/authService');
const { logger } = require('../config/logger');

const router = express.Router();

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts',
    message: 'Please try again later'
  }
});

/**
 * @route   POST /api/auth/register
 * @desc    Register new user
 * @access  Public
 */
router.post('/register', authLimiter, validationSets.userRegistration, async (req, res) => {
  try {
    const { email, password, firstName, lastName, currency, alertThreshold } = req.body;

    const result = await authService.register({
      email,
      password,
      firstName,
      lastName,
      currency,
      alertThreshold
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken
      }
    });
  } catch (error) {
    logger.error('Registration endpoint error:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(409).json({
        error: 'Registration failed',
        message: error.message
      });
    }
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Registration failed',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Login user
 * @access  Public
 */
router.post('/login', authLimiter, validationSets.userLogin, async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await authService.login(email, password);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken
      }
    });
  } catch (error) {
    logger.error('Login endpoint error:', error);
    
    if (error.message.includes('Invalid email or password') || 
        error.message.includes('Account is deactivated')) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token
 * @access  Public
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Refresh token is required'
      });
    }

    const result = await authService.refreshToken(refreshToken);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        accessToken: result.accessToken,
        user: result.user
      }
    });
  } catch (error) {
    logger.error('Token refresh endpoint error:', error);
    
    res.status(401).json({
      error: 'Token refresh failed',
      message: 'Invalid refresh token'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Private
 */
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // In a more sophisticated implementation, you might maintain a blacklist of tokens
    // For now, we rely on client-side token removal
    
    logger.info('User logged out', { userId: req.userId });
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout endpoint error:', error);
    
    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   GET /api/auth/profile
 * @desc    Get user profile
 * @access  Private
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const profile = await authService.getProfile(req.userId);

    res.json({
      success: true,
      data: profile
    });
  } catch (error) {
    logger.error('Get profile endpoint error:', error);
    
    res.status(500).json({
      error: 'Failed to get profile',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put('/profile', authenticateToken, validationSets.userProfileUpdate, async (req, res) => {
  try {
    const { firstName, lastName, currency, alertThreshold } = req.body;

    const updatedProfile = await authService.updateProfile(req.userId, {
      firstName,
      lastName,
      currency,
      alertThreshold
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile
    });
  } catch (error) {
    logger.error('Update profile endpoint error:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        error: 'Validation failed',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Profile update failed',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password', authenticateToken, [
  validationRules.password.withMessage('New password must be at least 8 characters with uppercase, lowercase, and number'),
  require('express-validator').body('currentPassword').notEmpty().withMessage('Current password is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { currentPassword, password: newPassword } = req.body;

    await authService.changePassword(req.userId, currentPassword, newPassword);

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password endpoint error:', error);
    
    if (error.message.includes('Current password is incorrect')) {
      return res.status(400).json({
        error: 'Password change failed',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Password change failed',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Request password reset
 * @access  Public
 */
router.post('/forgot-password', passwordResetLimiter, [
  validationRules.email,
  handleValidationErrors
], async (req, res) => {
  try {
    const { email } = req.body;

    const result = await authService.requestPasswordReset(email);

    res.json({
      success: true,
      message: result.message,
      ...(result.resetToken && { resetToken: result.resetToken }) // Only in development
    });
  } catch (error) {
    logger.error('Forgot password endpoint error:', error);
    
    res.status(500).json({
      error: 'Password reset request failed',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', [
  require('express-validator').body('resetToken').notEmpty().withMessage('Reset token is required'),
  validationRules.password,
  handleValidationErrors
], async (req, res) => {
  try {
    const { resetToken, password } = req.body;

    await authService.resetPassword(resetToken, password);

    res.json({
      success: true,
      message: 'Password reset successfully'
    });
  } catch (error) {
    logger.error('Reset password endpoint error:', error);
    
    if (error.message.includes('Invalid or expired')) {
      return res.status(400).json({
        error: 'Password reset failed',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Password reset failed',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email with token
 * @access  Public
 */
router.post('/verify-email', [
  require('express-validator').body('token').notEmpty().withMessage('Verification token is required'),
  handleValidationErrors
], async (req, res) => {
  try {
    const { token } = req.body;

    await authService.verifyEmail(token);

    res.json({
      success: true,
      message: 'Email verified successfully'
    });
  } catch (error) {
    logger.error('Email verification endpoint error:', error);
    
    if (error.message.includes('Invalid verification token')) {
      return res.status(400).json({
        error: 'Email verification failed',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Email verification failed',
      message: 'Internal server error'
    });
  }
});

/**
 * @route   DELETE /api/auth/account
 * @desc    Deactivate user account
 * @access  Private
 */
router.delete('/account', authenticateToken, async (req, res) => {
  try {
    await authService.deactivateAccount(req.userId);

    res.json({
      success: true,
      message: 'Account deactivated successfully'
    });
  } catch (error) {
    logger.error('Account deactivation endpoint error:', error);
    
    res.status(500).json({
      error: 'Account deactivation failed',
      message: 'Internal server error'
    });
  }
});

module.exports = router;
