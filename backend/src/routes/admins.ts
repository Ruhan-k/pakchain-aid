import { Router, Request, Response } from 'express';
import { getDbPool } from '../db';
import sql from 'mssql';
import crypto from 'crypto';

const router = Router();

// Helper function to hash password
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// GET /api/admins?username=admin
router.get('/', async (req: Request, res: Response) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.status(400).json({
        message: 'Username is required',
        code: 'MISSING_USERNAME',
      });
    }

    const pool = await getDbPool();
    const result = await pool.request()
      .input('username', sql.NVarChar, username)
      .query('SELECT * FROM admins WHERE username = @username');

    res.json({ data: result.recordset });
  } catch (error) {
    console.error('Get admin error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to fetch admin',
      code: 'FETCH_ERROR',
    });
  }
});

// PATCH /api/admins?id=uuid
router.patch('/', async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        message: 'Admin ID is required',
        code: 'MISSING_ID',
      });
    }

    const pool = await getDbPool();
    const request = pool.request().input('id', sql.UniqueIdentifier, id);
    const updates: string[] = [];

    if (req.body.last_login) {
      request.input('last_login', sql.DateTime2, new Date(req.body.last_login));
      updates.push('last_login = @last_login');
    }
    if (req.body.is_active !== undefined) {
      request.input('is_active', sql.Bit, req.body.is_active);
      updates.push('is_active = @is_active');
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: 'No fields to update',
        code: 'NO_UPDATES',
      });
    }

    await request.query(`
      UPDATE admins
      SET ${updates.join(', ')}
      WHERE id = @id
    `);

    const result = await request.query('SELECT * FROM admins WHERE id = @id');
    res.json({ data: result.recordset[0] });
  } catch (error) {
    console.error('Update admin error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to update admin',
      code: 'UPDATE_ERROR',
    });
  }
});

export { router as adminsRoutes };
export { hashPassword };

