import { Router, Request, Response } from 'express';
import { getDbPool } from '../db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sql from 'mssql';
import { sendOTPEmail } from '../services/email';
import crypto from 'crypto';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

// In-memory OTP storage (in production, use Redis or database)
// Format: { email: { code: string, expiresAt: Date } }
const otpStore = new Map<string, { code: string; expiresAt: Date }>();

// Generate 6-digit OTP code
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Clean expired OTPs
function cleanExpiredOTPs() {
  const now = new Date();
  for (const [email, data] of otpStore.entries()) {
    if (data.expiresAt < now) {
      otpStore.delete(email);
    }
  }
}

// Helper function to generate JWT token
function generateToken(userId: string, email: string): string {
  return jwt.sign(
    { userId, email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// POST /api/auth/signin
router.post('/signin', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: 'Email and password are required',
        code: 'MISSING_CREDENTIALS',
      });
    }

    // For now, we'll create a simple user if they don't exist
    // In production, you'd have a proper user table with passwords
    const pool = await getDbPool();
    
    // Check if user exists in users table
    const userResult = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email');

    let user;
    if (userResult.recordset.length === 0) {
      // Create new user (simple implementation - in production, hash password properly)
      const userId = require('crypto').randomUUID();
      await pool.request()
        .input('id', sql.UniqueIdentifier, userId)
        .input('email', sql.NVarChar, email)
        .input('display_name', sql.NVarChar, email.split('@')[0])
        .query(`
          INSERT INTO users (id, email, display_name, auth_user_id)
          VALUES (@id, @email, @display_name, @id)
        `);

      user = {
        id: userId,
        email,
        user_metadata: { display_name: email.split('@')[0] },
      };
    } else {
      const dbUser = userResult.recordset[0];
      user = {
        id: dbUser.id,
        email: dbUser.email,
        user_metadata: { display_name: dbUser.display_name },
      };
    }

    const token = generateToken(user.id, user.email);

    res.json({
      user,
      token,
    });
  } catch (error) {
    console.error('Sign in error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Sign in failed',
      code: 'SIGNIN_ERROR',
    });
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
        code: 'MISSING_EMAIL',
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        message: 'Invalid email format',
        code: 'INVALID_EMAIL',
      });
    }

    // Clean expired OTPs
    cleanExpiredOTPs();

    // Generate OTP code
    const otpCode = generateOTP();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Store OTP
    otpStore.set(normalizedEmail, { code: otpCode, expiresAt });
    console.log(`OTP stored for ${normalizedEmail}, expires at ${expiresAt.toISOString()}, current time: ${new Date().toISOString()}`);

    // Send email
    try {
      await sendOTPEmail(email, otpCode);
      console.log(`OTP sent to ${email} - Code: ${otpCode}`);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
      console.error('Email error details:', JSON.stringify(emailError, null, 2));
      // Return error so user knows email failed
      return res.status(500).json({
        message: `Failed to send email: ${emailError instanceof Error ? emailError.message : 'Unknown error'}. Please check server logs.`,
        code: 'EMAIL_SEND_ERROR',
      });
    }

    res.json({
      message: 'OTP sent successfully. Please check your email.',
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to send OTP',
      code: 'SEND_OTP_ERROR',
    });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response) => {
  try {
    const { email, token } = req.body;

    if (!email || !token) {
      return res.status(400).json({
        message: 'Email and token are required',
        code: 'MISSING_CREDENTIALS',
      });
    }

    // Validate token format
    if (token.length !== 6 || !/^\d{6}$/.test(token)) {
      return res.status(400).json({
        message: 'Invalid token format. Must be 6 digits.',
        code: 'INVALID_TOKEN',
      });
    }

    // Clean expired OTPs
    cleanExpiredOTPs();

    // Normalize email (lowercase, trim)
    const normalizedEmail = email.toLowerCase().trim();

    // Verify OTP
    const storedOTP = otpStore.get(normalizedEmail);
    console.log(`Verifying OTP for ${normalizedEmail}, stored OTP exists: ${!!storedOTP}`);
    
    if (!storedOTP) {
      console.log(`OTP not found for ${normalizedEmail}. Available emails in store: ${Array.from(otpStore.keys()).join(', ')}`);
      return res.status(400).json({
        message: 'OTP not found or expired. Please request a new code.',
        code: 'OTP_NOT_FOUND',
      });
    }

    const now = new Date();
    console.log(`OTP check - Expires: ${storedOTP.expiresAt.toISOString()}, Now: ${now.toISOString()}, Difference: ${(storedOTP.expiresAt.getTime() - now.getTime()) / 1000} seconds`);

    if (storedOTP.expiresAt < now) {
      otpStore.delete(normalizedEmail);
      return res.status(400).json({
        message: 'OTP expired. Please request a new code.',
        code: 'OTP_EXPIRED',
      });
    }

    if (storedOTP.code !== token) {
      console.log(`OTP mismatch - Expected: ${storedOTP.code}, Received: ${token}`);
      return res.status(400).json({
        message: 'Invalid OTP code. Please try again.',
        code: 'INVALID_OTP',
      });
    }

    // OTP verified - remove it from store
    otpStore.delete(normalizedEmail);
    console.log(`OTP verified successfully for ${normalizedEmail}`);

    // Get or create user
    const pool = await getDbPool();
    let userResult = await pool.request()
      .input('email', sql.NVarChar, email)
      .query('SELECT * FROM users WHERE email = @email');

    let user;
    if (userResult.recordset.length === 0) {
      // Create new user
      const userId = crypto.randomUUID();
      await pool.request()
        .input('id', sql.UniqueIdentifier, userId)
        .input('email', sql.NVarChar, email)
        .input('display_name', sql.NVarChar, email.split('@')[0])
        .query(`
          INSERT INTO users (id, email, display_name, auth_user_id)
          VALUES (@id, @email, @display_name, @id)
        `);

      user = {
        id: userId,
        email,
        user_metadata: { display_name: email.split('@')[0] },
      };
    } else {
      const dbUser = userResult.recordset[0];
      user = {
        id: dbUser.id,
        email: dbUser.email,
        user_metadata: { display_name: dbUser.display_name },
      };
    }

    const jwtToken = generateToken(user.id, user.email);

    res.json({
      user,
      token: jwtToken,
    });
  } catch (error) {
    console.error('Verify OTP error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'OTP verification failed',
      code: 'VERIFY_OTP_ERROR',
    });
  }
});

// POST /api/auth/update-user
router.post('/update-user', async (req: Request, res: Response) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string; email: string };
    const { password, data } = req.body;

    const pool = await getDbPool();

    if (password) {
      // In production, hash and update password
      // For now, just acknowledge
    }

    if (data) {
      await pool.request()
        .input('userId', sql.UniqueIdentifier, decoded.userId)
        .input('display_name', sql.NVarChar, data.display_name)
        .query(`
          UPDATE users 
          SET display_name = @display_name, updated_at = GETUTCDATE()
          WHERE auth_user_id = @userId
        `);
    }

    const userResult = await pool.request()
      .input('userId', sql.UniqueIdentifier, decoded.userId)
      .query('SELECT * FROM users WHERE auth_user_id = @userId');

    const dbUser = userResult.recordset[0];
    const user = {
      id: dbUser.id,
      email: dbUser.email,
      user_metadata: { display_name: dbUser.display_name },
    };

    res.json({ user });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Update failed',
      code: 'UPDATE_ERROR',
    });
  }
});

// POST /api/auth/signout
router.post('/signout', async (req: Request, res: Response) => {
  // In production, you might invalidate tokens
  res.json({ message: 'Signed out successfully' });
});

export { router as authRoutes };

