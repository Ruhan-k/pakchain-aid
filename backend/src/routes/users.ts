import { Router, Request, Response } from 'express';
import { getDbPool } from '../db';
import sql from 'mssql';

const router = Router();

// GET /api/users
router.get('/', async (req: Request, res: Response) => {
  try {
    const { auth_user_id, email, wallet_address, order, limit } = req.query;
    const pool = await getDbPool();
    let query = 'SELECT * FROM users WHERE 1=1';

    if (auth_user_id) {
      query += ` AND auth_user_id = '${auth_user_id}'`;
    }
    if (email) {
      query += ` AND email = '${email}'`;
    }
    if (wallet_address) {
      query += ` AND wallet_address = '${wallet_address}'`;
    }

    if (order) {
      const [column, direction] = (order as string).split('.');
      query += ` ORDER BY ${column} ${direction === 'desc' ? 'DESC' : 'ASC'}`;
    } else {
      query += ' ORDER BY created_at DESC';
    }

    if (limit) {
      query += ` OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY`;
    }

    const result = await pool.request().query(query);
    res.json({ data: result.recordset });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to fetch users',
      code: 'FETCH_ERROR',
    });
  }
});

// POST /api/users
router.post('/', async (req: Request, res: Response) => {
  try {
    const { auth_user_id, email, display_name, wallet_address } = req.body;

    if (!auth_user_id && !email) {
      return res.status(400).json({
        message: 'auth_user_id or email is required',
        code: 'MISSING_FIELDS',
      });
    }

    const pool = await getDbPool();
    const id = require('crypto').randomUUID();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('auth_user_id', sql.UniqueIdentifier, auth_user_id || id)
      .input('email', sql.NVarChar, email || null)
      .input('display_name', sql.NVarChar, display_name || null)
      .input('wallet_address', sql.NVarChar, wallet_address || null)
      .query(`
        INSERT INTO users (id, auth_user_id, email, display_name, wallet_address)
        VALUES (@id, @auth_user_id, @email, @display_name, @wallet_address)
      `);

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM users WHERE id = @id');

    res.status(201).json({ data: result.recordset[0] });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to create user',
      code: 'CREATE_ERROR',
    });
  }
});

// POST /api/users/upsert
router.post('/upsert', async (req: Request, res: Response) => {
  try {
    const { data, onConflict } = req.body;

    if (!data || !onConflict) {
      return res.status(400).json({
        message: 'data and onConflict are required',
        code: 'MISSING_FIELDS',
      });
    }

    const pool = await getDbPool();
    const id = require('crypto').randomUUID();

    // Check if user exists
    const existing = await pool.request()
      .input('auth_user_id', sql.UniqueIdentifier, data.auth_user_id)
      .query('SELECT * FROM users WHERE auth_user_id = @auth_user_id');

    if (existing.recordset.length > 0) {
      // Update existing
      await pool.request()
        .input('auth_user_id', sql.UniqueIdentifier, data.auth_user_id)
        .input('email', sql.NVarChar, data.email)
        .input('display_name', sql.NVarChar, data.display_name)
        .query(`
          UPDATE users
          SET email = @email, display_name = @display_name, updated_at = GETUTCDATE()
          WHERE auth_user_id = @auth_user_id
        `);

      const result = await pool.request()
        .input('auth_user_id', sql.UniqueIdentifier, data.auth_user_id)
        .query('SELECT * FROM users WHERE auth_user_id = @auth_user_id');

      res.json({ data: result.recordset[0] });
    } else {
      // Insert new
      await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .input('auth_user_id', sql.UniqueIdentifier, data.auth_user_id)
        .input('email', sql.NVarChar, data.email)
        .input('display_name', sql.NVarChar, data.display_name)
        .query(`
          INSERT INTO users (id, auth_user_id, email, display_name)
          VALUES (@id, @auth_user_id, @email, @display_name)
        `);

      const result = await pool.request()
        .input('id', sql.UniqueIdentifier, id)
        .query('SELECT * FROM users WHERE id = @id');

      res.status(201).json({ data: result.recordset[0] });
    }
  } catch (error) {
    console.error('Upsert user error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to upsert user',
      code: 'UPSERT_ERROR',
    });
  }
});

// PATCH /api/users?id=uuid
router.patch('/', async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        message: 'User ID is required',
        code: 'MISSING_ID',
      });
    }

    const pool = await getDbPool();
    const request = pool.request().input('id', sql.UniqueIdentifier, id);
    const updates: string[] = [];

    if (req.body.wallet_address !== undefined) {
      request.input('wallet_address', sql.NVarChar, req.body.wallet_address);
      updates.push('wallet_address = @wallet_address');
    }
    if (req.body.total_donated !== undefined) {
      request.input('total_donated', sql.NVarChar, req.body.total_donated);
      updates.push('total_donated = @total_donated');
    }
    if (req.body.donation_count !== undefined) {
      request.input('donation_count', sql.Int, req.body.donation_count);
      updates.push('donation_count = @donation_count');
    }
    if (req.body.is_blocked !== undefined) {
      request.input('is_blocked', sql.Bit, req.body.is_blocked);
      updates.push('is_blocked = @is_blocked');
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: 'No fields to update',
        code: 'NO_UPDATES',
      });
    }

    updates.push('updated_at = GETUTCDATE()');

    await request.query(`
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = @id
    `);

    const result = await request.query('SELECT * FROM users WHERE id = @id');
    res.json({ data: result.recordset[0] });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to update user',
      code: 'UPDATE_ERROR',
    });
  }
});

export { router as usersRoutes };

