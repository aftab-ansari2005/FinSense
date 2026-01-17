# Registration Password Requirements

## Current Error

**Error**: "Registration failed. Please try again."  
**Backend Error**: "New password must be at least 8 characters with uppercase, lowercase, and number"

## Password Requirements

Your password MUST include ALL of the following:

1. ✅ **At least 8 characters** (minimum length)
2. ✅ **At least one UPPERCASE letter** (A-Z)
3. ✅ **At least one lowercase letter** (a-z)
4. ✅ **At least one number** (0-9)

## Examples

### ❌ Invalid Passwords

- `aftab@1234` - Missing uppercase letter
- `AFTAB@1234` - Missing lowercase letter
- `Aftab@abcd` - Missing number
- `Aftab123` - Only 8 characters but valid (this would work!)
- `Short1A` - Only 7 characters (too short)

### ✅ Valid Passwords

- `Aftab@1234` - Has uppercase (A), lowercase (ftab), number (1234)
- `MyPass123` - Has uppercase (M, P), lowercase (yass), number (123)
- `SecureP@ss1` - Has uppercase (S, P), lowercase (ecureass), number (1)
- `Test1234` - Has uppercase (T), lowercase (est), number (1234)

## Quick Fix

To register successfully, use a password like:

- `Aftab@1234` (just capitalize the first letter of your current password!)
- `MyPassword123`
- `SecurePass1`

## Try Again

1. Go back to the registration page
2. Use a password that meets ALL requirements
3. Example: Change `aftab@1234` to `Aftab@1234`
4. Click "Create Account"

---

## For Developers: Relaxing Password Requirements (Optional)

If you want to make password requirements less strict for development, you can modify `backend/src/config/validation.js`:

### Current Rule (Strict):
```javascript
password: body('password')
  .isLength({ min: 8 })
  .withMessage('Password must be at least 8 characters long')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
```

### Relaxed Rule (Development Only):
```javascript
password: body('password')
  .isLength({ min: 6 })
  .withMessage('Password must be at least 6 characters long'),
```

**Note**: Only use relaxed rules in development. Always use strict password requirements in production for security!

---

**Quick Solution**: Just capitalize the first letter of your password! 🔐
