import { Router, Request, Response } from 'express';
import { getDbPool } from '../db';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import sql from 'mssql';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-this';

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

    // In production, send actual OTP email
    // For now, just return success
    res.json({
      message: 'OTP sent successfully (mock - implement email service)',
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

    // In production, verify OTP from database/email service
    // For now, accept any 6-digit token
    if (token.length !== 6) {
      return res.status(400).json({
        message: 'Invalid token format',
        code: 'INVALID_TOKEN',
      });
    }

    const pool = await getDbPool();
    const userId = require('crypto').randomUUID();

    // Create or update user
    await pool.request()
      .input('id', sql.UniqueIdentifier, userId)
      .input('email', sql.NVarChar, email)
      .input('display_name', sql.NVarChar, email.split('@')[0])
      .query(`
        IF EXISTS (SELECT 1 FROM users WHERE email = @email)
          UPDATE users SET auth_user_id = @id WHERE email = @email
        ELSE
          INSERT INTO users (id, email, display_name, auth_user_id)
          VALUES (@id, @email, @display_name, @id)
      `);

    const user = {
      id: userId,
      email,
      user_metadata: { display_name: email.split('@')[0] },
    };

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

