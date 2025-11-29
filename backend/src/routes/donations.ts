import { Router, Request, Response } from 'express';
import { getDbPool } from '../db';
import sql from 'mssql';

const router = Router();

// GET /api/donations
router.get('/', async (req: Request, res: Response) => {
  try {
    const { campaign_id, donor_wallet, status, order, limit } = req.query;
    const pool = await getDbPool();
    let query = `
      SELECT d.*, c.title as campaign_title
      FROM donations d
      LEFT JOIN campaigns c ON d.campaign_id = c.id
      WHERE 1=1
    `;

    if (campaign_id) {
      query += ` AND d.campaign_id = '${campaign_id}'`;
    }
    if (donor_wallet) {
      query += ` AND d.donor_wallet = '${donor_wallet}'`;
    }
    if (status) {
      query += ` AND d.status = '${status}'`;
    }

    // Handle order parameter(s) - can be string or array
    const orderParams = Array.isArray(order) ? order : (order ? [order] : []);
    
    if (orderParams.length > 0) {
      const orderClauses: string[] = [];
      for (const orderParam of orderParams) {
        if (typeof orderParam === 'string' && orderParam.includes('.')) {
          const [column, direction] = orderParam.split('.');
          // Sanitize column name to prevent SQL injection
          const safeColumn = column.replace(/[^a-zA-Z0-9_]/g, '');
          if (safeColumn) {
            orderClauses.push(`d.${safeColumn} ${direction === 'desc' ? 'DESC' : 'ASC'}`);
          }
        }
      }
      if (orderClauses.length > 0) {
        query += ` ORDER BY ${orderClauses.join(', ')}`;
      } else {
        // Fallback to default ordering
        query += ' ORDER BY d.created_at DESC';
      }
    } else {
      query += ' ORDER BY d.created_at DESC';
    }

    if (limit) {
      query += ` OFFSET 0 ROWS FETCH NEXT ${limit} ROWS ONLY`;
    }

    const result = await pool.request().query(query);

    // Format response to match expected structure
    const data = result.recordset.map((row: any) => ({
      id: row.id,
      campaign_id: row.campaign_id,
      donor_wallet: row.donor_wallet,
      amount: row.amount,
      transaction_hash: row.transaction_hash,
      block_number: row.block_number,
      timestamp_on_chain: row.timestamp_on_chain,
      status: row.status,
      created_at: row.created_at,
      campaigns: row.campaign_title ? {
        id: row.campaign_id,
        title: row.campaign_title,
      } : null,
    }));

    res.json({ data });
  } catch (error) {
    console.error('Get donations error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to fetch donations',
      code: 'FETCH_ERROR',
    });
  }
});

// POST /api/donations
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      campaign_id,
      donor_wallet,
      amount,
      transaction_hash,
      block_number,
      timestamp_on_chain,
      status,
    } = req.body;

    if (!campaign_id || !donor_wallet || !amount || !transaction_hash) {
      return res.status(400).json({
        message: 'campaign_id, donor_wallet, amount, and transaction_hash are required',
        code: 'MISSING_FIELDS',
      });
    }

    const pool = await getDbPool();
    const id = require('crypto').randomUUID();

    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .input('campaign_id', sql.UniqueIdentifier, campaign_id)
      .input('donor_wallet', sql.NVarChar, donor_wallet)
      .input('amount', sql.NVarChar, amount)
      .input('transaction_hash', sql.NVarChar, transaction_hash)
      .input('block_number', sql.BigInt, block_number || null)
      .input('timestamp_on_chain', sql.BigInt, timestamp_on_chain || null)
      .input('status', sql.NVarChar, status || 'pending')
      .query(`
        INSERT INTO donations (
          id, campaign_id, donor_wallet, amount, transaction_hash,
          block_number, timestamp_on_chain, status
        )
        VALUES (
          @id, @campaign_id, @donor_wallet, @amount, @transaction_hash,
          @block_number, @timestamp_on_chain, @status
        )
      `);

    // Update campaign current_amount
    await pool.request()
      .input('campaign_id', sql.UniqueIdentifier, campaign_id)
      .input('amount', sql.NVarChar, amount)
      .query(`
        UPDATE campaigns
        SET current_amount = CAST(CAST(current_amount AS BIGINT) + CAST(@amount AS BIGINT) AS NVARCHAR(78)),
            updated_at = GETUTCDATE()
        WHERE id = @campaign_id
      `);

    const result = await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('SELECT * FROM donations WHERE id = @id');

    res.status(201).json({ data: result.recordset[0] });
  } catch (error) {
    console.error('Create donation error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to create donation',
      code: 'CREATE_ERROR',
    });
  }
});

// PATCH /api/donations?id=uuid
router.patch('/', async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        message: 'Donation ID is required',
        code: 'MISSING_ID',
      });
    }

    const pool = await getDbPool();
    const request = pool.request().input('id', sql.UniqueIdentifier, id);
    const updates: string[] = [];

    if (req.body.status) {
      request.input('status', sql.NVarChar, req.body.status);
      updates.push('status = @status');
    }

    if (updates.length === 0) {
      return res.status(400).json({
        message: 'No fields to update',
        code: 'NO_UPDATES',
      });
    }

    await request.query(`
      UPDATE donations
      SET ${updates.join(', ')}
      WHERE id = @id
    `);

    const result = await request.query('SELECT * FROM donations WHERE id = @id');
    res.json({ data: result.recordset[0] });
  } catch (error) {
    console.error('Update donation error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to update donation',
      code: 'UPDATE_ERROR',
    });
  }
});

// DELETE /api/donations?id=uuid
router.delete('/', async (req: Request, res: Response) => {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({
        message: 'Donation ID is required',
        code: 'MISSING_ID',
      });
    }

    const pool = await getDbPool();
    await pool.request()
      .input('id', sql.UniqueIdentifier, id)
      .query('DELETE FROM donations WHERE id = @id');

    res.json({ message: 'Donation deleted successfully' });
  } catch (error) {
    console.error('Delete donation error:', error);
    res.status(500).json({
      message: error instanceof Error ? error.message : 'Failed to delete donation',
      code: 'DELETE_ERROR',
    });
  }
});

export { router as donationsRoutes };

